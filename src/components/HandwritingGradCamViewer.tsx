import { useState } from 'react';
import type { GradCamResult } from '../api/analysis';

interface HandwritingGradCamViewerProps {
  gradcam?: GradCamResult | null;
  filename?: string;
}

export default function HandwritingGradCamViewer({ gradcam, filename }: HandwritingGradCamViewerProps) {
  const [activeView, setActiveView] = useState<'overlay' | 'original' | 'heatmap' | 'split'>('overlay');

  if (!gradcam || !gradcam.available) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <h3 className="text-base font-bold text-slate-800">
            Handwriting Sample Analysis
          </h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {gradcam?.error
            ? `Detailed visual highlights could not be generated: ${gradcam.error}`
            : 'Visual highlight analysis was not generated for this handwriting sample. The overall screening results above remain complete and valid.'}
        </p>
      </div>
    );
  }

  const {
    original_image,
    heatmap_image,
    overlay_image,
  } = gradcam;

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
            Handwriting Sample Focus Map
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            These highlighted areas show which parts of the uploaded sample influenced the AI's decision most for {filename || 'your drawing'}.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveView('overlay')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'overlay'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Highlighted Drawing
          </button>
          <button
            type="button"
            onClick={() => setActiveView('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'split'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Side-by-Side
          </button>
          <button
            type="button"
            onClick={() => setActiveView('original')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'original'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Original Sample
          </button>
          <button
            type="button"
            onClick={() => setActiveView('heatmap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'heatmap'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Focus Heatmap
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div className="space-y-4">
        {activeView === 'split' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {/* Original */}
            <div className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                Original Uploaded Drawing
              </span>
              <img
                src={original_image}
                alt="Original handwriting drawing"
                className="rounded-xl max-h-72 object-contain shadow-xs border border-slate-200 bg-white"
              />
            </div>

            {/* Overlay */}
            <div className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wider mb-3">
                AI Focus Highlights
              </span>
              <img
                src={overlay_image}
                alt="AI highlighted regions on handwriting"
                className="rounded-xl max-h-72 object-contain shadow-xs border border-slate-200 bg-white"
              />
            </div>
          </div>
        ) : (
          <div className="relative bg-slate-900/5 border border-slate-200 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center w-full min-h-[300px]">
            {activeView === 'overlay' && overlay_image && (
              <img
                src={overlay_image}
                alt="Highlighted handwriting sample"
                className="rounded-xl max-h-80 sm:max-h-96 object-contain shadow-sm border border-slate-200 bg-white"
              />
            )}
            {activeView === 'original' && original_image && (
              <img
                src={original_image}
                alt="Original handwriting sample"
                className="rounded-xl max-h-80 sm:max-h-96 object-contain shadow-sm border border-slate-200 bg-white"
              />
            )}
            {activeView === 'heatmap' && heatmap_image && (
              <img
                src={heatmap_image}
                alt="AI activation heatmap"
                className="rounded-xl max-h-80 sm:max-h-96 object-contain shadow-sm border border-slate-200 bg-white"
              />
            )}

            <div className="absolute top-6 left-6 px-3 py-1 rounded-md bg-white/95 backdrop-blur-xs text-slate-800 text-xs font-semibold shadow-xs border border-slate-200/80">
              {activeView === 'overlay' && 'Highlighted Drawing Sample'}
              {activeView === 'original' && 'Original Drawing Sample'}
              {activeView === 'heatmap' && 'AI Focus Heatmap'}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="w-full flex items-center justify-between text-xs text-slate-600 px-2 pt-2">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
            Lower AI Focus
          </span>
          <div className="h-2 flex-1 mx-4 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 via-yellow-400 to-red-600 opacity-90" />
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
            Highest AI Focus
          </span>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 text-xs text-slate-700 space-y-1.5 leading-relaxed">
        <p className="font-bold text-sky-900">
          Understanding this Image
        </p>
        <p>
          These highlighted areas show which parts of the uploaded sample influenced the AI's decision most. Warmer colors (red, orange, and yellow) highlight the strokes the AI focused on most closely when evaluating the sample.
        </p>
      </div>
    </section>
  );
}
