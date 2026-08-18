import React, { useState } from 'react';
import {
  Lightbulb,
  Sparkles,
  TrendingUp,
  Flame,
  ArrowRight,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { ContentIdea } from '../types/index';

interface ContentIdeasViewProps {
  ideas: ContentIdea[];
  onSelectIdea: (topic: string, style?: string) => void;
  onRefreshIdeas: (niche: string) => void;
  isGenerating?: boolean;
}

export const ContentIdeasView: React.FC<ContentIdeasViewProps> = ({
  ideas,
  onSelectIdea,
  onRefreshIdeas,
  isGenerating = false
}) => {
  const [selectedNiche, setSelectedNiche] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const niches = [
    'All',
    'Facts',
    'Technology',
    'Travel',
    'History',
    'Motivation',
    'Business',
    'Mystery',
    'Food',
    'Science'
  ];

  const filtered = ideas.filter(idea => {
    const topicText = idea.topic || idea.title || '';
    const matchesNiche = selectedNiche === 'All' || idea.niche.toLowerCase() === selectedNiche.toLowerCase();
    const matchesSearch =
      topicText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (idea.hook || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (idea.concept || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesNiche && matchesSearch;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5" />
            <span>AI Viral Radar</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
            Content Ideas & Trends
          </h2>
          <p className="text-slate-400 text-sm">
            High-retention video concepts ready to turn into complete short videos in 1 click.
          </p>
        </div>

        <button
          onClick={() => onRefreshIdeas(selectedNiche)}
          disabled={isGenerating}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-orange-950/40 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Analyzing Trends...' : 'Generate New Viral Ideas'}</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Niche Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {niches.map(n => (
            <button
              key={n}
              onClick={() => setSelectedNiche(n)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                selectedNiche === n
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search ideas or keywords..."
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(idea => (
          <div
            key={idea.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-md"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  {idea.niche}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {idea.estimatedDuration}s · {idea.contentStyle}
                </span>
              </div>

              <h4 className="font-bold text-base text-slate-100 group-hover:text-amber-400 transition-colors leading-snug">
                {idea.topic || idea.title}
              </h4>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                <span className="text-[10px] font-bold text-amber-400 block mb-0.5">HOOK CONCEPT:</span>
                <p className="text-slate-300 italic">"{idea.hook}"</p>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2">
                {idea.concept}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Target: {idea.targetAudience || 'Curious Mobile Viewers'}</span>
              <button
                onClick={() => onSelectIdea(idea.topic || idea.title || '', idea.contentStyle)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/40 cursor-pointer"
              >
                <span>Create Video</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
