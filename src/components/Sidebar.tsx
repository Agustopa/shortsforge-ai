import React from 'react';
import {
  LayoutDashboard,
  Clapperboard,
  Layers,
  Lightbulb,
  FolderKanban,
  Image as ImageIcon,
  Settings,
  Sparkles,
  Zap
} from 'lucide-react';

export type NavTab = 'dashboard' | 'create' | 'batch' | 'ideas' | 'projects' | 'media' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onQuickCreate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, onQuickCreate }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create', label: 'Create Video', icon: Clapperboard, highlight: true },
    { id: 'batch', label: 'Batch Generator', icon: Layers },
    { id: 'ideas', label: 'Content Ideas', icon: Lightbulb },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'media', label: 'Media Library', icon: ImageIcon },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 flex items-center justify-center shadow-lg shadow-rose-950/50">
          <Clapperboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-base text-slate-100 tracking-tight">ShortsForge</h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">AI</span>
          </div>
          <p className="text-xs text-slate-400">One-Click Video Engine</p>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="p-4">
        <button
          id="btn-sidebar-create"
          onClick={onQuickCreate}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 hover:shadow-orange-900/60 transition-all cursor-pointer group"
        >
          <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
          <span>+ Create Video</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-amber-400 border border-slate-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="flex-1">{item.label}</span>
              {item.highlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Engine Status Footprint */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-900/40">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Engine Ready</span>
          </span>
          <span className="font-mono text-[11px] text-slate-500">1080x1920</span>
        </div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Gemini 3.7 + FFmpeg Active</span>
        </div>
      </div>
    </aside>
  );
};
