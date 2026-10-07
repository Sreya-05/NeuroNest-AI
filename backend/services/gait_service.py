"""
Gait Inference Service: MediaPipe Pose + Bi-LSTM Kinematic Preprocessing & Inference.

Handles:
- Validation of video recordings (.mp4, .mov, .webm, .avi, .mkv)
- Extraction of 33 body pose landmarks (99 features) per frame via MediaPipe Pose
- Sequence normalization (stride cadence, temporal padding to 150 frames)
- Bi-LSTM model loading and 128-dim kinematic embedding extraction
"""

import os
from typing import Dict, Any, Optional
from .config import get_weight_path, GAIT_PARAMS


class GaitInferenceService:
    def __init__(self):
        self.modality = "gait"
        self.architecture = "MediaPipe Pose (33 Landmarks) + Bidirectional LSTM"
        self.weight_path = get_weight_path(self.modality)
        self.feature_dim = 128
        self.weights_loaded = False
        self.model = None
        self._landmarker = None

        self._check_and_load_model()

    def _check_and_load_model(self) -> None:
        """Checks for trained weights and initializes model if available."""
        if not os.path.isfile(self.weight_path):
            self.weights_loaded = False
            return

        try:
            import torch
            try:
                from ..models.gait_model import GaitPoseLSTMClassifier
            except (ImportError, ValueError):
                from models.gait_model import GaitPoseLSTMClassifier
            self.model = GaitPoseLSTMClassifier(weight_path=self.weight_path)
            self._get_pose_landmarker()
            self.weights_loaded = True
        except Exception as e:
            self.weights_loaded = False
            self.load_error = str(e)

    def get_status(self) -> Dict[str, Any]:
        """Returns the readiness status of the gait inference service."""
        return {
            "modality": self.modality,
            "architecture": self.architecture,
            "feature_dim": self.feature_dim,
            "num_landmarks": GAIT_PARAMS["num_pose_landmarks"],
            "features_per_frame": GAIT_PARAMS["input_features_per_frame"],
            "max_sequence_length": GAIT_PARAMS["max_sequence_length"],
            "weight_file": os.path.basename(self.weight_path),
            "weight_path": self.weight_path,
            "weights_exist": os.path.isfile(self.weight_path),
            "ready_for_inference": self.weights_loaded,
        }

    def _get_pose_landmarker(self):
        """Initializes and caches the MediaPipe PoseLandmarker task instance."""
        if not hasattr(self, "_landmarker") or self._landmarker is None:
            import mediapipe as mp
            from .config import WEIGHTS_DIR

            model_task_path = os.path.join(WEIGHTS_DIR, "pose_landmarker_lite.task")
            if not os.path.isfile(model_task_path):
                import urllib.request
                url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
                urllib.request.urlretrieve(url, model_task_path)

            BaseOptions = mp.tasks.BaseOptions
            PoseLandmarker = mp.tasks.vision.PoseLandmarker
            PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
            VisionRunningMode = mp.tasks.vision.RunningMode

            options = PoseLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=model_task_path),
                running_mode=VisionRunningMode.IMAGE,
            )
            self._landmarker = PoseLandmarker.create_from_options(options)
        return self._landmarker

    def extract_pose_sequence(self, video_path: str):
        """
        Extracts 3D skeleton keypoint sequence from walking video using MediaPipe Pose:
        1. Reads video frames using OpenCV
        2. Uniformly samples 60 frames across the video
        3. Estimates 33 body landmarks per frame via MediaPipe Pose
        4. Standardizes coordinates with z-score normalization
        Returns tensor of shape (1, 60, 408)
        """
        if not os.path.isfile(video_path):
            raise FileNotFoundError(f"Gait video not found at: {video_path}")

        import cv2
        import numpy as np
        import torch
        import mediapipe as mp

        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            cap.release()
            raise ValueError(f"Could not read frames from video: {video_path}")

        seq_len = 60
        target_features = 408
        frame_indices = np.linspace(0, total_frames - 1, seq_len).astype(int)

        landmarker = self._get_pose_landmarker()
        arr = np.zeros((seq_len, target_features), dtype=np.float32)
        last_valid_vector = np.zeros(target_features, dtype=np.float32)
        detected_count = 0

        # Mapping of MediaPipe 33 landmark indices to standard body keypoint positions
        mp_to_body = {
            0: 0,   # nose
            2: 1,   # left_eye
            5: 2,   # right_eye
            7: 3,   # left_ear
            8: 4,   # right_ear
            11: 5,  # left_shoulder
            12: 6,  # right_shoulder
            13: 7,  # left_elbow
            14: 8,  # right_elbow
            15: 9,  # left_wrist
            16: 10, # right_wrist
            23: 11, # left_hip
            24: 12, # right_hip
            25: 13, # left_knee
            26: 14, # right_knee
            27: 15, # left_ankle
            28: 16, # right_ankle
            31: 20, # left_big_toe
            32: 21, # right_big_toe
            29: 24, # left_heel
            30: 25, # right_heel
        }

        for i, idx in enumerate(frame_indices):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ret, frame = cap.read()
            if not ret or frame is None:
                arr[i] = last_valid_vector
                continue

            h, w = frame.shape[:2]
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            detection_result = landmarker.detect(mp_image)

            if detection_result.pose_landmarks and len(detection_result.pose_landmarks) > 0:
                detected_count += 1
                landmarks = detection_result.pose_landmarks[0]
                frame_vec = np.zeros(target_features, dtype=np.float32)

                # Populate mapped primary body keypoints
                for mp_idx, body_idx in mp_to_body.items():
                    if mp_idx < len(landmarks):
                        lm = landmarks[mp_idx]
                        base = body_idx * 3
                        if base + 2 < target_features:
                            frame_vec[base] = lm.x * w
                            frame_vec[base + 1] = lm.y * h
                            frame_vec[base + 2] = lm.visibility if hasattr(lm, "visibility") else 1.0

                # Also place raw 33 landmarks in upper slots for rich spatial representation
                offset = 26 * 3  # after primary 26 body joints
                for j, lm in enumerate(landmarks[:33]):
                    base = offset + j * 3
                    if base + 2 < target_features:
                        frame_vec[base] = lm.x * w
                        frame_vec[base + 1] = lm.y * h
                        frame_vec[base + 2] = lm.z * w

                last_valid_vector = frame_vec.copy()
                arr[i] = frame_vec
            else:
                arr[i] = last_valid_vector

        cap.release()

        # Z-score standardization across sequence frames
        mean = np.mean(arr, axis=0, keepdims=True)
        std = np.std(arr, axis=0, keepdims=True) + 1e-6
        normalized = (arr - mean) / std

        tensor = torch.tensor(normalized, dtype=torch.float32).unsqueeze(0)
        return tensor, detected_count

    def extract_features(self, video_path: str) -> Any:
        """
        Extracts 128-dimensional kinematic biomarker embedding from gait video.
        Raises RuntimeError if model weights are not loaded.
        """
        if not self.weights_loaded:
            raise RuntimeError(
                f"Gait model weights missing: '{os.path.basename(self.weight_path)}' "
                f"was not found at {self.weight_path}. Model training or checkpoint required."
            )
        import torch
        seq_tensor, _ = self.extract_pose_sequence(video_path)
        with torch.inference_mode():
            embedding = self.model.extract_embedding(seq_tensor)
            return embedding

    def analyze_gait(self, video_path: str) -> Dict[str, Any]:
        """
        Runs complete inference for the gait video modality using MediaPipe Pose + Bi-LSTM.
        Returns predicted label, confidence, 4-class probabilities, and 128-dim embedding.
        """
        if not self.weights_loaded:
            raise RuntimeError("Gait model weights not loaded.")

        import torch
        seq_tensor, detected_count = self.extract_pose_sequence(video_path)
        with torch.inference_mode():
            res = self.model.predict(seq_tensor)
        probs = res["probabilities"][0]
        # Class 0: NORMAL, Class 1: MILD, Class 2: MODERATE, Class 3: SEVERE
        pred_label = res["label"]
        confidence = float(probs[res["predicted_class"]])

        prediction_text = (
            "Normal Gait"
            if pred_label == "NORMAL"
            else f"Parkinsonian Gait ({pred_label.capitalize()})"
        )

        return {
            "modality": "gait",
            "model": "MediaPipe Pose (33 Landmarks) + PyTorch Bi-LSTM Classifier",
            "prediction": prediction_text,
            "label": pred_label,
            "confidence": round(confidence, 4),
            "probabilities": {
                "normal": round(float(probs[0]), 4),
                "mild": round(float(probs[1]), 4),
                "moderate": round(float(probs[2]), 4),
                "severe": round(float(probs[3]), 4),
            },
            "frames_analyzed": 60,
            "poses_detected": detected_count,
            "embedding": res["embedding"][0],
        }
