"""
Handwriting Model Architecture: EfficientNet-B0 for Motor Biomarker Analysis.

This module defines the handwriting feature-extraction network based on EfficientNet-B0.
The backbone extracts visual and penmanship micro-features from spiral/meander drawings,
and the projection head produces a 128-dimensional motor embedding for multimodal fusion.
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


class HandwritingEfficientNetClassifier:
    """
    Handwriting feature extractor and classifier based on EfficientNet-B0.

    Architecture:
    - Pretrained EfficientNet-B0 backbone (1280 features at penultimate layer)
    - Global Adaptive Average Pooling
    - Intermediate projection head (1280 -> 128) for motor embedding
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
            raise RuntimeError("PyTorch is required to load Handwriting EfficientNet-B0 model.")
        checkpoint = torch.load(path, map_location=self.device)
        backbone_dim = checkpoint.get("backbone_dim", 1280) if isinstance(checkpoint, dict) else 1280
        self.model = PyTorchHandwritingModel(backbone_dim=backbone_dim, embedding_dim=self.feature_dim, num_classes=2)
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            self.model.load_state_dict(checkpoint["model_state_dict"])
        elif isinstance(checkpoint, dict) and any(k.startswith("projection") for k in checkpoint.keys()):
            self.model.load_state_dict(checkpoint)
        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    def extract_embedding(self, features_tensor) -> Any:
        """
        Extracts the 128-dimensional motor biomarker embedding.
        Input features_tensor shape: (batch_size, 1280) or (1280,).
        Returns tensor of shape (batch_size, 128).
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Handwriting model weights not loaded. Real model checkpoint required.")
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
            raise RuntimeError("Handwriting model weights not loaded. Real model checkpoint required.")
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
                "label": "PD" if pred_class == 1 else "Control",
                "embedding": embedding.cpu().numpy().tolist(),
            }


if TORCH_AVAILABLE:
    class PyTorchHandwritingModel(nn.Module):
        """Native PyTorch module for EfficientNet-B0 projection and classifier head."""

        def __init__(self, backbone_dim: int = 1280, embedding_dim: int = 128, num_classes: int = 2):
            super().__init__()
            self.projection = nn.Sequential(
                nn.Linear(backbone_dim, 256),
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
            embedding = self.projection(x)
            logits = self.classifier(embedding)
            return logits, embedding
