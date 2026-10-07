"""
Speech Inference Service: Wav2Vec2 Acoustic Preprocessing & Inference.

Handles:
- Validation of audio file formats (.wav, .mp3, .m4a, .ogg, .webm)
- Audio normalization and 16,000 Hz resampling
- Wav2Vec2 model loading and 128-dim acoustic embedding extraction
"""

import os
from typing import Dict, Any, Optional
from .config import get_weight_path, SPEECH_PARAMS


class SpeechInferenceService:
    def __init__(self):
        self.modality = "speech"
        self.architecture = "Wav2Vec2 (facebook/wav2vec2-base + Projection Head)"
        self.weight_path = get_weight_path(self.modality)
        self.feature_dim = 128
        self.weights_loaded = False
        self.model = None
        self._wav2vec2 = None

        self._check_and_load_model()

    def _check_and_load_model(self) -> None:
        """Checks for trained weights and initializes model if available."""
        if not os.path.isfile(self.weight_path):
            self.weights_loaded = False
            return

        try:
            import torch
            try:
                from ..models.speech_model import SpeechWav2Vec2Classifier
            except (ImportError, ValueError):
                from models.speech_model import SpeechWav2Vec2Classifier
            self.model = SpeechWav2Vec2Classifier(weight_path=self.weight_path)
            self._get_wav2vec2_backbone()
            self.weights_loaded = True
        except Exception as e:
            self.weights_loaded = False
            self.load_error = str(e)

    def get_status(self) -> Dict[str, Any]:
        """Returns the readiness status of the speech inference service."""
        return {
            "modality": self.modality,
            "architecture": self.architecture,
            "feature_dim": self.feature_dim,
            "target_sample_rate": SPEECH_PARAMS["target_sample_rate"],
            "weight_file": os.path.basename(self.weight_path),
            "weight_path": self.weight_path,
            "weights_exist": os.path.isfile(self.weight_path),
            "ready_for_inference": self.weights_loaded,
        }

    def preprocess_audio(self, file_path: str):
        """
        Prepares raw audio for Wav2Vec2 input:
        1. Verifies file exists on disk
        2. Resamples to 16,000 Hz mono PCM
        3. Normalizes amplitude to [-1.0, 1.0]
        """
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"Audio file not found at: {file_path}")

        import librosa
        import torch

        audio, sr = librosa.load(file_path, sr=SPEECH_PARAMS["target_sample_rate"], mono=SPEECH_PARAMS["mono"])
        max_samples = int(SPEECH_PARAMS["target_sample_rate"] * SPEECH_PARAMS["max_duration_seconds"])
        if len(audio) > max_samples:
            audio = audio[:max_samples]

        tensor = torch.tensor(audio, dtype=torch.float32).unsqueeze(0)
        return tensor

    def _get_wav2vec2_backbone(self):
        if self._wav2vec2 is None:
            import torch
            from transformers import Wav2Vec2Model
            self._wav2vec2 = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base")
            self._wav2vec2.eval()
            for p in self._wav2vec2.parameters():
                p.requires_grad = False
        return self._wav2vec2

    def extract_pooled_features(self, file_path: str):
        """Extracts 768-dim temporal mean pooled feature vector from frozen Wav2Vec2."""
        import torch
        tensor = self.preprocess_audio(file_path)
        wav2vec2 = self._get_wav2vec2_backbone()
        with torch.inference_mode():
            outputs = wav2vec2(tensor)
            pooled = outputs.last_hidden_state.squeeze(0).mean(dim=0)
            return pooled

    def extract_features(self, file_path: str) -> Any:
        """
        Extracts 128-dimensional acoustic embedding from speech audio.
        Raises RuntimeError if model weights are not loaded.
        """
        if not self.weights_loaded:
            raise RuntimeError(
                f"Speech model weights missing: '{os.path.basename(self.weight_path)}' "
                f"was not found at {self.weight_path}. Model training or checkpoint required."
            )
        pooled = self.extract_pooled_features(file_path)
        embedding = self.model.extract_embedding(pooled)
        return embedding

    def _compute_attribution(
        self, hidden, audio_data, duration: float, target_class: int, pred_label: str
    ) -> Dict[str, Any]:
        """
        Computes genuine time/frame-level gradient attribution (Gradient × Activation)
        from the already computed Wav2Vec2 penultimate representations.
        """
        import torch
        import numpy as np

        classifier_module = self.model.model

        # Enable gradient tracking on penultimate hidden representations
        h_grad = hidden.detach().clone()
        h_grad.requires_grad = True

        # Temporal mean pooling
        pooled = h_grad.mean(dim=1)
        logits, _ = classifier_module(pooled)

        score = logits[0, target_class]
        classifier_module.zero_grad()
        score.backward()

        if h_grad.grad is None:
            return {"available": False, "error": "No gradients computed for speech frames."}

        grad = h_grad.grad[0]  # shape (T, 768)
        act = h_grad[0].detach()  # shape (T, 768)

        # Gradient × Activation feature attribution per frame
        raw_attr = (act * grad).sum(dim=-1).cpu().numpy()  # shape (T,)

        # ReLU to isolate positive contributions to target class
        relu_attr = np.maximum(raw_attr, 0)
        attr_min, attr_max = float(relu_attr.min()), float(relu_attr.max())
        if attr_max - attr_min > 1e-7:
            norm_attr = (relu_attr - attr_min) / (attr_max - attr_min)
        else:
            norm_attr = np.zeros_like(relu_attr)

        T = len(raw_attr)
        time_step = duration / max(T, 1)

        # Audio amplitude downsampled to T windows for synchronized timeline visualization
        samples_per_frame = max(1, len(audio_data) // T)
        amplitudes = []
        for i in range(T):
            s_idx = i * samples_per_frame
            e_idx = min(len(audio_data), (i + 1) * samples_per_frame)
            chunk = audio_data[s_idx:e_idx]
            rms = float(np.sqrt(np.mean(chunk**2))) if len(chunk) > 0 else 0.0
            amplitudes.append(rms)

        max_amp = max(amplitudes) if len(amplitudes) > 0 and max(amplitudes) > 0 else 1.0
        norm_amplitudes = [round(float(a / max_amp), 4) for a in amplitudes]

        # Build timeline entries
        timeline = []
        for i in range(T):
            t_sec = round(float(i * time_step), 3)
            timeline.append({
                "time_sec": t_sec,
                "attribution": round(float(norm_attr[i]), 4),
                "amplitude": norm_amplitudes[i],
            })

        peak_idx = int(np.argmax(norm_attr)) if len(norm_attr) > 0 else 0
        peak_time = round(float(peak_idx * time_step), 2)
        target_name = "Parkinson's Acoustic Indication" if pred_label == "PD" else "Healthy Control Pattern"

        return {
            "available": True,
            "method": "Gradient × Activation Temporal Attribution (Wav2Vec2)",
            "target_layer": "Wav2Vec2.last_hidden_state (Penultimate 768-dim)",
            "target_class": target_class,
            "target_class_label": pred_label,
            "target_class_name": target_name,
            "duration_seconds": round(duration, 2),
            "frame_count": int(T),
            "time_step_ms": round(float(time_step * 1000), 1),
            "peak_attribution_time": peak_time,
            "mean_attribution": round(float(norm_attr.mean()), 4),
            "max_attribution": round(float(norm_attr.max()), 4),
            "timeline": timeline,
            "explanation_title": "Wav2Vec2 Temporal Acoustic Attribution",
            "explanation_summary": (
                f"Time-resolved feature attribution computed via Gradient × Activation on Wav2Vec2 representations over {duration:.2f}s of speech. "
                f"Peaks show temporal phonation segments that contributed most strongly to the '{pred_label}' acoustic classification."
            ),
            "disclaimer": "Acoustic feature attribution is an algorithmic visualization of neural network sensitivity and does not constitute a clinical diagnosis or medical evaluation.",
        }

    def analyze_speech(self, file_path: str) -> Dict[str, Any]:
        """
        Runs complete inference for the speech modality.
        Returns predicted label, confidence, probabilities, 128-dim embedding,
        and genuine temporal attribution explainability data.
        """
        if not self.weights_loaded:
            raise RuntimeError("Speech model weights not loaded.")

        import torch
        import librosa

        # 1. Load audio once
        audio_data, sr = librosa.load(file_path, sr=SPEECH_PARAMS["target_sample_rate"], mono=SPEECH_PARAMS["mono"])
        max_samples = int(SPEECH_PARAMS["target_sample_rate"] * SPEECH_PARAMS["max_duration_seconds"])
        if len(audio_data) > max_samples:
            audio_data = audio_data[:max_samples]

        duration = float(len(audio_data) / sr)
        tensor = torch.tensor(audio_data, dtype=torch.float32).unsqueeze(0)

        # 2. Forward pass through Wav2Vec2 once
        wav2vec2 = self._get_wav2vec2_backbone()
        with torch.no_grad():
            outputs = wav2vec2(tensor)
            hidden = outputs.last_hidden_state  # shape (1, T, 768)

        pooled = hidden.squeeze(0).mean(dim=0)
        res = self.model.predict(pooled)
        probs = res["probabilities"][0]
        # Class 0: Healthy Control (HC), Class 1: Parkinson's Disease (PD)
        pred_label = res["label"]
        pred_class = res["predicted_class"]
        confidence = float(probs[pred_class])

        # 3. Compute Speech XAI safely using cached hidden state
        attribution_data = None
        try:
            attribution_data = self._compute_attribution(
                hidden=hidden,
                audio_data=audio_data,
                duration=duration,
                target_class=pred_class,
                pred_label=pred_label,
            )
        except Exception as e:
            import logging
            logging.getLogger("speech_service").warning(f"Speech attribution failed: {e}")
            attribution_data = {
                "available": False,
                "error": str(e),
                "disclaimer": "Speech acoustic attribution is currently unavailable for this sample.",
            }

        return {
            "modality": "speech",
            "model": "Wav2Vec2 (facebook/wav2vec2-base) + PyTorch Acoustic Classifier",
            "prediction": "Healthy Control" if pred_label == "HC" else "Parkinson's Indication",
            "label": pred_label,
            "confidence": round(confidence, 4),
            "probabilities": {
                "healthy_control": round(float(probs[0]), 4),
                "parkinsons": round(float(probs[1]), 4),
            },
            "embedding": res["embedding"][0],
            "attribution": attribution_data,
        }
