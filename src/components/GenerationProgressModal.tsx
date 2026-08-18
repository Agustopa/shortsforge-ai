import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Film,
  ArrowRight,
  X
} from 'lucide-react';
import { Project, ProjectStatus } from '../types/index';

interface GenerationProgressModalProps {
  project: Project | null;
  onClose: () => void;
  onCancel: () => void;
  onOpenResult: (projectId: string) => void;
}

export const GenerationProgressModal: React.FC<GenerationProgressModalProps> = ({
  project,
  onClose,
  onCancel,
  onOpenResult
}) => {
  if (!project) return null;

  const isCompleted = project.status === 'COMPLETED';
  const isFailed = project.status === 'FAILED';
  const isCancelled = project.status === 'CANCELLED';

  const pipelineStages: { id: ProjectStatus; label: string; number: string }[] = [
    { id: 'ANALYZING', label: 'Understanding topic & strategic angle', number: '01' },
    { id: 'RESEARCHING', label: 'Researching verified facts & sources', number: '02' },
    { id: 'WRITING_SCRIPT', label: 'Scoring viral hooks & narration script', number: '03' },
    { id: 'PLANNING_SCENES', label: 'Planning visual continuity & scenes', number: '04' },
    { id: 'GENERATING_VISUALS', label: 'Sourcing 9:16 high-motion visuals', number: '05' },
    { id: 'GENERATING_VOICE', label: 'Synthesizing voiceover & word timing', number: '06' },
    { id: 'GENERATING_SUBTITLES', label: 'Building synchronized subtitles', number: '07' },
    { id: 'RENDERING', label: 'Rendering 1080x1920 MP4 with FFmpeg', number: '08' },
    { id: 'QUALITY_CHECK', label: 'Automated Quality Control verification', number: '09' }
  ];

  const stageOrder: ProjectStatus[] = [
    'DRAFT',
    'ANALYZING',
    'RESEARCHING',
    'WRITING_SCRIPT',
    'PLANNING_SCENES',
    'COLLECTING_MEDIA',
    'GENERATING_VISUALS',
    'GENERATING_VOICE',
    'GENERATING_SUBTITLES',
    'MIXING_AUDIO',
    'RENDERING',
    'QUALITY_CHECK',
    'COMPLETED'
  ];

  const currentIdx = stageOrder.indexOf(project.status);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : isFailed ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              )}
              <span>
                {isCompleted
                  ? 'Video Ready for Export'
                  : isFailed
                  ? 'Generation Failed'
                  : isCancelled
                  ? 'Generation Cancelled'
                  : 'Automated Video Factory in Action'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 line-clamp-1">
              {project.title || project.topic}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar & Current Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 font-mono flex items-center gap-1.5">
              {!isCompleted && !isFailed && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
              {project.currentStage || 'Processing...'}
            </span>
            <span className="text-amber-400 font-bold font-mono">{project.progress || 0}%</span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted
                  ? 'bg-emerald-500'
                  : isFailed
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600'
              }`}
              style={{ width: `${Math.max(5, project.progress || 0)}%` }}
            />
          </div>
        </div>

        {/* Real-time Pipeline Stage List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {pipelineStages.map(st => {
            const stIdx = stageOrder.indexOf(st.id);
            const isDone = isCompleted || currentIdx > stIdx;
            const isCurrent = project.status === st.id;

            return (
              <div
                key={st.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'bg-amber-950/20 border-amber-500/40 text-amber-300 shadow-sm'
                    : isDone
                    ? 'bg-slate-950/40 border-slate-800/60 text-slate-300'
                    : 'bg-slate-950/20 border-transparent text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-500">{st.number}</span>
                  <span className="text-xs font-medium">{st.label}</span>
                </div>

                <div>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-700" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Per-Scene Visual Asset Progress Display */}
        {project.scenes && project.scenes.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Film className="w-3.5 h-3.5" />
                Scene Visual Footage Tracker ({project.scenes.filter(s => s.visual_url || s.visualAsset).length}/{project.scenes.length})
              </span>
              <span className="text-[10px] font-mono text-slate-400">1080x1920 9:16 Portrait</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {project.scenes.map((s, idx) => {
                const isReady = !!(s.visual_url || s.visualAsset);
                return (
                  <div
                    key={s.id || idx}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-[11px] ${
                      isReady
                        ? 'bg-slate-900/90 border-emerald-500/30 text-slate-200'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center font-mono text-[9px] font-bold text-amber-400 shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate font-medium">
                        {isReady ? (s.visual_provider || 'Visual Asset Ready') : `Scene ${idx + 1} Visual...`}
                      </span>
                    </div>
                    {isReady ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Note if failed */}
        {isFailed && project.error && (
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{project.error}</span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          {!isCompleted && !isFailed ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                Cancel Generation
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Run in Background
              </button>
            </>
          ) : isCompleted ? (
            <div className="w-full flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onOpenResult(project.id)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-bold text-xs shadow-lg shadow-orange-950/50 flex items-center gap-1.5 cursor-pointer"
              >
                <Film className="w-4 h-4 text-slate-950" />
                <span>Open Video Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
