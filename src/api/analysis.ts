const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export interface SpeechAttributionPoint {
  time_sec: number;
  attribution: number;
  amplitude: number;
}

export interface SpeechAttributionResult {
  available: boolean;
  method?: string;
  target_layer?: string;
  target_class?: number;
  target_class_label?: string;
  target_class_name?: string;
  duration_seconds?: number;
  frame_count?: number;
  time_step_ms?: number;
  peak_attribution_time?: number;
  mean_attribution?: number;
  max_attribution?: number;
  timeline?: SpeechAttributionPoint[];
  explanation_title?: string;
  explanation_summary?: string;
  disclaimer?: string;
  error?: string;
}

export interface SpeechAnalysisResult {
  modality: 'speech';
  model: string;
  prediction: string;
  label: string;
  confidence: number;
  probabilities: {
    healthy_control: number;
    parkinsons: number;
  };
  attribution?: SpeechAttributionResult;
}

export interface GradCamResult {
  available: boolean;
  target_layer?: string;
  target_class?: number;
  target_class_label?: string;
  target_class_name?: string;
  original_image?: string;
  heatmap_image?: string;
  overlay_image?: string;
  max_activation?: number;
  mean_activation?: number;
  explanation_title?: string;
  explanation_summary?: string;
  disclaimer?: string;
  error?: string;
}

export interface HandwritingAnalysisResult {
  modality: 'handwriting';
  model: string;
  prediction: string;
  label: string;
  confidence: number;
  probabilities: {
    control: number;
    parkinsons: number;
  };
  gradcam?: GradCamResult;
}

export interface GaitAnalysisResult {
  modality: 'gait';
  model: string;
  prediction: string;
  label: string;
  confidence: number;
  probabilities: {
    normal: number;
    mild: number;
    moderate: number;
    severe: number;
  };
  frames_analyzed?: number;
  poses_detected?: number;
}

export interface CombinedResult {
  prediction: string;
  classification: string;
  risk_score: number;
  confidence: number;
  probabilities: {
    low_risk: number;
    elevated_risk: number;
  };
  positive_modalities_count?: number;
  total_modalities_count?: number;
  aggregation_type?: string;
  modalities_evaluated: string[];
  summary: string;
  raw_fusion_model?: {
    predicted_class: number;
    raw_softmax_confidence: number;
    raw_probabilities: {
      low_risk: number;
      elevated_risk: number;
    };
    note?: string;
  };
}

export interface MultimodalAnalysisResponse {
  status: string;
  modalities: {
    speech: SpeechAnalysisResult;
    handwriting: HandwritingAnalysisResult;
    gait: GaitAnalysisResult;
  };
  combined_result: CombinedResult;
  feature_dimensions?: {
    speech: number;
    handwriting: number;
    gait: number;
    fusion_total: number;
  };
}

export interface MultimodalAnalysisRequest {
  speech_filename: string;
  handwriting_filename: string;
  gait_filename: string;
}

export async function runMultimodalAnalysis(
  req: MultimodalAnalysisRequest
): Promise<MultimodalAnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analyze/multimodal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    let message = `Multimodal analysis failed (HTTP ${response.status})`;
    try {
      const data = await response.json();
      if (data && typeof data === "object" && "detail" in data && typeof data.detail === "string") {
        message = data.detail;
      }
    } catch {
      /* use default message */
    }
    throw new Error(message);
  }

  return response.json();
}
