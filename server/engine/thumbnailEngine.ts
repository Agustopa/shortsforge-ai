import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { getFfmpegPath } from '../utils/ffmpegPath';

export interface ThumbnailOptions {
  projectId: string;
  topic: string;
  category: string;
  videoTitle: string;
  thumbnailTitle: string;
  baseImagePath?: string;
  outputPath?: string;
}

export class ThumbnailEngine {
  private outputDir: string;
  private ai: GoogleGenAI | null = null;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'public', 'generated', 'thumbnails');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private ensureClient(): GoogleGenAI | null {
    const currentKey = process.env.GEMINI_API_KEY;
    if (!currentKey) return null;
    if (!this.ai) {
      try {
        this.ai = new GoogleGenAI({
          apiKey: currentKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
      } catch {
        this.ai = null;
      }
    }
    return this.ai;
  }

  /**
   * Generates catchy Video Title (4-8 words) and ultra-punchy Thumbnail Title (3-6 words in ALL CAPS)
   */
  async generateTitles(
    topic: string,
    script?: { title?: string; hook?: string; fullNarration?: string },
    language: string = 'id'
  ): Promise<{ videoTitle: string; thumbnailTitle: string; category: string }> {
    const rawTopic = topic.trim();
    const cleanTopic = rawTopic.replace(/^["'\s]+|["'\s]+$/g, '');

    // Default heuristic fallbacks
    let videoTitle = `${cleanTopic} yang Wajib Kamu Tahu!`;
    let thumbnailTitle = cleanTopic.toUpperCase();
    let category = 'FAKTA MENARIK';

    // Smart semantic detection for clean punchy titles
    const lower = cleanTopic.toLowerCase();
    if (lower.includes('air') || lower.includes('water') || lower.includes('hidrasi')) {
      videoTitle = '5 Manfaat Minum Air yang Wajib Kamu Ketahui!';
      thumbnailTitle = '5 MANFAAT AIR!';
      category = 'KESEHATAN';
    } else if (lower.includes('bulan') || lower.includes('moon') || lower.includes('lunar')) {
      videoTitle = 'Fakta Menakutkan Tentang Bulan yang Jarang Diketahui';
      thumbnailTitle = 'FAKTA MENAKUTKAN BULAN!';
      category = 'MISTERI LUAR ANGKASA';
    } else if (lower.includes('kucing') || lower.includes('cat')) {
      videoTitle = '5 Fakta Unik dan Rahasia Kucing yang Bikin Terkejut';
      thumbnailTitle = '5 RAHASIA KUCING!';
      category = 'DUNIA HEWAN';
    } else if (lower.includes('tidur') || lower.includes('sleep')) {
      videoTitle = 'Efek Luar Biasa Tidur Cukup Bagi Otak dan Tubuh';
      thumbnailTitle = 'BAHAYA KURANG TIDUR!';
      category = 'KESEHATAN';
    } else if (lower.includes('sukses') || lower.includes('kaya') || lower.includes('uang')) {
      videoTitle = 'Kebiasaan Rahasia Orang Sukses yang Bisa Kamu Tiru';
      thumbnailTitle = 'RAHASIA SUKSES!';
      category = 'MOTIVASI';
    } else {
      // General short title generator
      const words = cleanTopic.split(/\s+/);
      if (words.length <= 4) {
        thumbnailTitle = `${cleanTopic.toUpperCase()}!`;
      } else {
        thumbnailTitle = words.slice(0, 4).join(' ').toUpperCase() + '!';
      }
      videoTitle = `${cleanTopic} - Fakta & Penjelasan Lengkap`;
    }

    // If Gemini is available, enhance with AI title generation
    const client = this.ensureClient();
    if (client) {
      try {
        const prompt = `You are a viral YouTube Shorts and TikTok content strategist.
Given the topic: "${cleanTopic}"
And script hook: "${script?.hook || ''}"
Language: ${language}

Generate:
1. videoTitle: A catchy, non-clickbait, high-CTR video title (4-8 words).
2. thumbnailTitle: A short, punchy thumbnail headline (2-5 words, high curiosity, uppercase).
3. category: A 1-2 word uppercase niche badge (e.g. KESEHATAN, SAINS, ASTRONOMI, HEWAN, MISTERI, MOTIVASI).

Respond strictly in valid JSON format:
{
  "videoTitle": "...",
  "thumbnailTitle": "...",
  "category": "..."
}`;

        const models = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
        for (const model of models) {
          try {
            const response = await client.models.generateContent({
              model,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.6
              }
            });

            if (response && response.text) {
              const parsed = JSON.parse(response.text);
              if (parsed.videoTitle) videoTitle = parsed.videoTitle;
              if (parsed.thumbnailTitle) thumbnailTitle = parsed.thumbnailTitle.toUpperCase();
              if (parsed.category) category = parsed.category.toUpperCase();
              break;
            }
          } catch {
            continue;
          }
        }
      } catch {
        // Fallback to heuristics
      }
    }

    return { videoTitle, thumbnailTitle, category };
  }

  /**
   * Generates a 9:16 Portrait Thumbnail with high-contrast text overlay via FFmpeg
   */
  async generateThumbnail(options: ThumbnailOptions): Promise<{ url: string; localPath: string }> {
    const filename = `thumb_${options.projectId}.jpg`;
    const outputPath = options.outputPath || path.join(this.outputDir, filename);
    const publicUrl = `/generated/thumbnails/${filename}`;

    // Base background image: use provided base image if exists, else fallback to dark thematic canvas
    const baseImg = options.baseImagePath && fs.existsSync(options.baseImagePath)
      ? options.baseImagePath
      : null;

    // Build stylish SVG overlay
    const svgPath = path.join(this.outputDir, `overlay_${options.projectId}.svg`);
    
    // Split thumbnail title into 1 or 2 lines
    const words = options.thumbnailTitle.trim().split(/\s+/);
    let line1 = options.thumbnailTitle;
    let line2 = '';
    if (words.length > 3) {
      const mid = Math.ceil(words.length / 2);
      line1 = words.slice(0, mid).join(' ');
      line2 = words.slice(mid).join(' ');
    }

    // Escape XML entities
    const escapeXml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

    const safeCategory = escapeXml(options.category || 'SHORTSFORGE SPOTLIGHT');
    const safeLine1 = escapeXml(line1);
    const safeLine2 = escapeXml(line2);

    const svgContent = `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Top and Bottom dramatic vignettes -->
    <linearGradient id="topVignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#050811" stop-opacity="0.92"/>
      <stop offset="35%" stop-color="#050811" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#050811" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="bottomVignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#050811" stop-opacity="0.0"/>
      <stop offset="60%" stop-color="#050811" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#050811" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(15, 23, 42, 0.92)"/>
      <stop offset="100%" stop-color="rgba(30, 41, 59, 0.92)"/>
    </linearGradient>
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.9"/>
    </filter>
  </defs>

  <!-- Vignette dark layers for contrast -->
  <rect x="0" y="0" width="1080" height="750" fill="url(#topVignette)"/>
  <rect x="0" y="1250" width="1080" height="670" fill="url(#bottomVignette)"/>

  <!-- High-impact Headline Container Banner -->
  <g transform="translate(60, 220)">
    <!-- Main Card Backdrop with Neon Gold/Cyan Stroke -->
    <rect x="0" y="0" width="960" height="${line2 ? '420' : '320'}" rx="32" fill="url(#cardGrad)" stroke="#f59e0b" stroke-width="6"/>
    
    <!-- Category Pill Badge -->
    <g transform="translate(40, 40)">
      <rect x="0" y="0" width="auto" min-width="260" height="52" rx="26" fill="#f59e0b"/>
      <text x="30" y="36" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="900" fill="#0f172a" letter-spacing="3">${safeCategory}</text>
    </g>

    <!-- Verified ShortsForge Tag -->
    <text x="920" y="74" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#94a3b8" text-anchor="end">SHORTSFORGE AI</text>

    <!-- High-Impact Bold Typography -->
    <text x="480" y="195" font-family="system-ui, -apple-system, Impact, sans-serif" font-size="${line2 ? '68' : '76'}" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#textGlow)" letter-spacing="1">${safeLine1}</text>
    ${
      line2
        ? `<text x="480" y="285" font-family="system-ui, -apple-system, Impact, sans-serif" font-size="64" font-weight="900" fill="#38bdf8" text-anchor="middle" filter="url(#textGlow)" letter-spacing="1">${safeLine2}</text>`
        : ''
    }
  </g>

  <!-- Bottom CTA Footer Ribbon -->
  <g transform="translate(60, 1680)">
    <rect x="0" y="0" width="960" height="120" rx="24" fill="rgba(15, 23, 42, 0.88)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="2"/>
    <circle cx="70" cy="60" r="32" fill="#ef4444"/>
    <polygon points="62,45 84,60 62,75" fill="#ffffff"/>
    <text x="130" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="800" fill="#ffffff">TONTON SAMPAI HABIS!</text>
    <text x="890" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800" fill="#f59e0b" text-anchor="end">9:16 HD</text>
  </g>
</svg>`;

    // Render thumbnail using FFmpeg native drawbox/drawtext filters
    const cleanCategory = safeCategory.replace(/['":\\]/g, '').toUpperCase();
    const cleanLine1 = safeLine1.replace(/['":\\]/g, '').toUpperCase();
    const cleanLine2 = (line2 || '').replace(/['":\\]/g, '').toUpperCase();

    try {
      const baseInput = baseImg && fs.existsSync(baseImg)
        ? ['-i', baseImg]
        : ['-f', 'lavfi', '-i', 'color=c=#0f172a:s=1080x1920:d=1'];

      // Construct filter chain with drawbox + drawtext
      const bannerHeight = cleanLine2 ? 400 : 300;
      let vf = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,drawbox=x=60:y=220:w=960:h=${bannerHeight}:color=black@0.78:t=fill,drawbox=x=60:y=1680:w=960:h=120:color=black@0.78:t=fill`;
      
      // Add text if possible
      try {
        vf += `,drawtext=text='${cleanCategory}':fontsize=30:fontcolor=yellow:x=100:y=255:shadowcolor=black:shadowx=2:shadowy=2`;
        vf += `,drawtext=text='${cleanLine1}':fontsize=62:fontcolor=white:x=(w-text_w)/2:y=315:shadowcolor=black:shadowx=4:shadowy=4`;
        if (cleanLine2) {
          vf += `,drawtext=text='${cleanLine2}':fontsize=54:fontcolor=0x38bdf8:x=(w-text_w)/2:y=400:shadowcolor=black:shadowx=4:shadowy=4`;
        }
        vf += `,drawtext=text='TONTON SAMPAI HABIS!':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=1725:shadowcolor=black:shadowx=3:shadowy=3`;
      } catch {}

      await new Promise<void>((resolve, reject) => {
        const proc = spawn(getFfmpegPath(), [
          '-y',
          ...baseInput,
          '-vf', vf,
          '-frames:v', '1',
          '-update', '1',
          '-q:v', '2',
          outputPath
        ]);

        proc.on('close', (code) => {
          if (code === 0 && fs.existsSync(outputPath)) {
            resolve();
          } else {
            reject(new Error(`FFmpeg thumbnail generation returned code ${code}`));
          }
        });

        proc.on('error', (err) => reject(err));
      });
    } catch (e) {
      // Fallback 1: Simple scale/crop without text overlay
      try {
        if (baseImg && fs.existsSync(baseImg)) {
          const proc = spawn(getFfmpegPath(), [
            '-y',
            '-i', baseImg,
            '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
            '-frames:v', '1',
            '-update', '1',
            outputPath
          ]);
          await new Promise<void>((res) => proc.on('close', () => res()));
        }
      } catch {}

      // Fallback 2: Direct copy if file exists
      if (!fs.existsSync(outputPath) && baseImg && fs.existsSync(baseImg)) {
        try {
          fs.copyFileSync(baseImg, outputPath);
        } catch {}
      }
    } finally {
      if (fs.existsSync(svgPath)) {
        try { fs.unlinkSync(svgPath); } catch {}
      }
    }

    return { url: publicUrl, localPath: outputPath };
  }
}

export const thumbnailEngine = new ThumbnailEngine();
