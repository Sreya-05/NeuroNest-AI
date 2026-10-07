import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getScreeningState, getAnalysisResult, setAnalysisResult, type ScreeningUploadState } from '../utils/screeningState';
import { runMultimodalAnalysis } from '../api/analysis';

export default function ScreeningPage() {
  const navigate = useNavigate();
  const [screeningState, setScreeningState] = useState<ScreeningUploadState>({
    speech: { uploaded: false },
    handwriting: { uploaded: false },
    gait: { uploaded: false },
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const state = getScreeningState();
    setScreeningState(state);

    // If all 3 are uploaded and result is not yet cached, pre-fetch multimodal analysis
    if (state.speech.uploaded && state.handwriting.uploaded && state.gait.uploaded && !getAnalysisResult()) {
      const speechFile = state.speech.savedFilename || state.speech.filename;
      const handwritingFile = state.handwriting.savedFilename || state.handwriting.filename;
      const gaitFile = state.gait.savedFilename || state.gait.filename;

      if (speechFile && handwritingFile && gaitFile) {
        runMultimodalAnalysis({
          speech_filename: speechFile,
          handwriting_filename: handwritingFile,
          gait_filename: gaitFile,
        })
          .then((res) => {
            setAnalysisResult(res);
          })
          .catch((err) => {
            console.warn('Pre-analysis background trigger:', err);
          });
      }
    }
  }, []);

  const speechDone = screeningState.speech.uploaded;
  const handwritingDone = screeningState.handwriting.uploaded;
  const gaitDone = screeningState.gait.uploaded;

  const completedCount = (speechDone ? 1 : 0) + (handwritingDone ? 1 : 0) + (gaitDone ? 1 : 0);
  const isAllUploaded = completedCount === 3;

  // Determine missing modalities for user feedback message
  const missingModalities: string[] = [];
  if (!speechDone) missingModalities.push('Speech recording');
  if (!handwritingDone) missingModalities.push('Handwriting sample');
  if (!gaitDone) missingModalities.push('Gait video');

  const progressPercentage = Math.round((completedCount / 3) * 100);

  const handleContinueToResults = async () => {
    if (!isAllUploaded || isAnalyzing) return;

    const cached = getAnalysisResult();
    if (cached) {
      navigate('/screening/result');
      return;
    }

    const speechFile = screeningState.speech.savedFilename || screeningState.speech.filename;
    const handwritingFile = screeningState.handwriting.savedFilename || screeningState.handwriting.filename;
    const gaitFile = screeningState.gait.savedFilename || screeningState.gait.filename;

    if (!speechFile || !handwritingFile || !gaitFile) {
      setAnalysisError('Missing uploaded file identifiers. Please re-upload your files.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      const res = await runMultimodalAnalysis({
        speech_filename: speechFile,
        handwriting_filename: handwritingFile,
        gait_filename: gaitFile,
      });
      setAnalysisResult(res);
      navigate('/screening/result');
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Multimodal analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const cards = [
    {
      id: 'speech',
      title: 'Speech Analysis',
      badge: 'Audio Biomarkers',
      subtitle: 'Audio recording (.wav, .mp3, .m4a, .ogg, .webm)',
      description:
        'Acoustic features such as voice pitch, tremor, and vocal stability provide essential indicators for neurological screening.',
      href: '/screening/voice',
      uploaded: speechDone,
      filename: screeningState.speech.filename,
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      ),
      buttonText: speechDone ? 'Re-upload Speech' : 'Upload Speech Sample',
    },
    {
      id: 'handwriting',
      title: 'Handwriting Analysis',
      badge: 'Motor Biomarkers',
      subtitle: 'Handwriting image (.png, .jpg, .jpeg, .webp)',
      description:
        'Evaluates fine motor control variations, penmanship pressure, and micrographia patterns from drawn samples.',
      href: '/screening/handwriting',
      uploaded: handwritingDone,
      filename: screeningState.handwriting.filename,
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 7.5l3-3m0 0l-3-3m3 3H15" />
        </svg>
      ),
      buttonText: handwritingDone ? 'Re-upload Handwriting' : 'Upload Handwriting Sample',
    },
    {
      id: 'gait',
      title: 'Gait Analysis',
      badge: 'Video Biomarkers',
      subtitle: 'Gait video (.mp4, .mov, .webm, .avi, .mkv)',
      description:
        'Movement characteristics, stride cadence, and posture dynamics captured via walking video recordings.',
      href: '/screening/gait',
      uploaded: gaitDone,
      filename: screeningState.gait.filename,
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.5 12a7.5 7.5 0 0115 0" />
        </svg>
      ),
      buttonText: gaitDone ? 'Re-upload Gait Video' : 'Upload Gait Video',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-sky-100 selection:text-sky-900 font-sans relative">
      {/* Ambient background glow accent */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-sky-100/50 via-cyan-50/40 to-transparent blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Sticky Header / Navigation Bar matching Landing & Dashboard */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
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
            <span className="text-slate-300 font-light text-lg hidden sm:inline">/</span>
            <span className="text-xs sm:text-sm font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100 hidden sm:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
              Screening Hub
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm border border-slate-200/80 transition-all duration-200 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
        {/* Welcome / Header Banner Section matching Dashboard Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-50/90 via-white to-sky-50/40 border border-sky-100/80 p-6 sm:p-10 shadow-xs">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-sky-200/70 text-[#0284c7] text-xs font-semibold uppercase tracking-wider shadow-2xs">
              <svg className="w-3.5 h-3.5 text-[#0284c7]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h3l1.5-4.5L10.5 18l2.25-9 1.5 4.5h4.5" />
              </svg>
              <span>Multimodal Screening Protocol</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Multimodal Parkinson's Screening
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              To guarantee thorough clinical evaluation, all three digital biomarker modalities (Speech, Handwriting, and Gait) must be uploaded before generating the unified AI screening report.
            </p>
          </div>
        </section>

        {/* Overall Progress Indicator Bar */}
        <section className="bg-white rounded-2xl border border-slate-200/70 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Upload Completion Progress</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {completedCount}/3 Ready
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {isAllUploaded
                  ? 'All 3 modalities successfully uploaded. Ready for multimodal analysis.'
                  : `Upload remaining ${3 - completedCount} required digital biomarker${3 - completedCount === 1 ? '' : 's'} to proceed.`}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border shadow-2xs transition-colors ${
                isAllUploaded
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-sky-50 border-sky-200 text-sky-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAllUploaded ? 'bg-emerald-500 animate-pulse' : 'bg-[#0284c7]'}`} />
              <span>{completedCount} of 3 completed</span>
            </div>
          </div>

          {/* Visual Progress Track */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isAllUploaded
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-sky-500 to-[#0284c7]'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </section>

        {/* Modality Upload Cards Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Screening Modalities</h2>
            <span className="text-xs sm:text-sm font-medium text-slate-500">3 Modalities Required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card) => {
              return (
                <div
                  key={card.id}
                  className={`bg-white rounded-2xl p-6 sm:p-7 border transition-all duration-200 flex flex-col justify-between relative group ${
                    card.uploaded
                      ? 'border-emerald-300 shadow-md shadow-emerald-50/50 ring-1 ring-emerald-200'
                      : 'border-slate-200/70 shadow-sm hover:shadow-md hover:border-sky-200 hover:-translate-y-0.5'
                  }`}
                >
                  {card.uploaded && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-xs">
                      Completed
                    </div>
                  )}

                  <div>
                    {/* Top Row: Icon and Modality Category Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${
                        card.uploaded
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-sky-50 border-sky-100 text-[#0284c7] group-hover:scale-105'
                      }`}>
                        {card.uploaded ? (
                          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          card.icon
                        )}
                      </div>

                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        card.uploaded
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-sky-50 text-sky-700 border-sky-100'
                      }`}>
                        {card.badge}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2">
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-[#0284c7] transition-colors">
                        {card.title}
                      </h3>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${
                        card.uploaded
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${card.uploaded ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {card.uploaded ? 'Uploaded' : 'Not uploaded'}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-400 mt-1">{card.subtitle}</p>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{card.description}</p>
                  </div>

                  {/* Upload File Badge & Action Link */}
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                    {card.uploaded && card.filename && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900 font-medium truncate">
                        <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="truncate">{card.filename}</span>
                      </div>
                    )}

                    <Link
                      to={card.href}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 text-center flex items-center justify-center gap-2 active:scale-[0.98] ${
                        card.uploaded
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-2xs'
                          : 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sm shadow-sky-200/60 hover:shadow-md hover:shadow-sky-200'
                      }`}
                    >
                      <span>{card.buttonText}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Final Submission & Analyze CTA Section matching Dashboard Style */}
        <section className="bg-white rounded-2xl border border-slate-200/70 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Multimodal Screening Analysis</h2>
            <p className="text-sm text-slate-600">
              Once all three required digital biomarker modalities are uploaded, you can initiate analysis to generate the multimodal screening report.
            </p>
          </div>

          {/* Status Alert Banner */}
          {isAllUploaded ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">All 3 modalities uploaded successfully</p>
                <p className="text-xs text-emerald-700 mt-0.5">Speech, handwriting, and gait data are validated and ready for multimodal analysis.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-900 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">Incomplete Uploads ({completedCount} of 3)</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Please upload the remaining modality: <span className="font-semibold">{missingModalities.join(', ')}</span> before proceeding.
                </p>
              </div>
            </div>
          )}

          {analysisError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-rose-900">Analysis Error</p>
                <p className="text-xs text-rose-700 mt-0.5">{analysisError}</p>
              </div>
            </div>
          )}

          {/* Enforced Analyze & View Results Button */}
          <div>
            <button
              type="button"
              disabled={!isAllUploaded || isAnalyzing}
              onClick={handleContinueToResults}
              className={`w-full py-4 px-6 rounded-xl font-bold text-base sm:text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                isAllUploaded && !isAnalyzing
                  ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-md shadow-sky-200/80 hover:shadow-lg hover:shadow-sky-200 cursor-pointer active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/80 opacity-80'
              }`}
            >
              {isAnalyzing ? (
                <svg className="animate-spin w-5 h-5 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : !isAllUploaded ? (
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5a3.75 3.75 0 01-7 0m7 0a3.75 3.75 0 00-7 0m0 0H5" />
                </svg>
              )}
              <span>
                {isAnalyzing
                  ? 'Running Multimodal Analysis...'
                  : isAllUploaded
                  ? 'Analyze & View Screening Report'
                  : `Upload All 3 Modalities to Analyze (${completedCount}/3)`}
              </span>
            </button>
          </div>
        </section>

        {/* Clinical Disclaimer Banner */}
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
                NeuroNest AI is an AI-assisted screening and support tool. It is not a substitute for professional medical diagnosis. All screening results should be reviewed by a qualified healthcare provider before making clinical decisions.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer matching Landing Page */}
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
