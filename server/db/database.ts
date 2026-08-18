import fs from 'fs';
import path from 'path';
import { Project, GenerationJob, MediaAsset, ContentIdea, ProviderStatus } from '../../src/types/index';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const MEDIA_DIR = path.join(process.cwd(), 'public', 'generated');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export interface DatabaseSchema {
  projects: Record<string, Project>;
  jobs: Record<string, GenerationJob>;
  mediaAssets: Record<string, MediaAsset>;
  contentIdeas: ContentIdea[];
  settings: {
    defaultLanguage: string;
    defaultDuration: number;
    defaultVoiceGender: string;
    defaultVoiceStyle: string;
    defaultSubtitlePreset: string;
    defaultMusicCategory: string;
    defaultAspectRatio: string;
    qualityMode: string;
    visualMode: string;
    devMockMode: boolean;
  };
}

const DEFAULT_DB: DatabaseSchema = {
  projects: {},
  jobs: {},
  mediaAssets: {},
  contentIdeas: [],
  settings: {
    defaultLanguage: 'id',
    defaultDuration: 30,
    defaultVoiceGender: 'Male',
    defaultVoiceStyle: 'Energetic',
    defaultSubtitlePreset: 'Viral',
    defaultMusicCategory: 'Cinematic',
    defaultAspectRatio: '9:16',
    qualityMode: 'BALANCED',
    visualMode: 'AUTO',
    devMockMode: false
  }
};

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDirs();
    this.data = this.load();
    this.seedDefaultIdeas();
    this.seedDefaultProjects();
  }

  private ensureDirs() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_DB,
          ...parsed,
          settings: { ...DEFAULT_DB.settings, ...(parsed.settings || {}) }
        };
      }
    } catch (e) {
      console.error('Error loading database, resetting to default:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  public save() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (e) {
        console.error('Error writing database:', e);
      }
    }, 50);
  }

  // Projects
  public getProjects(): Project[] {
    return Object.values(this.data.projects).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getProject(id: string): Project | null {
    return this.data.projects[id] || null;
  }

  public setProject(project: Project): Project {
    this.data.projects[project.id] = {
      ...project,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.projects[project.id];
  }

  public updateProject(id: string, updates: Partial<Project>): Project | null {
    const existing = this.data.projects[id];
    if (!existing) return null;
    this.data.projects[id] = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.projects[id];
  }

  public deleteProject(id: string): boolean {
    if (this.data.projects[id]) {
      delete this.data.projects[id];
      this.save();
      return true;
    }
    return false;
  }

  // Jobs
  public getJob(id: string): GenerationJob | null {
    return this.data.jobs[id] || null;
  }

  public setJob(job: GenerationJob): GenerationJob {
    this.data.jobs[job.id] = job;
    this.save();
    return job;
  }

  public updateJob(id: string, updates: Partial<GenerationJob>): GenerationJob | null {
    const existing = this.data.jobs[id];
    if (!existing) return null;
    this.data.jobs[id] = { ...existing, ...updates };
    this.save();
    return this.data.jobs[id];
  }

  // Media Assets
  public getMediaAssets(): MediaAsset[] {
    return Object.values(this.data.mediaAssets).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public addMediaAsset(asset: MediaAsset): MediaAsset {
    this.data.mediaAssets[asset.id] = asset;
    this.save();
    return asset;
  }

  public deleteMediaAsset(id: string): boolean {
    if (this.data.mediaAssets[id]) {
      delete this.data.mediaAssets[id];
      this.save();
      return true;
    }
    return false;
  }

  // Content Ideas
  public getContentIdeas(niche?: string): ContentIdea[] {
    if (!niche || niche === 'All') {
      return this.data.contentIdeas;
    }
    return this.data.contentIdeas.filter(idea => idea.niche.toLowerCase() === niche.toLowerCase());
  }

  public setContentIdeas(ideas: ContentIdea[]) {
    this.data.contentIdeas = ideas;
    this.save();
  }

  // Settings
  public getSettings() {
    return this.data.settings;
  }

  public updateSettings(settings: Partial<DatabaseSchema['settings']>) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.data.settings;
  }

  private seedDefaultProjects() {
    if (Object.keys(this.data.projects).length > 0) return;

    const sampleProject: Project = {
      id: 'proj_sample_moon',
      title: 'Fakta Menakutkan Tentang Bulan',
      topic: 'fakta menakutkan tentang bulan yang jarang diketahui',
      language: 'id',
      platform: 'all',
      aspectRatio: '9:16',
      duration: 30,
      contentStyle: 'Facts',
      voiceGender: 'Male',
      voiceStyle: 'Energetic',
      subtitlePreset: 'Viral',
      musicCategory: 'Suspense',
      autoMode: true,
      qualityMode: 'BALANCED',
      visualMode: 'AUTO',
      status: 'COMPLETED',
      progress: 100,
      currentStage: 'Video ready for download and export',
      analysis: {
        niche: 'Space & Science',
        audience: 'Astronomy enthusiasts and curious minds',
        tone: 'Mysterious & Compelling',
        hookStrategy: 'Curiosity Gap & High Stakes',
        factualityRequired: true,
        detectedLanguage: 'id'
      },
      hooks: [
        {
          id: 'hook_1',
          text: 'Bulan bukan sekadar batu di langit malam, ada rahasia gelap di baliknya!',
          score: { curiosity: 9.8, clarity: 9.7, emotionalImpact: 9.5, retentionPotential: 9.8, relevance: 9.9, naturalLanguage: 9.8, total: 9.75 },
          reasoning: 'High-retention intrigue hook for lunar mysteries.'
        }
      ],
      selectedHookId: 'hook_1',
      script: {
        title: 'Fakta Menakutkan Tentang Bulan',
        hook: 'Bulan bukan sekadar batu di langit malam, ada rahasia gelap di baliknya!',
        body: 'Pertama, bulan ternyata mengalami gempa tektonik hebat yang bisa berlangsung lebih dari 10 menit. Kedua, ada anomali massa gravitasi misterius di bawah kawah terbesarnya. Dan ketiga, setiap tahun bulan perlahan menjauh dari bumi.',
        payoff: 'Semakin kita meneliti bulan, semakin banyak misteri kosmik yang belum terpecahkan.',
        cta: 'Fakta nomor berapa yang paling bikin kamu merinding? Tulis di komentar!',
        fullNarration: 'Bulan bukan sekadar batu di langit malam, ada rahasia gelap di baliknya! Pertama, bulan mengalami gempa tektonik hebat yang bisa berlangsung lebih dari 10 menit. Kedua, ada anomali massa gravitasi misterius di bawah kawah terbesarnya. Dan ketiga, bulan perlahan menjauh dari bumi. Fakta mana yang paling bikin kamu merinding? Tulis di komentar!',
        estimatedSpokenSeconds: 28.5
      },
      scenes: [
        {
          id: 'scene_1',
          scene_id: 1,
          start_time: 0,
          end_time: 6.0,
          duration: 6.0,
          narration: 'Bulan bukan sekadar batu di langit malam, ada rahasia gelap di baliknya!',
          subtitle_text: 'Bulan menyimpan rahasia gelap!',
          visual_description: 'Glowing full moon against pitch black deep space backdrop',
          visual_prompt: 'Vertical 9:16 glowing full moon surface dark craters starry deep space background cinematic 4k',
          search_query: 'moon glowing full dark space',
          visual_source: 'stock_image',
          visual_type: 'image',
          visual_url: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?w=1080&q=80',
          transition: 'cut',
          camera_motion: 'zoom_in',
          music_intensity: 'high'
        },
        {
          id: 'scene_2',
          scene_id: 2,
          start_time: 6.0,
          end_time: 14.0,
          duration: 8.0,
          narration: 'Pertama, bulan ternyata mengalami gempa tektonik hebat yang bisa berlangsung lebih dari 10 menit.',
          subtitle_text: 'Gempa bulan berlangsung lebih dari 10 menit!',
          visual_description: 'Dramatic close up of lunar craters with seismic vibration particles',
          visual_prompt: 'Vertical 9:16 detailed lunar landscape surface craters dust floating zero gravity cinematic lighting',
          search_query: 'lunar surface craters dust space',
          visual_source: 'stock_image',
          visual_type: 'image',
          visual_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&q=80',
          transition: 'crossfade',
          camera_motion: 'pan_right',
          music_intensity: 'medium'
        },
        {
          id: 'scene_3',
          scene_id: 3,
          start_time: 14.0,
          end_time: 22.0,
          duration: 8.0,
          narration: 'Kedua, ada anomali massa gravitasi misterius di bawah kawah terbesarnya.',
          subtitle_text: 'Anomali gravitasi misterius di bawah kawah.',
          visual_description: 'Cosmic orbit perspective of the dark side of the moon',
          visual_prompt: 'Vertical 9:16 dark side of the moon eerie cosmic shadows glowing horizon stars 4k',
          search_query: 'dark side moon cosmic space',
          visual_source: 'stock_image',
          visual_type: 'image',
          visual_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1080&q=80',
          transition: 'fade',
          camera_motion: 'zoom_out',
          music_intensity: 'high'
        },
        {
          id: 'scene_4',
          scene_id: 4,
          start_time: 22.0,
          end_time: 30.0,
          duration: 8.0,
          narration: 'Fakta nomor berapa yang paling bikin kamu merinding? Tulis di komentar!',
          subtitle_text: 'Nomor berapa yang bikin merinding? Komen!',
          visual_description: 'Earth viewed from the lunar surface with glowing atmospheric rim',
          visual_prompt: 'Vertical 9:16 earthrise from moon surface breathtaking cosmic vista 4k cinematic',
          search_query: 'earth from moon lunar earthrise',
          visual_source: 'stock_image',
          visual_type: 'image',
          visual_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&q=80',
          transition: 'zoom_in',
          camera_motion: 'zoom_in',
          music_intensity: 'high'
        }
      ],
      socialPackage: {
        title: 'Fakta Menakutkan Tentang Bulan Yang Bikin Merinding 🌑',
        titleOptions: [
          'Fakta Menakutkan Tentang Bulan Yang Jarang Diketahui',
          'Misteri Gempa dan Sisi Gelap Bulan Terungkap',
          'Kenapa Astronot Tidak Pernah Menceritakan Hal Ini?'
        ],
        tiktokCaption: 'Bulan ternyata jauh lebih misterius dari yang kita kira! 🌑✨ #space #moon #faktaunik #fyp #astronomy',
        reelsCaption: 'Fakta Menakutkan Tentang Bulan yang bakal mengubah cara pandangmu ke langit malam! 🌌\n\nFollow untuk insight sains & misteri setiap hari!',
        shortsDescription: 'Fakta Menakutkan Tentang Bulan Yang Jarang Diketahui! #Shorts #Space #FaktaUnik',
        hashtags: ['#space', '#moon', '#faktaunik', '#sains', '#reels', '#shorts', '#viral'],
        cta: 'Kira-kira nomor berapa yang baru kamu tahu? Tulis di kolom komentar!'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.projects[sampleProject.id] = sampleProject;
    this.save();
  }

  private seedDefaultIdeas() {
    if (this.data.contentIdeas.length > 0) return;

    this.data.contentIdeas = [
      {
        id: 'idea-1',
        niche: 'Facts',
        title: '5 Fakta Menakutkan Tentang Bulan',
        hook: 'Bulan bukan sekadar batu di langit malam, ada rahasia gelap di baliknya.',
        concept: 'Eksplorasi misteri gempa bulan tektonik, anomali gravitasi, dan sisi gelap bulan.',
        estimatedDuration: 30,
        visualStyle: 'Cinematic Space CGI & Lunar Surface 4K Visuals',
        cta: 'Kira-kira nomor berapa yang bikin kamu merinding? Tulis di komen!',
        contentStyle: 'Viral'
      },
      {
        id: 'idea-2',
        niche: 'Technology',
        title: 'How AI Will Actually Change Your Daily Routine in 2026',
        hook: 'Forget sci-fi movies, here is what AI is already doing while you sleep.',
        concept: 'Practical breakthrough automation tools transforming work and life right now.',
        estimatedDuration: 30,
        visualStyle: 'Futuristic Neon Tech & Clean UI Visuals',
        cta: 'Are you ready for this shift? Save this video for later.',
        contentStyle: 'Educational'
      },
      {
        id: 'idea-3',
        niche: 'Travel',
        title: 'Hidden Paradise Islands Nobody Tells You About',
        hook: 'Stop going to the same crowded tourist traps. Check this out instead.',
        concept: 'Unveiling 3 secluded pristine crystal-clear turquoise beach destinations.',
        estimatedDuration: 45,
        visualStyle: 'Vibrant Tropical Aerial 4K Drone Footage',
        cta: 'Tag someone you would bring here on your next trip!',
        contentStyle: 'Storytelling'
      },
      {
        id: 'idea-4',
        niche: 'Business',
        title: 'The Psychology Secret Behind TikTok Viral Hooks',
        hook: 'Why do you stop scrolling on certain videos in under 0.8 seconds?',
        concept: 'Dopamine triggers, open curiosity loops, and visual pattern interrupts.',
        estimatedDuration: 30,
        visualStyle: 'Fast-paced Motion Graphics & Bold Typography',
        cta: 'Follow for more daily content creation breakdowns.',
        contentStyle: 'Educational'
      },
      {
        id: 'idea-5',
        niche: 'History',
        title: 'Misteri Candi Borobudur yang Jarang Diungkap',
        hook: 'Ada satu bagian dari Borobudur yang sengaja ditutup tanah selama berabad-abad.',
        concept: 'Kisah relief Karmawibhangga di kaki candi yang sarat misteri kuno.',
        estimatedDuration: 45,
        visualStyle: 'Atmospheric Fog, Ancient Stone & Dramatic Lighting',
        cta: 'Pernahkah kamu perhatikan detail ini saat berkunjung?',
        contentStyle: 'Mystery'
      },
      {
        id: 'idea-6',
        niche: 'Motivation',
        title: 'The 2-Minute Rule That Cures Procrastination Instantly',
        hook: 'If you struggle with starting tasks, do this one psychological trick.',
        concept: 'Breaking the friction barrier through micro-momentum psychology.',
        estimatedDuration: 30,
        visualStyle: 'Moody Cinematic Slow Motion & High Focus Aesthetics',
        cta: 'Try this today and see how much you get done.',
        contentStyle: 'Motivation'
      }
    ];
    this.save();
  }
}

export const db = new Database();
