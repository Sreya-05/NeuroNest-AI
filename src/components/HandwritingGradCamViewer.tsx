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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <h3 className="text-base font-bold text-slate-800">
              Handwriting AI Explainability (Grad-CAM)
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
            EfficientNet-B0
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {gradcam?.error
            ? `Model attention map could not be computed: ${gradcam.error}`
            : 'Grad-CAM visual attribution was not generated for this handwriting sample. The numerical screening results above remain fully valid.'}
        </p>
      </div>
    );
  }

  const {
    target_layer = 'EfficientNet-B0.features[8]',
    target_class_label = 'PD',
    target_class_name = "Parkinson's Motor Indicator",
    original_image,
    heatmap_image,
    overlay_image,
    max_activation = 1.0,
    explanation_summary,
    disclaimer,
  } = gradcam;

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
              Grad-CAM Visual Attribution
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Handwriting Deep Learning Attention Map
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Transparent spatial attention computed from EfficientNet-B0's final convolutional layer for {filename || 'the uploaded drawing'}.
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
            Blended Overlay
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
            Heatmap Only
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Visual Display */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {activeView === 'split' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {/* Original */}
              <div className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Uploaded Drawing
                </span>
                <img
                  src={original_image}
                  alt="Original handwriting sample"
                  className="rounded-lg max-h-64 object-contain shadow-xs border border-slate-200"
                />
              </div>

              {/* Overlay */}
              <div className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider mb-2">
                  Grad-CAM Attention Overlay
                </span>
                <img
                  src={overlay_image}
                  alt="Grad-CAM overlay on handwriting"
                  className="rounded-lg max-h-64 object-contain shadow-xs border border-slate-200"
                />
              </div>
            </div>
          ) : (
            <div className="relative bg-slate-900/5 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center w-full min-h-[300px]">
              {activeView === 'overlay' && overlay_image && (
                <img
                  src={overlay_image}
                  alt="Grad-CAM blended overlay"
                  className="rounded-xl max-h-80 sm:max-h-96 object-contain shadow-sm border border-slate-200"
                />
              )}
              {activeView === 'original' && original_image && (
                <img
                  src={original_image}
                  alt="Original uploaded handwriting"
                  className="rounded-xl max-h-80 sm:max-h-96 object-contain shadow-sm border border-slate-200"
                />
              )}
              {activeView === 'heatmap' && heatmap_image && (
                <img
                  src={heatmap_image}
                  alt="Grad-CAM activation heatmap"
                  className="rounded-xl max-h-80 sm:max-h-96 object-contain shadow-sm border border-slate-200"
                />
              )}

              {/* View Overlay Badge */}
              <div className="absolute top-6 left-6 px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-xs text-slate-800 text-xs font-semibold shadow-xs border border-slate-200/80">
                {activeView === 'overlay' && 'Blended Overlay (Alpha 0.6 / 0.4)'}
                {activeView === 'original' && 'Original Drawing Sample'}
                {activeView === 'heatmap' && 'Normalized Activation Heatmap'}
              </div>
            </div>
          )}

          {/* Colormap Legend */}
          <div className="w-full mt-4 flex items-center justify-between text-xs text-slate-500 px-2">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
              Low Model Attention (0.0)
            </span>
            <div className="h-2 flex-1 mx-4 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 via-yellow-400 to-red-600 opacity-90" />
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
              Peak Model Attention (1.0)
            </span>
          </div>
        </div>

        {/* Explainability Technical Details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Inference Attribution Metrics
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Backbone Layer:</span>
                <span className="font-mono font-semibold text-slate-800">{target_layer}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Attributed Class:</span>
                <span className="font-bold text-slate-800">
                  {target_class_label} ({target_class_name})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Peak Gradient Activation:</span>
                <span className="font-mono font-bold text-slate-800">
                  {(max_activation * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Feature Extraction:</span>
                <span className="font-semibold text-slate-700">1280 Conv Channels → Spatial Attributions</span>
              </div>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100 text-xs text-slate-700 space-y-2 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-sky-900">
              <svg className="w-4 h-4 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>How to interpret this visualization</span>
            </div>
            <p>
              {explanation_summary ||
                "Grad-CAM (Gradient-weighted Class Activation Mapping) computes the partial derivatives of the target classification score with respect to the feature maps in the final convolutional layer of EfficientNet-B0."}
            </p>
            <p className="text-slate-600">
              Warm regions (red, orange, yellow) indicate handwriting strokes, line trembles, or spatial curvature patterns that contributed most heavily to the model's classification output.
            </p>
          </div>

          {/* Disclaimer Banner */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-[11px] text-amber-900/90 leading-relaxed flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong>Model Attention Notice:</strong> {disclaimer || "Model attention maps reflect computational feature weighting in deep learning layers and are not a clinical diagnosis or medical evaluation."}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
