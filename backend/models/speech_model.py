"""
Speech Model Architecture: Wav2Vec2 for Acoustic Biomarker Analysis.

This module defines the acoustic classification and feature-extraction network
based on Wav2Vec2. The backbone extracts high-level representations from 16kHz
raw speech waveforms, and the projection head produces a 128-dimensional acoustic
embedding for multimodal fusion.
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


class SpeechWav2Vec2Classifier:
    """
    Speech feature extractor and classifier based on Wav2Vec2.

    Architecture:
    - Pretrained Wav2Vec2 encoder (768 hidden dimension)
    - Temporal mean/max pooling
    - Intermediate projection layer (768 -> 128) for multimodal fusion embedding
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
            raise RuntimeError("PyTorch is required to load SpeechWav2Vec2 model.")
        checkpoint = torch.load(path, map_location=self.device)
        input_dim = checkpoint.get("input_dim", 768) if isinstance(checkpoint, dict) else 768
        self.model = PyTorchSpeechModel(input_dim=input_dim, embedding_dim=self.feature_dim, num_classes=2)
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            self.model.load_state_dict(checkpoint["model_state_dict"])
        elif isinstance(checkpoint, dict) and any(k.startswith("embedding_head") for k in checkpoint.keys()):
            self.model.load_state_dict(checkpoint)
        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    def extract_embedding(self, features_tensor) -> Any:
        """
        Extracts the 128-dimensional acoustic biomarker embedding.
        Input features_tensor shape: (batch_size, 768) or (768,).
        Returns tensor of shape (batch_size, 128).
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Speech model weights not loaded. Real model checkpoint required.")
        with torch.no_grad():
            if len(features_tensor.shape) == 1:
                features_tensor = features_tensor.unsqueeze(0)
            features_tensor = features_tensor.to(self.device)
            _, embedding = self.model(features_tensor)
            return embedding

    def predict(self, features_tensor) -> Dict[str, Any]:
        """
        Runs forward pass through classifier head.
        Returns predicted class, probabilities, and embedding.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Speech model weights not loaded. Real model checkpoint required.")
        with torch.no_grad():
            if len(features_tensor.shape) == 1:
                features_tensor = features_tensor.unsqueeze(0)
            features_tensor = features_tensor.to(self.device)
            logits, embedding = self.model(features_tensor)
            probs = torch.softmax(logits, dim=-1)
            pred_class = torch.argmax(probs, dim=-1).item()
            return {
                "logits": logits.cpu().numpy().tolist(),
                "probabilities": probs.cpu().numpy().tolist(),
                "predicted_class": pred_class,
                "label": "PD" if pred_class == 1 else "HC",
                "embedding": embedding.cpu().numpy().tolist(),
            }


if TORCH_AVAILABLE:
    class PyTorchSpeechModel(nn.Module):
        """Native PyTorch module for Wav2Vec2 classification head."""

        def __init__(self, input_dim: int = 768, embedding_dim: int = 128, num_classes: int = 2):
            super().__init__()
            self.embedding_head = nn.Sequential(
                nn.Linear(input_dim, 256),
                nn.BatchNorm1d(256),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(256, embedding_dim),
                nn.BatchNorm1d(embedding_dim),
                nn.ReLU(),
            )
            self.classifier = nn.Sequential(
                nn.Dropout(0.2),
                nn.Linear(embedding_dim, num_classes),
            )

        def forward(self, x):
            embedding = self.embedding_head(x)
            logits = self.classifier(embedding)
            return logits, embedding
