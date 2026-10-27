import { useState, useMemo } from 'react';
import type { SpeechAttributionResult } from '../api/analysis';

interface SpeechAttributionViewerProps {
  attribution?: SpeechAttributionResult | null;
  filename?: string;
}

export default function SpeechAttributionViewer({ attribution, filename }: SpeechAttributionViewerProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'dual' | 'attribution' | 'waveform'>('dual');

  const timeline = attribution?.timeline || [];

  // Find top peak frames for quick reference (unconditional hook call)
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

  if (!attribution || !attribution.available) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <h3 className="text-base font-bold text-slate-800">
            Voice Recording Timeline
          </h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {attribution?.error
            ? `Detailed timeline could not be displayed: ${attribution.error}`
            : 'Detailed timeline information is not available for this sample. The overall screening results above remain complete and valid.'}
        </p>
      </div>
    );
  }

  const {
    duration_seconds = 0,
    peak_attribution_time = 0,
  } = attribution;

  const hoveredPoint = hoveredIndex !== null && timeline[hoveredIndex] ? timeline[hoveredIndex] : null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Why did the AI make this result?
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Voice Recording Focus Timeline
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            These highlighted areas show which parts of the uploaded sample influenced the AI's decision most. Highlighted time periods influenced the prediction for {filename || 'your voice recording'}.
          </p>
        </div>

        {/* View Switcher */}
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
            Combined View
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
            AI Focus Only
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
            Sound Waveform
          </button>
        </div>
      </div>

      {/* Main Interactive Timeline Canvas */}
      <div className="space-y-4">
        {/* Hover Information */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-600">
              Recording Length: <strong className="text-slate-800">{duration_seconds}s</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Peak Focus Moment: <strong className="text-[#0284c7]">{peak_attribution_time}s</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hoveredPoint ? (
              <span className="text-slate-800 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                <span>Time: <strong>{hoveredPoint.time_sec.toFixed(2)}s</strong></span>
                <span>•</span>
                <span>AI Focus: <strong>{(hoveredPoint.attribution * 100).toFixed(0)}%</strong></span>
              </span>
            ) : (
              <span className="text-slate-400 italic">Hover over the timeline to inspect specific moments</span>
            )}
          </div>
        </div>

        {/* SVG Timeline Chart */}
        <div className="relative bg-slate-900/5 rounded-2xl p-4 sm:p-6 border border-slate-200 overflow-hidden">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-2 px-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-sky-400 to-amber-500 inline-block" />
              {viewMode === 'dual' && 'AI Focus (Bars) & Sound Waveform (Line)'}
              {viewMode === 'attribution' && 'AI Focus Over Time'}
              {viewMode === 'waveform' && 'Voice Sound Waveform'}
            </span>
            <span className="font-mono text-[11px] text-slate-400">0.00s → {duration_seconds.toFixed(2)}s</span>
          </div>

          <div className="w-full h-44 sm:h-52 relative flex items-end">
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

              {/* Waveform Line */}
              {(viewMode === 'dual' || viewMode === 'waveform') && (
                <polyline
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="0.75"
                  opacity={viewMode === 'dual' ? 0.45 : 0.85}
                  points={timeline
                    .map((pt, idx) => `${idx},${100 - Math.max(2, pt.amplitude * 85)}`)
                    .join(' ')}
                />
              )}

              {/* Cursor Line */}
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
          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 px-1 border-t border-slate-200/80 pt-1">
            <span>0.0s</span>
            <span>{(duration_seconds * 0.25).toFixed(1)}s</span>
            <span>{(duration_seconds * 0.5).toFixed(1)}s</span>
            <span>{(duration_seconds * 0.75).toFixed(1)}s</span>
            <span>{duration_seconds.toFixed(1)}s</span>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 pt-3 border-t border-slate-200/60">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#38bdf8] inline-block" />
                Standard Focus
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] inline-block" />
                Moderate Focus
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#f43f5e] inline-block" />
                Highest AI Focus
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Highlighted time periods influenced the prediction
            </span>
          </div>
        </div>
      </div>

      {/* Highest Focus Moments Callout */}
      {peakRegions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
          <span className="font-semibold text-slate-700">Moments of Highest AI Focus:</span>
          {peakRegions.map((p, idx) => (
            <span
              key={`peak-${idx}`}
              className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium text-[11px]"
            >
              at {p.time.toFixed(2)}s ({(p.score * 100).toFixed(0)}% focus)
            </span>
          ))}
        </div>
      )}

      {/* Plain-English Explanation Note */}
      <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 text-xs text-slate-700 space-y-1.5 leading-relaxed">
        <p className="font-bold text-sky-900">
          Understanding this Timeline
        </p>
        <p>
          These highlighted areas show which parts of the uploaded sample influenced the AI's decision most. Highlighted time periods influenced the prediction by showing where the audio had the strongest impact on the result.
        </p>
      </div>
    </section>
  );
}
