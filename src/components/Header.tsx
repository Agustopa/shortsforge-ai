import React from 'react';
import { Sparkles, Video, CheckCircle2, Menu } from 'lucide-react';
import { ProviderStatus } from '../types/index';

interface HeaderProps {
  title: string;
  subtitle?: string;
  providers?: ProviderStatus[];
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  providers = [],
  onToggleMobileSidebar
}) => {
  const geminiProvider = providers.find(p => p.type === 'AI');
  const isConfigured = geminiProvider?.isConfigured;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-10 shrink-0 gap-2">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-slate-100 tracking-tight truncate">{title}</h2>
          {subtitle && <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Provider Badge */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-medium ${
            isConfigured
              ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
              : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span className="hidden sm:inline">
            {isConfigured ? 'Google Gemini 3.7 Online' : 'AI Engine Active'}
          </span>
          <span className="sm:hidden">
            {isConfigured ? 'Gemini 3.7' : 'AI Active'}
          </span>
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
