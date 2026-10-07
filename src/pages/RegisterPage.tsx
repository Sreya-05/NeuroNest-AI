import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, type UserRole } from '../utils/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Patient');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [doctorReferralCode, setDoctorReferralCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirm) {
      newErrors.confirm = 'Please confirm your password';
    } else if (password !== confirm) {
      newErrors.confirm = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (validateForm()) {
      setSubmitting(true);
      try {
        const result = await registerUser({
          name,
          email,
          password,
          role,
          doctorReferralCode: role === 'Patient' ? doctorReferralCode : undefined,
        });

        if (!result.success) {
          setGeneralError(result.error || 'Registration failed');
          return;
        }

        // Successful registration: Redirect to login with prefilled email and success feedback
        navigate('/login', {
          state: {
            registeredEmail: email.trim().toLowerCase(),
            message: 'Account created successfully! Please sign in with your credentials.',
          },
        });
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-primary">
            <svg className="w-8 h-8 text-secondary" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
              <path d="M16 8V24M8 16H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            NeuroNest AI
          </Link>
          <p className="mt-4 text-gray-600">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {generalError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <svg className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.name
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary focus:ring-primary'
                } focus:ring-2 focus:ring-offset-0 focus:outline-none`}
                placeholder="Dr. Sarah Mitchell or Alex Morgan"
                aria-invalid={errors.name ? 'true' : 'false'}
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.email
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary focus:ring-primary'
                } focus:ring-2 focus:ring-offset-0 focus:outline-none`}
                placeholder="you@example.com"
                aria-invalid={errors.email ? 'true' : 'false'}
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Role Selection (Patient / Doctor) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('Patient')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col items-start gap-1 cursor-pointer ${
                    role === 'Patient'
                      ? 'border-primary bg-sky-50/70 text-slate-900 ring-2 ring-primary/20'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      role === 'Patient' ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                    }`}>
                      {role === 'Patient' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="font-semibold text-sm">Patient</span>
                  </div>
                  <span className="text-xs text-gray-500">Self-assessment & screening</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('Doctor')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col items-start gap-1 cursor-pointer ${
                    role === 'Doctor'
                      ? 'border-primary bg-sky-50/70 text-slate-900 ring-2 ring-primary/20'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      role === 'Doctor' ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                    }`}>
                      {role === 'Doctor' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="font-semibold text-sm">Doctor</span>
                  </div>
                  <span className="text-xs text-gray-500">Clinician & review portal</span>
                </button>
              </div>
            </div>

            {/* Clinician Referral Code (Optional for Patients) */}
            {role === 'Patient' && (
              <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="referral" className="block text-xs font-semibold text-slate-700">
                    Clinician Referral Code (Optional)
                  </label>
                  <span className="text-[10px] text-sky-700 font-medium bg-sky-100/60 px-2 py-0.5 rounded">
                    Doctor Portal Link
                  </span>
                </div>
                <input
                  id="referral"
                  type="text"
                  value={doctorReferralCode}
                  onChange={(e) => setDoctorReferralCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none uppercase font-mono"
                  placeholder="e.g. REF-DRSMITH"
                />
                <p className="text-[11px] text-slate-500">
                  If provided by your doctor, your completed screening assessments will securely link to their clinical review dashboard.
                </p>
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors pr-12 ${
                    errors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary focus:ring-primary'
                  } focus:ring-2 focus:ring-offset-0 focus:outline-none`}
                  placeholder="At least 6 characters"
                  aria-invalid={errors.password ? 'true' : 'false'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.confirm
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary focus:ring-primary'
                } focus:ring-2 focus:ring-offset-0 focus:outline-none`}
                placeholder="Re-enter password"
                aria-invalid={errors.confirm ? 'true' : 'false'}
              />
              {errors.confirm && (
                <p className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.confirm}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By registering, you agree to our{' '}
          <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
