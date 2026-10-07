import { Link } from 'react-router-dom';

export default function LandingPage() {
  const modalities = [
    {
      title: 'Speech Analysis',
      description:
        'Evaluates acoustic biomarkers such as vocal tremor, sustained phonation pitch, and articulation rhythm.',
      href: '/screening/voice',
      badge: 'Audio Biomarkers',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      ),
    },
    {
      title: 'Handwriting Analysis',
      description:
        'Assesses fine motor control, pen movement variation, and micrographia patterns from drawn samples.',
      href: '/screening/handwriting',
      badge: 'Motor Biomarkers',
      icon: (
        <svg className="w-6 h-6 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 7.5l3-3m0 0l-3-3m3 3H15" />
        </svg>
      ),
    },
    {
      title: 'Gait Analysis',
      description:
        'Analyzes video recordings of walking motion to detect stride cadence, posture symmetry, and gait hesitations.',
      href: '/screening/gait',
      badge: 'Video Biomarkers',
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
      {/* Header / Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo & App Name */}
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

          {/* Auth Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2"
            >
              Login
            </Link>
            <Link
              to="/screening"
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-semibold transition-all duration-200 shadow-sm shadow-sky-200/50 hover:shadow-md hover:shadow-sky-200/80 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32 lg:pt-32 lg:pb-36 px-4 sm:px-6 lg:px-8">
          {/* Subtle Ambient Background Gradient Accents */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-sky-100/50 via-cyan-50/40 to-transparent blur-[120px] rounded-full pointer-events-none -z-10" />

          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            {/* Small Top Pill Badge */}
            <div className="inline-flex items-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50/90 border border-sky-200/70 text-[#0284c7] text-xs sm:text-sm font-medium shadow-xs">
                <svg className="w-3.5 h-3.5 text-[#0284c7] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h3l1.5-4.5L10.5 18l2.25-9 1.5 4.5h4.5" />
                </svg>
                <span>Multimodal Deep Learning Platform</span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              Early Detection of{' '}
              <span className="text-[#0284c7] block sm:inline mt-1 sm:mt-0">
                Parkinson's Disease
              </span>
            </h1>

            {/* Subheading / Description */}
            <p className="text-slate-600 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-normal">
              Upload handwriting samples, speech recordings, and gait videos. Our AI analyzes multiple biomarkers to provide early risk assessment with explainable predictions.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4 sm:pt-6">
              <Link
                to="/screening"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-base transition-all duration-200 shadow-sm shadow-sky-200/60 hover:shadow-md hover:shadow-sky-200 text-center active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2"
              >
                Start Assessment
              </Link>
              <a
                href="#modalities"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base border border-slate-200/80 transition-all duration-200 shadow-xs hover:border-slate-300 text-center active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
              >
                Learn More
              </a>
            </div>
          </div>
        </section>

        {/* Modalities Section */}
        <section id="modalities" className="py-16 sm:py-24 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <span className="text-xs sm:text-sm font-semibold tracking-wider text-[#0284c7] uppercase">
                Digital Biomarker Screening
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mt-2 tracking-tight">
                Multimodal Assessment Modalities
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Evaluate multiple neurological indicators through non-invasive digital screening tools.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {modalities.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="group bg-[#f8fafc] hover:bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100/50 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        {item.icon}
                      </div>
                      <span className="text-xs font-medium text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#0284c7] transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center text-sm font-semibold text-[#0284c7] group-hover:translate-x-1 transition-transform">
                    <span>Begin {item.title.split(' ')[0]} Test</span>
                    <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>

            {/* Medical AI Disclaimer Banner */}
            <div className="mt-12 sm:mt-16 bg-sky-50/60 border border-sky-100 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0284c7]/10 flex items-center justify-center text-[#0284c7] flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900">Clinical Decision Support Disclaimer</h4>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  NeuroNest AI provides early screening indicators based on digital biomarkers to assist healthcare professionals and clinical researchers. It is not an automated diagnostic tool. All outputs require clinical review.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-sm">
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
