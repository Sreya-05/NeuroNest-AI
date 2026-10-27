import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getScreeningState,
  getAnalysisResult,
  setAnalysisResult,
  resetAllScreeningState,
} from '../utils/screeningState';
import {
  runMultimodalAnalysis,
  type MultimodalAnalysisResponse,
} from '../api/analysis';
import { saveScreeningRecord } from '../api/screenings';
import ScreeningVisualizations from '../components/ScreeningVisualizations';
import SpeechAttributionViewer from '../components/SpeechAttributionViewer';
import HandwritingGradCamViewer from '../components/HandwritingGradCamViewer';

export default function ResultPage() {
  const navigate = useNavigate();
  const [analysisResult, setAnalysisResultState] = useState<MultimodalAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savedToBackend, setSavedToBackend] = useState<boolean>(false);
  const savedRef = useRef<boolean>(false);

  const persistResult = useCallback(async (data: MultimodalAnalysisResponse) => {
    if (savedRef.current) return;
    savedRef.current = true;
    try {
      await saveScreeningRecord(data);
      setSavedToBackend(true);
    } catch (saveErr) {
      console.warn('Could not automatically save screening record to database:', saveErr);
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    const state = getScreeningState();
    const speechFile = state.speech.savedFilename || state.speech.filename;
    const handwritingFile = state.handwriting.savedFilename || state.handwriting.filename;
    const gaitFile = state.gait.savedFilename || state.gait.filename;

    if (!speechFile || !handwritingFile || !gaitFile) {
      setError('Missing uploaded file references. Please return to the screening hub and upload all 3 samples.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await runMultimodalAnalysis({
        speech_filename: speechFile,
        handwriting_filename: handwritingFile,
        gait_filename: gaitFile,
      });
      setAnalysisResult(data);
      setAnalysisResultState(data);
      await persistResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Multimodal analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [persistResult]);

  // Enforce access control: User MUST have uploaded all 3 modalities to view results
  useEffect(() => {
    const state = getScreeningState();
    const allDone = state.speech.uploaded && state.handwriting.uploaded && state.gait.uploaded;
    if (!allDone) {
      navigate('/screening', { replace: true });
      return;
    }

    const cached = getAnalysisResult();
    if (cached) {
      setAnalysisResultState(cached);
      setLoading(false);
      persistResult(cached);
      return;
    }

    fetchAnalysis();
  }, [navigate, fetchAnalysis, persistResult]);

  const state = getScreeningState();

  const handleStartNewSession = () => {
    resetAllScreeningState();
    navigate('/screening');
  };

  const modalityCards = [
    {
      title: 'Voice Recording',
      subtitle: 'Audio Sample',
      filename: state.speech.filename || 'Speech sample',
      description: 'Your voice recording was successfully uploaded and evaluated.',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      ),
    },
    {
      title: 'Handwriting Sample',
      subtitle: 'Drawing Image',
      filename: state.handwriting.filename || 'Handwriting sample',
      description: 'Your drawing sample was successfully uploaded and evaluated.',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 7.5l3-3m0 0l-3-3m3 3H15" />
        </svg>
      ),
    },
    {
      title: 'Walking Video',
      subtitle: 'Video Recording',
      filename: state.gait.filename || 'Walking video',
      description: 'Your walking video was successfully uploaded and evaluated.',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.5 12a7.5 7.5 0 0115 0" />
        </svg>
      ),
    },
  ];

  const combined = analysisResult?.combined_result;
  const modalities = analysisResult?.modalities;
  const isPositive = combined?.classification === 'Positive' || (combined?.risk_score ?? 0) >= 0.5;

  // Gait friendly label
  const getGaitLabel = (rawLabel?: string) => {
    if (!rawLabel) return 'Normal';
    const upper = rawLabel.toUpperCase();
    if (upper === 'NORMAL') return 'Normal';
    if (upper === 'MILD') return 'Mild';
    if (upper === 'MODERATE') return 'Moderate';
    if (upper === 'SEVERE') return 'Severe';
    return rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1).toLowerCase();
  };

  const gaitDisplayLabel = getGaitLabel(modalities?.gait?.label);

  const getGaitExplanation = (label: string) => {
    switch (label) {
      case 'Normal':
        return 'The AI observed smooth walking rhythm, steady balance, and symmetrical posture in your video.';
      case 'Mild':
        return 'The AI detected mild variations in stride pace or balance while walking.';
      case 'Moderate':
        return 'The AI noted noticeable stride changes and walking movement irregularities.';
      case 'Severe':
        return 'The AI observed pronounced movement differences or hesitation in walking rhythm.';
      default:
        return 'The AI analyzed your walking motion and stride rhythm.';
    }
  };

  const elevatedCount = Math.max(0, Math.min(3, combined?.positive_modalities_count ?? (isPositive ? 1 : 0)));

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-sky-100 selection:text-sky-900 font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
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

          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm border border-slate-200/80 transition-all duration-200 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2 flex items-center gap-1.5"
          >
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
        {/* Page Title & Status */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>3 of 3 Samples Uploaded</span>
            </div>
            {savedToBackend && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[#0284c7] text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
                <span>Saved to Screening History</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            AI-Assisted Screening Summary
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-3xl leading-relaxed">
            A clear, plain-English summary of your voice, handwriting, and walking assessments.
          </p>
        </section>

        {/* Screening Progress or Completion Status */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 sm:p-8">
            {loading ? (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0 text-[#0284c7]">
                  <svg className="animate-spin w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">Reviewing Your Uploaded Samples</h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    Please wait while our AI models examine your voice recording, handwriting drawing, and walking video.
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-900">Analysis Error</h2>
                    <p className="text-rose-700 text-sm sm:text-base leading-relaxed">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchAnalysis}
                  className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer self-start sm:self-center"
                >
                  Retry Analysis
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">Analysis Complete</h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    All three samples (voice, handwriting, and walking) have been processed. Your AI-assisted screening summary is ready below.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Uploaded Samples Overview Cards */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Your Uploaded Samples</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {modalityCards.map((modality) => (
              <div
                key={modality.title}
                className="bg-white rounded-2xl border border-emerald-200/80 p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                      {modality.icon}
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Verified
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{modality.title}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{modality.filename}</p>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{modality.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Screening Results Section */}
        {combined && modalities && (
          <section className="space-y-8">
            {/* TOP CARD: Overall Screening Indication */}
            <div className={`bg-white rounded-3xl border ${isPositive ? 'border-amber-300 shadow-amber-50/50' : 'border-emerald-300 shadow-emerald-50/50'} p-6 sm:p-10 shadow-sm`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Combined AI Screening Result
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        isPositive
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      }`}
                    >
                      {isPositive ? 'Elevated Finding' : 'Normal / Low Risk'}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {isPositive ? 'Elevated Finding' : 'Normal / Low Risk Indication'}
                  </h2>
                </div>

                {/* Patient-Friendly Metric Badges with Required Labels */}
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                  {/* Overall Screening Indicator (replacing Composite Risk Score, not a medical probability) */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 text-center min-w-[130px]">
                    <p className="text-xs font-semibold text-slate-500">Overall Screening Indicator</p>
                    <p className={`text-2xl sm:text-3xl font-black mt-0.5 ${isPositive ? 'text-amber-800' : 'text-emerald-800'}`}>
                      {(combined.risk_score * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Combined result</p>
                  </div>

                  {/* AI Confidence (replacing Average Model Confidence) */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 text-center min-w-[120px]">
                    <p className="text-xs font-semibold text-slate-500">AI Confidence</p>
                    <p className="text-2xl sm:text-3xl font-black mt-0.5 text-[#0284c7]">
                      {(combined.confidence * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Model certainty</p>
                  </div>

                  {/* Number of Areas Showing Elevated Findings (replacing Modality Concordance) */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 text-center min-w-[140px]">
                    <p className="text-xs font-semibold text-slate-500">Number of Areas Showing Elevated Findings</p>
                    <p className="text-2xl sm:text-3xl font-black mt-0.5 text-slate-800">
                      {elevatedCount} of 3
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Areas with findings</p>
                  </div>
                </div>
              </div>
            </div>

            {/* THREE SIMPLE MODALITY CARDS (Requirement 3) */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Results by Assessment Area
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. VOICE */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-5 hover:border-sky-200 transition-colors">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284c7]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">VOICE</h3>
                          <p className="text-xs text-slate-500">Voice recording</p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          modalities.speech.label === 'PD'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {modalities.speech.label === 'PD' ? 'Elevated' : 'Not Elevated'}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
                        <span className="text-slate-500">Result:</span>
                        <span className="font-bold text-slate-900">
                          {modalities.speech.label === 'PD' ? 'Elevated' : 'Not Elevated'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
                        <span className="text-slate-500">AI Confidence:</span>
                        <span className="font-extrabold text-[#0284c7]">
                          {(modalities.speech.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {modalities.speech.label === 'PD'
                          ? 'The AI detected variations in your voice recording that differ from standard speech patterns.'
                          : 'The AI found your voice recording consistent with steady, clear speech patterns.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. HANDWRITING */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-5 hover:border-sky-200 transition-colors">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284c7]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 7.5l3-3m0 0l-3-3m3 3H15" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">HANDWRITING</h3>
                          <p className="text-xs text-slate-500">Drawing sample</p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          modalities.handwriting.label === 'PD'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {modalities.handwriting.label === 'PD' ? 'Elevated' : 'Not Elevated'}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
                        <span className="text-slate-500">Result:</span>
                        <span className="font-bold text-slate-900">
                          {modalities.handwriting.label === 'PD' ? 'Elevated' : 'Not Elevated'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
                        <span className="text-slate-500">AI Confidence:</span>
                        <span className="font-extrabold text-[#0284c7]">
                          {(modalities.handwriting.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {modalities.handwriting.label === 'PD'
                          ? 'The AI identified variations in your drawing sample that differ from standard handwriting patterns.'
                          : 'The AI found steady and consistent stroke shapes in your handwriting drawing sample.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. WALKING */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-5 hover:border-sky-200 transition-colors">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284c7]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.5 12a7.5 7.5 0 0115 0" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">WALKING</h3>
                          <p className="text-xs text-slate-500">Walking video</p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          gaitDisplayLabel === 'Normal'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : gaitDisplayLabel === 'Mild'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : gaitDisplayLabel === 'Moderate'
                            ? 'bg-orange-50 text-orange-800 border-orange-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {gaitDisplayLabel}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
                        <span className="text-slate-500">Result:</span>
                        <span className="font-bold text-slate-900">
                          {gaitDisplayLabel}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
                        <span className="text-slate-500">AI Confidence:</span>
                        <span className="font-extrabold text-[#0284c7]">
                          {(modalities.gait.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {getGaitExplanation(gaitDisplayLabel)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI-Assisted Screening Summary Visualizations (Requirement 1 & 4) */}
            <ScreeningVisualizations data={analysisResult} />

            {/* Explainable AI: "Why did the AI make this result?" (Requirement 6 & 7) */}
            <div className="space-y-6">
              <div className="border-b border-slate-200/80 pb-3">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Why did the AI make this result?
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  These highlighted areas show which parts of the uploaded sample influenced the AI's decision most.
                </p>
              </div>

              {/* Speech Explainability */}
              {modalities.speech && (
                <SpeechAttributionViewer
                  attribution={modalities.speech.attribution}
                  filename={state.speech.filename}
                />
              )}

              {/* Handwriting Explainability */}
              {modalities.handwriting && (
                <HandwritingGradCamViewer
                  gradcam={modalities.handwriting.gradcam}
                  filename={state.handwriting.filename}
                />
              )}
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <section className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="button"
            onClick={handleStartNewSession}
            className="px-6 py-3.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-base transition-all duration-200 shadow-sm shadow-sky-200/60 text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start New Screening Session</span>
          </button>
          <Link
            to="/dashboard"
            className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base border border-slate-200/80 transition-all duration-200 shadow-xs text-center flex items-center justify-center gap-2"
          >
            <span>Return to Dashboard</span>
          </Link>
        </section>


      </main>
    </div>
  );
}
