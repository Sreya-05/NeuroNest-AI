import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuthSession, logoutUser, type AuthSession } from '../utils/auth';
import {
  fetchDoctorPatients,
  fetchDoctorPatientScreenings,
  associatePatient,
  type DoctorPatient,
  type ScreeningRecord,
} from '../api/screenings';
import {
  fetchDoctorAppointments,
  updateAppointmentStatus,
  type AppointmentRecord,
} from '../api/appointments';

export default function DoctorDashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected patient for viewing screening history
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatient | null>(null);
  const [patientHistory, setPatientHistory] = useState<ScreeningRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expandedScreeningId, setExpandedScreeningId] = useState<number | null>(null);

  // Quick link patient by email
  const [associateEmail, setAssociateEmail] = useState('');
  const [associating, setAssociating] = useState(false);
  const [associateMsg, setAssociateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Doctor Appointments state
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState<boolean>(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [notePromptId, setNotePromptId] = useState<number | null>(null);
  const [responseNote, setResponseNote] = useState<string>('');

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDoctorPatients();
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve patient list.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    setAppointmentsError(null);
    try {
      const data = await fetchDoctorAppointments();
      setAppointments(data);
    } catch (err) {
      setAppointmentsError(
        err instanceof Error ? err.message : 'Failed to retrieve appointments.'
      );
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    const currentSession = getAuthSession();
    // Block dashboard access when not logged in
    if (!currentSession) {
      navigate('/login');
      return;
    }
    // Route Patient to Patient Dashboard
    if (currentSession.role === 'Patient') {
      navigate('/dashboard');
      return;
    }
    setSession(currentSession);
    loadPatients();
    loadAppointments();
  }, [navigate, loadPatients, loadAppointments]);

  const handleStatusChange = async (
    appointmentId: number,
    status: 'accepted' | 'rejected',
    note?: string
  ) => {
    setUpdatingId(appointmentId);
    try {
      const updated = await updateAppointmentStatus(appointmentId, status, note);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? updated : a))
      );
      setNotePromptId(null);
      setResponseNote('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update appointment status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const clinicianRef = session?.referralCode
    ? session.referralCode
    : session?.email
    ? `REF-${session.email.split('@')[0].toUpperCase().slice(0, 8)}`
    : 'REF-CLINICIAN';

  const handleSelectPatient = async (patient: DoctorPatient) => {
    setSelectedPatient(patient);
    setLoadingHistory(true);
    setHistoryError(null);
    setPatientHistory([]);
    setExpandedScreeningId(null);

    try {
      const history = await fetchDoctorPatientScreenings(patient.email);
      setPatientHistory(history);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to retrieve patient screening history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAssociatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!associateEmail.trim()) return;

    setAssociating(true);
    setAssociateMsg(null);

    try {
      const res = await associatePatient(associateEmail.trim());
      setAssociateMsg({ type: 'success', text: res.message || 'Patient successfully linked!' });
      setAssociateEmail('');
      await loadPatients();
    } catch (err) {
      setAssociateMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to link patient.',
      });
    } finally {
      setAssociating(false);
    }
  };

  const clinicalProtocols = [
    {
      title: 'Speech Acoustic Biomarkers',
      description: 'Acoustic feature analysis of vocal tremor, fundamental frequency variability, sustained phonation stability, and articulation rhythm.',
      badge: 'Audio Biomarkers',
      domain: 'Acoustic Phonation',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      ),
    },
    {
      title: 'Motor & Handwriting Kinematics',
      description: 'Fine motor control metrics, kinematic velocity decay, micrographia spatial compression patterns, and pen pressure variance.',
      badge: 'Motor Biomarkers',
      domain: 'Fine Motor Control',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 7.5l3-3m0 0l-3-3m3 3H15" />
        </svg>
      ),
    },
    {
      title: 'Gait & Mobility Kinematics',
      description: 'Ambulatory movement characteristics, stride cadence consistency, bilateral posture symmetry, and episode hesitation tracking.',
      badge: 'Video Biomarkers',
      domain: 'Gross Motor Mobility',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.5 12a7.5 7.5 0 0115 0" />
        </svg>
      ),
    },
  ];

  const totalCompletedScreenings = patients.reduce((acc, p) => acc + p.screening_count, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-sky-100 selection:text-sky-900 font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0284c7] flex items-center justify-center text-white shadow-sm shadow-sky-200/80 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04" />
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04" />
                </svg>
              </div>
              <span className="text-slate-900 font-bold text-lg sm:text-xl tracking-tight">
                NeuroNest AI
              </span>
            </Link>
            <span className="text-slate-300 font-light text-lg hidden sm:inline">/</span>
            <span className="text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 hidden sm:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Doctor Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            {session && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Dr. {session.name}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm border border-slate-200/80 transition-all duration-200 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2 flex items-center gap-2 cursor-pointer"
            >
              <span>Log Out</span>
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H8.25" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
        {/* Welcome Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-50/90 via-white to-sky-50/40 border border-emerald-100/80 p-6 sm:p-10 shadow-xs">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-emerald-200/80 text-emerald-800 text-xs font-semibold uppercase tracking-wider shadow-2xs">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h3l1.5-4.5L10.5 18l2.25-9 1.5 4.5h4.5" />
              </svg>
              <span>Clinical Practitioner Portal • Persistent Backend</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {session?.name ? `Doctor Workspace — Dr. ${session.name}` : 'Doctor Clinical Workspace'}
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Clinical review portal for examining real registered patients, viewing their latest model-indicated screening findings, and inspecting multimodal AI biomarker history across speech, handwriting, and gait.
            </p>
          </div>
        </section>

        {/* Clinical Referral & Review Overview */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Clinician Referral Key Card */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0284c7]">
                Clinician Identification
              </span>
              <h3 className="text-lg font-bold text-slate-900">Your Referral Code</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Provide this referral code to your patients during registration so their completed screening assessments link to your review portal.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="font-mono text-sm font-bold bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200">
                {clinicianRef}
              </span>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                Active Clinician
              </span>
            </div>
          </div>

          {/* Associated Patients Stats */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0284c7]">
                Clinical Registry
              </span>
              <h3 className="text-lg font-bold text-slate-900">Registered Patients</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Active patient accounts linked to your clinician profile in persistent backend storage.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Associated Patients</span>
              <span className="font-bold text-lg text-slate-900">{patients.length}</span>
            </div>
          </div>

          {/* Total Completed Screenings Stats */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0284c7]">
                Completed Assessments
              </span>
              <h3 className="text-lg font-bold text-slate-900">Screening Reports</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Total completed 3-modality screening reports recorded and available for clinical review.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Total Screenings</span>
              <span className="font-bold text-lg text-[#0284c7]">{totalCompletedScreenings}</span>
            </div>
          </div>
        </section>

        {/* Link Patient Workflow */}
        <section className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Link Existing Patient to Your Account</h3>
              <p className="text-xs text-slate-500">
                If a registered patient did not enter your referral code upon sign-up, enter their email address below to link them.
              </p>
            </div>
            <form onSubmit={handleAssociatePatient} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="email"
                required
                value={associateEmail}
                onChange={(e) => setAssociateEmail(e.target.value)}
                placeholder="patient@example.com"
                className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0284c7] w-64"
              />
              <button
                type="submit"
                disabled={associating}
                className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {associating ? 'Linking...' : 'Link Patient'}
              </button>
            </form>
          </div>
          {associateMsg && (
            <div
              className={`mt-3 text-xs p-2.5 rounded-lg border flex items-center gap-2 ${
                associateMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span>{associateMsg.text}</span>
            </div>
          )}
        </section>

        {/* Incoming Consultation & Review Requests */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Consultation & Appointment Requests
                </h2>
                {appointments.filter((a) => a.status === 'pending').length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              <p className="text-sm text-slate-500">
                Patient appointment requests with model-indicated screening findings and decision controls.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setAppointmentFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  appointmentFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({appointments.length})
              </button>
              <button
                type="button"
                onClick={() => setAppointmentFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  appointmentFilter === 'pending'
                    ? 'bg-white text-amber-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Pending</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                  {appointments.filter((a) => a.status === 'pending').length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAppointmentFilter('accepted')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  appointmentFilter === 'accepted'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Confirmed ({appointments.filter((a) => a.status === 'accepted').length})
              </button>
              <button
                type="button"
                onClick={() => setAppointmentFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  appointmentFilter === 'rejected'
                    ? 'bg-white text-rose-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Declined ({appointments.filter((a) => a.status === 'rejected').length})
              </button>
            </div>
          </div>

          {loadingAppointments ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto text-[#0284c7]">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">Retrieving appointments...</p>
            </div>
          ) : appointmentsError ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm text-rose-700 flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">Unable to load appointment requests</p>
                <p className="text-xs text-rose-600 mt-0.5">{appointmentsError}</p>
              </div>
            </div>
          ) : appointments.filter((a) => (appointmentFilter === 'all' ? true : a.status === appointmentFilter)).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-8 sm:p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto mb-3 text-[#0284c7]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h3 className="text-slate-800 font-semibold text-base">No {appointmentFilter !== 'all' ? appointmentFilter : ''} appointments found</h3>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                Incoming consultation requests submitted by patients will appear here for review and confirmation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {appointments
                .filter((a) => (appointmentFilter === 'all' ? true : a.status === appointmentFilter))
                .map((appt) => {
                  const isPending = appt.status === 'pending';
                  const isAccepted = appt.status === 'accepted';
                  const isRejected = appt.status === 'rejected';
                  const isPromptingNote = notePromptId === appt.id;
                  const sc = appt.patient_latest_screening;
                  const isElevated =
                    sc?.composite_classification.toLowerCase().includes('positive') ||
                    sc?.composite_classification.toLowerCase().includes('elevated');

                  return (
                    <div
                      key={appt.id}
                      className={`bg-white rounded-2xl border p-6 shadow-xs space-y-4 transition-all ${
                        isPending
                          ? 'border-amber-200/90 hover:border-amber-300'
                          : isAccepted
                          ? 'border-emerald-200/80 hover:border-emerald-300'
                          : 'border-slate-200/80'
                      }`}
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                              {appt.patient_name.charAt(0).toUpperCase()}
                            </span>
                            <h3 className="text-lg font-bold text-slate-900">{appt.patient_name}</h3>
                            <span className="text-xs text-slate-400 font-mono">({appt.patient_email})</span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-600 pt-0.5">
                            <div className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                              </svg>
                              <span className="font-semibold text-slate-800">{appt.appointment_date}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-semibold text-slate-800">{appt.appointment_time}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider flex items-center gap-1.5 ${
                              isAccepted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isRejected
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {isAccepted && (
                              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                            {isPending && (
                              <svg className="w-3.5 h-3.5 text-amber-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {isRejected && (
                              <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            <span>{appt.status}</span>
                          </span>
                        </div>
                      </div>

                      {/* Patient Reason / Note */}
                      {appt.reason && (
                        <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700">
                          <span className="font-semibold text-slate-800 block mb-0.5">Patient Consultation Note:</span>
                          <p className="italic">"{appt.reason}"</p>
                        </div>
                      )}

                      {/* Patient's Latest Screening Status / Model-Indicated Findings */}
                      <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#0284c7]">
                            Patient Screening Findings
                          </span>
                          {sc ? (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                isElevated
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              Status: {sc.composite_classification} Indicator
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                              No screenings submitted yet
                            </span>
                          )}
                        </div>

                        {sc ? (
                          <div className="space-y-1.5">
                            <p className="text-sm font-bold text-slate-900">{sc.composite_prediction}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                              <span>
                                Composite Score: <strong className="text-slate-900">{(sc.risk_score * 100).toFixed(1)}%</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Model Confidence: <strong className="text-[#0284c7]">{(sc.confidence * 100).toFixed(1)}%</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Concordance: <strong className="text-slate-900">{sc.modality_concordance}</strong>
                              </span>
                            </div>
                            {sc.summary && (
                              <p className="text-xs text-slate-600 line-clamp-2 pt-0.5">
                                {sc.summary}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            The patient has not submitted any 3-modality screening sessions yet.
                          </p>
                        )}
                      </div>

                      {/* Doctor Feedback Note (if previously attached) */}
                      {appt.doctor_note && (
                        <div className="text-xs bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 text-emerald-900">
                          <span className="font-semibold text-emerald-800 block mb-0.5">Your Clinician Note:</span>
                          <p>{appt.doctor_note}</p>
                        </div>
                      )}

                      {/* Prompt for optional note when accepting/declining */}
                      {isPromptingNote && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <label className="block text-xs font-semibold text-slate-700">
                            Add an Optional Note for Patient (e.g. clinic room, preparation instructions):
                          </label>
                          <input
                            type="text"
                            value={responseNote}
                            onChange={(e) => setResponseNote(e.target.value)}
                            placeholder="e.g. Confirmed. Please bring your motor logs to Room 304."
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#0284c7]"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setNotePromptId(null);
                                setResponseNote('');
                              }}
                              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === appt.id}
                              onClick={() => handleStatusChange(appt.id, 'accepted', responseNote)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Confirm Accept
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === appt.id}
                              onClick={() => handleStatusChange(appt.id, 'rejected', responseNote)}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Confirm Decline
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Doctor Decision Controls */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100">
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={updatingId === appt.id}
                              onClick={() => handleStatusChange(appt.id, 'accepted')}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              <span>{updatingId === appt.id ? 'Updating...' : 'Accept Request'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={updatingId === appt.id}
                              onClick={() => handleStatusChange(appt.id, 'rejected')}
                              className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Decline</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setNotePromptId(isPromptingNote ? null : appt.id)}
                              className="text-xs text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer"
                            >
                              {isPromptingNote ? 'Close Note' : 'Add Note First'}
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                            <span>Decision recorded on {new Date(appt.updated_at).toLocaleDateString()}</span>
                          </div>
                        )}

                        {/* View Patient Full Screening History Link */}
                        {patients.some((p) => p.email === appt.patient_email) && (
                          <button
                            type="button"
                            onClick={() => {
                              const p = patients.find((pat) => pat.email === appt.patient_email);
                              if (p) handleSelectPatient(p);
                            }}
                            className="text-xs font-semibold text-[#0284c7] hover:text-[#0369a1] hover:underline cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <span>Inspect Patient History</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* Real Registered Patient Screening Records & Reports */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Associated Patients & Screening Status
              </h2>
              <p className="text-sm text-slate-500">
                Real registered patients associated with your account and their latest screening findings.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {patients.length} Registered {patients.length === 1 ? 'Patient' : 'Patients'}
            </span>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto text-[#0284c7]">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">Loading registered patients from backend...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm text-rose-700 flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">Unable to load patient records</p>
                <p className="text-xs text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          ) : patients.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-8 sm:p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto mb-4 text-[#0284c7]">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-slate-800 font-semibold text-base">No patients associated with your account yet</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-lg mx-auto leading-relaxed">
                When patients register using your clinician referral code (<code className="font-mono font-bold text-slate-800">{clinicianRef}</code>) or when you link them by email, they will appear here along with their latest screening results and AI biomarker findings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {patients.map((patient) => {
                const latest = patient.latest_screening;
                const isElevated =
                  latest?.composite_classification.toLowerCase().includes('positive') ||
                  latest?.composite_classification.toLowerCase().includes('elevated');

                const latestDate = latest?.timestamp
                  ? new Date(latest.timestamp).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : null;

                return (
                  <div
                    key={patient.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-sky-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                          {patient.name.charAt(0).toUpperCase()}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">{patient.name}</h3>
                        <span className="text-xs text-slate-400 font-mono">({patient.email})</span>
                      </div>

                      {latest ? (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                              isElevated
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            Latest Status: {latest.composite_classification} Indicator
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {latestDate}
                          </span>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
                            Screening Status: No assessments submitted yet
                          </span>
                        </div>
                      )}

                      {latest && (
                        <p className="text-xs text-slate-600 max-w-xl line-clamp-1 pt-0.5">
                          {latest.composite_prediction} • Concordance: {latest.modality_concordance}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-6 self-start md:self-auto flex-wrap">
                      {latest && (
                        <div className="text-right hidden sm:block">
                          <p className="text-[11px] font-medium text-slate-400">Composite Score</p>
                          <p className="text-lg font-black text-slate-900">
                            {(latest.risk_score * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}

                      <div className="text-right">
                        <p className="text-[11px] font-medium text-slate-400">Total Assessments</p>
                        <p className="text-sm font-bold text-slate-700">
                          {patient.screening_count} {patient.screening_count === 1 ? 'Record' : 'Records'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectPatient(patient)}
                        className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-[#0284c7] hover:text-[#0369a1] font-semibold text-xs rounded-xl border border-sky-100 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>View Screening History</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Patient Screening History Modal */}
        {selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0284c7]">
                      Patient Clinical History
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {selectedPatient.email}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                    {selectedPatient.name}'s Screening Records
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {loadingHistory ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto text-[#0284c7]">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                    <p className="text-xs text-slate-500">Retrieving patient history...</p>
                  </div>
                ) : historyError ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">
                    {historyError}
                  </div>
                ) : patientHistory.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No completed screening assessments recorded for this patient.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patientHistory.map((sc) => {
                      const isExpanded = expandedScreeningId === sc.id;
                      const isElevated =
                        sc.composite_classification.toLowerCase().includes('positive') ||
                        sc.composite_classification.toLowerCase().includes('elevated');
                      const dateStr = new Date(sc.timestamp).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={sc.id}
                          className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                    isElevated
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  {sc.composite_classification} Indicator
                                </span>
                                <span className="text-xs text-slate-400 font-medium">{dateStr}</span>
                              </div>
                              <h4 className="text-base font-bold text-slate-900 mt-1">
                                {sc.composite_prediction}
                              </h4>
                            </div>

                            <div className="flex items-center gap-4 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Score</span>
                                <span className="font-bold text-slate-900">
                                  {(sc.risk_score * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Confidence</span>
                                <span className="font-bold text-[#0284c7]">
                                  {(sc.confidence * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Concordance</span>
                                <span className="font-semibold text-slate-700">
                                  {sc.modality_concordance}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Summary snippet */}
                          {sc.summary && (
                            <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60">
                              {sc.summary}
                            </p>
                          )}

                          {/* Modality Breakdown */}
                          {isExpanded && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                              <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Speech Acoustic</p>
                                <p className="text-xs font-bold text-slate-900">{sc.speech_prediction}</p>
                                <p className="text-[11px] text-slate-500">Confidence: {(sc.speech_confidence * 100).toFixed(1)}%</p>
                              </div>

                              <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Handwriting Motor</p>
                                <p className="text-xs font-bold text-slate-900">{sc.handwriting_prediction}</p>
                                <p className="text-[11px] text-slate-500">Confidence: {(sc.handwriting_confidence * 100).toFixed(1)}%</p>
                              </div>

                              <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Gait Kinematics</p>
                                <p className="text-xs font-bold text-slate-900">{sc.gait_prediction}</p>
                                <p className="text-[11px] text-slate-500">Confidence: {(sc.gait_confidence * 100).toFixed(1)}%</p>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setExpandedScreeningId(isExpanded ? null : sc.id)}
                              className="text-xs font-semibold text-[#0284c7] hover:text-[#0369a1] hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Hide Modalities' : 'Inspect Modalities'}</span>
                              <svg
                                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Total records: {patientHistory.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clinical Biomarker Modalities Reference */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Biomarker Modality Evaluation Criteria</h2>
              <p className="text-sm text-slate-500">Clinical reference metrics evaluated in patient screening reports.</p>
            </div>
            <span className="text-xs sm:text-sm font-medium text-slate-500">3 Biomarker Streams</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {clinicalProtocols.map((modality) => (
              <div
                key={modality.title}
                className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284c7]">
                      {modality.icon}
                    </div>
                    <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                      {modality.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {modality.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {modality.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Domain</span>
                  <span className="font-semibold text-slate-700">{modality.domain}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Safety Disclaimer Banner */}
        <section>
          <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#0284c7]/10 flex items-center justify-center text-[#0284c7] flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-slate-900">Clinical Decision Support Notice</h4>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                NeuroNest AI is an AI-assisted screening and support tool. It is not a substitute for
                professional medical diagnosis. All screening results should be reviewed by a qualified
                healthcare provider before making clinical decisions.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0284c7] flex items-center justify-center text-white">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04" />
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04" />
              </svg>
            </div>
            <span className="font-semibold text-white">NeuroNest AI</span>
          </div>
          <p>© {new Date().getFullYear()} NeuroNest AI. Multimodal Parkinson's Screening Platform.</p>
        </div>
      </footer>
    </div>
  );
}
