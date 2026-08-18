import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Save,
  Check,
  Zap,
  Sliders,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { AppSettings, ProviderStatus } from '../types/index';

interface SettingsViewProps {
  settings: AppSettings;
  providers: ProviderStatus[];
  onSaveSettings: (updated: Partial<AppSettings>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  providers,
  onSaveSettings
}) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider">
          <SettingsIcon className="w-3.5 h-3.5 text-amber-400" />
          <span>System & Engine Config</span>
        </div>
        <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
          Engine Settings & Providers
        </h2>
        <p className="text-slate-400 text-sm">
          Inspect integrated AI model status, render presets, voice defaults, and fallback configurations.
        </p>
      </div>

      {/* Provider Connectivity Status Table */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>AI Provider & Pipeline Status</span>
          </h3>
          <span className="text-xs text-slate-400">All services healthy</span>
        </div>

        <div className="space-y-2.5">
          {providers.map((p, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 text-sm">{p.name}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono uppercase text-slate-400">
                    {p.type}
                  </span>
                </div>
                <p className="text-slate-400 text-xs">{p.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 font-semibold text-xs ${
                    p.isConfigured
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${p.isConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>{p.statusText}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Defaults Configuration Form */}
      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Default Generation Preferences</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300">Default Language</label>
            <select
              value={form.defaultLanguage}
              onChange={e => setForm({ ...form, defaultLanguage: e.target.value as any })}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs"
            >
              <option value="id">Indonesian (Bahasa Indonesia)</option>
              <option value="en">English</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300">Default Duration</label>
            <select
              value={form.defaultDuration}
              onChange={e => setForm({ ...form, defaultDuration: Number(e.target.value) as any })}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs"
            >
              <option value={15}>15 Seconds</option>
              <option value={30}>30 Seconds</option>
              <option value={45}>45 Seconds</option>
              <option value={60}>60 Seconds</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300">Default Voice Gender</label>
            <select
              value={form.defaultVoiceGender}
              onChange={e => setForm({ ...form, defaultVoiceGender: e.target.value as any })}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300">Default Subtitle Preset</label>
            <select
              value={form.defaultSubtitlePreset}
              onChange={e => setForm({ ...form, defaultSubtitlePreset: e.target.value as any })}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs"
            >
              <option value="Viral">Viral (Yellow/Black High Contrast Pop)</option>
              <option value="Bold">Bold Box</option>
              <option value="Clean">Clean Sans</option>
              <option value="Karaoke">Karaoke Word Highlight</option>
              <option value="Minimal">Minimal</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-orange-950/40 flex items-center gap-2 cursor-pointer"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Settings Saved!' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
