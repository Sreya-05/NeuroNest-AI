import type { MultimodalAnalysisResponse } from './analysis';
import { getAuthSession } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export interface ScreeningRecord {
  id: number;
  patient_id: number;
  patient_email: string;
  patient_name: string;
  timestamp: string;
  speech_prediction: string;
  speech_confidence: number;
  handwriting_prediction: string;
  handwriting_confidence: number;
  gait_prediction: string;
  gait_confidence: number;
  composite_prediction: string;
  composite_classification: string;
  risk_score: number;
  confidence: number;
  positive_modalities_count: number;
  total_modalities_count: number;
  modality_concordance: string;
  summary: string;
  raw_details?: MultimodalAnalysisResponse;
}

export interface DoctorPatient {
  id: number;
  name: string;
  email: string;
  role: 'Patient';
  doctor_email: string | null;
  created_at: string;
  latest_screening: {
    id: number;
    timestamp: string;
    composite_prediction: string;
    composite_classification: string;
    risk_score: number;
    confidence: number;
    positive_modalities_count: number;
    modality_concordance: string;
    summary: string;
  } | null;
  screening_count: number;
}

function getAuthorizationHeader(customToken?: string): Record<string, string> {
  const token = customToken || getAuthSession()?.token;
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function saveScreeningRecord(
  data: MultimodalAnalysisResponse,
  customToken?: string
): Promise<{ status: string; screening: ScreeningRecord }> {
  const response = await fetch(`${API_BASE_URL}/api/screenings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(customToken),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMsg = `Failed to save screening (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function fetchPatientScreenings(
  customToken?: string
): Promise<ScreeningRecord[]> {
  const response = await fetch(`${API_BASE_URL}/api/patient/screenings`, {
    method: 'GET',
    headers: {
      ...getAuthorizationHeader(customToken),
    },
  });

  if (!response.ok) {
    let errorMsg = `Failed to fetch screening history (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.screenings || [];
}

export async function fetchDoctorPatients(
  customToken?: string
): Promise<DoctorPatient[]> {
  const response = await fetch(`${API_BASE_URL}/api/doctor/patients`, {
    method: 'GET',
    headers: {
      ...getAuthorizationHeader(customToken),
    },
  });

  if (!response.ok) {
    let errorMsg = `Failed to fetch doctor patients (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.patients || [];
}

export async function fetchDoctorPatientScreenings(
  patientEmail: string,
  customToken?: string
): Promise<ScreeningRecord[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/doctor/patients/${encodeURIComponent(patientEmail)}/screenings`,
    {
      method: 'GET',
      headers: {
        ...getAuthorizationHeader(customToken),
      },
    }
  );

  if (!response.ok) {
    let errorMsg = `Failed to fetch patient history (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.screenings || [];
}

export async function associatePatient(
  patientEmail: string,
  customToken?: string
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/doctor/associate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(customToken),
    },
    body: JSON.stringify({ patient_email: patientEmail }),
  });

  if (!response.ok) {
    let errorMsg = `Failed to associate patient (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
