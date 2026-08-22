export type ProjectStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'RESEARCHING'
  | 'WRITING_SCRIPT'
  | 'PLANNING_SCENES'
  | 'COLLECTING_MEDIA'
  | 'GENERATING_VISUALS'
  | 'GENERATING_VOICE'
  | 'GENERATING_SUBTITLES'
  | 'MIXING_AUDIO'
  | 'RENDERING'
  | 'QUALITY_CHECK'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type LanguageCode =
  | 'id' // Indonesian
  | 'en' // English
  | 'zh' // Chinese
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'de' // German
  | 'es' // Spanish
  | 'fr'; // French

export type VideoPlatform = 'tiktok' | 'reels' | 'shorts' | 'all';
export type AspectRatio = '9:16' | '16:9' | '1:1';
export type VideoDuration = 'AUTO' | 15 | 30 | 45 | 60 | 90 | number;

export type ContentStyle =
  | 'Viral'
  | 'Educational'
  | 'Storytelling'
  | 'Documentary'
  | 'News'
  | 'Facts'
  | 'Motivation'
  | 'Business'
  | 'Product promotion'
  | 'Travel'
  | 'Food'
  | 'Technology'
  | 'Gaming'
  | 'History'
  | 'Horror'
  | 'Mystery'
  | 'Comedy';

export type VoiceGender = 'Male' | 'Female' | 'Neutral';
export type VoiceStyle = 'Natural' | 'Energetic' | 'Professional' | 'Dramatic' | 'Calm' | 'Emotional';
export type SubtitlePreset = 'Viral' | 'Bold' | 'Clean' | 'Minimal' | 'Karaoke' | 'Documentary';
export type MusicCategory =
  | 'None'
  | 'Cinematic'
  | 'Energetic'
  | 'Emotional'
  | 'Suspense'
  | 'Corporate'
  | 'Funny'
  | 'Travel'
  | 'Technology'
  | 'Motivational'
  | 'Scary'
  | 'Space'
  | 'Science'
  | 'Health'
  | 'Animal'
  | 'FunFact'
  | 'History'
  | 'Education'
  | 'General';
export type QualityMode = 'FAST' | 'BALANCED' | 'HIGH';
export type VisualMode = 'AUTO' | 'STOCK_FIRST' | 'AI_VIDEO_FIRST' | 'AI_IMAGE_FIRST';

export interface CurrentTopic {
  id: string;
  text: string;
  language: LanguageCode;
  createdAt: string;
}

export interface TopicRelevanceCheck {
  relevant: boolean;
  confidence: number;
  reason?: string;
  detectedSubject?: string;
}

export interface GenerationIsolationDebug {
  currentTopic: string;
  projectId: string;
  generationId: string;
  scriptTopic: string;
  visualTopic: string;
  researchTopic: string;
  isIsolated: boolean;
  relevanceScore: number;
  contaminationDetected: boolean;
  contaminationFlag?: string;
  verifiedAt: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  highlighted?: boolean;
}

export interface Scene {
  id: string;
  scene_id: number;
  start_time: number;
  end_time: number;
  duration: number;
  narration: string;
  visual_description: string;
  visual_prompt: string;
  search_query: string;
  subtitle_text: string;
  word_timestamps?: WordTimestamp[];
  transition: 'cut' | 'fade' | 'crossfade' | 'zoom_in' | 'slide_left';
  camera_motion: 'static' | 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'ken_burns' | 'parallax';
  music_intensity: 'low' | 'medium' | 'high';
  
  // Visual asset fields
  visual_url?: string;
  visual_type?: 'video' | 'image';
  visual_source?: 'user' | 'stock_video' | 'stock_image' | 'ai_image' | 'ai_video' | 'motion_graphic' | 'google_veo' | 'gemini_image';
  visualAsset?: string; // Path to verified local disk asset
  visualAssetType?: 'video' | 'image';
  visual_provider?: string;
  visual_status?: 'pending' | 'generating' | 'completed' | 'failed' | 'fallback';
  visual_details?: {
    provider: string;
    model?: string;
    width: number;
    height: number;
    duration?: number;
    fileSizeBytes?: number;
    localPath?: string;
    isMock: boolean;
    error?: string;
  };

  // Voiceover fields
  voice_audio_url?: string;
  voice_audio_duration?: number;
}

export interface VisualBible {
  characters?: string[];
  locations: string[];
  objects?: string[];
  style: string;
  lighting: string;
  cameraStyle: string;
  colorMood: string;
}

export interface ResearchSource {
  id?: string;
  title: string;
  url?: string;
  sourceName?: string;
  snippet: string;
  isFact: boolean;
  type: 'FACT' | 'OPINION' | 'SPECULATION' | 'CREATIVE_CONTENT' | 'EDUCATIONAL' | 'OFFICIAL' | 'WIKIPEDIA';
  confidence: number;
  license?: string;
  creator?: string;
}

export interface AIResearchResult {
  topic: string;
  status: 'READY' | 'SEARCHING' | 'FACT_CHECKING' | 'FAILED';
  summary: string;
  sourcesFoundCount: number;
  relevantSourcesCount: number;
  visualSourcesCount: number;
  selectedVisualCount: number;
  factChecked: boolean;
  factCheckNotes?: string;
  sources: ResearchSource[];
  relevantFacts: string[];
}

export interface VisualSourcingItem {
  sceneId: number;
  searchQuery: string;
  selectedUrl: string;
  thumbnailUrl: string;
  type: 'video' | 'image';
  source: 'stock_api' | 'public_domain' | 'creative_commons' | 'stock_media' | 'ai_generated' | 'procedural';
  providerName: string;
  license: string;
  attribution?: string;
  relevanceScore: number;
  validationStatus: 'PASSED' | 'WARNING' | 'REPLACED';
  resolution: string;
  fingerprint: string;
}

export interface HookOption {
  id: string;
  text: string;
  score: {
    curiosity: number;
    clarity: number;
    emotionalImpact: number;
    retentionPotential: number;
    relevance: number;
    naturalLanguage: number;
    total: number;
  };
  reasoning: string;
}

export interface TopicAnalysis {
  topic: string;
  language: LanguageCode;
  niche: string;
  audience: string;
  tone: string;
  hook_strategy: string;
  factuality_required: boolean;
  content_style?: ContentStyle;
  contentStyle?: ContentStyle;
  platform?: VideoPlatform;
  duration?: VideoDuration;
}

export interface SocialPackage {
  title: string;
  titleOptions: string[];
  tiktokCaption: string;
  reelsCaption: string;
  shortsDescription: string;
  hashtags: string[];
  cta: string;
}

export interface QCResult {
  passed: boolean;
  checks: {
    name: string;
    status: 'passed' | 'fixed' | 'warning' | 'failed';
    message: string;
  }[];
}

export interface Project {
  id: string;
  title: string;
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
  qualityMode: QualityMode;
  visualMode: VisualMode;
  
  status: ProjectStatus;
  progress: number;
  currentStage: string;
  statusMessage?: string;
  
  // Script and Strategy data
  analysis?: {
    niche: string;
    audience: string;
    tone: string;
    hookStrategy: string;
    factualityRequired: boolean;
    detectedLanguage: LanguageCode;
  };
  research?: ResearchSource[];
  aiResearch?: AIResearchResult;
  visualSourcing?: VisualSourcingItem[];
  hooks?: HookOption[];
  selectedHookId?: string;
  script?: {
    title: string;
    hook: string;
    body: string;
    payoff: string;
    cta: string;
    fullNarration: string;
    estimatedSpokenSeconds: number;
  };
  visualBible?: VisualBible;
  scenes: Scene[];
  
  // Output media
  videoUrl?: string;
  thumbnailUrl?: string;
  videoTitle?: string;
  thumbnailTitle?: string;
  category?: string;
  captionsSrtUrl?: string;
  captionsVttUrl?: string;
  backgroundMusicUrl?: string;
  finalAudioUrl?: string;
  
  // Export & Social Package
  socialPackage?: SocialPackage;
  qcResult?: QCResult;
  isolationDebug?: GenerationIsolationDebug;
  currentTopicObj?: CurrentTopic;
  
  // Error handling
  error?: string;
  jobId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface GenerationJob {
  id: string;
  projectId: string;
  stage: ProjectStatus;
  progress: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startTime: string;
  endTime?: string;
  logs: { timestamp: string; message: string; level: 'info' | 'warn' | 'error' }[];
  error?: string;
}

export interface ContentIdea {
  id: string;
  niche: string;
  topic?: string;
  title?: string;
  hook: string;
  concept: string;
  estimatedDuration: VideoDuration;
  visualStyle: string;
  cta: string;
  targetAudience?: string;
  contentStyle: ContentStyle;
}

export interface MediaAsset {
  id: string;
  name: string;
  type: 'video' | 'image' | 'audio' | 'music';
  source: 'user' | 'ai_generated' | 'stock';
  category?: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  sizeBytes?: number;
  mimeType?: string;
  projectId?: string;
  license?: string;
  createdAt: string;
}

export interface ProviderStatus {
  name: string;
  type: 'AI' | 'TTS' | 'IMAGE' | 'VIDEO' | 'STOCK' | 'MUSIC' | 'SEARCH' | 'RENDER';
  isConfigured: boolean;
  isAvailable: boolean;
  statusText: string;
  description: string;
  isMock: boolean;
}

export interface AppSettings {
  defaultLanguage: LanguageCode;
  defaultDuration: VideoDuration;
  defaultVoiceGender: VoiceGender;
  defaultSubtitlePreset: SubtitlePreset;
  defaultMusicCategory: MusicCategory;
  geminiApiKeyConfigured: boolean;
  mockModeEnabled: boolean;
  maxConcurrentJobs: number;
}

export interface BatchGenerateItem {
  id: string;
  topic: string;
  language: LanguageCode;
  duration: VideoDuration;
  style: ContentStyle;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  projectId?: string;
  videoUrl?: string;
  error?: string;
}

// ==========================================
// AI AUTO EDITOR TYPES & DATA CONTRACTS
// ==========================================
export type AutoEditorStyle =
  | 'Professional'
  | 'Viral Shorts'
  | 'Cinematic'
  | 'Clean'
  | 'Educational'
  | 'Product Promo'
  | 'Storytelling'
  | 'Funny'
  | 'Fast Paced';

export interface UploadedMediaItem {
  id: string;
  originalName: string;
  filePath: string;
  url: string;
  type: 'video' | 'image';
  sizeBytes: number;
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  thumbnailUrl?: string;
  hasAudio?: boolean;
}

export interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
  speaker?: string;
  isImportant?: boolean;
  score?: number;
}

export interface ContentAnalysisResult {
  topic: string;
  mainSubject: string;
  importantMoments: string[];
  suggestedHook: string;
  suggestedCategory: string;
  suggestedDuration: number;
  emotions: string[];
  keywords: string[];
  silenceRanges: { start: number; end: number }[];
  speechPace: string;
  visualQuality: string;
  audioQuality: string;
}

export interface AutoEditorCut {
  id: string;
  sceneIndex: number;
  type: 'HOOK' | 'MAIN_CONTENT' | 'B_ROLL' | 'CTA';
  startTime: number;
  endTime: number;
  duration: number;
  transcriptText: string;
  score: number;
  bRollQuery?: string;
  bRollAssetUrl?: string;
  bRollAssetType?: 'video' | 'image';
  cameraMotion?: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'ken_burns' | 'static';
  subtitleText?: string;
  isKept: boolean;
  notes?: string;
}

export interface AutoEditorProject {
  id: string;
  jobId: string;
  title: string;
  videoTitle?: string;
  thumbnailTitle?: string;
  style: AutoEditorStyle;
  targetDuration: VideoDuration;
  autoCta: boolean;
  status: ProjectStatus;
  progress: number;
  stageName: string;
  statusMessage?: string;
  
  // Media Input
  mediaType: 'video' | 'images';
  uploadedMedia: UploadedMediaItem[];
  
  // Analysis & Processing
  analysis?: ContentAnalysisResult;
  transcript?: TranscriptSegment[];
  cuts: AutoEditorCut[];
  
  // Audio & Music
  musicCategory?: MusicCategory;
  musicTrackName?: string;
  musicUrl?: string;
  voiceCleaned?: boolean;
  
  // Subtitle
  subtitlePreset?: SubtitlePreset;
  subtitlesBurned?: boolean;
  
  // Final Output
  outputVideoUrl?: string;
  outputThumbnailUrl?: string;
  finalDuration?: number;
  outputWidth?: number;
  outputHeight?: number;
  
  // Social Package
  socialPackage?: SocialPackage;
  
  // Quality Check
  qcResult?: QCResult;
  error?: string;
  
  createdAt: string;
  updatedAt: string;
}

