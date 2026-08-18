import fs from 'fs';
import path from 'path';
import { MusicCategory } from '../../../src/types/index';

export interface MusicTrack {
  id: string;
  category: MusicCategory;
  title: string;
  artist: string;
  url: string;
  duration: number;
  bpm: number;
  license: string;
}

const MUSIC_CATALOG: Record<MusicCategory, MusicTrack[]> = {
  None: [],
  Cinematic: [
    {
      id: 'music-cinematic-1',
      category: 'Cinematic',
      title: 'Epic Awakening Odyssey',
      artist: 'ShortsForge Studio Orchestra',
      url: 'https://assets.mixkit.co/music/preview/mixkit-epic-orchestral-game-intro-hero-256.mp3',
      duration: 62,
      bpm: 110,
      license: 'Royalty-Free Commercial License'
    },
    {
      id: 'music-cinematic-2',
      category: 'Cinematic',
      title: 'Deep Horizon Rising',
      artist: 'Cinematic Soundscapes',
      url: 'https://assets.mixkit.co/music/preview/mixkit-cinematic-mystery-trailer-drum-roll-549.mp3',
      duration: 48,
      bpm: 95,
      license: 'Royalty-Free Commercial License'
    }
  ],
  Energetic: [
    {
      id: 'music-energetic-1',
      category: 'Energetic',
      title: 'High Velocity Bass Pulse',
      artist: 'ShortsForge Beats',
      url: 'https://assets.mixkit.co/music/preview/mixkit-energetic-hip-hop-833.mp3',
      duration: 55,
      bpm: 128,
      license: 'Royalty-Free Commercial License'
    }
  ],
  Emotional: [
    {
      id: 'music-emotional-1',
      category: 'Emotional',
      title: 'Gentle Piano Reflections',
      artist: 'Acoustic Horizon',
      url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
      duration: 75,
      bpm: 80,
      license: 'Royalty-Free Commercial License'
    }
  ],
  Suspense: [
    {
      id: 'music-suspense-1',
      category: 'Suspense',
      title: 'Dark Tension Rising',
      artist: 'Shadow Pulse',
      url: 'https://assets.mixkit.co/music/preview/mixkit-mysterious-lights-512.mp3',
      duration: 50,
      bpm: 90,
      license: 'Royalty-Free Commercial License'
    }
  ],
  Corporate: [
    {
      id: 'music-corporate-1',
      category: 'Corporate',
      title: 'Inspiring Innovation Groove',
      artist: 'TechForward Audio',
      url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      duration: 68,
      bpm: 122,
      license: 'Royalty-Free Commercial License'
    }
  ],
  Funny: [
    {
      id: 'music-funny-1',
      category: 'Funny',
      title: 'Quirky Sneaky Bounce',
      artist: 'Playful Sounds',
      url: 'https://assets.mixkit.co/music/preview/mixkit-comical-2.mp3',
      duration: 45,
      bpm: 115,
      license: 'Royalty-Free Commercial License'
    }
  ],
  Travel: [
    {
      id: 'music-travel-1',
      category: 'Travel',
      title: 'Tropical Sunrise Acoustic',
      artist: 'Island Wanderers',
      url: 'https://assets.mixkit.co/music/preview/mixkit-summer-fun-13.mp3',
      duration: 60,
      bpm: 118,
      license: 'Royalty-Free Commercial License'
    }
  ],
  Technology: [
    {
      id: 'music-tech-1',
      category: 'Technology',
      title: 'Cyber Grid Pulse',
      artist: 'Synthwave Matrix',
      url: 'https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3',
      duration: 52,
      bpm: 125,
      license: 'Royalty-Free Commercial License'
    }
  ],
  Motivational: [
    {
      id: 'music-motivation-1',
      category: 'Motivational',
      title: 'Unstoppable Momentum',
      artist: 'Peak Performance Audio',
      url: 'https://assets.mixkit.co/music/preview/mixkit-raising-me-higher-34.mp3',
      duration: 65,
      bpm: 120,
      license: 'Royalty-Free Commercial License'
    }
  ]
};

export class MusicProvider {
  getTracks(category?: MusicCategory): MusicTrack[] {
    if (!category || category === 'None') {
      const all: MusicTrack[] = [];
      Object.values(MUSIC_CATALOG).forEach(tracks => all.push(...tracks));
      return all;
    }
    return MUSIC_CATALOG[category] || MUSIC_CATALOG.Cinematic;
  }

  getBestTrackForCategory(category: MusicCategory): MusicTrack | null {
    if (category === 'None') return null;
    const tracks = MUSIC_CATALOG[category] || MUSIC_CATALOG.Cinematic;
    return tracks[0] || null;
  }
}

export const musicProvider = new MusicProvider();
