import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuthSession, logoutUser, type AuthSession } from '../utils/auth';
import { fetchPatientScreenings, type ScreeningRecord } from '../api/screenings';
import {
  fetchDoctors,
  fetchPatientAppointments,
  createAppointment,
  type DoctorInfo,
  type AppointmentRecord,
} from '../api/appointments';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [loadingScreenings, setLoadingScreenings] = useState<boolean>(true);
  const [screeningsError, setScreeningsError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Appointments state
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState<boolean>(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  // Booking Modal state
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(false);
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [appointmentTime, setAppointmentTime] = useState<string>('10:00 AM');
  const [appointmentReason, setAppointmentReason] = useState<string>('');
  const [submittingBooking, setSubmittingBooking] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const loadAppointmentsData = useCallback(async () => {
    setLoadingAppointments(true);
    setAppointmentsError(null);
    try {
      const data = await fetchPatientAppointments();
      setAppointments(data);
    } catch (err) {
      setAppointmentsError(
        err instanceof Error ? err.message : 'Failed to retrieve appointments.'
      );
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  const loadDoctorsData = useCallback(async () => {
    setLoadingDoctors(true);
    try {
      const docList = await fetchDoctors();
      setDoctors(docList);
      if (docList.length > 0 && selectedDoctorId === '') {
        setSelectedDoctorId(docList[0].id);
      }
    } catch (err) {
      console.warn('Failed to load registered doctors list:', err);
    } finally {
      setLoadingDoctors(false);
    }
  }, [selectedDoctorId]);

  useEffect(() => {
    const currentSession = getAuthSession();
    // Block dashboard access when not logged in
    if (!currentSession) {
      navigate('/login');
      return;
    }
    // Route Doctor to Doctor Dashboard
    if (currentSession.role === 'Doctor') {
      navigate('/doctor-dashboard');
      return;
    }
    setSession(currentSession);

    // Fetch patient screening history from persistent backend database
    async function loadHistory() {
      setLoadingScreenings(true);
      setScreeningsError(null);
      try {
        const data = await fetchPatientScreenings();
        setScreenings(data);
      } catch (err) {
        setScreeningsError(
          err instanceof Error ? err.message : 'Failed to retrieve screening history.'
        );
      } finally {
        setLoadingScreenings(false);
      }
    }

    loadHistory();
    loadAppointmentsData();
    loadDoctorsData();
  }, [navigate, loadAppointmentsData, loadDoctorsData]);

  const handleOpenBooking = () => {
    setBookingError(null);
    setBookingSuccess(null);
    // Default to tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setAppointmentDate(tomorrow.toISOString().split('T')[0]);
    setIsBookingOpen(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setBookingError('Please select a doctor for the appointment.');
      return;
    }
    if (!appointmentDate || !appointmentTime) {
      setBookingError('Please select both a date and a time slot.');
      return;
    }

    setSubmittingBooking(true);
    setBookingError(null);

    try {
      const newAppt = await createAppointment({
        doctor_id: Number(selectedDoctorId),
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        reason: appointmentReason.trim() || undefined,
      });

      setAppointments((prev) => [newAppt, ...prev]);
      setBookingSuccess('Appointment request submitted successfully!');
      setAppointmentReason('');
      setTimeout(() => {
        setIsBookingOpen(false);
        setBookingSuccess(null);
      }, 1200);
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : 'Failed to submit appointment request.'
      );
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const modalities = [
    {
      title: 'Speech Analysis',
      description: 'Upload or analyze speech samples to evaluate vocal patterns that may indicate neurological changes.',
      href: '/screening/voice',
      badge: 'Audio',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      ),
    },
    {
      title: 'Handwriting Analysis',
      description: 'Upload a handwriting sample to assess fine motor control and penmanship variations.',
      href: '/screening/handwriting',
      badge: 'Motor',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 7.5l3-3m0 0l-3-3m3 3H15" />
        </svg>
      ),
    },
    {
      title: 'Gait Analysis',
      description: 'Upload a gait video to analyze walking patterns and movement characteristics.',
      href: '/screening/gait',
      badge: 'Video',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.5 12a7.5 7.5 0 0115 0" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-sky-100 selection:text-sky-900 font-sans">
      {/* Sticky Header / Navigation Bar */}
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
            <span className="text-xs sm:text-sm font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100 hidden sm:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
              Patient Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            {session && (
              <span className="text-xs sm:text-sm text-slate-600 hidden md:inline font-medium">
                {session.name}
              </span>
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

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
        {/* Welcome Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-50/90 via-white to-sky-50/40 border border-sky-100/80 p-6 sm:p-10 shadow-xs">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-sky-200/70 text-[#0284c7] text-xs font-semibold uppercase tracking-wider shadow-2xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h3l1.5-4.5L10.5 18l2.25-9 1.5 4.5h4.5" />
              </svg>
              <span>Multimodal Screening Platform • Patient Portal</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {session?.name ? `Welcome back, ${session.name}` : 'Welcome to NeuroNest AI'}
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              NeuroNest AI supports Parkinson's screening using multiple digital biomarkers including speech,
              handwriting, and gait analysis. The platform is designed to assist healthcare professionals — it
              is not a substitute for professional medical diagnosis.
            </p>
          </div>
        </section>

        {/* Start Assessment CTA Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 sm:p-8 hover:border-sky-200 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Start Assessment</h2>
                <p className="text-slate-600 text-sm sm:text-base">Begin a comprehensive screening using digital biomarkers.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/screening')}
                className="px-6 py-3.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-sm shadow-sky-200/60 hover:shadow-md hover:shadow-sky-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Assessment</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Screening Modalities */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Screening Modalities</h2>
            <span className="text-xs sm:text-sm font-medium text-slate-500">3 Modalities Available</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {modalities.map((modality) => (
              <Link
                key={modality.title}
                to={modality.href}
                className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm hover:shadow-md hover:border-sky-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284c7] group-hover:scale-105 transition-transform duration-200">
                      {modality.icon}
                    </div>
                    <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                      {modality.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0284c7] transition-colors">
                    {modality.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {modality.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-sm font-semibold text-[#0284c7] group-hover:translate-x-1 transition-transform">
                  <span>Open {modality.title.split(' ')[0]} Test</span>
                  <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Previous Screenings / History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Screening History</h2>
              <p className="text-xs sm:text-sm text-slate-500">Persistent medical screening records from backend storage.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {screenings.length} {screenings.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          {loadingScreenings ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto text-[#0284c7]">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">Retrieving patient screening records...</p>
            </div>
          ) : screeningsError ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm text-rose-700 flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">Unable to load screening history</p>
                <p className="text-xs text-rose-600 mt-0.5">{screeningsError}</p>
              </div>
            </div>
          ) : screenings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-8 sm:p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-center justify-center mx-auto mb-4 text-[#0284c7]">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-slate-700 font-semibold text-base">No screenings recorded yet</p>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                Completed screening sessions and reports will appear here for review.
              </p>
              <button
                type="button"
                onClick={() => navigate('/screening')}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0284c7] hover:text-[#0369a1] hover:underline focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2 rounded-lg px-3 py-1.5 bg-sky-50/80 border border-sky-100 transition-colors cursor-pointer"
              >
                <span>Start your first screening</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {screenings.map((sc) => {
                const isExpanded = expandedId === sc.id;
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
                    className={`bg-white rounded-2xl border transition-all shadow-xs ${
                      isElevated ? 'border-amber-200 hover:border-amber-300' : 'border-slate-200/80 hover:border-sky-200'
                    } p-6 sm:p-7 space-y-4`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                              isElevated
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {sc.composite_classification} Indicator
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {dateStr}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                          {sc.composite_prediction}
                        </h3>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6">
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Composite Score</p>
                          <p className="text-lg font-black text-slate-900">
                            {(sc.risk_score * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Confidence</p>
                          <p className="text-lg font-black text-[#0284c7]">
                            {(sc.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Concordance</p>
                          <p className="text-sm font-bold text-slate-700">
                            {sc.modality_concordance}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Summary snippet */}
                    {sc.summary && (
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        {sc.summary}
                      </p>
                    )}

                    {/* Collapsible Modalities Breakdown */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Speech Acoustic</p>
                          <p className="text-sm font-bold text-slate-900">{sc.speech_prediction}</p>
                          <p className="text-xs text-slate-500">Confidence: {(sc.speech_confidence * 100).toFixed(1)}%</p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Handwriting Motor</p>
                          <p className="text-sm font-bold text-slate-900">{sc.handwriting_prediction}</p>
                          <p className="text-xs text-slate-500">Confidence: {(sc.handwriting_confidence * 100).toFixed(1)}%</p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gait Kinematics</p>
                          <p className="text-sm font-bold text-slate-900">{sc.gait_prediction}</p>
                          <p className="text-xs text-slate-500">Confidence: {(sc.gait_confidence * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : sc.id)}
                        className="text-xs font-semibold text-[#0284c7] hover:text-[#0369a1] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>{isExpanded ? 'Hide Modality Breakdown' : 'View Modality Breakdown'}</span>
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
        </section>

        {/* Doctor Consultations & Appointments */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Consultations & Appointments
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Schedule and manage clinical review appointments with registered doctors.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {appointments.length} {appointments.length === 1 ? 'Appointment' : 'Appointments'}
              </span>
              <button
                type="button"
                onClick={handleOpenBooking}
                className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Request Appointment</span>
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
                <p className="font-semibold">Unable to load appointments</p>
                <p className="text-xs text-rose-600 mt-0.5">{appointmentsError}</p>
              </div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-8 sm:p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto mb-3 text-[#0284c7]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <p className="text-slate-800 font-semibold text-base">No appointments requested yet</p>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                Request a clinical consultation with one of our registered doctors to review your multimodal screening results.
              </p>
              <button
                type="button"
                onClick={handleOpenBooking}
                className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0284c7] hover:text-[#0369a1] bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100 transition-colors cursor-pointer"
              >
                <span>Request your first consultation</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((appt) => {
                const isPending = appt.status === 'pending';
                const isAccepted = appt.status === 'accepted';
                const isRejected = appt.status === 'rejected';

                return (
                  <div
                    key={appt.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3 transition-all ${
                      isAccepted
                        ? 'border-emerald-200'
                        : isRejected
                        ? 'border-rose-200'
                        : 'border-amber-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <h3 className="text-base font-bold text-slate-900">
                            {appt.doctor_name.startsWith('Dr.') ? appt.doctor_name : `Dr. ${appt.doctor_name}`}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">{appt.doctor_email}</p>
                      </div>

                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1 ${
                          isAccepted
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isRejected
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {isAccepted && (
                          <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                        {isPending && (
                          <svg className="w-3 h-3 text-amber-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {isRejected && (
                          <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span>{appt.status}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600">
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

                    {appt.reason && (
                      <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600">
                        <span className="font-semibold text-slate-700">Reason / Note: </span>
                        {appt.reason}
                      </div>
                    )}

                    {appt.doctor_note && (
                      <div className="text-xs bg-sky-50/70 p-2.5 rounded-lg border border-sky-100 text-sky-900">
                        <span className="font-semibold text-sky-800">Doctor Note: </span>
                        {appt.doctor_note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Appointment Booking Modal */}
        {isBookingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0284c7]">
                    Patient Portal
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                    Request Doctor Consultation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateAppointment} className="p-6 space-y-4">
                {bookingError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{bookingError}</span>
                  </div>
                )}

                {bookingSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span>{bookingSuccess}</span>
                  </div>
                )}

                {/* Doctor Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Doctor
                  </label>
                  {loadingDoctors ? (
                    <div className="text-xs text-slate-400 py-2">Loading registered doctors...</div>
                  ) : doctors.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      No registered doctors available at the moment.
                    </div>
                  ) : (
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                      required
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    >
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`} ({doc.email}) — Ref: {doc.referral_code}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preferred Time Slot
                    </label>
                    <select
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:30 PM">03:30 PM</option>
                      <option value="04:30 PM">04:30 PM</option>
                    </select>
                  </div>
                </div>

                {/* Optional Reason / Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Consultation / Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={appointmentReason}
                    onChange={(e) => setAppointmentReason(e.target.value)}
                    placeholder="e.g. Discuss recent multimodal screening findings and vocal acoustic changes..."
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBookingOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBooking || doctors.length === 0}
                    className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {submittingBooking ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Request</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Safety Disclaimer Banner */}
        <section>
          <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#0284c7]/10 flex items-center justify-center text-[#0284c7] flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-slate-900">Important Notice</h4>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                NeuroNest AI is an AI-assisted screening and support tool. It is not a substitute for
                professional medical diagnosis. All screening results should be reviewed by a qualified
                healthcare provider before making clinical decisions.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
