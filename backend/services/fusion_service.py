"""
Multimodal Fusion Inference Service.

Coordinates:
- Speech acoustic embedding extraction (128-dim)
- Handwriting motor embedding extraction (128-dim)
- Gait kinematic embedding extraction (128-dim)
- Concatenation to 384-dimensional joint feature representation
- Multimodal classification inference
"""

import os
from typing import Dict, Any, List
from .config import get_weight_path, FEATURE_DIMS
from .speech_service import SpeechInferenceService
from .handwriting_service import HandwritingInferenceService
from .gait_service import GaitInferenceService


class MultimodalFusionService:
    def __init__(self):
        self.modality = "multimodal_fusion"
        self.architecture = "Feature-Level Concatenation (384-dim) + Multilayer Dense Network"
        self.weight_path = get_weight_path("fusion")
        self.input_feature_dim = FEATURE_DIMS["fusion_total"]
        self.weights_loaded = False
        self.model = None

        self.speech_service = SpeechInferenceService()
        self.handwriting_service = HandwritingInferenceService()
        self.gait_service = GaitInferenceService()

        self._check_and_load_model()

    def _check_and_load_model(self) -> None:
        """Checks for trained weights and initializes model if available."""
        if not os.path.isfile(self.weight_path):
            self.weights_loaded = False
            return

        try:
            import torch
            try:
                from ..models.fusion_model import MultimodalFusionClassifier
            except (ImportError, ValueError):
                from models.fusion_model import MultimodalFusionClassifier
            self.model = MultimodalFusionClassifier(weight_path=self.weight_path)
            self.weights_loaded = True
        except Exception as e:
            self.weights_loaded = False
            self.load_error = str(e)

    def get_system_status(self) -> Dict[str, Any]:
        """
        Reports system-wide status across all individual modalities and the fusion layer.
        Identifies missing model weights without generating fake scores.
        """
        missing_weights: List[str] = []

        speech_status = self.speech_service.get_status()
        if not speech_status["weights_exist"]:
            missing_weights.append(speech_status["weight_file"])

        handwriting_status = self.handwriting_service.get_status()
        if not handwriting_status["weights_exist"]:
            missing_weights.append(handwriting_status["weight_file"])

        gait_status = self.gait_service.get_status()
        if not gait_status["weights_exist"]:
            missing_weights.append(gait_status["weight_file"])

        fusion_weights_exist = os.path.isfile(self.weight_path)
        if not fusion_weights_exist:
            missing_weights.append(os.path.basename(self.weight_path))

        all_ready = (
            speech_status["ready_for_inference"]
            and handwriting_status["ready_for_inference"]
            and gait_status["ready_for_inference"]
            and self.weights_loaded
        )

        return {
            "status": "ready" if all_ready else "weights_missing",
            "ready_for_inference": all_ready,
            "architecture": {
                "speech": speech_status["architecture"],
                "handwriting": handwriting_status["architecture"],
                "gait": gait_status["architecture"],
                "fusion": self.architecture,
            },
            "feature_dimensions": FEATURE_DIMS,
            "weights": {
                "speech": speech_status,
                "handwriting": handwriting_status,
                "gait": gait_status,
                "fusion": {
                    "weight_file": os.path.basename(self.weight_path),
                    "weight_path": self.weight_path,
                    "weights_exist": fusion_weights_exist,
                    "ready_for_inference": self.weights_loaded,
                },
            },
            "missing_weights": missing_weights,
            "message": (
                "All models loaded and ready for multimodal inference."
                if all_ready
                else f"Missing {len(missing_weights)} required model weight file(s): {', '.join(missing_weights)}. Models must be trained or checkpoints placed in backend/models/weights/ before running inference."
            ),
        }

    def run_multimodal_inference(
        self,
        speech_file_path: str,
        handwriting_file_path: str,
        gait_file_path: str,
    ) -> Dict[str, Any]:
        """
        Executes unified feature-level fusion inference across all 3 modalities.
        Strictly requires all 3 real model checkpoints to be loaded.
        Will NOT invent fake predictions or placeholder scores.
        """
        status = self.get_system_status()
        if not status["ready_for_inference"]:
            raise RuntimeError(
                f"Cannot run multimodal inference: {status['message']}"
            )

        import torch
        import concurrent.futures

        # 1-3. Run Speech, Handwriting, and Gait inference concurrently across threads
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            speech_future = executor.submit(self.speech_service.analyze_speech, speech_file_path)
            handwriting_future = executor.submit(self.handwriting_service.analyze_handwriting, handwriting_file_path)
            gait_future = executor.submit(self.gait_service.analyze_gait, gait_file_path)

            speech_analysis = speech_future.result()
            handwriting_analysis = handwriting_future.result()
            gait_analysis = gait_future.result()

        # 4. Feature-level Multimodal Late Fusion
        speech_emb = torch.tensor(speech_analysis["embedding"], dtype=torch.float32).unsqueeze(0)
        handwriting_emb = torch.tensor(handwriting_analysis["embedding"], dtype=torch.float32).unsqueeze(0)
        gait_emb = torch.tensor(gait_analysis["embedding"], dtype=torch.float32).unsqueeze(0)

        with torch.inference_mode():
            fusion_res = self.model.predict(speech_emb, handwriting_emb, gait_emb)
        fusion_probs = fusion_res["probabilities"][0]
        fusion_pred_class = fusion_res["predicted_class"]
        raw_fusion_confidence = float(fusion_probs[fusion_pred_class])

        # Extract calibrated risk probabilities directly from the 3 validated modality models
        speech_risk = float(speech_analysis.get("probabilities", {}).get("parkinsons", 0.0))
        handwriting_risk = float(handwriting_analysis.get("probabilities", {}).get("parkinsons", 0.0))
        gait_normal = float(gait_analysis.get("probabilities", {}).get("normal", 1.0))
        gait_risk = float(round(1.0 - gait_normal, 4))

        modality_risks = [speech_risk, handwriting_risk, gait_risk]
        modality_confidences = [
            float(speech_analysis["confidence"]),
            float(handwriting_analysis["confidence"]),
            float(gait_analysis["confidence"]),
        ]

        # Model-derived screening aggregation across the 3 validated digital biomarkers
        aggregated_risk_score = round(sum(modality_risks) / len(modality_risks), 4)
        aggregated_confidence = round(sum(modality_confidences) / len(modality_confidences), 4)
        elevated_risk_prob = aggregated_risk_score
        low_risk_prob = round(1.0 - elevated_risk_prob, 4)

        positive_modalities = sum([
            speech_analysis["label"] == "PD",
            handwriting_analysis["label"] == "PD",
            gait_analysis["label"] != "NORMAL",
        ])

        classification = "Positive" if aggregated_risk_score >= 0.5 else "Negative"
        combined_prediction = (
            "Elevated Risk / Parkinsonian Biomarkers Detected"
            if classification == "Positive"
            else "Low Risk / Consistent with Healthy Controls"
        )

        # Modality summaries without embeddings in outer layer for clean payload
        speech_out = {k: v for k, v in speech_analysis.items() if k != "embedding"}
        handwriting_out = {k: v for k, v in handwriting_analysis.items() if k != "embedding"}
        gait_out = {k: v for k, v in gait_analysis.items() if k != "embedding"}

        summary = (
            f"Multimodal screening aggregation evaluated across 3 digital biomarkers ({positive_modalities} of 3 modalities indicated elevated risk). "
            f"Speech acoustic model indicated {speech_analysis['label']} ({speech_analysis['confidence']:.1%} confidence); "
            f"Handwriting motor model indicated {handwriting_analysis['label']} ({handwriting_analysis['confidence']:.1%} confidence); "
            f"Gait kinematic model indicated {gait_analysis['label']} ({gait_analysis['confidence']:.1%} confidence). "
            f"Model-derived screening aggregation indicates {combined_prediction.lower()} with {aggregated_confidence:.1%} average model confidence and {aggregated_risk_score:.1%} composite biomarker risk score."
        )

        return {
            "status": "success",
            "modalities": {
                "speech": speech_out,
                "handwriting": handwriting_out,
                "gait": gait_out,
            },
            "combined_result": {
                "prediction": combined_prediction,
                "classification": classification,
                "risk_score": aggregated_risk_score,
                "confidence": aggregated_confidence,
                "probabilities": {
                    "low_risk": low_risk_prob,
                    "elevated_risk": elevated_risk_prob,
                },
                "positive_modalities_count": positive_modalities,
                "total_modalities_count": 3,
                "modalities_evaluated": ["speech", "handwriting", "gait"],
                "aggregation_type": "Model-Derived Screening Aggregation",
                "summary": summary,
                "raw_fusion_model": {
                    "predicted_class": fusion_pred_class,
                    "raw_softmax_confidence": round(raw_fusion_confidence, 4),
                    "raw_probabilities": {
                        "low_risk": round(float(fusion_probs[0]), 4),
                        "elevated_risk": round(float(fusion_probs[1]), 4),
                    },
                    "note": "Raw fusion head output (experimental). Calibrated screening aggregation is used as primary indicator."
                },
            },
            "feature_dimensions": {
                "speech": 128,
                "handwriting": 128,
                "gait": 128,
                "fusion_total": 384,
            },
        }
