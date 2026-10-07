const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export type UserRole = 'Patient' | 'Doctor';

export interface RegisteredUser {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  doctorEmail?: string | null;
  referralCode?: string | null;
  registeredAt: number;
}

export interface AuthSession {
  name: string;
  email: string;
  role: UserRole;
  loginTime: number;
  token?: string;
  doctorEmail?: string | null;
  referralCode?: string | null;
}

const USERS_STORAGE_KEY = 'neuro_nest_registered_users';
const SESSION_STORAGE_KEY = 'neuro_nest_active_session';

export function getRegisteredUsers(): RegisteredUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read registered users from localStorage:', e);
  }
  return [];
}

export async function registerUser(userData: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  doctorReferralCode?: string;
}): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = userData.email.trim().toLowerCase();
  const trimmedName = userData.name.trim();

  if (!trimmedName) {
    return { success: false, error: 'Full name is required.' };
  }
  if (!normalizedEmail) {
    return { success: false, error: 'Email address is required.' };
  }
  if (!userData.password || userData.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmedName,
        email: normalizedEmail,
        password: userData.password,
        role: userData.role,
        doctor_referral_code: userData.doctorReferralCode?.trim() || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Registration failed. Please verify your details.',
      };
    }

    // Keep localStorage in sync for offline cache
    const users = getRegisteredUsers().filter((u) => u.email.toLowerCase() !== normalizedEmail);
    users.push({
      name: trimmedName,
      email: normalizedEmail,
      role: userData.role,
      doctorEmail: data.user?.doctor_email || null,
      referralCode: data.user?.referral_code || null,
      registeredAt: Date.now(),
    });
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    return { success: true };
  } catch (e) {
    console.error('Registration network error:', e);
    return {
      success: false,
      error: 'Unable to connect to authentication server. Please check your backend connection.',
    };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return { success: false, error: 'Please enter your email address.' };
  }
  if (!password) {
    return { success: false, error: 'Please enter your password.' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password: password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Incorrect email or password. Please verify your credentials.',
      };
    }

    const session: AuthSession = {
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      loginTime: Date.now(),
      token: data.token,
      doctorEmail: data.user.doctor_email || null,
      referralCode: data.user.referral_code || null,
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return { success: true, session };
  } catch (e) {
    console.error('Login network error:', e);
    return {
      success: false,
      error: 'Unable to connect to authentication server. Please verify the backend is running.',
    };
  }
}

export function getAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AuthSession;
    }
  } catch (e) {
    console.error('Failed to read auth session from localStorage:', e);
  }
  return null;
}

export function logoutUser(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to remove auth session from localStorage:', e);
  }
}

export function isAuthenticated(): boolean {
  return getAuthSession() !== null;
}
