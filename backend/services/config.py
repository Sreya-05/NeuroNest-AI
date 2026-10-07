import os
from typing import Dict, Any

# Root paths
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

# Upload directory
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads")
SPEECH_UPLOADS = os.path.join(UPLOADS_DIR, "speech")
HANDWRITING_UPLOADS = os.path.join(UPLOADS_DIR, "handwriting")
GAIT_UPLOADS = os.path.join(UPLOADS_DIR, "gait")

# Models and checkpoints directory
MODELS_DIR = os.path.join(BACKEND_DIR, "models")
WEIGHTS_DIR = os.path.join(MODELS_DIR, "weights")

# Datasets directory in project root
DATASETS_DIR = os.path.join(PROJECT_ROOT, "datasets")
DATASET_SPEECH_DIR = os.path.join(DATASETS_DIR, "speech")
DATASET_HANDWRITING_DIR = os.path.join(DATASETS_DIR, "handwriting")
DATASET_GAIT_DIR = os.path.join(DATASETS_DIR, "gait video")

# Expected model weight filenames
WEIGHT_FILES = {
    "speech": "speech_wav2vec2.pt",
    "handwriting": "handwriting_efficientnet_b0.pt",
    "gait": "gait_lstm.pt",
    "fusion": "multimodal_fusion.pt",
}

# Embedding dimensions for feature-level fusion
FEATURE_DIMS = {
    "speech": 128,        # Wav2Vec2 feature projection dimension
    "handwriting": 128,   # EfficientNet-B0 projection dimension
    "gait": 128,          # Bi-LSTM hidden state projection dimension
    "fusion_total": 384,  # Concatenated feature dimension (128 * 3)
}

# Audio preprocessing parameters
SPEECH_PARAMS = {
    "target_sample_rate": 16000,
    "max_duration_seconds": 10.0,
    "mono": True,
}

# Handwriting preprocessing parameters
HANDWRITING_PARAMS = {
    "image_size": (224, 224),
    "mean": [0.485, 0.456, 0.406],
    "std": [0.229, 0.224, 0.225],
}

# Gait preprocessing parameters
GAIT_PARAMS = {
    "num_pose_landmarks": 33,
    "coords_per_landmark": 3,  # x, y, z
    "input_features_per_frame": 99,  # 33 * 3
    "target_fps": 30,
    "max_sequence_length": 150,  # 5 seconds of walking at 30 fps
}

def get_weight_path(modality: str) -> str:
    filename = WEIGHT_FILES.get(modality, f"{modality}.pt")
    return os.path.join(WEIGHTS_DIR, filename)

def check_weights_availability() -> Dict[str, Dict[str, Any]]:
    """Checks for the existence of trained model weight files on disk."""
    availability = {}
    for modality, filename in WEIGHT_FILES.items():
        path = os.path.join(WEIGHTS_DIR, filename)
        exists = os.path.isfile(path)
        availability[modality] = {
            "expected_file": filename,
            "path": path,
            "exists": exists,
            "size_bytes": os.path.getsize(path) if exists else 0,
        }
    return availability

def check_dependencies() -> Dict[str, bool]:
    """Checks whether machine learning libraries are installed in the python environment."""
    deps = {}
    for pkg in ["torch", "torchvision", "torchaudio", "transformers", "mediapipe", "cv2", "librosa", "numpy"]:
        try:
            __import__(pkg)
            deps[pkg] = True
        except ImportError:
            deps[pkg] = False
    return deps

def check_datasets_availability() -> Dict[str, Dict[str, Any]]:
    """Inspects the local datasets directory structure."""
    return {
        "speech": {
            "path": DATASET_SPEECH_DIR,
            "exists": os.path.isdir(DATASET_SPEECH_DIR),
        },
        "handwriting": {
            "path": DATASET_HANDWRITING_DIR,
            "exists": os.path.isdir(DATASET_HANDWRITING_DIR),
        },
        "gait": {
            "path": DATASET_GAIT_DIR,
            "exists": os.path.isdir(DATASET_GAIT_DIR),
        },
    }
