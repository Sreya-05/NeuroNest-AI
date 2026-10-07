import { useState, useMemo } from 'react';
import type { SpeechAttributionResult } from '../api/analysis';

interface SpeechAttributionViewerProps {
  attribution?: SpeechAttributionResult | null;
  filename?: string;
}

export default function SpeechAttributionViewer({ attribution, filename }: SpeechAttributionViewerProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'dual' | 'attribution' | 'waveform'>('dual');

  if (!attribution || !attribution.available) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <h3 className="text-base font-bold text-slate-800">
              Speech AI Explainability (Wav2Vec2)
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
            Wav2Vec2-Base
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {attribution?.error
            ? `Temporal attribution could not be computed: ${attribution.error}`
            : 'Temporal acoustic attribution was not generated for this speech sample. The numerical screening results above remain fully valid.'}
        </p>
      </div>
    );
  }

  const {
    target_layer = 'Wav2Vec2.last_hidden_state',
    target_class_label = 'PD',
    target_class_name = "Parkinson's Acoustic Indication",
    duration_seconds = 0,
    frame_count = 0,
    time_step_ms = 20,
    peak_attribution_time = 0,
    mean_attribution = 0,
    max_attribution = 1,
    timeline = [],
    explanation_summary,
    disclaimer,
  } = attribution;

  const hoveredPoint = hoveredIndex !== null && timeline[hoveredIndex] ? timeline[hoveredIndex] : null;

  // Find top peak frames for quick reference
  const peakRegions = useMemo(() => {
    if (!timeline.length) return [];
    const threshold = 0.7; // Top 30% intensity
    const peaks: { time: number; score: number }[] = [];
    timeline.forEach((pt) => {
      if (pt.attribution >= threshold) {
        peaks.push({ time: pt.time_sec, score: pt.attribution });
      }
    });
    return peaks.slice(0, 5);
  }, [timeline]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Explainable AI (XAI)
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Gradient × Activation Temporal Attribution
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Speech Acoustic Timeline Attribution
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Time-resolved gradient sensitivity across Wav2Vec2 representations for {filename || 'the uploaded speech sample'}.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            type="button"
            onClick={() => setViewMode('dual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'dual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dual Timeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode('attribution')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'attribution'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Attribution Only
          </button>
          <button
            type="button"
            onClick={() => setViewMode('waveform')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'waveform'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Waveform Only
          </button>
        </div>
      </div>

      {/* Main Interactive Timeline Canvas */}
      <div className="space-y-4">
        {/* Interactive Stats Callout on Hover */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-500">
              Audio Duration:{' '}
              <strong className="text-slate-800 font-mono">{duration_seconds}s</strong> ({frame_count} frames @ {time_step_ms}ms)
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              Peak Attribution:{' '}
              <strong className="text-[#0284c7] font-mono">{peak_attribution_time}s</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hoveredPoint ? (
              <span className="font-mono text-slate-800 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                <span>Time: <strong>{hoveredPoint.time_sec.toFixed(2)}s</strong></span>
                <span>•</span>
                <span>Attribution: <strong>{(hoveredPoint.attribution * 100).toFixed(1)}%</strong></span>
                <span>•</span>
                <span>RMS Amplitude: <strong>{(hoveredPoint.amplitude * 100).toFixed(0)}%</strong></span>
              </span>
            ) : (
              <span className="text-slate-400 italic">Hover over the timeline to inspect specific timeframes</span>
            )}
          </div>
        </div>

        {/* SVG Visualization Stage */}
        <div className="relative bg-slate-900/5 rounded-2xl p-4 sm:p-6 border border-slate-200 overflow-hidden">
          {/* Top Label */}
          <div className="flex justify-between items-center text-xs text-slate-500 mb-2 px-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-sky-400 to-amber-500 inline-block" />
              {viewMode === 'dual' && 'Model Feature Attribution (Bars) & Waveform Amplitude (Outline)'}
              {viewMode === 'attribution' && 'Wav2Vec2 Frame-Level Gradient Attribution'}
              {viewMode === 'waveform' && 'Audio Acoustic Waveform (Normalized RMS)'}
            </span>
            <span className="font-mono text-[11px] text-slate-400">0.00s → {duration_seconds.toFixed(2)}s</span>
          </div>

          {/* Canvas Render via SVG */}
          <div className="w-full h-48 sm:h-56 relative flex items-end">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${timeline.length} 100`}
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Gridlines */}
              <line x1="0" y1="25" x2={timeline.length} y2="25" stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="0.5" />
              <line x1="0" y1="50" x2={timeline.length} y2="50" stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="0.5" />
              <line x1="0" y1="75" x2={timeline.length} y2="75" stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="0.5" />

              {/* Attribution Bars */}
              {(viewMode === 'dual' || viewMode === 'attribution') &&
                timeline.map((pt, idx) => {
                  const barHeight = Math.max(2, pt.attribution * 85);
                  const isHovered = hoveredIndex === idx;
                  // Color gradient based on intensity: low = sky, high = amber/rose
                  const fillColor =
                    pt.attribution > 0.7
                      ? isHovered ? '#e11d48' : '#f43f5e'
                      : pt.attribution > 0.4
                      ? isHovered ? '#d97706' : '#f59e0b'
                      : isHovered ? '#0284c7' : '#38bdf8';

                  return (
                    <rect
                      key={`bar-${idx}`}
                      x={idx}
                      y={100 - barHeight}
                      width={0.85}
                      height={barHeight}
                      fill={fillColor}
                      opacity={isHovered ? 1 : 0.85}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      className="cursor-pointer transition-opacity"
                    />
                  );
                })}

              {/* Waveform Line & Fill */}
              {(viewMode === 'dual' || viewMode === 'waveform') && (
                <>
                  <polyline
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="0.75"
                    opacity={viewMode === 'dual' ? 0.45 : 0.85}
                    points={timeline
                      .map((pt, idx) => `${idx},${100 - Math.max(2, pt.amplitude * 85)}`)
                      .join(' ')}
                  />
                </>
              )}

              {/* Hover Cursor Vertical Line */}
              {hoveredIndex !== null && (
                <line
                  x1={hoveredIndex}
                  y1="0"
                  x2={hoveredIndex}
                  y2="100"
                  stroke="#0284c7"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}
            </svg>
          </div>

          {/* Time axis ticks */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-2 px-1 border-t border-slate-200/80 pt-1">
            <span>0.0s</span>
            <span>{(duration_seconds * 0.25).toFixed(1)}s</span>
            <span>{(duration_seconds * 0.5).toFixed(1)}s</span>
            <span>{(duration_seconds * 0.75).toFixed(1)}s</span>
            <span>{duration_seconds.toFixed(1)}s</span>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 pt-3 border-t border-slate-200/60">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#38bdf8] inline-block" />
                Baseline Sensitivity (&lt;40%)
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] inline-block" />
                Moderate Attribution (40-70%)
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#f43f5e] inline-block" />
                High Attribution Peak (&gt;70%)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Sensitivity Method: $\nabla \cdot A$ (Gradient $\times$ Activation)
            </span>
          </div>
        </div>
      </div>

      {/* Attribution Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Attributed Class</p>
          <p className="text-lg font-black text-slate-900">
            {target_class_label} ({target_class_name})
          </p>
          <p className="text-xs text-slate-400 font-mono">Layer: {target_layer}</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Peak Sensitivity Time</p>
          <p className="text-lg font-black text-[#0284c7]">
            {peak_attribution_time}s
          </p>
          <p className="text-xs text-slate-500">
            Highest gradient influence on output score
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Temporal Coverage</p>
          <p className="text-lg font-black text-slate-900">
            {frame_count} frames
          </p>
          <p className="text-xs text-slate-500">
            Mean: {(mean_attribution * 100).toFixed(1)}% | Peak: {(max_attribution * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* High-Attribution Acoustic Windows Callout */}
      {peakRegions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
          <span className="font-semibold text-slate-700">Top Sensitivity Windows:</span>
          {peakRegions.map((p, idx) => (
            <span
              key={`peak-${idx}`}
              className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[11px]"
            >
              {p.time.toFixed(2)}s ({(p.score * 100).toFixed(0)}%)
            </span>
          ))}
        </div>
      )}

      {/* Explanation Summary & Clinical Disclaimer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Interpretation Note */}
        <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100 text-xs text-slate-700 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-sky-900">
            <svg className="w-4 h-4 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Interpretation of Speech Attribution</span>
          </div>
          <p>
            {explanation_summary ||
              "Wav2Vec2 processes 16kHz speech audio and outputs 768-dimensional temporal representations. Frame-level gradient attribution highlights the phonation and articulation windows where acoustic dynamics most heavily influenced the classifier."}
          </p>
          <p className="text-slate-600">
            Peaks indicate acoustic instability (e.g., vocal tremor, pitch fluctuations, or voice breaks) correlated with the model's prediction.
          </p>
        </div>

        {/* Medical Disclaimer */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-900/90 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Algorithmic Feature Attribution Notice</span>
          </div>
          <p>
            {disclaimer ||
              "Acoustic temporal attribution is provided strictly for model explainability and algorithmic transparency. It is not a clinical diagnosis or medical evaluation."}
          </p>
          <p className="text-amber-800">
            Screening results must be interpreted by a licensed healthcare professional in conjunction with clinical motor assessments.
          </p>
        </div>
      </div>
    </section>
  );
}
