import type { MultimodalAnalysisResponse } from '../api/analysis';

export interface ModalityUploadInfo {
  uploaded: boolean;
  filename?: string;
  savedFilename?: string;
  timestamp?: number;
}

export interface ScreeningUploadState {
  speech: ModalityUploadInfo;
  handwriting: ModalityUploadInfo;
  gait: ModalityUploadInfo;
}

const STORAGE_KEY = 'neuro_nest_screening_state';
const ANALYSIS_STORAGE_KEY = 'neuro_nest_analysis_result';

export function getScreeningState(): ScreeningUploadState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        speech: parsed.speech || { uploaded: false },
        handwriting: parsed.handwriting || { uploaded: false },
        gait: parsed.gait || { uploaded: false },
      };
    }
  } catch (e) {
    console.error('Failed to read screening state from sessionStorage:', e);
  }
  return {
    speech: { uploaded: false },
    handwriting: { uploaded: false },
    gait: { uploaded: false },
  };
}

export function setModalityUploaded(
  modality: 'speech' | 'handwriting' | 'gait',
  filename: string,
  savedFilename?: string
): void {
  try {
    const current = getScreeningState();
    current[modality] = {
      uploaded: true,
      filename,
      savedFilename: savedFilename || filename,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    // When a modality is updated/uploaded, clear any obsolete analysis result
    clearAnalysisResult();
  } catch (e) {
    console.error(`Failed to save ${modality} upload state:`, e);
  }
}

export function clearModalityUploaded(
  modality: 'speech' | 'handwriting' | 'gait'
): void {
  try {
    const current = getScreeningState();
    current[modality] = { uploaded: false };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    clearAnalysisResult();
  } catch (e) {
    console.error(`Failed to clear ${modality} upload state:`, e);
  }
}

export function getAnalysisResult(): MultimodalAnalysisResponse | null {
  try {
    const raw = sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read analysis result from sessionStorage:', e);
  }
  return null;
}

export function setAnalysisResult(result: MultimodalAnalysisResponse): void {
  try {
    sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(result));
  } catch (e) {
    console.error('Failed to save analysis result to sessionStorage:', e);
  }
}

export function clearAnalysisResult(): void {
  try {
    sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear analysis result:', e);
  }
}

export function resetAllScreeningState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset screening state:', e);
  }
}
