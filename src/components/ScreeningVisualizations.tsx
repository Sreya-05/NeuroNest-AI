import type { MultimodalAnalysisResponse } from '../api/analysis';

interface ScreeningVisualizationsProps {
  data: MultimodalAnalysisResponse;
}

export default function ScreeningVisualizations({ data }: ScreeningVisualizationsProps) {
  const { modalities, combined_result: combined } = data;

  const clampProb = (val: number | undefined | null) => {
    if (typeof val !== 'number' || isNaN(val)) return 0;
    return Math.max(0, Math.min(1, val));
  };

  const toPct = (val: number | undefined | null, decimals = 1) => {
    return (clampProb(val) * 100).toFixed(decimals);
  };

  // 1. Voice Probabilities
  const speechHealthy = clampProb(modalities?.speech?.probabilities?.healthy_control);
  const speechParkinsons = clampProb(modalities?.speech?.probabilities?.parkinsons);

  // 2. Handwriting Probabilities
  const hwControl = clampProb(modalities?.handwriting?.probabilities?.control);
  const hwParkinsons = clampProb(modalities?.handwriting?.probabilities?.parkinsons);

  // 3. Walking Probabilities
  const gaitNormal = clampProb(modalities?.gait?.probabilities?.normal);
  const gaitMild = clampProb(modalities?.gait?.probabilities?.mild);
  const gaitModerate = clampProb(modalities?.gait?.probabilities?.moderate);
  const gaitSevere = clampProb(modalities?.gait?.probabilities?.severe);

  // 4. Overall metrics
  const compositeScore = clampProb(combined?.risk_score);
  const modelConfidence = clampProb(combined?.confidence);
  const elevatedCount = Math.max(0, Math.min(3, combined?.positive_modalities_count ?? 0));
  const isElevated = combined?.classification === 'Positive' || compositeScore >= 0.5;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            AI-Assisted Screening Summary
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Clear overview of your assessment results across voice, handwriting, and walking samples.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
          Patient Summary
        </span>
      </div>

      {/* Grid of 4 Simple Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: Voice Assessment */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:border-sky-200 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284c7]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Voice Assessment Breakdown</h3>
                <p className="text-xs text-slate-500">Audio sample evaluation</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              modalities?.speech?.label === 'PD'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {modalities?.speech?.label === 'PD' ? 'Elevated Finding' : 'Not Elevated'}
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {/* Typical Pattern Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Typical Speech Pattern
                </span>
                <span className="font-bold text-slate-800">{toPct(speechHealthy)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${speechHealthy * 100}%` }}
                />
              </div>
            </div>

            {/* Parkinson's Indicator Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-amber-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Parkinson's-related Model Indication
                </span>
                <span className="font-bold text-slate-800">{toPct(speechParkinsons)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${speechParkinsons * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>AI Screening Result: <strong className="text-slate-800">{modalities?.speech?.label === 'PD' ? 'Elevated' : 'Not Elevated'}</strong></span>
            <span>AI Confidence: <strong className="text-[#0284c7]">{toPct(modalities?.speech?.confidence)}%</strong></span>
          </div>
        </div>

        {/* CARD 2: Handwriting Assessment */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:border-sky-200 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284c7]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Handwriting Assessment Breakdown</h3>
                <p className="text-xs text-slate-500">Drawing sample evaluation</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              modalities?.handwriting?.label === 'PD'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {modalities?.handwriting?.label === 'PD' ? 'Elevated Finding' : 'Not Elevated'}
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {/* Typical Control Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Typical Handwriting Pattern
                </span>
                <span className="font-bold text-slate-800">{toPct(hwControl)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${hwControl * 100}%` }}
                />
              </div>
            </div>

            {/* Parkinson's Indicator Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-amber-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Parkinson's-related Model Indication
                </span>
                <span className="font-bold text-slate-800">{toPct(hwParkinsons)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${hwParkinsons * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>AI Screening Result: <strong className="text-slate-800">{modalities?.handwriting?.label === 'PD' ? 'Elevated' : 'Not Elevated'}</strong></span>
            <span>AI Confidence: <strong className="text-[#0284c7]">{toPct(modalities?.handwriting?.confidence)}%</strong></span>
          </div>
        </div>

        {/* CARD 3: Walking Assessment */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:border-sky-200 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284c7]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.5 12a7.5 7.5 0 0115 0" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Walking Assessment Breakdown</h3>
                <p className="text-xs text-slate-500">Walking video evaluation</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              modalities?.gait?.label === 'NORMAL'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {modalities?.gait?.label === 'NORMAL' ? 'Normal' : modalities?.gait?.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-emerald-800">Normal</span>
              <p className="text-lg font-black text-slate-900 my-1">{toPct(gaitNormal, 0)}%</p>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${gaitNormal * 100}%` }} />
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-amber-700">Mild</span>
              <p className="text-lg font-black text-slate-900 my-1">{toPct(gaitMild, 0)}%</p>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: `${gaitMild * 100}%` }} />
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-amber-800">Moderate</span>
              <p className="text-lg font-black text-slate-900 my-1">{toPct(gaitModerate, 0)}%</p>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="bg-amber-600 h-full rounded-full" style={{ width: `${gaitModerate * 100}%` }} />
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-rose-800">Severe</span>
              <p className="text-lg font-black text-slate-900 my-1">{toPct(gaitSevere, 0)}%</p>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${gaitSevere * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>AI Screening Result: <strong className="text-slate-800">{modalities?.gait?.label}</strong></span>
            <span>AI Confidence: <strong className="text-[#0284c7]">{toPct(modalities?.gait?.confidence)}%</strong></span>
          </div>
        </div>

        {/* CARD 4: Combined Overview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:border-sky-200 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284c7]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Combined Assessment Overview</h3>
                <p className="text-xs text-slate-500">Summary across all 3 assessments</p>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                isElevated
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {isElevated ? 'Elevated Finding' : 'Low Risk Indication'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Overall Screening Indicator */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Screening Indicator</span>
              <p className={`text-2xl font-black ${isElevated ? 'text-amber-800' : 'text-emerald-800'}`}>
                {toPct(compositeScore)}%
              </p>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isElevated ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${compositeScore * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">Combined result from the three uploaded samples</span>
            </div>

            {/* AI Confidence */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI Confidence</span>
              <p className="text-2xl font-black text-[#0284c7]">
                {toPct(modelConfidence)}%
              </p>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="bg-[#0284c7] h-full rounded-full transition-all duration-700"
                  style={{ width: `${modelConfidence * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">Model certainty across samples</span>
            </div>

            {/* Number of Areas Showing Elevated Findings */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Number of Areas Showing Elevated Findings</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800">
                  {elevatedCount} of 3
                </span>
                <span className="text-xs text-slate-500 font-medium">Areas</span>
              </div>
              <div className="grid grid-cols-3 gap-1 h-2">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className={`rounded-full transition-colors ${
                      idx < elevatedCount ? 'bg-amber-500' : 'bg-emerald-400'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-400">Voice • Handwriting • Walking</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>AI Screening Result: <strong className="text-slate-800">{isElevated ? 'Elevated Finding' : 'Low Risk Indication'}</strong></span>
            <span className="text-[11px] text-slate-500">Non-diagnostic screening support</span>
          </div>
        </div>

      </div>
    </section>
  );
}
