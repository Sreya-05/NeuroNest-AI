"""
Gait Model Architecture: MediaPipe Pose + Bi-LSTM for Kinematic Biomarker Analysis.

This module defines the gait sequence classifier and feature extractor.
MediaPipe Pose extracts 33 3D body keypoints (99 features per video frame),
and a Bidirectional LSTM captures temporal walking dynamics (cadence, stride symmetry, hesitation),
producing a 128-dimensional kinematic embedding for multimodal fusion.
"""

from typing import Optional, Dict, Any

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    nn = None


class GaitPoseLSTMClassifier:
    """
    Gait feature extractor and classifier based on MediaPipe Pose + Bi-LSTM.

    Architecture:
    - Input sequence: (batch_size, sequence_length, 99) keypoint coordinates
    - 2-layer Bidirectional LSTM (hidden_size=64 per direction -> 128 total)
    - Attention or Temporal pooling
    - Intermediate projection (128-dim kinematic embedding)
    - Classification head (128 -> 2) for binary Parkinson's risk indication
    """

    def __init__(self, weight_path: Optional[str] = None, device: str = "cpu"):
        self.device = device
        self.weight_path = weight_path
        self.is_loaded = False
        self.feature_dim = 128
        self.model = None

        if TORCH_AVAILABLE and weight_path:
            self._load_weights(weight_path)

    def _load_weights(self, path: str):
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch is required to load Gait LSTM model.")
        checkpoint = torch.load(path, map_location=self.device)
        input_features = checkpoint.get("input_features", 408) if isinstance(checkpoint, dict) else 408
        num_classes = checkpoint.get("num_classes", 4) if isinstance(checkpoint, dict) else 4
        hidden_size = checkpoint.get("hidden_size", 64) if isinstance(checkpoint, dict) else 64
        num_layers = checkpoint.get("num_layers", 2) if isinstance(checkpoint, dict) else 2
        self.model = PyTorchGaitLSTM(
            input_features=input_features,
            hidden_size=hidden_size,
            num_layers=num_layers,
            embedding_dim=self.feature_dim,
            num_classes=num_classes,
        )
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            self.model.load_state_dict(checkpoint["model_state_dict"])
        elif isinstance(checkpoint, dict) and any(k.startswith("lstm") for k in checkpoint.keys()):
            self.model.load_state_dict(checkpoint)
        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    def extract_embedding(self, pose_sequence_tensor) -> Any:
        """
        Extracts the 128-dimensional kinematic biomarker embedding.
        Input pose_sequence_tensor shape: (batch_size, seq_len, num_features) or (seq_len, num_features).
        Returns tensor of shape (batch_size, 128).
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Gait model weights not loaded. Real model checkpoint required.")
        with torch.no_grad():
            if len(pose_sequence_tensor.shape) == 2:
                pose_sequence_tensor = pose_sequence_tensor.unsqueeze(0)
            pose_sequence_tensor = pose_sequence_tensor.to(self.device)
            _, embedding = self.model(pose_sequence_tensor)
            return embedding

    def predict(self, pose_sequence_tensor) -> Dict[str, Any]:
        """
        Runs forward pass through classifier head.
        Returns predicted class, probabilities, and embedding.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Gait model weights not loaded. Real model checkpoint required.")
        with torch.no_grad():
            if len(pose_sequence_tensor.shape) == 2:
                pose_sequence_tensor = pose_sequence_tensor.unsqueeze(0)
            pose_sequence_tensor = pose_sequence_tensor.to(self.device)
            logits, embedding = self.model(pose_sequence_tensor)
            probs = torch.softmax(logits, dim=-1)
            pred_class = torch.argmax(probs, dim=-1).item()
            label_map = {0: "NORMAL", 1: "MILD", 2: "MODERATE", 3: "SEVERE"}
            return {
                "logits": logits.cpu().numpy().tolist(),
                "probabilities": probs.cpu().numpy().tolist(),
                "predicted_class": pred_class,
                "label": label_map.get(pred_class, str(pred_class)),
                "embedding": embedding.cpu().numpy().tolist(),
            }


if TORCH_AVAILABLE:
    class PyTorchGaitLSTM(nn.Module):
        """Native PyTorch module for Gait Pose Bi-LSTM network."""

        def __init__(
            self,
            input_features: int = 408,
            hidden_size: int = 64,
            num_layers: int = 2,
            embedding_dim: int = 128,
            num_classes: int = 4,
            dropout: float = 0.3,
        ):
            super().__init__()
            self.lstm = nn.LSTM(
                input_size=input_features,
                hidden_size=hidden_size,
                num_layers=num_layers,
                batch_first=True,
                bidirectional=True,
                dropout=dropout if num_layers > 1 else 0.0,
            )
            # 2 directions * hidden_size = 128
            self.projection = nn.Sequential(
                nn.Linear(hidden_size * 2, embedding_dim),
                nn.BatchNorm1d(embedding_dim),
                nn.ReLU(),
            )
            self.classifier = nn.Sequential(
                nn.Dropout(dropout),
                nn.Linear(embedding_dim, num_classes),
            )

        def forward(self, x):
            # x shape: (batch_size, seq_len, input_features)
            lstm_out, (hn, cn) = self.lstm(x)
            # Global temporal average pooling over sequence length
            pooled = torch.mean(lstm_out, dim=1)
            embedding = self.projection(pooled)
            logits = self.classifier(embedding)
            return logits, embedding
