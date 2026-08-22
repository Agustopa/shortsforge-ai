import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { spawn, spawnSync } from 'child_process';
import { MusicCategory } from '../../../src/types/index';
import { getFfmpegPath } from '../../utils/ffmpegPath';

export interface MusicTrack {
  id: string;
  category: MusicCategory;
  title: string;
  artist: string;
  url: string;
  duration: number;
  bpm: number;
  license: string;
  vibe: string;
}

// Multi-track catalog categorized by topic mood with royalty-free licenses
export const MUSIC_CATALOG: Record<string, MusicTrack[]> = {
  Scary: [
    {
      id: 'music-scary-01',
      category: 'Scary',
      title: 'Dark Tension Mystery',
      artist: 'Shadow Pulse Studio',
      url: 'https://assets.mixkit.co/music/preview/mixkit-mysterious-lights-512.mp3',
      duration: 50,
      bpm: 85,
      license: 'Royalty-Free Commercial',
      vibe: 'Dark, mysterious, eerie suspense'
    },
    {
      id: 'music-scary-02',
      category: 'Scary',
      title: 'Deep Abyss Horror Whispers',
      artist: 'Cinematic Thriller Labs',
      url: 'https://assets.mixkit.co/music/preview/mixkit-creepy-background-123.mp3',
      duration: 55,
      bpm: 78,
      license: 'Royalty-Free Commercial',
      vibe: 'Creepy, tense, chilling atmosphere'
    },
    {
      id: 'music-scary-03',
      category: 'Scary',
      title: 'Suspenseful Pulse of the Void',
      artist: 'Dark Cinema Audio',
      url: 'https://assets.mixkit.co/music/preview/mixkit-cinematic-mystery-trailer-drum-roll-549.mp3',
      duration: 48,
      bpm: 90,
      license: 'Royalty-Free Commercial',
      vibe: 'Heavy pulse, ominous mystery'
    }
  ],
  Suspense: [
    {
      id: 'music-suspense-01',
      category: 'Suspense',
      title: 'Dark Tension Rising',
      artist: 'Shadow Pulse',
      url: 'https://assets.mixkit.co/music/preview/mixkit-mysterious-lights-512.mp3',
      duration: 50,
      bpm: 90,
      license: 'Royalty-Free Commercial',
      vibe: 'Atmospheric tension, thrilling'
    },
    {
      id: 'music-suspense-02',
      category: 'Suspense',
      title: 'Midnight Mystery Investigation',
      artist: 'Noir Soundscapes',
      url: 'https://assets.mixkit.co/music/preview/mixkit-cinematic-mystery-trailer-drum-roll-549.mp3',
      duration: 48,
      bpm: 88,
      license: 'Royalty-Free Commercial',
      vibe: 'Moody noir suspense'
    }
  ],
  Space: [
    {
      id: 'music-space-01',
      category: 'Space',
      title: 'Cosmic Nebula Horizon',
      artist: 'Stellar Sound Orchestra',
      url: 'https://assets.mixkit.co/music/preview/mixkit-deep-ambient-soundscape-420.mp3',
      duration: 65,
      bpm: 80,
      license: 'Royalty-Free Commercial',
      vibe: 'Cosmic, atmospheric, wondrous'
    },
    {
      id: 'music-space-02',
      category: 'Space',
      title: 'Interstellar Voyage',
      artist: 'Astral Echoes',
      url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
      duration: 60,
      bpm: 85,
      license: 'Royalty-Free Commercial',
      vibe: 'Cinematic deep space journey'
    },
    {
      id: 'music-space-03',
      category: 'Space',
      title: 'Lunar Mysteries Ambient',
      artist: 'CosmoSphere Audio',
      url: 'https://assets.mixkit.co/music/preview/mixkit-epic-orchestral-game-intro-hero-256.mp3',
      duration: 58,
      bpm: 92,
      license: 'Royalty-Free Commercial',
      vibe: 'Mysterious celestial harmony'
    }
  ],
  Science: [
    {
      id: 'music-science-01',
      category: 'Science',
      title: 'Future Lab Technology Pulse',
      artist: 'Quantum Beats',
      url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      duration: 68,
      bpm: 120,
      license: 'Royalty-Free Commercial',
      vibe: 'Technological, modern discovery'
    },
    {
      id: 'music-science-02',
      category: 'Science',
      title: 'Digital Matrix Exploration',
      artist: 'Synthwave Labs',
      url: 'https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3',
      duration: 52,
      bpm: 118,
      license: 'Royalty-Free Commercial',
      vibe: 'Futuristic documentary synth'
    }
  ],
  Health: [
    {
      id: 'music-health-01',
      category: 'Health',
      title: 'Pure Hydration & Vitality',
      artist: 'Zen Wellness Audio',
      url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
      duration: 75,
      bpm: 82,
      license: 'Royalty-Free Commercial',
      vibe: 'Calm, positive, clean, refreshing'
    },
    {
      id: 'music-health-02',
      category: 'Health',
      title: 'Morning Wellness Awakening',
      artist: 'Organic Harmony',
      url: 'https://assets.mixkit.co/music/preview/mixkit-summer-fun-13.mp3',
      duration: 60,
      bpm: 95,
      license: 'Royalty-Free Commercial',
      vibe: 'Inspiring, uplifting health flow'
    },
    {
      id: 'music-health-03',
      category: 'Health',
      title: 'Gentle Pure Water Piano',
      artist: 'Acoustic Oasis',
      url: 'https://assets.mixkit.co/music/preview/mixkit-raising-me-higher-34.mp3',
      duration: 65,
      bpm: 88,
      license: 'Royalty-Free Commercial',
      vibe: 'Clean, serene, rejuvenating'
    }
  ],
  Animal: [
    {
      id: 'music-animal-01',
      category: 'Animal',
      title: 'Playful Whiskers & Paws',
      artist: 'Sunny Meadow Records',
      url: 'https://assets.mixkit.co/music/preview/mixkit-comical-2.mp3',
      duration: 45,
      bpm: 116,
      license: 'Royalty-Free Commercial',
      vibe: 'Playful, lighthearted, cute bounce'
    },
    {
      id: 'music-animal-02',
      category: 'Animal',
      title: 'Curious Pets Adventure',
      artist: 'Playful Sounds Studio',
      url: 'https://assets.mixkit.co/music/preview/mixkit-energetic-hip-hop-833.mp3',
      duration: 55,
      bpm: 122,
      license: 'Royalty-Free Commercial',
      vibe: 'Bouncy energetic fun'
    },
    {
      id: 'music-animal-03',
      category: 'Animal',
      title: 'Wildlife Natural Wonders',
      artist: 'Nature Beats',
      url: 'https://assets.mixkit.co/music/preview/mixkit-summer-fun-13.mp3',
      duration: 58,
      bpm: 110,
      license: 'Royalty-Free Commercial',
      vibe: 'Light, natural, cheerful'
    }
  ],
  FunFact: [
    {
      id: 'music-funfact-01',
      category: 'FunFact',
      title: 'Upbeat Viral Fact Pulse',
      artist: 'ShortsForge Beats',
      url: 'https://assets.mixkit.co/music/preview/mixkit-energetic-hip-hop-833.mp3',
      duration: 55,
      bpm: 128,
      license: 'Royalty-Free Commercial',
      vibe: 'Energetic, upbeat, playful'
    },
    {
      id: 'music-funfact-02',
      category: 'FunFact',
      title: 'Curiosity Spark Groove',
      artist: 'Groove Labs',
      url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      duration: 62,
      bpm: 125,
      license: 'Royalty-Free Commercial',
      vibe: 'Engaging, witty rhythm'
    },
    {
      id: 'music-funfact-03',
      category: 'FunFact',
      title: 'Quirky Discovery Pop',
      artist: 'Fun Factory Audio',
      url: 'https://assets.mixkit.co/music/preview/mixkit-comical-2.mp3',
      duration: 48,
      bpm: 118,
      license: 'Royalty-Free Commercial',
      vibe: 'Playful punchy pop'
    }
  ],
  History: [
    {
      id: 'music-history-01',
      category: 'History',
      title: 'Ancient Empires Chronicle',
      artist: 'Epic Cinematic Orchestra',
      url: 'https://assets.mixkit.co/music/preview/mixkit-epic-orchestral-game-intro-hero-256.mp3',
      duration: 62,
      bpm: 105,
      license: 'Royalty-Free Commercial',
      vibe: 'Dramatic, grand, historical'
    },
    {
      id: 'music-history-02',
      category: 'History',
      title: 'Legends of Antiquity',
      artist: 'Chronicle Audio',
      url: 'https://assets.mixkit.co/music/preview/mixkit-cinematic-mystery-trailer-drum-roll-549.mp3',
      duration: 52,
      bpm: 95,
      license: 'Royalty-Free Commercial',
      vibe: 'Deep documentary drama'
    }
  ],
  Education: [
    {
      id: 'music-education-01',
      category: 'Education',
      title: 'Inquiring Minds Documentary',
      artist: 'Academy Soundworks',
      url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
      duration: 70,
      bpm: 90,
      license: 'Royalty-Free Commercial',
      vibe: 'Light, informative, acoustic'
    },
    {
      id: 'music-education-02',
      category: 'Education',
      title: 'Clear Focus & Knowledge',
      artist: 'Study Lounge Audio',
      url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      duration: 60,
      bpm: 105,
      license: 'Royalty-Free Commercial',
      vibe: 'Documentary, thoughtful pace'
    }
  ],
  Motivational: [
    {
      id: 'music-motivation-01',
      category: 'Motivational',
      title: 'Unstoppable Momentum',
      artist: 'Peak Performance Audio',
      url: 'https://assets.mixkit.co/music/preview/mixkit-raising-me-higher-34.mp3',
      duration: 65,
      bpm: 120,
      license: 'Royalty-Free Commercial',
      vibe: 'Inspiring, uplifting, empowering'
    },
    {
      id: 'music-motivation-02',
      category: 'Motivational',
      title: 'Rise to Greatness',
      artist: 'Champion Soundscapes',
      url: 'https://assets.mixkit.co/music/preview/mixkit-epic-orchestral-game-intro-hero-256.mp3',
      duration: 60,
      bpm: 115,
      license: 'Royalty-Free Commercial',
      vibe: 'Grand cinematic triumph'
    }
  ],
  Cinematic: [
    {
      id: 'music-cinematic-01',
      category: 'Cinematic',
      title: 'Epic Awakening Odyssey',
      artist: 'ShortsForge Studio Orchestra',
      url: 'https://assets.mixkit.co/music/preview/mixkit-epic-orchestral-game-intro-hero-256.mp3',
      duration: 62,
      bpm: 110,
      license: 'Royalty-Free Commercial',
      vibe: 'Grand cinematic documentary'
    },
    {
      id: 'music-cinematic-02',
      category: 'Cinematic',
      title: 'Deep Horizon Rising',
      artist: 'Cinematic Soundscapes',
      url: 'https://assets.mixkit.co/music/preview/mixkit-cinematic-mystery-trailer-drum-roll-549.mp3',
      duration: 48,
      bpm: 95,
      license: 'Royalty-Free Commercial',
      vibe: 'Atmospheric cinematic trailer'
    }
  ],
  Energetic: [
    {
      id: 'music-energetic-01',
      category: 'Energetic',
      title: 'High Velocity Bass Pulse',
      artist: 'ShortsForge Beats',
      url: 'https://assets.mixkit.co/music/preview/mixkit-energetic-hip-hop-833.mp3',
      duration: 55,
      bpm: 128,
      license: 'Royalty-Free Commercial',
      vibe: 'Upbeat modern hip-hop groove'
    }
  ],
  Emotional: [
    {
      id: 'music-emotional-01',
      category: 'Emotional',
      title: 'Gentle Piano Reflections',
      artist: 'Acoustic Horizon',
      url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
      duration: 75,
      bpm: 80,
      license: 'Royalty-Free Commercial',
      vibe: 'Warm, heartfelt piano'
    }
  ],
  Technology: [
    {
      id: 'music-tech-01',
      category: 'Technology',
      title: 'Cyber Grid Pulse',
      artist: 'Synthwave Matrix',
      url: 'https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3',
      duration: 52,
      bpm: 125,
      license: 'Royalty-Free Commercial',
      vibe: 'Futuristic electronic rhythm'
    }
  ],
  General: [
    {
      id: 'music-general-01',
      category: 'General',
      title: 'Documentary Storyflow',
      artist: 'ShortsForge Ambient',
      url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
      duration: 65,
      bpm: 92,
      license: 'Royalty-Free Commercial',
      vibe: 'Clean, balanced storytelling'
    },
    {
      id: 'music-general-02',
      category: 'General',
      title: 'Inspiring Discovery Pulse',
      artist: 'Modern Audio Works',
      url: 'https://assets.mixkit.co/music/preview/mixkit-raising-me-higher-34.mp3',
      duration: 58,
      bpm: 110,
      license: 'Royalty-Free Commercial',
      vibe: 'Positive, engaging backdrop'
    }
  ]
};

export class MusicProvider {
  private musicDir: string;
  private isInitialized = false;
  private generationLocks: Map<string, Promise<void>> = new Map(); // NEW: mencegah race condition per kategori

  constructor() {
    this.musicDir = path.join(process.cwd(), 'public', 'audio', 'music');
    if (!fs.existsSync(this.musicDir)) {
      fs.mkdirSync(this.musicDir, { recursive: true });
    }
    // Asynchronously pre-warm all categories on startup
    setTimeout(() => {
      this.initializeAllTracks().catch(() => {});
    }, 500);
  }

  /**
   * Pre-generates music tracks for all supported categories so they are immediately available
   */
  async initializeAllTracks(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    const categories: MusicCategory[] = [
      'General',
      'Scary',
      'Suspense',
      'Space',
      'Animal',
      'Health',
      'Science',
      'History',
      'Motivational',
      'FunFact',
      'Education',
      'Cinematic',
      'Energetic',
      'Emotional',
      'Technology'
    ];

    await Promise.allSettled(
      categories.map(cat => this.ensureMusicTrackAvailable(cat))
    );
  }

  getTracks(category?: MusicCategory): MusicTrack[] {
    if (!category || category === 'None') {
      const all: MusicTrack[] = [];
      Object.values(MUSIC_CATALOG).forEach(tracks => all.push(...tracks));
      return all;
    }
    const catKey = this.normalizeCategoryKey(category);
    return MUSIC_CATALOG[catKey] || MUSIC_CATALOG.General || MUSIC_CATALOG.Cinematic;
  }

  /**
   * Selects a track within category using rotation/randomization seeded by seedId/projectId
   */
  getTrackForProject(category: MusicCategory, seedId?: string): MusicTrack | null {
    if (category === 'None') return null;
    const catKey = this.normalizeCategoryKey(category);
    const tracks = MUSIC_CATALOG[catKey] || MUSIC_CATALOG.General || MUSIC_CATALOG.Cinematic;
    if (!tracks || tracks.length === 0) return null;

    if (!seedId) {
      const randIdx = Math.floor(Math.random() * tracks.length);
      return tracks[randIdx];
    }

    // Deterministic rotation based on seed
    let hash = 0;
    for (let i = 0; i < seedId.length; i++) {
      hash = (hash << 5) - hash + seedId.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % tracks.length;
    return tracks[idx];
  }

  getBestTrackForCategory(category: MusicCategory): MusicTrack | null {
    return this.getTrackForProject(category);
  }

  /**
   * Intelligently detects the best matching music category based on topic semantics
   */
  detectMusicCategoryFromTopic(topic: string): MusicCategory {
    const t = topic.toLowerCase();

    // 1. SCARY / MYSTERY
    if (
      t.includes('menakutkan') ||
      t.includes('scary') ||
      t.includes('horror') ||
      t.includes('misteri') ||
      t.includes('mystery') ||
      t.includes('seram') ||
      t.includes('gelap') ||
      t.includes('hantu') ||
      t.includes('creepy') ||
      t.includes('angker')
    ) {
      return 'Scary';
    }

    // 2. SPACE
    if (
      t.includes('bulan') ||
      t.includes('moon') ||
      t.includes('space') ||
      t.includes('angkasa') ||
      t.includes('galaxy') ||
      t.includes('galaksi') ||
      t.includes('cosmos') ||
      t.includes('astronot') ||
      t.includes('planet') ||
      t.includes('mars') ||
      t.includes('solar system') ||
      t.includes('tata surya')
    ) {
      return 'Space';
    }

    // 3. ANIMAL
    if (
      t.includes('kucing') ||
      t.includes('cat') ||
      t.includes('kitten') ||
      t.includes('anjing') ||
      t.includes('dog') ||
      t.includes('hewan') ||
      t.includes('animal') ||
      t.includes('pet') ||
      t.includes('singa') ||
      t.includes('harimau') ||
      t.includes('fauna')
    ) {
      return 'Animal';
    }

    // 4. HEALTH / HYDRATION
    if (
      t.includes('air') ||
      t.includes('water') ||
      t.includes('hidrasi') ||
      t.includes('hydration') ||
      t.includes('minum') ||
      t.includes('sehat') ||
      t.includes('health') ||
      t.includes('tubuh') ||
      t.includes('badan') ||
      t.includes('organ') ||
      t.includes('ginjal') ||
      t.includes('diet') ||
      t.includes('nutrisi') ||
      t.includes('meditasi') ||
      t.includes('tidur')
    ) {
      return 'Health';
    }

    // 5. SCIENCE / TECH
    if (
      t.includes('tech') ||
      t.includes('ai') ||
      t.includes('coding') ||
      t.includes('komputer') ||
      t.includes('robot') ||
      t.includes('sains') ||
      t.includes('science') ||
      t.includes('fisika') ||
      t.includes('kimia') ||
      t.includes('quantum') ||
      t.includes('penemuan')
    ) {
      return 'Science';
    }

    // 6. HISTORY / ANCIENT
    if (
      t.includes('sejarah') ||
      t.includes('history') ||
      t.includes('piramida') ||
      t.includes('pyramid') ||
      t.includes('mesir') ||
      t.includes('egypt') ||
      t.includes('kuno') ||
      t.includes('ancient') ||
      t.includes('perang') ||
      t.includes('kerajaan') ||
      t.includes('arkeologi')
    ) {
      return 'History';
    }

    // 7. MOTIVATION / WEALTH
    if (
      t.includes('sukses') ||
      t.includes('success') ||
      t.includes('kaya') ||
      t.includes('uang') ||
      t.includes('money') ||
      t.includes('bisnis') ||
      t.includes('business') ||
      t.includes('motivasi') ||
      t.includes('karir') ||
      t.includes('kaya') ||
      t.includes('disiplin')
    ) {
      return 'Motivational';
    }

    // 8. FUN FACTS
    if (
      t.includes('fakta') ||
      t.includes('fact') ||
      t.includes('unik') ||
      t.includes('rahasia') ||
      t.includes('menarik') ||
      t.includes('lucu') ||
      t.includes('funny') ||
      t.includes('tahu')
    ) {
      return 'FunFact';
    }

    // 9. EDUCATION / TUTORIAL
    if (
      t.includes('belajar') ||
      t.includes('cara') ||
      t.includes('tutorial') ||
      t.includes('edukasi') ||
      t.includes('tips') ||
      t.includes('kenapa') ||
      t.includes('mengapa')
    ) {
      return 'Education';
    }

    return 'General';
  }

  /**
   * Ensures a valid, playable MP3 music file exists on disk, downloading or synthesizing with multi-track variation
   */
  async ensureMusicTrackAvailable(
    category: MusicCategory,
    seedId?: string
  ): Promise<{ url: string; localPath: string; trackTitle: string }> {
    const catKey = this.normalizeCategoryKey(category || 'General');
    const chosenTrack = this.getTrackForProject(category, seedId);
    const trackId = chosenTrack ? chosenTrack.id : `music_${catKey.toLowerCase()}_01`;
    const filename = `${trackId}.mp3`;
    const localPath = path.join(this.musicDir, filename);
    const publicUrl = `/audio/music/${filename}`;
    const trackTitle = chosenTrack?.title || `${catKey} Background Theme`;

    const isAudioValid = (filePath: string): boolean => {
      if (!fs.existsSync(filePath)) return false;
      if (fs.statSync(filePath).size < 2000) return false;
      try {
        const res = spawnSync(getFfmpegPath(), ['-v', 'error', '-i', filePath, '-t', '0.5', '-f', 'null', '-']);
        return res.status === 0;
      } catch {
        return false;
      }
    };

    if (isAudioValid(localPath)) {
      return { url: publicUrl, localPath, trackTitle };
    }

    // NEW: kalau kategori ini sedang di-generate oleh request lain, tunggu proses itu selesai
    // dulu daripada menulis file yang sama secara bersamaan.
    if (this.generationLocks.has(filename)) {
      await this.generationLocks.get(filename);
      if (isAudioValid(localPath)) {
        return { url: publicUrl, localPath, trackTitle };
      }
    }

    const genPromise = (async () => {
      // NEW: generate ke file sementara unik dulu, baru rename atomic ke path final.
      // Ini mencegah proses lain membaca file yang masih setengah ditulis.
      const tempPath = path.join(this.musicDir, `.tmp_${trackId}_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
      await this.generateRichMelodicBGM(tempPath, catKey);
      if (isAudioValid(tempPath)) {
        fs.renameSync(tempPath, localPath);
      } else if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
    })();

    this.generationLocks.set(filename, genPromise);
    try {
      await genPromise;
    } finally {
      this.generationLocks.delete(filename);
    }

    if (isAudioValid(localPath)) {
      return { url: publicUrl, localPath, trackTitle };
    }

    // Fallback ke general (logic ini tetap sama seperti sebelumnya)
    const generalFallbackPath = path.join(this.musicDir, 'music-general-01.mp3');
    if (generalFallbackPath !== localPath) {
      if (isAudioValid(generalFallbackPath)) {
        try { fs.copyFileSync(generalFallbackPath, localPath); } catch {}
      } else {
        await this.generateRichMelodicBGM(generalFallbackPath, 'General');
        if (isAudioValid(generalFallbackPath)) {
          try { fs.copyFileSync(generalFallbackPath, localPath); } catch {}
        }
      }
    }

    return { url: publicUrl, localPath, trackTitle };
  }

  /**
   * Generates a pleasant, rich ambient musical pad with harmonic chord progression
   */
  private async generateRichMelodicBGM(destPath: string, catKey: string): Promise<void> {
    try {
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Harmonic chords based on category
      let f1 = 220.00; // A3
      let f2 = 277.18; // C#4
      let f3 = 329.63; // E4
      let filterFreq = 1200;

      if (catKey === 'Scary' || catKey === 'Suspense') {
        f1 = 110.00; // A2 deep bass
        f2 = 130.81; // C3 dark minor
        f3 = 155.56; // Eb3 diminished tension
        filterFreq = 700;
      } else if (catKey === 'Space') {
        f1 = 146.83; // D3
        f2 = 220.00; // A3
        f3 = 329.63; // E4 open fifths
        filterFreq = 950;
      } else if (catKey === 'Health') {
        f1 = 174.61; // F3 serene
        f2 = 220.00; // A3
        f3 = 261.63; // C4 pure major triad
        filterFreq = 1400;
      } else if (catKey === 'Animal' || catKey === 'FunFact' || catKey === 'Energetic') {
        f1 = 261.63; // C4 bright
        f2 = 329.63; // E4
        f3 = 392.00; // G4 upbeat
        filterFreq = 1600;
      } else if (catKey === 'Science' || catKey === 'Technology') {
        f1 = 196.00; // G3
        f2 = 246.94; // B3
        f3 = 293.66; // D4 synth drive
        filterFreq = 1300;
      } else if (catKey === 'Motivational' || catKey === 'History') {
        f1 = 164.81; // E3
        f2 = 246.94; // B3
        f3 = 329.63; // E4 epic fifth
        filterFreq = 1200;
      }

      await new Promise<void>((resolve) => {
        const proc = spawn(getFfmpegPath(), [
          '-y',
          '-f', 'lavfi', '-i', `anoisesrc=d=65:c=pink:r=44100:a=0.012`,
          '-f', 'lavfi', '-i', `sine=f=${f1}:d=65`,
          '-f', 'lavfi', '-i', `sine=f=${f2}:d=65`,
          '-f', 'lavfi', '-i', `sine=f=${f3}:d=65`,
          '-filter_complex', `[0:a][1:a][2:a][3:a]amix=inputs=4:duration=longest,lowpass=f=${filterFreq},volume=0.85[aout]`,
          '-map', '[aout]',
          '-c:a', 'libmp3lame',
          '-b:a', '192k',
          '-ar', '44100',
          '-t', '65',
          destPath
        ]);
        proc.on('close', () => resolve());
        proc.on('error', () => resolve());
      });
    } catch {
      // ignore
    }
  }

  private normalizeCategoryKey(cat: string): string {
    const lower = cat.toLowerCase().replace(/[^a-z]/g, '');
    if (lower.includes('scary') || lower.includes('horror') || lower.includes('suspense') || lower.includes('misteri')) return 'Scary';
    if (lower.includes('space') || lower.includes('bulan') || lower.includes('lunar')) return 'Space';
    if (lower.includes('animal') || lower.includes('kucing') || lower.includes('pet')) return 'Animal';
    if (lower.includes('health') || lower.includes('air') || lower.includes('water') || lower.includes('sehat')) return 'Health';
    if (lower.includes('science') || lower.includes('tech')) return 'Science';
    if (lower.includes('history') || lower.includes('sejarah')) return 'History';
    if (lower.includes('motivation') || lower.includes('motivasi') || lower.includes('sukses')) return 'Motivational';
    if (lower.includes('fun') || lower.includes('fact') || lower.includes('energetic')) return 'FunFact';
    if (lower.includes('education') || lower.includes('edukasi')) return 'Education';
    if (lower.includes('cinematic')) return 'Cinematic';
    if (lower.includes('emotional')) return 'Emotional';
    return 'General';
  }

  private async downloadFile(fileUrl: string, destPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const file = fs.createWriteStream(destPath);
        const client = fileUrl.startsWith('https') ? https : http;

        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        };

        const req = client.get(fileUrl, options, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const redirectUrl = res.headers.location;
            if (redirectUrl) {
              file.close();
              this.downloadFile(redirectUrl, destPath).then(resolve);
              return;
            }
          }

          if (res.statusCode !== 200) {
            file.close();
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            resolve(false);
            return;
          }

          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(true);
          });
        });

        req.on('error', () => {
          file.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          resolve(false);
        });

        req.setTimeout(12000, () => {
          req.destroy();
          file.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }
}

export const musicProvider = new MusicProvider();
