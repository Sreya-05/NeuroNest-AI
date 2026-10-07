import { getAuthSession } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export interface DoctorInfo {
  id: number;
  name: string;
  email: string;
  referral_code: string;
  created_at: string;
}

export interface PatientLatestScreening {
  id: number;
  timestamp: string;
  composite_prediction: string;
  composite_classification: string;
  risk_score: number;
  confidence: number;
  positive_modalities_count: number;
  modality_concordance: string;
  summary: string;
}

export interface AppointmentRecord {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  doctor_id: number;
  doctor_name: string;
  doctor_email: string;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  doctor_note: string | null;
  created_at: string;
  updated_at: string;
  patient_latest_screening?: PatientLatestScreening | null;
}

export interface CreateAppointmentPayload {
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  reason?: string;
}

function getAuthorizationHeader(customToken?: string): Record<string, string> {
  const token = customToken || getAuthSession()?.token;
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchDoctors(customToken?: string): Promise<DoctorInfo[]> {
  const response = await fetch(`${API_BASE_URL}/api/doctors`, {
    method: 'GET',
    headers: {
      ...getAuthorizationHeader(customToken),
    },
  });

  if (!response.ok) {
    let errorMsg = `Failed to fetch doctors (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.doctors || [];
}

export async function createAppointment(
  payload: CreateAppointmentPayload,
  customToken?: string
): Promise<AppointmentRecord> {
  const response = await fetch(`${API_BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(customToken),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = `Failed to create appointment (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.appointment;
}

export async function fetchPatientAppointments(
  customToken?: string
): Promise<AppointmentRecord[]> {
  const response = await fetch(`${API_BASE_URL}/api/patient/appointments`, {
    method: 'GET',
    headers: {
      ...getAuthorizationHeader(customToken),
    },
  });

  if (!response.ok) {
    let errorMsg = `Failed to fetch appointments (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.appointments || [];
}

export async function fetchDoctorAppointments(
  customToken?: string
): Promise<AppointmentRecord[]> {
  const response = await fetch(`${API_BASE_URL}/api/doctor/appointments`, {
    method: 'GET',
    headers: {
      ...getAuthorizationHeader(customToken),
    },
  });

  if (!response.ok) {
    let errorMsg = `Failed to fetch doctor appointments (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.appointments || [];
}

export async function updateAppointmentStatus(
  appointmentId: number,
  status: 'accepted' | 'rejected',
  doctorNote?: string,
  customToken?: string
): Promise<AppointmentRecord> {
  const response = await fetch(
    `${API_BASE_URL}/api/doctor/appointments/${appointmentId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthorizationHeader(customToken),
      },
      body: JSON.stringify({
        status,
        doctor_note: doctorNote || null,
      }),
    }
  );

  if (!response.ok) {
    let errorMsg = `Failed to update appointment status (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.appointment;
}
