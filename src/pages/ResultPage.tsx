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
      setError('Missing uploaded file references. Please return to the screening hub and upload all 3 modalities.');
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

    // Otherwise initiate multimodal analysis
    fetchAnalysis();
  }, [navigate, fetchAnalysis, persistResult]);

  const state = getScreeningState();

  const handleStartNewSession = () => {
    resetAllScreeningState();
    navigate('/screening');
  };

  const modalityCards = [
    {
      title: 'Speech Analysis',
      subtitle: 'Audio Biomarker',
      filename: state.speech.filename || 'Speech sample',
      description:
        'Acoustic parameters including vocal pitch tremor, sustained phonation, and articulation stability have been received.',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      ),
    },
    {
      title: 'Handwriting Analysis',
      subtitle: 'Motor Biomarker',
      filename: state.handwriting.filename || 'Handwriting image',
      description:
        'Pen stroke dynamics, penmanship pressure variations, and micrographia patterns have been received.',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 7.5l3-3m0 0l-3-3m3 3H15" />
        </svg>
      ),
    },
    {
      title: 'Gait Analysis',
      subtitle: 'Video Biomarker',
      filename: state.gait.filename || 'Gait video',
      description:
        'Walking motion, posture dynamics, cadence symmetry, and gait hesitation indicators have been received.',
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
  const isPositive = combined?.classification === 'Positive';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-sky-100 selection:text-sky-900 font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0284c7] flex items-center justify-center text-white shadow-sm shadow-sky-200/80 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04" />
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04" />
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
        {/* Page Header */}
        <section className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>3 of 3 Modalities Uploaded</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            AI-Assisted Screening Report
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-3xl leading-relaxed">
            This report summarizes the uploaded multimodal screening data (Speech, Handwriting, and Gait) intended for clinical decision support.
          </p>
        </section>

        {/* Screening Status */}
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
                  <h2 className="text-lg font-bold text-slate-900">Processing Multimodal AI Models</h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    Executing unified feature extraction across speech acoustic representations, handwriting motor dynamics, and gait video kinematics (384-dimensional joint feature space).
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
                  <h2 className="text-lg font-bold text-slate-900">Multimodal AI Inference Complete</h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    All three required digital biomarkers (speech, handwriting, and gait) have been processed by their respective deep learning networks and integrated through the feature-level fusion classifier.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Modality Summary Cards */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Uploaded Modalities Summary</h2>

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

        {/* Analysis Results Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Analysis Results</h2>
            {analysisResult && (
              <div className="flex items-center gap-2">
                {savedToBackend && (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Saved to Screening History</span>
                  </span>
                )}
                <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                  Multimodal Fusion Model
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-8 sm:p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto text-[#0284c7]">
                <svg className="animate-spin w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div>
                <p className="text-slate-800 font-semibold text-base">Running Multimodal Deep Learning Inference...</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Acoustic, visual motor, and kinematic feature embeddings are being evaluated across trained PyTorch classifiers.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-slate-800 font-semibold">{error}</p>
              <button
                type="button"
                onClick={fetchAnalysis}
                className="px-5 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Retry Multimodal Analysis
              </button>
            </div>
          ) : combined && modalities ? (
            <div className="space-y-6">
              {/* Primary Combined Multimodal Result Card */}
              <div className={`bg-white rounded-2xl border ${isPositive ? 'border-amber-300' : 'border-emerald-300'} p-6 sm:p-8 shadow-sm space-y-6`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Model-Derived Screening Aggregation
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          isPositive
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {combined.classification} Indicator
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {combined.prediction}
                    </h3>
                  </div>

                  <div className="flex items-center gap-6 sm:gap-8 self-start md:self-auto flex-wrap">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Composite Risk Score</p>
                      <p className="text-2xl font-black text-slate-900">
                        {(combined.risk_score * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div>
                      <p className="text-xs font-medium text-slate-500">Average Model Confidence</p>
                      <p className="text-2xl font-black text-[#0284c7]">
                        {(combined.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    {combined.positive_modalities_count !== undefined && (
                      <>
                        <div className="h-8 w-px bg-slate-200" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Modality Concordance</p>
                          <p className="text-xl font-bold text-slate-800">
                            {combined.positive_modalities_count} of 3 Elevated
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Probability Distribution */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-emerald-700">
                      Low Risk Indicator: {(combined.probabilities.low_risk * 100).toFixed(1)}%
                    </span>
                    <span className="text-amber-800">
                      Elevated Risk Indicator: {(combined.probabilities.elevated_risk * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${combined.probabilities.low_risk * 100}%` }}
                    />
                    <div
                      className="bg-amber-500 h-full transition-all duration-500"
                      style={{ width: `${combined.probabilities.elevated_risk * 100}%` }}
                    />
                  </div>
                </div>

                {/* Screening Aggregation Explanation Note */}
                <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                  <svg className="w-4 h-4 text-[#0284c7] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong>Screening Aggregation Note:</strong> This composite score is a model-derived algorithmic aggregation of individual digital biomarkers (Speech, Handwriting, Gait), not a clinical probability or medical diagnosis. Detailed individual modality findings are presented below.
                  </span>
                </div>

                {/* AI Summary Callout */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Screening Aggregation Summary
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {combined.summary}
                  </p>
                </div>
              </div>

              {/* Individual Modality Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Speech Modality Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Speech Acoustic
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          modalities.speech.label === 'PD'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {modalities.speech.label === 'PD' ? 'Elevated Indication' : 'Healthy Control'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{modalities.speech.prediction}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Model: {modalities.speech.model}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Confidence:</span>
                        <span className="font-bold text-slate-900">
                          {(modalities.speech.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Healthy Control Prob:</span>
                        <span className="font-semibold text-slate-700">
                          {(modalities.speech.probabilities.healthy_control * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Parkinson's Prob:</span>
                        <span className="font-semibold text-slate-700">
                          {(modalities.speech.probabilities.parkinsons * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Handwriting Modality Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Handwriting Motor
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          modalities.handwriting.label === 'PD'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {modalities.handwriting.label === 'PD' ? 'Elevated Indication' : 'Healthy Control'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{modalities.handwriting.prediction}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Model: {modalities.handwriting.model}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Confidence:</span>
                        <span className="font-bold text-slate-900">
                          {(modalities.handwriting.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Control Prob:</span>
                        <span className="font-semibold text-slate-700">
                          {(modalities.handwriting.probabilities.control * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Parkinson's Prob:</span>
                        <span className="font-semibold text-slate-700">
                          {(modalities.handwriting.probabilities.parkinsons * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gait Modality Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Gait Kinematics
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          modalities.gait.label === 'NORMAL'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {modalities.gait.label}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{modalities.gait.prediction}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Model: {modalities.gait.model}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Confidence:</span>
                        <span className="font-bold text-slate-900">
                          {(modalities.gait.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Normal Gait Prob:</span>
                        <span className="font-semibold text-slate-700">
                          {(modalities.gait.probabilities.normal * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Mild / Mod / Sev:</span>
                        <span className="font-semibold text-slate-700">
                          {(modalities.gait.probabilities.mild * 100).toFixed(0)}% /{' '}
                          {(modalities.gait.probabilities.moderate * 100).toFixed(0)}% /{' '}
                          {(modalities.gait.probabilities.severe * 100).toFixed(0)}%
                        </span>
                      </div>
                      {modalities.gait.poses_detected !== undefined && (
                        <div className="flex justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
                          <span>Kinematic Poses:</span>
                          <span className="font-medium text-slate-700">
                            {modalities.gait.poses_detected} of {modalities.gait.frames_analyzed || 60} frames
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Multimodal Probability & Metric Charts */}
              <ScreeningVisualizations data={analysisResult} />

              {/* Speech Wav2Vec2 Temporal Acoustic Explainability */}
              {modalities.speech && (
                <SpeechAttributionViewer
                  attribution={modalities.speech.attribution}
                  filename={state.speech.filename}
                />
              )}

              {/* Handwriting EfficientNet-B0 Grad-CAM Explainability */}
              {modalities.handwriting && (
                <HandwritingGradCamViewer
                  gradcam={modalities.handwriting.gradcam}
                  filename={state.handwriting.filename}
                />
              )}
            </div>
          ) : null}
        </section>

        {/* Navigation Action Buttons */}
        <section className="flex flex-col sm:flex-row gap-4">
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

        {/* Safety Disclaimer Banner */}
        <section>
          <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#0284c7]/10 flex items-center justify-center text-[#0284c7] flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-slate-900">Medical Disclaimer</h4>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                NeuroNest AI is an AI-assisted screening/support tool and does not replace professional medical diagnosis or clinical evaluation. All screening results should be reviewed by a qualified healthcare provider before making clinical decisions.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
