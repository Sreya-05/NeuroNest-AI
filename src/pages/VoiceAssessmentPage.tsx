import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadFile } from '../api/upload';
import { setModalityUploaded, getScreeningState, setAnalysisResult } from '../utils/screeningState';
import { runMultimodalAnalysis } from '../api/analysis';

const ACCEPTED_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.ogg', '.webm'];
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

export default function VoiceAssessmentPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setProcessingMessage(false);
    setUploadMessage(null);
    setIsSuccess(false);
    if (!selected) {
      setError(null);
      return;
    }
    const ext = getFileExtension(selected.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(
        `Invalid file type. Accepted formats: ${ACCEPTED_EXTENSIONS.join(', ')}`
      );
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
  };

  const handleRemove = () => {
    setFile(null);
    setError(null);
    setProcessingMessage(false);
    setUploadMessage(null);
    setIsSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!file || processingMessage) return;
    setProcessingMessage(true);
    setUploadMessage(null);
    try {
      const response = await uploadFile("/api/upload/speech", file);
      setModalityUploaded('speech', response.original_filename, response.saved_filename);
      setIsSuccess(true);
      setUploadMessage(`Speech sample uploaded successfully (${response.original_filename}).`);

      const current = getScreeningState();
      if (current.speech.uploaded && current.handwriting.uploaded && current.gait.uploaded) {
        const speechFile = current.speech.savedFilename || current.speech.filename;
        const handwritingFile = current.handwriting.savedFilename || current.handwriting.filename;
        const gaitFile = current.gait.savedFilename || current.gait.filename;
        if (speechFile && handwritingFile && gaitFile) {
          runMultimodalAnalysis({
            speech_filename: speechFile,
            handwriting_filename: handwritingFile,
            gait_filename: gaitFile,
          })
            .then(setAnalysisResult)
            .catch((e) => console.warn('Background multimodal analysis note:', e));
        }
      }
    } catch (err) {
      setIsSuccess(false);
      setUploadMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setProcessingMessage(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-sky-100 selection:text-sky-900 font-sans">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
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

          <button
            type="button"
            onClick={() => navigate('/screening')}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm border border-slate-200/80 transition-all duration-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Back to Screening</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
        <section className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-semibold uppercase tracking-wider">
            Audio Biomarker
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Speech Analysis</h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Upload a speech or audio sample for analysis as part of the multimodal Parkinson's screening.
          </p>
        </section>

        {/* Upload Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Upload Speech Audio File</h2>

            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.m4a,.ogg,.webm"
              onChange={handleFileChange}
              className="hidden"
            />

            {!file ? (
              <button
                type="button"
                onClick={openFilePicker}
                className="w-full flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed border-slate-300 hover:border-[#0284c7] rounded-2xl bg-slate-50/50 hover:bg-sky-50/40 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284c7] mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-800">Click to select audio file or drag & drop</p>
                <p className="text-xs text-slate-500 mt-1">Accepted formats: WAV, MP3, M4A, OGG, WEBM (max 50 MB)</p>
              </button>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-sky-50/60 border border-sky-100">
                  <div className="w-10 h-10 rounded-xl bg-[#0284c7] flex items-center justify-center text-white flex-shrink-0 shadow-xs">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2"
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="flex-1 bg-white border border-rose-200 text-rose-600 py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-rose-600 font-medium" role="alert">
                {error}
              </p>
            )}

            <div className="pt-2">
              <button
                type="button"
                disabled={!file || processingMessage}
                onClick={handleAnalyze}
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white py-3.5 px-6 rounded-xl font-semibold text-base transition-all duration-200 shadow-sm shadow-sky-200/60 hover:shadow-md hover:shadow-sky-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2"
              >
                {processingMessage ? "Uploading Speech..." : "Upload & Save Speech Sample"}
              </button>

              {uploadMessage && (
                <div className={`mt-4 p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
                  isSuccess
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}>
                  <span>{uploadMessage}</span>
                  {isSuccess && (
                    <button
                      type="button"
                      onClick={() => navigate('/screening')}
                      className="ml-3 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Return to Screening Checklist →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
