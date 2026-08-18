import React, { useState } from 'react';
import {
  Film,
  CheckCircle,
  Clock,
  Sparkles,
  Play,
  ArrowRight,
  Download,
  Trash2,
  Copy,
  Plus,
  Flame,
  Globe,
  SlidersHorizontal
} from 'lucide-react';
import { Project, ContentIdea } from '../types/index';

interface DashboardViewProps {
  projects: Project[];
  ideas: ContentIdea[];
  onCreateNew: (initialTopic?: string) => void;
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (projectId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  ideas,
  onCreateNew,
  onOpenProject,
  onDeleteProject,
  onDuplicateProject
}) => {
  const [quickTopic, setQuickTopic] = useState('');

  const completedCount = projects.filter(p => p.status === 'COMPLETED').length;
  const processingCount = projects.filter(p => !['COMPLETED', 'FAILED', 'CANCELLED', 'DRAFT'].includes(p.status)).length;
  const totalCount = projects.length;

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickTopic.trim()) {
      onCreateNew(quickTopic.trim());
    }
  };

  const sampleIdeas = [
    '5 fakta unik tentang Bali yang jarang diketahui',
    'How AI will actually change your daily routine in 2026',
    'Rahasia di balik arsitektur kuno Candi Borobudur',
    'The 2-minute rule that cures procrastination instantly'
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Videos</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100 mt-2">{totalCount}</p>
          <p className="text-xs text-slate-500 mt-1">Shorts, Reels & TikToks</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-2">{completedCount}</p>
          <p className="text-xs text-slate-500 mt-1">1080x1920 MP4 ready</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Generating</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-orange-400 mt-2">{processingCount}</p>
          <p className="text-xs text-slate-500 mt-1">Live background queue</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Engine Pipeline</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-violet-400 mt-2">14</p>
          <p className="text-xs text-slate-500 mt-1">Automated AI stages</p>
        </div>
      </div>

      {/* Hero Quick-Creation Station */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800/80 p-6 md:p-8 shadow-2xl overflow-hidden">
        {/* Subtle glow background */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ShortsForge Auto Mode</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Turn one idea into a complete short video.
          </h2>
          <p className="text-slate-400 text-sm md:text-base mt-2">
            No complex manual editing needed. Sourcing, spoken script, voice synthesis, synchronized viral subtitles, and FFmpeg 9:16 rendering happen automatically.
          </p>

          {/* Quick Input Form */}
          <form onSubmit={handleQuickSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                id="input-dashboard-topic"
                type="text"
                value={quickTopic}
                onChange={e => setQuickTopic(e.target.value)}
                placeholder="What do you want to make a video about? (e.g. 5 fakta mengejutkan tentang Bali)"
                className="w-full h-14 pl-5 pr-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 shadow-inner"
              />
            </div>
            <button
              id="btn-dashboard-generate"
              type="submit"
              className="h-14 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-extrabold text-base shadow-lg shadow-orange-950/50 hover:shadow-orange-900/70 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Sparkles className="w-5 h-5 text-slate-950" />
              <span>Generate Video</span>
            </button>
          </form>

          {/* Sample Topic Chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Try an idea:</span>
            </span>
            {sampleIdeas.map((s, idx) => (
              <button
                key={idx}
                onClick={() => onCreateNew(s)}
                className="px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Videos Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-100 tracking-tight">Recent Videos</h3>
            <p className="text-xs text-slate-400">Manage, edit, duplicate or export your rendered short videos</p>
          </div>
          <button
            id="btn-view-all-projects"
            onClick={() => onCreateNew()}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <span>+ New Project</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80">
            <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-slate-300">No videos created yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Enter any topic in the box above to generate your first 9:16 portrait short video.
            </p>
            <button
              onClick={() => onCreateNew('5 fakta mengejutkan tentang Bali')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-950/40"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Create Bali Sample Video</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {projects.map(proj => {
              const isDone = proj.status === 'COMPLETED';
              const isProcessing = !['COMPLETED', 'FAILED', 'CANCELLED', 'DRAFT'].includes(proj.status);

              return (
                <div
                  key={proj.id}
                  id={`project-card-${proj.id}`}
                  className="group rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all overflow-hidden flex flex-col shadow-md"
                >
                  {/* Thumbnail / Preview Area (9:16 Aspect Box) */}
                  <div
                    onClick={() => onOpenProject(proj.id)}
                    className="relative aspect-[9/14] bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center"
                  >
                    {proj.thumbnailUrl ? (
                      <img
                        src={proj.thumbnailUrl}
                        alt={proj.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : proj.scenes[0]?.visual_url ? (
                      <img
                        src={proj.scenes[0].visual_url}
                        alt={proj.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="p-4 text-center">
                        <Film className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                        <span className="text-[11px] text-slate-500 font-mono">1080x1920</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      {isDone ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-slate-950 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                          Ready ({proj.duration}s)
                        </span>
                      ) : isProcessing ? (
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/90 text-slate-950 text-[10px] font-bold uppercase tracking-wider animate-pulse backdrop-blur-sm">
                          {proj.progress}% {proj.status}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                          {proj.status}
                        </span>
                      )}
                    </div>

                    {/* Play Hover Overlay */}
                    {isDone && (
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-100 line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
                        {proj.title || proj.topic}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {proj.language.toUpperCase()}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {proj.contentStyle}
                        </span>
                        <span>{proj.scenes?.length || 0} scenes</span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/60">
                      <button
                        onClick={() => onOpenProject(proj.id)}
                        className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                        <span>Open</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {isDone && proj.videoUrl && (
                          <a
                            href={proj.videoUrl}
                            download={`shortsforge_${proj.id}.mp4`}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                            title="Download MP4"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => onDuplicateProject(proj.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteProject(proj.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
