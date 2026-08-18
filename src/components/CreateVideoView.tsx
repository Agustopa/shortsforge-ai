import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Globe,
  Clock,
  Palette,
  Volume2,
  Subtitles,
  Music,
  Maximize2,
  Tv,
  Eye,
  Sliders,
  Check
} from 'lucide-react';
import {
  LanguageCode,
  VideoPlatform,
  AspectRatio,
  VideoDuration,
  ContentStyle,
  VoiceGender,
  VoiceStyle,
  SubtitlePreset,
  MusicCategory,
  VisualMode,
  QualityMode
} from '../types/index';

interface CreateVideoViewProps {
  initialTopic?: string;
  onGenerate: (payload: {
    topic: string;
    language: LanguageCode;
    platform: VideoPlatform;
    aspectRatio: AspectRatio;
    duration: VideoDuration;
    contentStyle: ContentStyle;
    voiceGender: VoiceGender;
    voiceStyle: VoiceStyle;
    subtitlePreset: SubtitlePreset;
    musicCategory: MusicCategory;
    autoMode: boolean;
    visualMode: VisualMode;
    qualityMode: QualityMode;
  }) => void;
  isGenerating?: boolean;
}

export const CreateVideoView: React.FC<CreateVideoViewProps> = ({
  initialTopic = '',
  onGenerate,
  isGenerating = false
}) => {
  const [topic, setTopic] = useState(initialTopic);
  const [autoMode, setAutoMode] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Settings
  const [language, setLanguage] = useState<LanguageCode>('id');
  const [duration, setDuration] = useState<VideoDuration>(30);
  const [contentStyle, setContentStyle] = useState<ContentStyle>('Viral');
  const [platform, setPlatform] = useState<VideoPlatform>('all');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('Male');
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>('Energetic');
  const [subtitlePreset, setSubtitlePreset] = useState<SubtitlePreset>('Viral');
  const [musicCategory, setMusicCategory] = useState<MusicCategory>('Cinematic');
  const [visualMode, setVisualMode] = useState<VisualMode>('AUTO');
  const [qualityMode, setQualityMode] = useState<QualityMode>('BALANCED');

  const languages: { code: LanguageCode; label: string; flag: string }[] = [
    { code: 'id', label: 'Indonesian', flag: '🇮🇩' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
    { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', label: 'Korean', flag: '🇰🇷' },
    { code: 'de', label: 'German', flag: '🇩🇪' },
    { code: 'es', label: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', label: 'French', flag: '🇫🇷' }
  ];

  const durations: { value: VideoDuration; label: string }[] = [
    { value: 15, label: '15s' },
    { value: 30, label: '30s' },
    { value: 45, label: '45s' },
    { value: 60, label: '60s' },
    { value: 90, label: '90s' }
  ];

  const styles: ContentStyle[] = [
    'Viral',
    'Educational',
    'Storytelling',
    'Documentary',
    'News',
    'Facts',
    'Motivation',
    'Business',
    'Product promotion',
    'Travel',
    'Food',
    'Technology',
    'Gaming',
    'History',
    'Horror',
    'Mystery',
    'Comedy'
  ];

  const voiceStyles: VoiceStyle[] = ['Natural', 'Energetic', 'Professional', 'Dramatic', 'Calm', 'Emotional'];
  const subtitlePresets: SubtitlePreset[] = ['Viral', 'Bold', 'Clean', 'Minimal', 'Karaoke', 'Documentary'];
  const musicCategories: MusicCategory[] = ['Cinematic', 'Energetic', 'Emotional', 'Suspense', 'Corporate', 'Funny', 'Travel', 'Technology', 'Motivational', 'None'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    onGenerate({
      topic: topic.trim(),
      language,
      platform,
      aspectRatio,
      duration,
      contentStyle,
      voiceGender,
      voiceStyle,
      subtitlePreset,
      musicCategory,
      autoMode,
      visualMode,
      qualityMode
    });
  };

  const sampleIdeas = [
    'fakta menakutkan tentang bulan',
    '5 fakta unik tentang gurita',
    'sejarah piramida Mesir',
    'How AI agents will transform productivity in 2026'
  ];

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>One-Click Video Engine</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
          What do you want to make a video about?
        </h2>
        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
          Type an idea, keyword, or fact. AI automatically creates the script, voice narration, synchronized subtitles, 9:16 visuals, and background music.
        </p>
      </div>

      {/* Main Creation Card */}
      <form onSubmit={handleSubmit} className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
        {/* Large Topic Input */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Video Topic or Prompt
          </label>
          <div className="relative">
            <textarea
              id="input-create-topic"
              rows={3}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. fakta menakutkan tentang bulan..."
              className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all resize-none shadow-inner"
            />
          </div>
          {/* Quick Idea Starters */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-500">Quick ideas:</span>
            {sampleIdeas.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setTopic(s)}
                className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/60 transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Auto Mode Switch */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 to-orange-950/20 border border-amber-800/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Auto Mode (Recommended)</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold">1-CLICK</span>
            </div>
            <p className="text-xs text-slate-400">
              AI automatically decides best hook, scene count, voice pacing, viral captions & music intensity.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAutoMode(!autoMode)}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              autoMode ? 'bg-amber-500' : 'bg-slate-800'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-slate-950 shadow-md transition-transform ${
                autoMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Primary Settings Row (Language, Duration, Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Language Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Language</span>
            </label>
            <select
              id="select-language"
              value={language}
              onChange={e => setLanguage(e.target.value as LanguageCode)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
            >
              {languages.map(l => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Duration</span>
            </label>
            <div className="grid grid-cols-5 gap-1">
              {durations.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={`h-11 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    duration === d.value
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-950 border border-slate-700/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Style Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Content Style</span>
            </label>
            <select
              id="select-style"
              value={contentStyle}
              onChange={e => setContentStyle(e.target.value as ContentStyle)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
            >
              {styles.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Collapsible Advanced Settings */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Advanced Settings (Aspect Ratio, Voice, Subtitles, Music & Visual Mode)</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="mt-4 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {/* Platform */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-400 flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-rose-400" />
                  <span>Target Platform</span>
                </label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value as VideoPlatform)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                >
                  <option value="all">All (TikTok, Reels, Shorts)</option>
                  <option value="tiktok">TikTok</option>
                  <option value="reels">Instagram Reels</option>
                  <option value="shorts">YouTube Shorts</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-400 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Aspect Ratio</span>
                </label>
                <select
                  value={aspectRatio}
                  onChange={e => setAspectRatio(e.target.value as AspectRatio)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                >
                  <option value="9:16">9:16 (Shorts / TikTok / Reels)</option>
                  <option value="16:9">16:9 (Standard Landscape)</option>
                  <option value="1:1">1:1 (Square Feed)</option>
                </select>
              </div>

              {/* Voice Gender */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Voice Gender</span>
                </label>
                <select
                  value={voiceGender}
                  onChange={e => setVoiceGender(e.target.value as VoiceGender)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                >
                  <option value="Male">Male Voice</option>
                  <option value="Female">Female Voice</option>
                  <option value="Neutral">Neutral Voice</option>
                </select>
              </div>

              {/* Voice Style */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Voice Style</span>
                </label>
                <select
                  value={voiceStyle}
                  onChange={e => setVoiceStyle(e.target.value as VoiceStyle)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                >
                  {voiceStyles.map(vs => (
                    <option key={vs} value={vs}>{vs}</option>
                  ))}
                </select>
              </div>

              {/* Subtitle Preset */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-400 flex items-center gap-1.5">
                  <Subtitles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Subtitle Style</span>
                </label>
                <select
                  value={subtitlePreset}
                  onChange={e => setSubtitlePreset(e.target.value as SubtitlePreset)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                >
                  {subtitlePresets.map(sp => (
                    <option key={sp} value={sp}>{sp} (Animated)</option>
                  ))}
                </select>
              </div>

              {/* Background Music */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-400 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Background Music</span>
                </label>
                <select
                  value={musicCategory}
                  onChange={e => setMusicCategory(e.target.value as MusicCategory)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                >
                  {musicCategories.map(mc => (
                    <option key={mc} value={mc}>{mc}</option>
                  ))}
                </select>
              </div>

              {/* Visual Mode */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-violet-400" />
                  <span>Visual Engine Priority</span>
                </label>
                <select
                  value={visualMode}
                  onChange={e => setVisualMode(e.target.value as VisualMode)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                >
                  <option value="AUTO">AUTO (Intelligent Cost & Quality)</option>
                  <option value="STOCK_FIRST">Stock Video First (Fast HD)</option>
                  <option value="AI_IMAGE_FIRST">AI Image + Ken Burns Motion</option>
                  <option value="AI_VIDEO_FIRST">AI Video First (Google Veo)</option>
                </select>
              </div>

              {/* Quality Preset */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>Render Quality</span>
                </label>
                <select
                  value={qualityMode}
                  onChange={e => setQualityMode(e.target.value as QualityMode)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                >
                  <option value="FAST">FAST (Fastest Preview)</option>
                  <option value="BALANCED">BALANCED (1080x1920 30fps)</option>
                  <option value="HIGH">HIGH (Ultra High Bitrate 4K)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Big Submit Button */}
        <button
          id="btn-generate-video-main"
          type="submit"
          disabled={!topic.trim() || isGenerating}
          className="w-full h-16 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-lg md:text-xl shadow-xl shadow-orange-950/50 hover:shadow-orange-900/70 transition-all flex items-center justify-center gap-3 cursor-pointer group"
        >
          <Sparkles className="w-6 h-6 text-slate-950 group-hover:rotate-12 transition-transform" />
          <span>{isGenerating ? 'STARTING ENGINE...' : 'GENERATE VIDEO'}</span>
        </button>
      </form>
    </div>
  );
};
