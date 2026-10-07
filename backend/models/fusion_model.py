"""
Multimodal Fusion Model Architecture: Feature-Level Late Fusion.

This module defines the feature-level fusion network that integrates:
- Speech acoustic embedding (128-dim) from Wav2Vec2
- Handwriting motor embedding (128-dim) from EfficientNet-B0
- Gait kinematic embedding (128-dim) from MediaPipe Pose + Bi-LSTM

The concatenated 384-dimensional representation is passed through cross-modal
dense projection layers to output the unified screening prediction.
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


class MultimodalFusionClassifier:
    """
    Multimodal fusion classifier coordinating speech, handwriting, and gait representations.

    Input:
    - speech_emb: (batch_size, 128)
    - handwriting_emb: (batch_size, 128)
    - gait_emb: (batch_size, 128)

    Total concatenated dimension: 384
    Output: 2 logits (Class 0: Healthy Control / Low Risk, Class 1: Parkinson's Indication)
    """

    def __init__(self, weight_path: Optional[str] = None, device: str = "cpu"):
        self.device = device
        self.weight_path = weight_path
        self.is_loaded = False
        self.total_feature_dim = 384
        self.model = None

        if TORCH_AVAILABLE and weight_path:
            self._load_weights(weight_path)

    def _load_weights(self, path: str):
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch is required to load Multimodal Fusion model.")
        checkpoint = torch.load(path, map_location=self.device)
        self.model = PyTorchFusionNetwork(
            speech_dim=128,
            handwriting_dim=128,
            gait_dim=128,
            hidden_dim=128,
            num_classes=2,
        )
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            self.model.load_state_dict(checkpoint["model_state_dict"])
        elif isinstance(checkpoint, dict) and any(k.startswith("fusion_layers") for k in checkpoint.keys()):
            self.model.load_state_dict(checkpoint)
        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    def predict(self, speech_emb, handwriting_emb, gait_emb) -> Dict[str, Any]:
        """
        Runs feature-level fusion forward pass.
        Requires all three embeddings and loaded weights.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Multimodal Fusion model weights not loaded. Real model checkpoint required.")
        with torch.no_grad():
            if len(speech_emb.shape) == 1:
                speech_emb = speech_emb.unsqueeze(0)
            if len(handwriting_emb.shape) == 1:
                handwriting_emb = handwriting_emb.unsqueeze(0)
            if len(gait_emb.shape) == 1:
                gait_emb = gait_emb.unsqueeze(0)
            speech_emb = speech_emb.to(self.device)
            handwriting_emb = handwriting_emb.to(self.device)
            gait_emb = gait_emb.to(self.device)
            logits = self.model(speech_emb, handwriting_emb, gait_emb)
            probs = torch.softmax(logits, dim=-1)
            pred_class = torch.argmax(probs, dim=-1).item()
            return {
                "logits": logits.cpu().numpy().tolist(),
                "probabilities": probs.cpu().numpy().tolist(),
                "predicted_class": pred_class,
                "label": "High Risk / PD" if pred_class == 1 else "Low Risk / Healthy",
            }


if TORCH_AVAILABLE:
    class PyTorchFusionNetwork(nn.Module):
        """Native PyTorch module for 3-modality feature-level fusion."""

        def __init__(
            self,
            speech_dim: int = 128,
            handwriting_dim: int = 128,
            gait_dim: int = 128,
            hidden_dim: int = 128,
            num_classes: int = 2,
            dropout: float = 0.3,
        ):
            super().__init__()
            total_in = speech_dim + handwriting_dim + gait_dim  # 384

            self.fusion_layers = nn.Sequential(
                nn.Linear(total_in, hidden_dim),
                nn.BatchNorm1d(hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(hidden_dim, 64),
                nn.BatchNorm1d(64),
                nn.ReLU(),
                nn.Dropout(dropout / 2),
                nn.Linear(64, num_classes),
            )

        def forward(self, speech_feat, handwriting_feat, gait_feat):
            # Concatenate along feature dimension
            combined = torch.cat([speech_feat, handwriting_feat, gait_feat], dim=-1)
            logits = self.fusion_layers(combined)
            return logits
