"""
NeuroNest AI Model Training Pipeline

Trains:
1. Speech: 81 WAV files (HC_AH=0, PD_AH=1) via frozen Wav2Vec2 + PyTorchSpeechModel head.
2. Handwriting: 368 PNGs (SpiralControl=0, SpiralPatients=1) via frozen EfficientNet-B0 + class-weighted PyTorchHandwritingModel head.
3. Gait: 344 JSON sequences (NORMAL=0, MILD=1, MODERATE=2, SEVERE=3) via Bi-LSTM + class-weighted PyTorchGaitLSTM head.

Saves checkpoints into backend/models/weights/.
"""

import os
import glob
import json
import time
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
import torchvision.models as models
from transformers import Wav2Vec2Model

from backend.models.speech_model import PyTorchSpeechModel, SpeechWav2Vec2Classifier
from backend.models.handwriting_model import PyTorchHandwritingModel, HandwritingEfficientNetClassifier
from backend.models.gait_model import PyTorchGaitLSTM, GaitPoseLSTMClassifier

# Determine device
DEVICE = torch.device("cpu")
torch.manual_seed(42)
np.random.seed(42)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEIGHTS_DIR = os.path.join(BASE_DIR, "backend", "models", "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)


# ==============================================================================
# 1. SPEECH MODEL TRAINING
# ==============================================================================
def train_speech():
    print("\n" + "=" * 60)
    print(">>> 1. Training Speech Model (Wav2Vec2 Transfer Learning)")
    print("=" * 60)

    speech_dir = os.path.join(BASE_DIR, "datasets", "speech")
    hc_files = sorted(glob.glob(os.path.join(speech_dir, "HC_AH", "**", "*.wav"), recursive=True))
    pd_files = sorted(glob.glob(os.path.join(speech_dir, "PD_AH", "**", "*.wav"), recursive=True))

    print(f"Discovered {len(hc_files)} HC_AH (label 0) and {len(pd_files)} PD_AH (label 1) files.")
    total_files = len(hc_files) + len(pd_files)
    assert total_files == 81, f"Expected 81 speech files, found {total_files}"

    all_files = [(f, 0) for f in hc_files] + [(f, 1) for f in pd_files]
    cache_path = os.path.join(WEIGHTS_DIR, ".cache_speech_features.pt")

    if os.path.isfile(cache_path):
        print(f"Loading cached speech features from {cache_path}...")
        cached_data = torch.load(cache_path, map_location="cpu")
        X_speech = cached_data["X"]
        y_speech = cached_data["y"]
    else:
        # Load frozen Wav2Vec2 backbone
        print("Loading pretrained Wav2Vec2 backbone (facebook/wav2vec2-base)...")
        wav2vec2 = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base").to(DEVICE)
        wav2vec2.eval()

        import librosa

        features_list = []
        labels_list = []

        print("Extracting acoustic feature embeddings from 81 WAV files...")
        t0 = time.time()
        for idx, (fpath, label) in enumerate(all_files):
            try:
                audio, sr = librosa.load(fpath, sr=16000, mono=True)
                # Limit duration to max 5 seconds for uniform fast processing
                if len(audio) > 16000 * 5:
                    audio = audio[:16000 * 5]
                input_tensor = torch.tensor(audio, dtype=torch.float32).unsqueeze(0).to(DEVICE)

                with torch.no_grad():
                    outputs = wav2vec2(input_tensor)
                    # Mean pool over sequence length: [1, seq_len, 768] -> [768]
                    feat = outputs.last_hidden_state.squeeze(0).mean(dim=0).cpu()
                    features_list.append(feat)
                    labels_list.append(label)
            except Exception as e:
                print(f"Error loading {fpath}: {e}")

        X_speech = torch.stack(features_list)
        y_speech = torch.tensor(labels_list, dtype=torch.long)
        torch.save({"X": X_speech, "y": y_speech}, cache_path)
        print(f"Extracted features shape: {X_speech.shape} in {time.time() - t0:.2f}s")

    # Dataset & DataLoader: 81 / 9 = 9 batches exactly, avoiding batch size = 1 for BatchNorm
    dataset = TensorDataset(X_speech, y_speech)
    loader = DataLoader(dataset, batch_size=9, shuffle=True)

    # Train PyTorchSpeechModel head
    model = PyTorchSpeechModel(input_dim=768, embedding_dim=128, num_classes=2).to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)

    epochs = 20
    print(f"Training classification head for {epochs} epochs...")
    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        correct = 0
        total = 0
        for batch_x, batch_y in loader:
            batch_x, batch_y = batch_x.to(DEVICE), batch_y.to(DEVICE)
            optimizer.zero_grad()
            logits, _ = model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * len(batch_y)
            preds = torch.argmax(logits, dim=1)
            correct += (preds == batch_y).sum().item()
            total += len(batch_y)

        train_loss = total_loss / total
        train_acc = correct / total * 100
        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch {epoch:02d}/{epochs:02d} - Loss: {train_loss:.4f} - Acc: {train_acc:.1f}%")

    weight_path = os.path.join(WEIGHTS_DIR, "speech_wav2vec2.pt")
    checkpoint = {
        "input_dim": 768,
        "embedding_dim": 128,
        "num_classes": 2,
        "model_state_dict": model.state_dict(),
        "num_samples": total_files,
        "labels": {"HC_AH": 0, "PD_AH": 1},
    }
    torch.save(checkpoint, weight_path)
    print(f"Saved speech weights to: {weight_path} ({os.path.getsize(weight_path):,} bytes)")

    # Verify loading
    classifier = SpeechWav2Vec2Classifier(weight_path=weight_path)
    assert classifier.is_loaded, "Speech classifier failed to load!"
    test_pred = classifier.predict(X_speech[0])
    print(f"Speech verification passed: {test_pred['label']} (prob={test_pred['probabilities']})")


# ==============================================================================
# 2. HANDWRITING MODEL TRAINING
# ==============================================================================
def train_handwriting():
    print("\n" + "=" * 60)
    print(">>> 2. Training Handwriting Model (EfficientNet-B0 Transfer Learning)")
    print("=" * 60)

    hw_dir = os.path.join(BASE_DIR, "datasets", "handwriting")
    control_dir = os.path.join(hw_dir, "SpiralControl")
    patient_dir = os.path.join(hw_dir, "SpiralPatients")

    def get_valid_images(folder):
        files = []
        for root, dirs, filenames in os.walk(folder):
            if "__MACOSX" in root:
                continue
            for f in filenames:
                if f.lower().endswith((".png", ".jpg", ".jpeg")) and not f.startswith("._") and not f.startswith("."):
                    files.append(os.path.join(root, f))
        return sorted(files)

    control_files = get_valid_images(control_dir)
    patient_files = get_valid_images(patient_dir)
    print(f"Discovered {len(control_files)} SpiralControl (label 0) and {len(patient_files)} SpiralPatients (label 1) images.")
    total_files = len(control_files) + len(patient_files)
    assert total_files == 368, f"Expected 368 valid images, found {total_files}"

    all_files = [(f, 0) for f in control_files] + [(f, 1) for f in patient_files]
    cache_path = os.path.join(WEIGHTS_DIR, ".cache_handwriting_features.pt")

    if os.path.isfile(cache_path):
        print(f"Loading cached handwriting features from {cache_path}...")
        cached_data = torch.load(cache_path, map_location="cpu")
        X_hw = cached_data["X"]
        y_hw = cached_data["y"]
    else:
        # Pretrained EfficientNet-B0 feature extractor
        print("Loading pretrained EfficientNet-B0 backbone...")
        effnet = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT).to(DEVICE)
        effnet.eval()

        import torchvision.transforms as T
        transform = T.Compose([
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        features_list = []
        labels_list = []

        print("Extracting visual feature embeddings from 368 PNG files...")
        t0 = time.time()
        for fpath, label in all_files:
            try:
                with Image.open(fpath) as img:
                    img_rgb = img.convert("RGB")
                    img_tensor = transform(img_rgb).unsqueeze(0).to(DEVICE)
                    with torch.no_grad():
                        # EfficientNet-B0 penultimate features
                        feats = effnet.features(img_tensor)
                        feats = effnet.avgpool(feats)
                        feats = torch.flatten(feats, 1).squeeze(0).cpu()
                        features_list.append(feats)
                        labels_list.append(label)
            except Exception as e:
                print(f"Error loading {fpath}: {e}")

        X_hw = torch.stack(features_list)
        y_hw = torch.tensor(labels_list, dtype=torch.long)
        torch.save({"X": X_hw, "y": y_hw}, cache_path)
        print(f"Extracted features shape: {X_hw.shape} in {time.time() - t0:.2f}s")

    # Class weights for imbalance: N_0=72, N_1=296
    n0, n1 = len(control_files), len(patient_files)
    w0 = total_files / (2.0 * n0)
    w1 = total_files / (2.0 * n1)
    class_weights = torch.tensor([w0, w1], dtype=torch.float32).to(DEVICE)
    print(f"Class weights (imbalance handling): Control (0) = {w0:.3f}, Patients (1) = {w1:.3f}")

    dataset = TensorDataset(X_hw, y_hw)
    loader = DataLoader(dataset, batch_size=32, shuffle=True)

    model = PyTorchHandwritingModel(backbone_dim=1280, embedding_dim=128, num_classes=2).to(DEVICE)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)

    epochs = 25
    print(f"Training classification head for {epochs} epochs...")
    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        correct = 0
        total = 0
        for batch_x, batch_y in loader:
            batch_x, batch_y = batch_x.to(DEVICE), batch_y.to(DEVICE)
            optimizer.zero_grad()
            logits, _ = model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * len(batch_y)
            preds = torch.argmax(logits, dim=1)
            correct += (preds == batch_y).sum().item()
            total += len(batch_y)

        train_loss = total_loss / total
        train_acc = correct / total * 100
        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch {epoch:02d}/{epochs:02d} - Loss: {train_loss:.4f} - Acc: {train_acc:.1f}%")

    weight_path = os.path.join(WEIGHTS_DIR, "handwriting_efficientnet_b0.pt")
    checkpoint = {
        "backbone_dim": 1280,
        "embedding_dim": 128,
        "num_classes": 2,
        "model_state_dict": model.state_dict(),
        "num_samples": total_files,
        "class_weights": [w0, w1],
        "labels": {"SpiralControl": 0, "SpiralPatients": 1},
    }
    torch.save(checkpoint, weight_path)
    print(f"Saved handwriting weights to: {weight_path} ({os.path.getsize(weight_path):,} bytes)")

    # Verify loading
    classifier = HandwritingEfficientNetClassifier(weight_path=weight_path)
    assert classifier.is_loaded, "Handwriting classifier failed to load!"
    test_pred = classifier.predict(X_hw[0])
    print(f"Handwriting verification passed: {test_pred['label']} (prob={test_pred['probabilities']})")


# ==============================================================================
# 3. GAIT MODEL TRAINING
# ==============================================================================
def train_gait():
    print("\n" + "=" * 60)
    print(">>> 3. Training Gait Model (MediaPipe Pose Sequences + Bi-LSTM)")
    print("=" * 60)

    gait_base = os.path.join(BASE_DIR, "datasets", "gait video")

    # 4 classes: NORMAL=0 (150), MILD=1 (81), MODERATE=2 (61), SEVERE=3 (52) -> Total: 344
    normal_files = sorted(glob.glob(os.path.join(gait_base, "NORMAL-20230607T012037Z-001", "**", "*.json"), recursive=True))
    mild_files = sorted(glob.glob(os.path.join(gait_base, "MILD-20230607T012016Z-001", "**", "*.json"), recursive=True))
    moderate_files = sorted(glob.glob(os.path.join(gait_base, "MODERATE-20230607T012020Z-001", "**", "*.json"), recursive=True))
    severe_files = sorted(glob.glob(os.path.join(gait_base, "SEVERE-20230607T012047Z-001", "SEVERE", "*.json")))

    categories = [
        ("NORMAL", normal_files, 0),
        ("MILD", mild_files, 1),
        ("MODERATE", moderate_files, 2),
        ("SEVERE", severe_files, 3),
    ]

    all_files = []
    class_counts = {}
    for cat_name, file_list, label_idx in categories:
        class_counts[cat_name] = len(file_list)
        print(f"Discovered {len(file_list)} {cat_name} (label {label_idx}) files.")
        for f in file_list:
            all_files.append((f, label_idx))

    total_files = len(all_files)
    print(f"Total labeled pose sequences: {total_files}")
    assert total_files == 344, f"Expected 344 gait sequences, found {total_files}"

    # Target sequence length
    SEQ_LEN = 60
    INPUT_FEATURES = 408

    cache_path = os.path.join(WEIGHTS_DIR, ".cache_gait_sequences.pt")

    if os.path.isfile(cache_path):
        print(f"Loading cached gait sequences from {cache_path}...")
        cached_data = torch.load(cache_path, map_location="cpu")
        X_gait = cached_data["X"]
        y_gait = cached_data["y"]
    else:
        sequences_list = []
        labels_list = []

        print(f"Parsing and standardizing {total_files} JSON keypoint sequences (seq_len={SEQ_LEN}, features={INPUT_FEATURES})...")
        t0 = time.time()
        for fpath, label in all_files:
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)

                frames_kp = []
                for frame in data:
                    if isinstance(frame, dict) and "keypoints" in frame:
                        kp = frame["keypoints"]
                        if len(kp) == INPUT_FEATURES:
                            frames_kp.append(kp)

                if len(frames_kp) == 0:
                    continue

                arr = np.array(frames_kp, dtype=np.float32)

                # Uniform temporal sampling to exactly SEQ_LEN frames
                indices = np.linspace(0, len(arr) - 1, SEQ_LEN).astype(int)
                sample_seq = arr[indices]

                # Sequence-level standardization (z-score normalization)
                mean = np.mean(sample_seq, axis=0, keepdims=True)
                std = np.std(sample_seq, axis=0, keepdims=True) + 1e-6
                sample_seq = (sample_seq - mean) / std

                sequences_list.append(torch.tensor(sample_seq, dtype=torch.float32))
                labels_list.append(label)
            except Exception as e:
                print(f"Error parsing {fpath}: {e}")

        X_gait = torch.stack(sequences_list)
        y_gait = torch.tensor(labels_list, dtype=torch.long)
        torch.save({"X": X_gait, "y": y_gait}, cache_path)
        print(f"Standardized gait dataset shape: {X_gait.shape} in {time.time() - t0:.2f}s")

    # Compute class weights for 4 classes
    class_weights = []
    for cat_name, _, idx in categories:
        cnt = class_counts[cat_name]
        w = total_files / (4.0 * cnt)
        class_weights.append(w)
        print(f"Class weight {cat_name} ({idx}): count={cnt}, weight={w:.3f}")
    weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(DEVICE)

    dataset = TensorDataset(X_gait, y_gait)
    loader = DataLoader(dataset, batch_size=32, shuffle=True)

    model = PyTorchGaitLSTM(
        input_features=INPUT_FEATURES,
        hidden_size=64,
        num_layers=2,
        embedding_dim=128,
        num_classes=4,
        dropout=0.3,
    ).to(DEVICE)

    criterion = nn.CrossEntropyLoss(weight=weights_tensor)
    optimizer = torch.optim.Adam(model.parameters(), lr=2e-3, weight_decay=1e-4)

    epochs = 20
    print(f"Training Gait Bi-LSTM for {epochs} epochs...")
    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        correct = 0
        total = 0
        for batch_x, batch_y in loader:
            batch_x, batch_y = batch_x.to(DEVICE), batch_y.to(DEVICE)
            optimizer.zero_grad()
            logits, _ = model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * len(batch_y)
            preds = torch.argmax(logits, dim=1)
            correct += (preds == batch_y).sum().item()
            total += len(batch_y)

        train_loss = total_loss / total
        train_acc = correct / total * 100
        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch {epoch:02d}/{epochs:02d} - Loss: {train_loss:.4f} - Acc: {train_acc:.1f}%")

    weight_path = os.path.join(WEIGHTS_DIR, "gait_lstm.pt")
    checkpoint = {
        "input_features": INPUT_FEATURES,
        "hidden_size": 64,
        "num_layers": 2,
        "embedding_dim": 128,
        "num_classes": 4,
        "model_state_dict": model.state_dict(),
        "num_samples": total_files,
        "class_weights": class_weights,
        "labels": {"NORMAL": 0, "MILD": 1, "MODERATE": 2, "SEVERE": 3},
    }
    torch.save(checkpoint, weight_path)
    print(f"Saved gait weights to: {weight_path} ({os.path.getsize(weight_path):,} bytes)")

    # Verify loading
    classifier = GaitPoseLSTMClassifier(weight_path=weight_path)
    assert classifier.is_loaded, "Gait classifier failed to load!"
    test_pred = classifier.predict(X_gait[0])
    print(f"Gait verification passed: {test_pred['label']} (prob={test_pred['probabilities']})")


# ==============================================================================
# MAIN RUNNER
# ==============================================================================
if __name__ == "__main__":
    t_start = time.time()
    train_speech()
    train_handwriting()
    train_gait()
    print("\n" + "=" * 60)
    print(f"ALL 3 MODELS SUCCESSFULLY TRAINED AND VERIFIED IN {time.time() - t_start:.2f}s")
    print("=" * 60)
