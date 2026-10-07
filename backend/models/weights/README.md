# NeuroNest AI Model Weights Directory

This directory stores the trained PyTorch checkpoint weights for the multimodal Parkinson's detection models.

## Expected Weight Files

| Modality | Architecture | Target File | Input Specification | Output Embedding |
| :--- | :--- | :--- | :--- | :--- |
| **Speech** | Wav2Vec2 (`facebook/wav2vec2-base` + Classifier) | `speech_wav2vec2.pt` | 16kHz mono audio waveform | 128-dim acoustic embedding |
| **Handwriting** | EfficientNet-B0 + Classifier | `handwriting_efficientnet_b0.pt` | 224x224 RGB image | 128-dim motor embedding |
| **Gait** | MediaPipe Pose (33 landmarks) + Bi-LSTM | `gait_lstm.pt` | (batch, seq_len, 99) pose coordinates | 128-dim kinematic embedding |
| **Fusion** | Feature-level Concatenation + Dense Network | `multimodal_fusion.pt` | 384-dim concatenated embedding | 2-dim classification logits |

## Status

When weights are placed in this directory, the backend inference services will automatically detect and load them. If any weight file is missing, the backend will reject inference requests with a 503 status code indicating which checkpoint must be trained or provided.
