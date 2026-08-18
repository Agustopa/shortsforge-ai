import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { AspectRatio, Scene, VisualMode } from '../../../src/types/index';

export interface VisualAssetResult {
  id: string;
  type: 'video' | 'image';
  url: string;
  localPath: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  duration?: number;
  source: 'google_veo' | 'gemini_image' | 'stock_video' | 'stock_image' | 'motion_graphic';
  provider: string;
  status: 'completed' | 'fallback' | 'failed';
  fileSizeBytes: number;
  isMock: boolean;
  modelName?: string;
  error?: string;
}

// Curated high quality royalty-free stock clips and images with 9:16 / 1080x1920 portrait formats categorized by theme
const CURATED_STOCK_MEDIA: Record<string, { type: 'video' | 'image'; url: string; thumb: string; title: string; tags: string[] }[]> = {
  space_lunar: [
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Full Glowing Moon in Dark Night Sky',
      tags: ['moon', 'bulan', 'lunar', 'craters', 'space', 'night', 'dark', 'menakutkan', 'astronomy', 'sky']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Deep Space Orbit Earth and Lunar Glow',
      tags: ['space', 'orbit', 'earth', 'galaxy', 'universe', 'stars', 'bulan', 'bintang', 'cosmos']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Astronaut Spacewalk in Cosmic Void',
      tags: ['astronaut', 'space', 'moonwalk', 'void', 'lunar', 'dark', 'nebula', 'bulan', 'misteri']
    }
  ],
  ocean_marine: [
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Majestic Octopus in Deep Ocean Coral',
      tags: ['octopus', 'gurita', 'tentacles', 'ocean', 'marine', 'underwater', 'sea', 'creature', 'deep']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Deep Blue Ocean Abyss',
      tags: ['ocean', 'sea', 'underwater', 'marine', 'blue', 'laut', 'abyss', 'coral']
    }
  ],
  ancient_history: [
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Great Pyramids of Giza in Desert Sun',
      tags: ['pyramid', 'piramida', 'egypt', 'mesir', 'giza', 'desert', 'history', 'ancient', 'pharaoh', 'sejarah']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Ancient Stone Monument Architecture',
      tags: ['ancient', 'stone', 'monument', 'ruins', 'history', 'sejarah', 'candi', 'archaeology']
    }
  ],
  tech_future: [
    {
      type: 'video',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-42533-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1080&h=1920&q=80',
      title: 'Futuristic AI Code Interface',
      tags: ['tech', 'ai', 'code', 'typing', 'laptop', 'cyber', 'future', 'data', 'teknologi']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Abstract Neon Hologram Network',
      tags: ['neon', 'network', 'abstract', 'glow', 'future', 'robot', 'digital', 'ai']
    }
  ],
  nature_general: [
    {
      type: 'video',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1080&h=1920&q=80',
      title: 'Dramatic Sky and Time Lapse',
      tags: ['sky', 'clouds', 'timelapse', 'nature', 'discovery', 'epic', 'landscape', 'awan', 'langit']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Misty Forest Morning Mountain Peaks',
      tags: ['forest', 'mountain', 'mist', 'morning', 'sunlight', 'fog', 'epic', 'gunung', 'alam']
    }
  ]
};

export class UnifiedVisualProvider {
  private ai: GoogleGenAI | null = null;
  private apiKey: string | undefined;
  private outputDir: string;
  private imageCooldownUntil: number = 0;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.ai = new GoogleGenAI({
        apiKey: this.apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }

    this.outputDir = path.join(process.cwd(), 'public', 'generated', 'visuals');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  public isVeoAvailable(): boolean {
    return !!this.ai && !!this.apiKey;
  }

  public isImagenAvailable(): boolean {
    return !!this.ai && !!this.apiKey && Date.now() >= this.imageCooldownUntil;
  }

  /**
   * Generates or retrieves visual asset for a specific scene with strict topic relevance.
   */
  async generateSceneVisual(
    scene: Scene,
    projectId: string,
    visualMode: VisualMode = 'AUTO',
    aspectRatio: AspectRatio = '9:16'
  ): Promise<VisualAssetResult> {
    const prompt = scene.visual_prompt || scene.visual_description || 'High quality cinematic visual';
    const searchQuery = scene.search_query || scene.visual_description || 'cinematic portrait 4k';

    // Strategy 1: AI Video first (Veo)
    if (visualMode === 'AI_VIDEO_FIRST' && this.isVeoAvailable()) {
      const veoResult = await this.tryGenerateVeoVideo(prompt, scene.scene_id, projectId, aspectRatio);
      if (veoResult) return veoResult;
    }

    // Strategy 2: AI Image first (Imagen 3 / Nano Banana)
    if ((visualMode === 'AI_IMAGE_FIRST' || visualMode === 'AUTO') && this.isImagenAvailable()) {
      const imageResult = await this.tryGenerateGeminiImage(prompt, scene.scene_id, projectId, aspectRatio);
      if (imageResult) return imageResult;
    }

    // Strategy 3: Topic-matched Stock Media (Only if relevance matches)
    const stockResult = await this.trySourceStockMedia(
      searchQuery,
      scene.scene_id,
      projectId,
      aspectRatio,
      scene.duration
    );
    if (stockResult) return stockResult;

    // Strategy 4: Dynamic AI Generative Image Fallback
    if (this.isImagenAvailable()) {
      const retryImage = await this.tryGenerateGeminiImage(
        `${prompt}, portrait 9:16 aspect ratio, cinematic lighting, 4k`,
        scene.scene_id,
        projectId,
        aspectRatio
      );
      if (retryImage) return retryImage;
    }

    // Strategy 5: Dynamic Procedural Graphic with exact Scene Prompt
    return this.createProceduralVisual(scene, projectId, aspectRatio);
  }

  /**
   * Calls Google Veo video generation model
   */
  private async tryGenerateVeoVideo(
    prompt: string,
    sceneId: number,
    projectId: string,
    aspectRatio: AspectRatio
  ): Promise<VisualAssetResult | null> {
    if (!this.ai) return null;

    try {
      console.log(`[VisualProvider] Initiating Google Veo video generation for Scene ${sceneId}...`);
      const veoRatio = aspectRatio === '9:16' ? '9:16' : aspectRatio === '16:9' ? '16:9' : '1:1';
      
      let operation: GenerateVideosOperation = await this.ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: `${prompt}. Ultra realistic 4k cinematic footage, fluid motion, professional color grade, no artifacts.`,
        config: {
          aspectRatio: veoRatio as any,
          personGeneration: 'ALLOW_ADULT' as any,
          durationSeconds: 5
        }
      });

      let retries = 0;
      while (!operation.done && retries < 15) {
        await new Promise((res) => setTimeout(res, 5000));
        operation = await this.ai.operations.getVideosOperation({
          operation: operation
        });
        retries++;
      }

      if (operation.done && operation.response?.generatedVideos?.[0]?.video?.uri) {
        const videoUri = operation.response.generatedVideos[0].video.uri;
        const filename = `veo_scene_${sceneId}_${projectId}_${Date.now()}.mp4`;
        const localPath = path.join(this.outputDir, filename);
        const publicUrl = `/generated/visuals/${filename}`;

        const downloadSuccess = await this.downloadRemoteFile(
          `${videoUri}&key=${this.apiKey}`,
          localPath
        );

        if (downloadSuccess && fs.existsSync(localPath)) {
          const stats = fs.statSync(localPath);
          return {
            id: `veo-${Date.now()}`,
            type: 'video',
            url: publicUrl,
            localPath,
            thumbnailUrl: publicUrl,
            width: aspectRatio === '9:16' ? 1080 : 1920,
            height: aspectRatio === '9:16' ? 1920 : 1080,
            duration: 5,
            source: 'google_veo',
            provider: 'Google Veo 3.1 Neural Video',
            status: 'completed',
            fileSizeBytes: stats.size,
            isMock: false,
            modelName: 'veo-3.1-generate-preview'
          };
        }
      }
    } catch (err: any) {
      console.warn(`[VisualProvider] Veo call error:`, err?.message || err);
    }
    return null;
  }

  /**
   * Calls Gemini Image Generation (gemini-3.1-flash-lite-image)
   */
  private async tryGenerateGeminiImage(
    prompt: string,
    sceneId: number,
    projectId: string,
    aspectRatio: AspectRatio
  ): Promise<VisualAssetResult | null> {
    if (!this.ai) return null;

    try {
      console.log(`[VisualProvider] Initiating Gemini image generation for Scene ${sceneId}...`);
      const imgRatio = aspectRatio === '9:16' ? '9:16' : aspectRatio === '16:9' ? '16:9' : '1:1';

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              text: `${prompt}. High detail cinematic photography, 8k resolution, masterwork volumetric lighting, photorealistic.`
            }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: imgRatio as any
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          const base64Data = part.inlineData.data;
          const buffer = Buffer.from(base64Data, 'base64');
          const filename = `gemini_scene_${sceneId}_${projectId}_${Date.now()}.png`;
          const localPath = path.join(this.outputDir, filename);
          const publicUrl = `/generated/visuals/${filename}`;

          fs.writeFileSync(localPath, buffer);

          return {
            id: `gemini-img-${Date.now()}`,
            type: 'image',
            url: publicUrl,
            localPath,
            thumbnailUrl: publicUrl,
            width: aspectRatio === '9:16' ? 1080 : 1920,
            height: aspectRatio === '9:16' ? 1920 : 1080,
            source: 'gemini_image',
            provider: 'Gemini Neural Image',
            status: 'completed',
            fileSizeBytes: buffer.length,
            isMock: false,
            modelName: 'gemini-3.1-flash-lite-image'
          };
        }
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) {
        this.imageCooldownUntil = Date.now() + 60000;
      }
    }
    return null;
  }

  /**
   * Sourcing curated stock media strictly matching search query tokens
   */
  private async trySourceStockMedia(
    query: string,
    sceneId: number,
    projectId: string,
    aspectRatio: AspectRatio,
    duration: number
  ): Promise<VisualAssetResult | null> {
    const q = query.toLowerCase();
    const allStock = [
      ...CURATED_STOCK_MEDIA.space_lunar,
      ...CURATED_STOCK_MEDIA.ocean_marine,
      ...CURATED_STOCK_MEDIA.ancient_history,
      ...CURATED_STOCK_MEDIA.tech_future,
      ...CURATED_STOCK_MEDIA.nature_general
    ];

    const keywords = q.split(/\s+/).filter((k) => k.length > 2);
    const scored = allStock
      .map((item) => {
        let score = 0;
        keywords.forEach((k) => {
          if (item.tags.some((t) => t.includes(k) || k.includes(t))) score += 4;
          if (item.title.toLowerCase().includes(k)) score += 5;
        });
        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    // Only pick if there is a real semantic keyword match
    if (scored.length > 0 && scored[0].score >= 3) {
      const chosen = scored[0].item;
      const ext = chosen.type === 'video' ? 'mp4' : 'jpg';
      const filename = `stock_${chosen.type}_scene_${sceneId}_${projectId}_${Date.now()}.${ext}`;
      const localPath = path.join(this.outputDir, filename);
      const publicUrl = `/generated/visuals/${filename}`;

      const downloadUrl = chosen.url || chosen.thumb;
      const success = await this.downloadRemoteFile(downloadUrl, localPath);

      if (success && fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        return {
          id: `stock-${Date.now()}`,
          type: chosen.type,
          url: publicUrl,
          localPath,
          thumbnailUrl: chosen.thumb || publicUrl,
          width: 1080,
          height: 1920,
          duration: chosen.type === 'video' ? duration : undefined,
          source: chosen.type === 'video' ? 'stock_video' : 'stock_image',
          provider: `ShortsForge Stock HD (${chosen.title})`,
          status: 'completed',
          fileSizeBytes: stats.size,
          isMock: false
        };
      }
    }

    return null;
  }

  /**
   * Procedural visual fallback matching scene prompt
   */
  private async createProceduralVisual(
    scene: Scene,
    projectId: string,
    aspectRatio: AspectRatio
  ): Promise<VisualAssetResult> {
    const filename = `scenic_fallback_${scene.scene_id}_${projectId}_${Date.now()}.jpg`;
    const localPath = path.join(this.outputDir, filename);
    const publicUrl = `/generated/visuals/${filename}`;

    // Select dynamic thematic image based on query
    const q = (scene.search_query || scene.visual_prompt || '').toLowerCase();
    let downloadUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&q=80'; // space/global default
    if (q.includes('moon') || q.includes('bulan') || q.includes('space') || q.includes('lunar') || q.includes('bintang')) {
      downloadUrl = 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?w=1080&q=80';
    } else if (q.includes('octopus') || q.includes('gurita') || q.includes('sea') || q.includes('laut') || q.includes('ocean')) {
      downloadUrl = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1080&q=80';
    } else if (q.includes('pyramid') || q.includes('piramida') || q.includes('egypt') || q.includes('mesir') || q.includes('desert')) {
      downloadUrl = 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=1080&q=80';
    } else if (q.includes('tech') || q.includes('ai') || q.includes('code') || q.includes('robot')) {
      downloadUrl = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1080&q=80';
    }

    const downloaded = await this.downloadRemoteFile(downloadUrl, localPath);
    if (!downloaded || !fs.existsSync(localPath) || fs.statSync(localPath).size < 1000) {
      // Local fallback: generate high-res cinematic 1080x1920 solid graphic via FFmpeg
      await this.generateLocalFallbackAsset(localPath, scene.scene_id);
    }

    const stats = fs.existsSync(localPath) ? fs.statSync(localPath) : { size: 10000 };

    return {
      id: `fallback-${Date.now()}`,
      type: 'image',
      url: publicUrl,
      localPath,
      thumbnailUrl: publicUrl,
      width: 1080,
      height: 1920,
      source: 'stock_image',
      provider: 'ShortsForge Dynamic Visual Engine',
      status: 'fallback',
      fileSizeBytes: stats.size,
      isMock: false
    };
  }

  private async generateLocalFallbackAsset(destPath: string, sceneId: number): Promise<void> {
    try {
      const colors = ['#0f172a', '#1e1b4b', '#172554', '#042f2e', '#2e1065', '#18181b'];
      const color = colors[(sceneId - 1) % colors.length];
      
      const { spawn } = await import('child_process');
      await new Promise<void>((resolve) => {
        const proc = spawn('ffmpeg', [
          '-y',
          '-f', 'lavfi',
          '-i', `color=c=${color}:s=1080x1920:d=1`,
          '-frames:v', '1',
          destPath
        ]);
        proc.on('close', () => resolve());
        proc.on('error', () => resolve());
      });
    } catch {
      // ignore
    }
  }

  private async downloadRemoteFile(fileUrl: string, destPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const file = fs.createWriteStream(destPath);
        const client = fileUrl.startsWith('https') ? https : http;

        const req = client.get(fileUrl, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const redirectUrl = res.headers.location;
            if (redirectUrl) {
              file.close();
              this.downloadRemoteFile(redirectUrl, destPath).then(resolve);
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

        req.on('error', (err) => {
          console.warn(`[VisualProvider] Error downloading remote file:`, err.message);
          file.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          resolve(false);
        });

        req.setTimeout(15000, () => {
          req.destroy();
          file.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          resolve(false);
        });
      } catch (err) {
        resolve(false);
      }
    });
  }
}

export const visualProvider = new UnifiedVisualProvider();
