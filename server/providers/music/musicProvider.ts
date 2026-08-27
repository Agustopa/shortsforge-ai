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

// Multi-track catalog categorized by topic mood with royalty-free licenses (CC-BY 4.0 / Royalty-Free Commercial)
export const MUSIC_CATALOG: Record<string, MusicTrack[]> = {
  FunFact: [
    {
      id: 'music-funfact-01',
      category: 'FunFact',
      title: 'Sneaky Snitch',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-funfact-01.mp3',
      duration: 136,
      bpm: 128,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Playful, bouncy, curious, viral hook'
    },
    {
      id: 'music-funfact-02',
      category: 'FunFact',
      title: 'Fluffing a Duck',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-funfact-02.mp3',
      duration: 67,
      bpm: 130,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Quirky, funny, cheerful fact rhythm'
    },
    {
      id: 'music-funfact-03',
      category: 'FunFact',
      title: 'Hidden Agenda',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-funfact-03.mp3',
      duration: 135,
      bpm: 120,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Engaging, witty investigation'
    }
  ],
  Animal: [
    {
      id: 'music-animal-01',
      category: 'Animal',
      title: 'Monkeys Spinning Monkeys',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-animal-01.mp3',
      duration: 125,
      bpm: 132,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Playful, cute, lively bounce'
    },
    {
      id: 'music-animal-02',
      category: 'Animal',
      title: 'Carefree',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-animal-02.mp3',
      duration: 205,
      bpm: 110,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Sunny, cheerful pet adventures'
    },
    {
      id: 'music-animal-03',
      category: 'Animal',
      title: 'Sneaky Snitch',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-animal-03.mp3',
      duration: 136,
      bpm: 128,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Curious cute animals'
    }
  ],
  Scary: [
    {
      id: 'music-scary-01',
      category: 'Scary',
      title: 'The Dread',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-scary-01.mp3',
      duration: 197,
      bpm: 75,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Dark, creepy, chilling horror'
    },
    {
      id: 'music-scary-02',
      category: 'Scary',
      title: 'Unseen Horrors',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-scary-02.mp3',
      duration: 251,
      bpm: 80,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Atmospheric terror, haunting'
    },
    {
      id: 'music-scary-03',
      category: 'Scary',
      title: 'Ghost Processional',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-scary-03.mp3',
      duration: 104,
      bpm: 88,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Eerie mystery, paranormal suspense'
    }
  ],
  Suspense: [
    {
      id: 'music-suspense-01',
      category: 'Suspense',
      title: 'Ghost Processional',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-suspense-01.mp3',
      duration: 104,
      bpm: 88,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Moody suspense, tension'
    },
    {
      id: 'music-suspense-02',
      category: 'Suspense',
      title: 'Industrial Music Box',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-suspense-02.mp3',
      duration: 102,
      bpm: 92,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Unsettling clockwork mystery'
    }
  ],
  Space: [
    {
      id: 'music-space-01',
      category: 'Space',
      title: 'Impact Moderato',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-space-01.mp3',
      duration: 75,
      bpm: 85,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Cosmic cinematic voyage'
    },
    {
      id: 'music-space-02',
      category: 'Space',
      title: 'Echoes of Time',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-space-02.mp3',
      duration: 285,
      bpm: 78,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Deep space wonders, infinite horizons'
    }
  ],
  Science: [
    {
      id: 'music-science-01',
      category: 'Science',
      title: 'Electrodoodle',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-science-01.mp3',
      duration: 166,
      bpm: 120,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Technological, energetic discovery'
    },
    {
      id: 'music-science-02',
      category: 'Science',
      title: 'Electrodoodle Synth Pulse',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-science-02.mp3',
      duration: 166,
      bpm: 120,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Modern laboratory synth'
    }
  ],
  Technology: [
    {
      id: 'music-tech-01',
      category: 'Technology',
      title: 'Electrodoodle',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-tech-01.mp3',
      duration: 166,
      bpm: 120,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Futuristic electronic rhythm'
    }
  ],
  Health: [
    {
      id: 'music-health-01',
      category: 'Health',
      title: 'Daily Beetle',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-health-01.mp3',
      duration: 316,
      bpm: 90,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Calm, refreshing, positive health flow'
    },
    {
      id: 'music-health-02',
      category: 'Health',
      title: 'Clean Soul',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-health-02.mp3',
      duration: 306,
      bpm: 85,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Pure acoustic harmony, rejuvenation'
    },
    {
      id: 'music-health-03',
      category: 'Health',
      title: 'Life of Riley',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-health-03.mp3',
      duration: 235,
      bpm: 110,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Uplifting wellness and vitality'
    }
  ],
  History: [
    {
      id: 'music-history-01',
      category: 'History',
      title: 'Heroic Age',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-history-01.mp3',
      duration: 97,
      bpm: 100,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Grand historical documentary'
    },
    {
      id: 'music-history-02',
      category: 'History',
      title: 'Crusade',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-history-02.mp3',
      duration: 198,
      bpm: 95,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Epic medieval antiquity chronicle'
    }
  ],
  Education: [
    {
      id: 'music-education-01',
      category: 'Education',
      title: 'Airport Lounge',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-education-01.mp3',
      duration: 276,
      bpm: 92,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Smooth acoustic jazz, thoughtful focus'
    },
    {
      id: 'music-education-02',
      category: 'Education',
      title: 'Daily Beetle',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-education-02.mp3',
      duration: 150,
      bpm: 90,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Clear, light acoustic storytelling'
    }
  ],
  Motivational: [
    {
      id: 'music-motivation-01',
      category: 'Motivational',
      title: 'Perspectives',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-motivation-01.mp3',
      duration: 718,
      bpm: 115,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Inspiring, uplifting, triumph'
    },
    {
      id: 'music-motivation-02',
      category: 'Motivational',
      title: 'Perspectives Uplift',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-motivation-02.mp3',
      duration: 718,
      bpm: 115,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Peak performance and success'
    }
  ],
  Cinematic: [
    {
      id: 'music-cinematic-01',
      category: 'Cinematic',
      title: 'Hero Down',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-cinematic-01.mp3',
      duration: 214,
      bpm: 95,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Grand cinematic trailer drama'
    },
    {
      id: 'music-cinematic-02',
      category: 'Cinematic',
      title: 'Prelude and Action',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-cinematic-02.mp3',
      duration: 98,
      bpm: 110,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Intense cinematic action pulse'
    }
  ],
  Energetic: [
    {
      id: 'music-energetic-01',
      category: 'Energetic',
      title: 'Monkeys Spinning Monkeys',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-energetic-01.mp3',
      duration: 125,
      bpm: 132,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Upbeat, high energy groove'
    }
  ],
  Emotional: [
    {
      id: 'music-emotional-01',
      category: 'Emotional',
      title: 'Heartwarming',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-emotional-01.mp3',
      duration: 72,
      bpm: 78,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Warm, heartfelt piano reflections'
    }
  ],
  General: [
    {
      id: 'music-general-01',
      category: 'General',
      title: 'Life of Riley',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-general-01.mp3',
      duration: 235,
      bpm: 110,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Clean, cheerful, balanced storytelling'
    },
    {
      id: 'music-general-02',
      category: 'General',
      title: 'Carefree',
      artist: 'Kevin MacLeod (Incompetech)',
      url: '/audio/music/music-general-02.mp3',
      duration: 205,
      bpm: 110,
      license: 'Royalty-Free Commercial (CC-BY 4.0)',
      vibe: 'Positive, engaging backdrop'
    }
  ]
};

// Aliases for user-facing UI categories
MUSIC_CATALOG.Corporate = MUSIC_CATALOG.Education;
MUSIC_CATALOG.Funny = MUSIC_CATALOG.FunFact;
MUSIC_CATALOG.Travel = MUSIC_CATALOG.General;

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
   * Ensures a valid, playable MP3 music file exists on disk, prioritizing static royalty-free assets
   */
  async ensureMusicTrackAvailable(
    category: MusicCategory,
    seedId?: string
  ): Promise<{ url: string; localPath: string; trackTitle: string }> {
    const catKey = this.normalizeCategoryKey(category || 'General');
    const chosenTrack = this.getTrackForProject(category, seedId);
    const trackId = chosenTrack ? chosenTrack.id : `music-${catKey.toLowerCase()}-01`;
    const filename = `${trackId}.mp3`;
    const localPath = path.join(this.musicDir, filename);
    const publicUrl = `/audio/music/${filename}`;
    const trackTitle = chosenTrack?.title || `${catKey} Background Theme`;

    const isAudioValid = (filePath: string): boolean => {
      if (!fs.existsSync(filePath)) return false;
      if (fs.statSync(filePath).size < 10000) return false;
      try {
        const res = spawnSync(getFfmpegPath(), ['-v', 'error', '-i', filePath, '-t', '0.5', '-f', 'null', '-']);
        return res.status === 0;
      } catch {
        return false;
      }
    };

    // 1. Primary: If the static MP3 exists and is valid on disk, return it immediately
    if (isAudioValid(localPath)) {
      return { url: publicUrl, localPath, trackTitle };
    }

    // 2. Secondary: If there are other valid static tracks in this category, use one of them
    const categoryTracks = MUSIC_CATALOG[catKey] || [];
    for (const altTrack of categoryTracks) {
      const altFilename = `${altTrack.id}.mp3`;
      const altLocalPath = path.join(this.musicDir, altFilename);
      if (isAudioValid(altLocalPath)) {
        try {
          fs.copyFileSync(altLocalPath, localPath);
          return { url: publicUrl, localPath, trackTitle: altTrack.title };
        } catch {}
      }
    }

    // 3. Tertiary: General fallback track from disk (e.g. Life of Riley or Carefree)
    const generalFiles = ['music-general-01.mp3', 'music-funfact-01.mp3', 'music-cinematic-01.mp3', 'music-animal-01.mp3'];
    for (const genFile of generalFiles) {
      const genPath = path.join(this.musicDir, genFile);
      if (isAudioValid(genPath)) {
        try {
          fs.copyFileSync(genPath, localPath);
          return { url: publicUrl, localPath, trackTitle };
        } catch {}
      }
    }

    // 4. Download from remote if needed
    const remoteUrl = `https://incompetech.com/music/royalty-free/mp3-royaltyfree/Life%20of%20Riley.mp3`;
    const tempDir = path.join(process.cwd(), 'data', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const tempDl = path.join(tempDir, `dl_${Date.now()}.mp3`);
    const dlOk = await this.downloadFile(remoteUrl, tempDl);
    if (dlOk && isAudioValid(tempDl)) {
      try {
        fs.copyFileSync(tempDl, localPath);
        fs.unlinkSync(tempDl);
        return { url: publicUrl, localPath, trackTitle };
      } catch {}
    }

    // 5. Ultimate fallback: Dynamic synthesis
    await this.generateRichMelodicBGM(localPath, catKey);
    return { url: publicUrl, localPath, trackTitle };
  }

  /**
   * Generates an ambient musical pad with gentle arpeggio rhythm
   */
  private async generateRichMelodicBGM(destPath: string, catKey: string): Promise<void> {
    try {
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let f1 = 261.63; // C4
      let f2 = 329.63; // E4
      let f3 = 392.00; // G4
      let filterFreq = 1200;

      if (catKey === 'Scary' || catKey === 'Suspense') {
        f1 = 110.00; // A2
        f2 = 130.81; // C3
        f3 = 164.81; // E3
        filterFreq = 700;
      } else if (catKey === 'Cinematic' || catKey === 'History') {
        f1 = 174.61; // F3
        f2 = 220.00; // A3
        f3 = 261.63; // C4
        filterFreq = 1000;
      }

      await new Promise<void>((resolve) => {
        const proc = spawn(getFfmpegPath(), [
          '-y',
          '-f', 'lavfi', '-i', `sine=f=${f1}:d=70,tremolo=f=1.5:d=0.6`,
          '-f', 'lavfi', '-i', `sine=f=${f2}:d=70,tremolo=f=2.0:d=0.5`,
          '-f', 'lavfi', '-i', `sine=f=${f3}:d=70,tremolo=f=3.0:d=0.4`,
          '-filter_complex',
          `[0:a][1:a][2:a]amix=inputs=3:normalize=0,lowpass=f=${filterFreq},highpass=f=80,aecho=0.8:0.7:100|200:0.3|0.15,volume=0.2,alimiter=limit=0.8[aout]`,
          '-map', '[aout]',
          '-c:a', 'libmp3lame',
          '-b:a', '192k',
          '-ar', '48000',
          '-t', '70',
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
