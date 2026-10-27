import type { MultimodalAnalysisResponse } from '../api/analysis';
import { getAuthSession } from './auth';

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

/**
 * Derives a user-specific storage key to isolate screening state per patient.
 * Ensures new users start with an empty assessment and prevents cross-user leakage.
 */
function getUserStorageKey(baseKey: string): string {
  const session = getAuthSession();
  if (session?.email) {
    const normalized = session.email.trim().toLowerCase();
    return `${baseKey}_${normalized}`;
  }
  return `${baseKey}_anonymous`;
}

export function getScreeningState(): ScreeningUploadState {
  try {
    const key = getUserStorageKey('neuro_nest_screening_state');
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        speech: parsed.speech || { uploaded: false },
        handwriting: parsed.handwriting || { uploaded: false },
        gait: parsed.gait || { uploaded: false },
      };
    }
  } catch (e) {
    console.error('Failed to read screening state:', e);
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
    const key = getUserStorageKey('neuro_nest_screening_state');
    const val = JSON.stringify(current);
    sessionStorage.setItem(key, val);
    localStorage.setItem(key, val);
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
    const key = getUserStorageKey('neuro_nest_screening_state');
    const val = JSON.stringify(current);
    sessionStorage.setItem(key, val);
    localStorage.setItem(key, val);
    clearAnalysisResult();
  } catch (e) {
    console.error(`Failed to clear ${modality} upload state:`, e);
  }
}

export function getAnalysisResult(): MultimodalAnalysisResponse | null {
  try {
    const key = getUserStorageKey('neuro_nest_analysis_result');
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read analysis result:', e);
  }
  return null;
}

export function setAnalysisResult(result: MultimodalAnalysisResponse): void {
  try {
    const key = getUserStorageKey('neuro_nest_analysis_result');
    const val = JSON.stringify(result);
    sessionStorage.setItem(key, val);
    localStorage.setItem(key, val);
  } catch (e) {
    console.error('Failed to save analysis result:', e);
  }
}

export function clearAnalysisResult(): void {
  try {
    const key = getUserStorageKey('neuro_nest_analysis_result');
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
    sessionStorage.removeItem('neuro_nest_analysis_result');
    localStorage.removeItem('neuro_nest_analysis_result');
  } catch (e) {
    console.error('Failed to clear analysis result:', e);
  }
}

export function resetAllScreeningState(): void {
  try {
    const screenKey = getUserStorageKey('neuro_nest_screening_state');
    const analysisKey = getUserStorageKey('neuro_nest_analysis_result');
    sessionStorage.removeItem(screenKey);
    localStorage.removeItem(screenKey);
    sessionStorage.removeItem(analysisKey);
    localStorage.removeItem(analysisKey);

    // Also remove legacy static keys if present
    sessionStorage.removeItem('neuro_nest_screening_state');
    localStorage.removeItem('neuro_nest_screening_state');
    sessionStorage.removeItem('neuro_nest_analysis_result');
    localStorage.removeItem('neuro_nest_analysis_result');
  } catch (e) {
    console.error('Failed to reset screening state:', e);
  }
}
