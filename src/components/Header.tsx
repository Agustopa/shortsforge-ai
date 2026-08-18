import React from 'react';
import { Sparkles, Video, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProviderStatus } from '../types/index';

interface HeaderProps {
  title: string;
  subtitle?: string;
  providers?: ProviderStatus[];
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, providers = [] }) => {
  const geminiProvider = providers.find(p => p.type === 'AI');
  const isConfigured = geminiProvider?.isConfigured;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
      <div>
        <h2 className="text-base font-semibold text-slate-100 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Provider Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
          isConfigured
            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
            : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
        }`}>
          {isConfigured ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{isConfigured ? 'Google Gemini 3.7 Online' : 'AI Engine (Heuristic + Stock)'}</span>
        </div>

        {/* Video Output Specs */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Video className="w-3.5 h-3.5 text-rose-400" />
          <span>9:16 Shorts/Reels/TikTok</span>
        </div>
      </div>
    </header>
  );
};
