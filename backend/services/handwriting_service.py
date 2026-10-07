"""
Handwriting Inference Service: EfficientNet-B0 Motor Preprocessing & Inference.

Handles:
- Validation of handwriting images (.png, .jpg, .jpeg, .webp)
- Image resizing to 224x224 and ImageNet normalization
- EfficientNet-B0 model loading and 128-dim motor embedding extraction
"""

import os
from typing import Dict, Any, Optional
from .config import get_weight_path, HANDWRITING_PARAMS


class HandwritingInferenceService:
    def __init__(self):
        self.modality = "handwriting"
        self.architecture = "EfficientNet-B0 (Pretrained Visual Backbone + Projection Head)"
        self.weight_path = get_weight_path(self.modality)
        self.feature_dim = 128
        self.weights_loaded = False
        self.model = None
        self._effnet = None

        import torchvision.transforms as T
        self.transform = T.Compose([
            T.Resize(HANDWRITING_PARAMS["image_size"]),
            T.ToTensor(),
            T.Normalize(mean=HANDWRITING_PARAMS["mean"], std=HANDWRITING_PARAMS["std"]),
        ])

        self._check_and_load_model()

    def _check_and_load_model(self) -> None:
        """Checks for trained weights and initializes model if available."""
        if not os.path.isfile(self.weight_path):
            self.weights_loaded = False
            return

        try:
            import torch
            try:
                from ..models.handwriting_model import HandwritingEfficientNetClassifier
            except (ImportError, ValueError):
                from models.handwriting_model import HandwritingEfficientNetClassifier
            self.model = HandwritingEfficientNetClassifier(weight_path=self.weight_path)
            self._get_effnet_backbone()
            self.weights_loaded = True
        except Exception as e:
            self.weights_loaded = False
            self.load_error = str(e)

    def get_status(self) -> Dict[str, Any]:
        """Returns the readiness status of the handwriting inference service."""
        return {
            "modality": self.modality,
            "architecture": self.architecture,
            "feature_dim": self.feature_dim,
            "input_resolution": HANDWRITING_PARAMS["image_size"],
            "weight_file": os.path.basename(self.weight_path),
            "weight_path": self.weight_path,
            "weights_exist": os.path.isfile(self.weight_path),
            "ready_for_inference": self.weights_loaded,
        }

    def preprocess_image(self, file_path: str):
        """
        Prepares handwriting image for EfficientNet-B0:
        1. Verifies image exists on disk
        2. Converts to 3-channel RGB
        3. Resizes to (224, 224)
        4. Normalizes using ImageNet mean & standard deviation
        """
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"Handwriting image not found at: {file_path}")

        from PIL import Image

        with Image.open(file_path) as img:
            img_rgb = img.convert("RGB")
            img_tensor = self.transform(img_rgb).unsqueeze(0)
            return img_tensor

    def _get_effnet_backbone(self):
        if self._effnet is None:
            import torch
            import torchvision.models as models
            self._effnet = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
            self._effnet.eval()
            for p in self._effnet.parameters():
                p.requires_grad = False
        return self._effnet

    def extract_penultimate_features(self, file_path: str):
        """Extracts 1280-dim feature vector from frozen EfficientNet-B0."""
        import torch
        img_tensor = self.preprocess_image(file_path)
        effnet = self._get_effnet_backbone()
        with torch.inference_mode():
            feats = effnet.features(img_tensor)
            feats = effnet.avgpool(feats)
            feats = torch.flatten(feats, 1).squeeze(0)
            return feats

    def extract_features(self, file_path: str) -> Any:
        """
        Extracts 128-dimensional motor biomarker embedding from handwriting image.
        Raises RuntimeError if model weights are not loaded.
        """
        if not self.weights_loaded:
            raise RuntimeError(
                f"Handwriting model weights missing: '{os.path.basename(self.weight_path)}' "
                f"was not found at {self.weight_path}. Model training or checkpoint required."
            )
        penultimate = self.extract_penultimate_features(file_path)
        embedding = self.model.extract_embedding(penultimate)
        return embedding

    def generate_gradcam(self, file_path: str, target_class: Optional[int] = None) -> Dict[str, Any]:
        """
        Computes genuine Grad-CAM explainability for the EfficientNet-B0 handwriting model.
        Target layer: Final convolutional block of EfficientNet-B0 backbone (features[-1]).
        Returns base64-encoded original image, heatmap, and blended overlay.
        """
        import io
        import base64
        import numpy as np
        import cv2
        import torch
        from PIL import Image

        if not self.weights_loaded or self.model is None or self.model.model is None:
            return {"available": False, "error": "Model weights not loaded for Grad-CAM."}

        # 1. Load original image
        with Image.open(file_path) as pil_img:
            orig_rgb = pil_img.convert("RGB")
            w, h = orig_rgb.size

        # 2. Preprocess tensor and enable gradient tracking
        img_tensor = self.preprocess_image(file_path)
        img_tensor.requires_grad = True

        # 3. Hook target convolutional layer (effnet.features[-1])
        effnet = self._get_effnet_backbone()
        classifier_module = self.model.model
        target_layer = effnet.features[-1]

        activations = []
        gradients = []

        def forward_hook(module, inp, outp):
            activations.append(outp)

        def backward_hook(module, grad_in, grad_out):
            gradients.append(grad_out[0])

        handle_fwd = target_layer.register_forward_hook(forward_hook)
        handle_bwd = target_layer.register_full_backward_hook(backward_hook)

        try:
            # Forward pass through backbone and classifier
            conv_out = effnet.features(img_tensor)
            pooled = effnet.avgpool(conv_out)
            flattened = torch.flatten(pooled, 1)
            logits, _ = classifier_module(flattened)

            probs = torch.softmax(logits, dim=-1)
            if target_class is None:
                target_class = int(torch.argmax(probs, dim=-1).item())

            target_score = logits[0, target_class]

            # Zero existing gradients
            effnet.zero_grad()
            classifier_module.zero_grad()
            if img_tensor.grad is not None:
                img_tensor.grad.zero_()

            # Backward pass
            target_score.backward()

            if not activations or not gradients:
                return {"available": False, "error": "No activations or gradients captured for Grad-CAM."}

            act = activations[0]  # shape (1, 1280, 7, 7)
            grad = gradients[0]   # shape (1, 1280, 7, 7)

            # Global average pooling over spatial dimensions (height, width)
            weights = torch.mean(grad, dim=(2, 3), keepdim=True)  # (1, 1280, 1, 1)

            # Weighted sum of feature maps
            cam = torch.sum(weights * act, dim=1, keepdim=True)   # (1, 1, 7, 7)
            cam = torch.relu(cam)  # Discard negative contributions

            # Normalize to [0, 1]
            cam_min, cam_max = cam.min(), cam.max()
            if (cam_max - cam_min) > 1e-7:
                cam = (cam - cam_min) / (cam_max - cam_min)
            else:
                cam = torch.zeros_like(cam)

            # Create responsive display thumbnail (max 512px)
            max_dim = 512
            scale = min(max_dim / max(w, h), 1.0)
            disp_w = max(1, int(w * scale))
            disp_h = max(1, int(h * scale))

            disp_img = orig_rgb.resize((disp_w, disp_h), Image.Resampling.LANCZOS)
            disp_np = np.array(disp_img)

            # Upsample Grad-CAM heatmap to display size
            cam_resized = torch.nn.functional.interpolate(
                cam, size=(disp_h, disp_w), mode="bilinear", align_corners=False
            )
            cam_np = cam_resized.squeeze().detach().cpu().numpy()

            # Colorize heatmap (COLORMAP_JET)
            cam_uint8 = np.uint8(255 * cam_np)
            heatmap_bgr = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)
            heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)

            # Alpha blend overlay with original image
            overlay_rgb = cv2.addWeighted(disp_np, 0.60, heatmap_rgb, 0.40, 0)
            overlay_bgr = cv2.cvtColor(overlay_rgb, cv2.COLOR_RGB2BGR)

            # Base64 encodings (JPEG format for fast transmission)
            buf_orig = io.BytesIO()
            disp_img.save(buf_orig, format="JPEG", quality=88)
            orig_b64 = base64.b64encode(buf_orig.getvalue()).decode("utf-8")

            _, buf_hm = cv2.imencode(".jpg", heatmap_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
            hm_b64 = base64.b64encode(buf_hm.tobytes()).decode("utf-8")

            _, buf_ol = cv2.imencode(".jpg", overlay_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
            ol_b64 = base64.b64encode(buf_ol.tobytes()).decode("utf-8")

            target_label = "PD" if target_class == 1 else "Control"
            target_title = (
                "Parkinson's Motor Indicator Attributions"
                if target_class == 1
                else "Healthy Control Handwriting Characteristics"
            )

            return {
                "available": True,
                "target_layer": "EfficientNet-B0.features[8] (Final Conv Block)",
                "target_class": target_class,
                "target_class_label": target_label,
                "target_class_name": target_title,
                "original_image": f"data:image/jpeg;base64,{orig_b64}",
                "heatmap_image": f"data:image/jpeg;base64,{hm_b64}",
                "overlay_image": f"data:image/jpeg;base64,{ol_b64}",
                "max_activation": round(float(cam_np.max()), 4),
                "mean_activation": round(float(cam_np.mean()), 4),
                "explanation_title": "EfficientNet-B0 Grad-CAM Visual Attention",
                "explanation_summary": (
                    f"Visual attribution heatmap computed via Grad-CAM on EfficientNet-B0's final convolutional layer. "
                    f"Warm regions (red/orange) highlight stroke features and penmanship dynamics that most strongly influenced the '{target_label}' motor classification."
                ),
                "disclaimer": "Model attention visualization is provided strictly for algorithmic transparency and explainability; it is not a clinical diagnosis or medical evaluation.",
            }
        finally:
            handle_fwd.remove()
            handle_bwd.remove()

    def analyze_handwriting(self, file_path: str) -> Dict[str, Any]:
        """
        Runs complete inference for the handwriting modality.
        Returns predicted label, confidence, probabilities, 128-dim embedding,
        and genuine Grad-CAM explainability data.
        """
        if not self.weights_loaded:
            raise RuntimeError("Handwriting model weights not loaded.")

        penultimate = self.extract_penultimate_features(file_path)
        res = self.model.predict(penultimate)
        probs = res["probabilities"][0]
        # Class 0: Control, Class 1: Parkinson's Disease (PD)
        pred_label = res["label"]
        pred_class = res["predicted_class"]
        confidence = float(probs[pred_class])

        # Compute Grad-CAM explainability safely without breaking screening if it encounters an issue
        gradcam_data = None
        try:
            gradcam_data = self.generate_gradcam(file_path, target_class=pred_class)
        except Exception as e:
            import logging
            logging.getLogger("handwriting_service").warning(f"Grad-CAM generation failed: {e}")
            gradcam_data = {
                "available": False,
                "error": str(e),
                "disclaimer": "Model attention visualization is currently unavailable for this sample.",
            }

        return {
            "modality": "handwriting",
            "model": "EfficientNet-B0 + PyTorch Motor Classifier",
            "prediction": "Healthy Control" if pred_label == "Control" else "Parkinson's Indication",
            "label": pred_label,
            "confidence": round(confidence, 4),
            "probabilities": {
                "control": round(float(probs[0]), 4),
                "parkinsons": round(float(probs[1]), 4),
            },
            "embedding": res["embedding"][0],
            "gradcam": gradcam_data,
        }
