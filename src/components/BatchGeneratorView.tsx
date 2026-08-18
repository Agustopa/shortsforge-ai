import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  Clock,
  Download,
  Globe,
  Film
} from 'lucide-react';
import { LanguageCode, VideoDuration, ContentStyle, Project } from '../types/index';

interface BatchGeneratorViewProps {
  projects: Project[];
  onStartBatch: (topics: string[], config: { language: LanguageCode; duration: VideoDuration; contentStyle: ContentStyle }) => void;
  onOpenProject: (projectId: string) => void;
}

export const BatchGeneratorView: React.FC<BatchGeneratorViewProps> = ({
  projects,
  onStartBatch,
  onOpenProject
}) => {
  const [topicsText, setTopicsText] = useState(
    `5 fakta unik tentang Bali yang jarang diketahui\n3 rahasia piramida Mesir yang baru terungkap\nCara kerja AI reasoning dalam 30 detik\nAlasan kenapa kopi bisa bikin fokus`
  );
  const [language, setLanguage] = useState<LanguageCode>('id');
  const [duration, setDuration] = useState<VideoDuration>(30);
  const [contentStyle, setContentStyle] = useState<ContentStyle>('Viral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topicsList = topicsText
    .split('\n')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const handleStart = () => {
    if (topicsList.length === 0) return;
    setIsSubmitting(true);
    onStartBatch(topicsList, { language, duration, contentStyle });
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const batchProjects = projects.filter(p => p.id.includes('batch'));

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-bold uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          <span>High-Volume Factory</span>
        </div>
        <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
          Batch Video Generator
        </h2>
        <p className="text-slate-400 text-sm">
          Generate multiple short videos simultaneously from a list of topics or titles.
        </p>
      </div>

      {/* Batch Input Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Enter Topics (One topic per line)
          </label>
          <textarea
            rows={5}
            value={topicsText}
            onChange={e => setTopicsText(e.target.value)}
            placeholder="Paste multiple topics here, one per line..."
            className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{topicsList.length} topics detected</span>
            <span>Estimated generation time: ~{topicsList.length * 15}s total</span>
          </div>
        </div>

        {/* Global Batch Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400">Language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as LanguageCode)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs cursor-pointer"
            >
              <option value="id">🇮🇩 Indonesian</option>
              <option value="en">🇺🇸 English</option>
              <option value="zh">🇨🇳 Chinese</option>
              <option value="ja">🇯🇵 Japanese</option>
              <option value="es">🇪🇸 Spanish</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400">Duration</label>
            <select
              value={duration}
              onChange={e => setDuration(Number(e.target.value) as VideoDuration)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs cursor-pointer"
            >
              <option value={15}>15 Seconds</option>
              <option value={30}>30 Seconds (Recommended)</option>
              <option value={45}>45 Seconds</option>
              <option value={60}>60 Seconds</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400">Content Style</label>
            <select
              value={contentStyle}
              onChange={e => setContentStyle(e.target.value as ContentStyle)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs cursor-pointer"
            >
              <option value="Viral">Viral Style</option>
              <option value="Educational">Educational</option>
              <option value="Facts">Facts / Trivia</option>
              <option value="Storytelling">Storytelling</option>
              <option value="Motivation">Motivation</option>
            </select>
          </div>
        </div>

        {/* Start Button */}
        <button
          id="btn-start-batch"
          onClick={handleStart}
          disabled={topicsList.length === 0 || isSubmitting}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white font-extrabold text-base shadow-xl shadow-purple-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5" />
          <span>GENERATE {topicsList.length} VIDEOS IN BATCH</span>
        </button>
      </div>

      {/* Batch Processing Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100">Batch Generation Queue</h3>
        {batchProjects.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
            No batch jobs run in this session yet.
          </div>
        ) : (
          <div className="space-y-2">
            {batchProjects.map(bp => {
              const isDone = bp.status === 'COMPLETED';

              return (
                <div
                  key={bp.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      <Film className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-200 truncate">{bp.title || bp.topic}</h4>
                      <p className="text-xs text-slate-500">{bp.currentStage || bp.status}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-bold text-amber-400">{bp.progress || 0}%</span>
                    {isDone && bp.videoUrl ? (
                      <a
                        href={bp.videoUrl}
                        download={`shortsforge_${bp.id}.mp4`}
                        className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : null}
                    <button
                      onClick={() => onOpenProject(bp.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      Open
                    </button>
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
