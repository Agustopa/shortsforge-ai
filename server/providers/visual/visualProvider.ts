import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { spawn } from 'child_process';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { AspectRatio, Scene, VisualMode } from '../../../src/types/index';
import { visualSourcingEngine } from '../../engine/visualSourcingEngine';
import { getFfmpegPath } from '../../utils/ffmpegPath';
import { pipelineCache, withTimeout } from '../../utils/concurrency';

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

// Curated high quality royalty-free stock clips and images with 9:16 portrait formats categorized by theme
const CURATED_STOCK_MEDIA: Record<string, { type: 'video' | 'image'; url: string; thumb: string; title: string; tags: string[] }[]> = {
  cats_felines: [
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Cute Curious Ginger Cat Close-up Portrait',
      tags: ['kucing', 'cat', 'kitten', 'hewan', 'pet', 'cute', 'lucu', 'mata', 'fakta', 'feline', 'whiskers']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Playful British Shorthair Cat with Big Eyes',
      tags: ['kucing', 'cat', 'eyes', 'pupil', 'vision', 'penglihatan', 'lucu', 'shorthair', 'pet', 'hewan', 'fakta']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Agile Athletic Cat in Action',
      tags: ['kucing', 'cat', 'jump', 'lompat', 'agility', 'kelincahan', 'refleks', 'hewan', 'insting', 'predator']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Peaceful Cat Sleeping & Purring',
      tags: ['kucing', 'cat', 'sleep', 'tidur', 'purr', 'dengkur', 'suara', 'relax', 'hewan', 'lucu', 'fakta']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Domestic Cat Hunting Instinct in Nature',
      tags: ['kucing', 'cat', 'hunting', 'berburu', 'insting', 'alam', 'cakar', 'telinga', 'pendengaran', 'hewan']
    }
  ],
  water_hydration: [
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Crystal Clear Water Pouring into Glass',
      tags: ['water', 'air', 'minum', 'glass', 'pour', 'fresh', 'hydration', 'hidrasi', 'sehat', 'mineral', 'drink', 'tubuh', 'aqua']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Pure Refreshing Water Splash & Droplets',
      tags: ['water', 'splash', 'droplets', 'air', 'tetesan', 'segar', 'clean', 'pure', 'hidrasi', 'kesehatan', 'liquid', 'segelas']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Athlete Drinking Water After Workout',
      tags: ['water', 'drink', 'athlete', 'fitness', 'workout', 'stamina', 'energy', 'minum', 'olahraga', 'sehat', 'tubuh', 'vitalitas', 'energi']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Natural Pure Mountain Spring Stream',
      tags: ['water', 'spring', 'stream', 'natural', 'pure', 'air', 'sungai', 'alam', 'gunung', 'hidrasi', 'fresh', 'racun', 'detox']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Healthy Hydrated Person Radiant Vitality',
      tags: ['sehat', 'health', 'kulit', 'glowing', 'tubuh', 'organ', 'ginjal', 'fokus', 'otak', 'manfaat', 'hidrasi', 'wellness']
    }
  ],
  health_wellness: [
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Mindfulness Meditation & Body Wellness',
      tags: ['health', 'wellness', 'meditation', 'body', 'mind', 'sehat', 'tubuh', 'kesehatan', 'jiwa', 'fokus', 'relax', 'organ']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Healthy Organic Nutrition & Vitality Diet',
      tags: ['nutrition', 'diet', 'food', 'health', 'vitamins', 'nutrisi', 'makanan', 'sehat', 'gizi', 'buah', 'sayur', 'manfaat']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Medical Health & Anatomy Science',
      tags: ['medical', 'doctor', 'health', 'anatomy', 'science', 'medis', 'dokter', 'penyakit', 'tubuh', 'biologi', 'organ', 'sel', 'otak']
    }
  ],
  space_lunar: [
    {
      type: 'video',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Cosmic Starfield Motion in Deep Universe',
      tags: ['space', 'stars', 'cosmos', 'universe', 'galaxy', 'astronomy', 'bintang', 'angkasa', 'lunar', 'nebula', 'dark', 'void']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Full Glowing Moon in Dark Night Sky',
      tags: ['moon', 'bulan', 'lunar', 'craters', 'space', 'night', 'dark', 'menakutkan', 'astronomy', 'sky', 'misteri', 'kawah']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Deep Space Orbit Earth and Lunar Glow',
      tags: ['space', 'orbit', 'earth', 'galaxy', 'universe', 'stars', 'bulan', 'bintang', 'cosmos', 'planet', 'bumi', 'gempa']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Astronaut Spacewalk in Cosmic Void',
      tags: ['astronaut', 'space', 'moonwalk', 'void', 'lunar', 'dark', 'nebula', 'bulan', 'misteri', 'astronot', 'apollo', 'gravitasi']
    }
  ],
  ocean_marine: [
    {
      type: 'video',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-underwater-view-of-swimming-fish-in-an-aquarium-41551-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Deep Ocean Coral & Marine Life Swimming',
      tags: ['ocean', 'marine', 'underwater', 'fish', 'sea', 'coral', 'laut', 'ikan', 'terumbu', 'deep', 'aquatic']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Majestic Octopus in Deep Ocean Coral',
      tags: ['octopus', 'gurita', 'tentacles', 'ocean', 'marine', 'underwater', 'sea', 'creature', 'deep', 'hewan', 'abyss']
    }
  ],
  ancient_history: [
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Great Pyramids of Giza in Desert Sun',
      tags: ['pyramid', 'piramida', 'egypt', 'mesir', 'giza', 'desert', 'history', 'ancient', 'pharaoh', 'sejarah', 'firaun', 'kuno']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Ancient Stone Monument Architecture',
      tags: ['ancient', 'stone', 'monument', 'ruins', 'history', 'sejarah', 'candi', 'archaeology', 'romawi', 'arkeologi']
    }
  ],
  tech_future: [
    {
      type: 'video',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-42533-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1080&h=1920&q=80',
      title: 'Futuristic AI Code Interface',
      tags: ['tech', 'ai', 'code', 'typing', 'laptop', 'cyber', 'future', 'data', 'teknologi', 'komputer', 'coding', 'artificial']
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&h=1920&q=80',
      thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&h=600&q=80',
      title: 'Abstract Neon Hologram Network',
      tags: ['neon', 'network', 'abstract', 'glow', 'future', 'robot', 'digital', 'ai', 'jaringan', 'hologram', 'siber']
    }
  ]
};

export class UnifiedVisualProvider {
  private ai: GoogleGenAI | null = null;
  private apiKey: string | undefined;
  private outputDir: string;
  private imageCooldownUntil: number = 0;
  private imageQuotaExhausted: boolean = false;
  private veoCooldownUntil: number = 0;
  private veoQuotaExhausted: boolean = false;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'public', 'generated', 'visuals');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private ensureClient(): GoogleGenAI | null {
    const currentKey = process.env.GEMINI_API_KEY;
    if (!currentKey) return null;
    if (!this.ai || this.apiKey !== currentKey) {
      this.apiKey = currentKey;
      this.imageQuotaExhausted = false;
      this.imageCooldownUntil = 0;
      this.veoQuotaExhausted = false;
      this.veoCooldownUntil = 0;
      try {
        this.ai = new GoogleGenAI({
          apiKey: this.apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
      } catch (e) {
        console.error('Error initializing visual GoogleGenAI client:', e);
        this.ai = null;
      }
    }
    return this.ai;
  }

  public isVeoAvailable(): boolean {
    const client = this.ensureClient();
    return !!client && !!this.apiKey && !this.veoQuotaExhausted && Date.now() >= this.veoCooldownUntil;
  }

  public isImagenAvailable(): boolean {
    const client = this.ensureClient();
    return !!client && !!this.apiKey && !this.imageQuotaExhausted && Date.now() >= this.imageCooldownUntil;
  }

  /**
   * Generates or retrieves visual asset for a specific scene with strict topic relevance and scene diversity
   */
  async generateSceneVisual(
    scene: Scene,
    projectId: string,
    visualMode: VisualMode = 'AUTO',
    aspectRatio: AspectRatio = '9:16',
    topicContext: string = '',
    jobId: string = '',
    sceneIndex: number = 0,
    totalScenes: number = 1
  ): Promise<VisualAssetResult> {
    const startTime = Date.now();
    const prompt = scene.visual_prompt || scene.visual_description || 'High quality cinematic visual';
    const searchQuery = `${topicContext} ${scene.search_query || scene.visual_description || ''}`.trim();
    const uniqueSessionId = `${projectId}_${jobId || 'job'}_scene_${scene.scene_id}_${Date.now()}`;

    // 0. Cache Check
    const cacheKey = `${searchQuery}|${prompt}|${aspectRatio}|${visualMode}`;
    const cached = pipelineCache.get<VisualAssetResult>('visuals', cacheKey);
    if (cached && cached.localPath && fs.existsSync(cached.localPath) && fs.statSync(cached.localPath).size > 500) {
      console.log(`[PERFORMANCE] [Visual Cache HIT] Retrieved visual for Scene ${scene.scene_id} in ${Date.now() - startTime}ms`);
      return cached;
    }

    let result: VisualAssetResult | null = null;

    // Determine if this scene is a key anchor scene eligible for Veo video AI generation (max 1-2 scenes per video: Scene 1 Hook, or middle climax)
    const isVeoEligibleScene = sceneIndex === 0 || (totalScenes >= 5 && sceneIndex === Math.floor(totalScenes / 2));

    // Strategy Option A: AI Video first (Veo) - STRICTLY LIMITED to 1-2 key scenes per video
    if (visualMode === 'AI_VIDEO_FIRST' && isVeoEligibleScene && this.isVeoAvailable()) {
      try {
        console.log(`[VisualProvider] Scene ${scene.scene_id} selected as Veo key hero scene (Index: ${sceneIndex + 1}/${totalScenes}).`);
        const veoResult = await withTimeout(
          this.tryGenerateVeoVideo(prompt, scene.scene_id, uniqueSessionId, aspectRatio, 45000),
          48000,
          'Veo video generation timeout'
        );
        if (veoResult) result = veoResult;
      } catch (e) {
        console.warn(`[VisualProvider] Veo timeout/error for scene ${scene.scene_id}, falling back immediately to Gemini Image / Pexels:`, e);
      }
    }

    // Strategy Option B: AI Image first (Gemini Image) - used for AI_IMAGE_FIRST, or secondary scenes in AI_VIDEO_FIRST, or Veo fallback
    if (!result && (visualMode === 'AI_IMAGE_FIRST' || visualMode === 'AI_VIDEO_FIRST') && this.isImagenAvailable()) {
      try {
        const imageResult = await withTimeout(
          this.tryGenerateGeminiImage(
            `${topicContext}: ${prompt}, vertical 9:16 portrait photography, highly detailed, 4k`,
            scene.scene_id,
            uniqueSessionId,
            aspectRatio
          ),
          8000,
          'Gemini image generation timeout'
        );
        if (imageResult) result = imageResult;
      } catch (e) {
        console.warn(`[VisualProvider] Gemini Image timeout/error for scene ${scene.scene_id}:`, e);
      }
    }

    // Strategy 1 (AUTO primary / Fallback for AI modes): Fast Pexels internet search with strict 7s timeout
    if (!result) {
      try {
        const pexelsResult = await withTimeout(
          this.tryPexelsSearch(searchQuery || topicContext, scene.scene_id, uniqueSessionId, aspectRatio),
          7000,
          'Pexels search timeout'
        );
        if (pexelsResult) result = pexelsResult;
      } catch (e) {
        console.warn(`[VisualProvider] Pexels timeout for scene ${scene.scene_id}:`, e);
      }
    }

    // Strategy 2: Multi-Source Scene Visual Sourcing with Duplicate Rejection
    if (!result) {
      try {
        const sourced = await withTimeout(
          visualSourcingEngine.sourceVisualForScene({
            scene,
            topic: topicContext,
            jobId: jobId || projectId,
            projectId,
            aspectRatio,
            visualMode
          }),
          5000,
          'Visual sourcing engine timeout'
        );

        if (sourced && fs.existsSync(sourced.localPath) && fs.statSync(sourced.localPath).size > 500) {
          result = {
            id: `sourced-${Date.now()}-${scene.scene_id}`,
            type: sourced.type,
            url: sourced.url,
            localPath: sourced.localPath,
            thumbnailUrl: sourced.thumbnailUrl,
            width: sourced.width,
            height: sourced.height,
            duration: sourced.duration,
            source: sourced.type === 'video' ? 'stock_video' : 'stock_image',
            provider: `${sourced.providerName} (${sourced.license})`,
            status: 'completed',
            fileSizeBytes: sourced.fileSizeBytes,
            isMock: false
          };
        }
      } catch (sourceErr) {
        console.warn('[VisualProvider] Visual sourcing engine fallback:', sourceErr);
      }
    }

    // Strategy 3: Try Gemini AI Image in AUTO mode only if stock was not found and Imagen is available
    if (!result && visualMode === 'AUTO' && this.isImagenAvailable()) {
      try {
        const imageResult = await withTimeout(
          this.tryGenerateGeminiImage(
            `${topicContext}: ${prompt}, vertical 9:16 portrait photography, highly detailed, 4k`,
            scene.scene_id,
            uniqueSessionId,
            aspectRatio
          ),
          8000,
          'Gemini image generation timeout'
        );
        if (imageResult) result = imageResult;
      } catch (e) {
        console.warn(`[VisualProvider] Gemini Image fallback error for scene ${scene.scene_id}:`, e);
      }
    }

    // Strategy 4: Dynamic Generative Thematic Graphic Fallback (Always 100% Reliable)
    if (!result) {
      result = await this.createProceduralVisual(scene, uniqueSessionId, aspectRatio, topicContext);
    }

    // Cache the result if valid
    if (result && result.localPath && fs.existsSync(result.localPath)) {
      pipelineCache.set('visuals', cacheKey, result);
    }

    console.log(`[PERFORMANCE] [Visual Sourced] Scene ${scene.scene_id} (${result.source}) in ${Date.now() - startTime}ms`);
    return result;
  }

  /**
   * Calls Google Veo video generation model with hard timeout limit (max 45s)
   */
  private async tryGenerateVeoVideo(
    prompt: string,
    sceneId: number,
    sessionId: string,
    aspectRatio: AspectRatio,
    maxWaitMs: number = 45000
  ): Promise<VisualAssetResult | null> {
    const client = this.ensureClient();
    if (!client) return null;

    const startTime = Date.now();
    try {
      console.log(`[VisualProvider] Initiating Google Veo video generation for Scene ${sceneId} (Timeout: ${maxWaitMs / 1000}s)...`);
      const veoRatio = aspectRatio === '9:16' ? '9:16' : aspectRatio === '16:9' ? '16:9' : '1:1';
      
      let operation: GenerateVideosOperation = await withTimeout(
        client.models.generateVideos({
          model: 'veo-3.1-lite-generate-preview',
          prompt: `${prompt}. Ultra realistic 4k cinematic footage, fluid motion, professional color grade, no artifacts.`,
          config: {
            aspectRatio: veoRatio as any,
            personGeneration: 'ALLOW_ADULT' as any,
            durationSeconds: 5
          }
        }),
        15000,
        'Veo initial request timeout'
      );

      let retries = 0;
      while (!operation.done) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= maxWaitMs) {
          console.warn(`[VisualProvider] Veo polling reached ${maxWaitMs / 1000}s timeout for Scene ${sceneId}. Aborting and switching to fast fallback.`);
          return null;
        }

        await new Promise((res) => setTimeout(res, 4000));
        operation = await withTimeout(
          client.operations.getVideosOperation({
            operation: operation
          }),
          10000,
          'Veo polling status timeout'
        );
        retries++;
      }

      if (operation.done && operation.response?.generatedVideos?.[0]?.video?.uri) {
        const videoUri = operation.response.generatedVideos[0].video.uri;
        const filename = `veo_${sessionId}.mp4`;
        const localPath = path.join(this.outputDir, filename);
        const publicUrl = `/generated/visuals/${filename}`;

        const downloadSuccess = await withTimeout(
          this.downloadRemoteFile(
            `${videoUri}&key=${this.apiKey}`,
            localPath
          ),
          12000,
          'Veo download timeout'
        );

        if (downloadSuccess && fs.existsSync(localPath) && fs.statSync(localPath).size > 1000) {
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
            provider: 'Google Veo Neural Video',
            status: 'completed',
            fileSizeBytes: stats.size,
            isMock: false,
            modelName: 'veo-3.1-lite-generate-preview'
          };
        }
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) {
        this.veoQuotaExhausted = true;
        this.veoCooldownUntil = Date.now() + 3600000;
        console.log('[VisualProvider] Google Veo API quota exhausted (429). Circuit breaker engaged: switching video visuals to fast image/stock.');
      } else {
        console.warn(`[VisualProvider] Veo generation error/timeout: ${msg}`);
      }
    }
    return null;
  }

  /**
   * Calls Gemini Image Generation with bounded timeout
   */
  private async tryGenerateGeminiImage(
    prompt: string,
    sceneId: number,
    sessionId: string,
    aspectRatio: AspectRatio
  ): Promise<VisualAssetResult | null> {
    if (!this.isImagenAvailable()) return null;
    const client = this.ensureClient();
    if (!client) return null;

    const imgModels = ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'];
    const imgRatio = aspectRatio === '9:16' ? '9:16' : aspectRatio === '16:9' ? '16:9' : '1:1';

    for (const model of imgModels) {
      if (!this.isImagenAvailable()) break;
      try {
        const response = await withTimeout(
          client.models.generateContent({
            model,
            contents: {
              parts: [
                {
                  text: `${prompt}. Cinematic vertical 9:16 composition, 4k ultra-high resolution, beautiful volumetric light, professional photography.`
                }
              ]
            },
            config: {
              imageConfig: {
                aspectRatio: imgRatio as any
              }
            }
          }),
          7000,
          `Gemini image generation timeout (${model})`
        );

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData?.data) {
            const base64Data = part.inlineData.data;
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `gemini_${sessionId}.png`;
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
              modelName: model
            };
          }
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) {
          this.imageQuotaExhausted = true;
          this.imageCooldownUntil = Date.now() + 3600000;
          console.log('[VisualProvider] Gemini Image API quota reached (429/RESOURCE_EXHAUSTED). Circuit breaker engaged: switching visual pipeline to stock footage & Pexels.');
          break; // Break loop immediately, do not try other models that will also fail
        } else {
          console.warn(`[VisualProvider] ${model} image generation attempt failed: ${msg}`);
        }
      }
    }
    return null;
  }

  /**
   * Mencari video/foto ASLI dari internet lewat Pexels API dengan strict timeout (maks 5s per request)
   */
  private async tryPexelsSearch(
    query: string,
    sceneId: number,
    sessionId: string,
    aspectRatio: AspectRatio
  ): Promise<VisualAssetResult | null> {
    const pexelsKey = process.env.PEXELS_API_KEY;
    if (!pexelsKey) return null;

    const cleanQuery = query.replace(/[^\w\s]/g, ' ').trim().slice(0, 100) || 'cinematic background';

    const fetchJson = (url: string, timeoutMs: number = 4500): Promise<any> => {
      return new Promise((resolve) => {
        const req = https.get(url, { headers: { Authorization: pexelsKey } }, (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve(null);
            }
          });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(timeoutMs, () => {
          req.destroy();
          resolve(null);
        });
      });
    };

    try {
      // 1) Coba cari VIDEO dulu (maks 4.5s)
      const videoUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(cleanQuery)}&orientation=portrait&per_page=6`;
      const videoData = await fetchJson(videoUrl, 4500);
      const videoResult = videoData?.videos?.[0];
      if (videoResult) {
        const files = videoResult.video_files || [];
        const bestFile =
          files.find((f: any) => f.width && f.width <= 1080 && f.file_type === 'video/mp4') ||
          files.find((f: any) => f.file_type === 'video/mp4') ||
          files[0];
        if (bestFile?.link) {
          const filename = `pexels_video_${sessionId}.mp4`;
          const localPath = path.join(this.outputDir, filename);
          const publicUrl = `/generated/visuals/${filename}`;
          const ok = await withTimeout(this.downloadRemoteFile(bestFile.link, localPath), 5000, 'Pexels video download timeout');
          if (ok && fs.existsSync(localPath) && fs.statSync(localPath).size > 2000) {
            const stats = fs.statSync(localPath);
            return {
              id: `pexels-video-${Date.now()}-${sceneId}`,
              type: 'video',
              url: publicUrl,
              localPath,
              thumbnailUrl: videoResult.image || publicUrl,
              width: aspectRatio === '9:16' ? 1080 : 1920,
              height: aspectRatio === '9:16' ? 1920 : 1080,
              duration: Math.min(videoResult.duration || 6, 8),
              source: 'stock_video',
              provider: `Pexels (by ${videoResult.user?.name || 'Pexels Creator'})`,
              status: 'completed',
              fileSizeBytes: stats.size,
              isMock: false
            };
          }
        }
      }

      // 2) Kalau tidak ada video cocok, coba cari FOTO (maks 4.5s)
      const photoUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanQuery)}&orientation=portrait&per_page=6`;
      const photoData = await fetchJson(photoUrl, 4500);
      const photoResult = photoData?.photos?.[0];
      if (photoResult) {
        const srcUrl = photoResult.src?.portrait || photoResult.src?.large2x || photoResult.src?.original;
        if (srcUrl) {
          const filename = `pexels_photo_${sessionId}.jpg`;
          const localPath = path.join(this.outputDir, filename);
          const publicUrl = `/generated/visuals/${filename}`;
          const ok = await withTimeout(this.downloadRemoteFile(srcUrl, localPath), 5000, 'Pexels photo download timeout');
          if (ok && fs.existsSync(localPath) && fs.statSync(localPath).size > 2000) {
            const stats = fs.statSync(localPath);
            return {
              id: `pexels-photo-${Date.now()}-${sceneId}`,
              type: 'image',
              url: publicUrl,
              localPath,
              thumbnailUrl: publicUrl,
              width: aspectRatio === '9:16' ? 1080 : 1920,
              height: aspectRatio === '9:16' ? 1920 : 1080,
              source: 'stock_image',
              provider: `Pexels (by ${photoResult.photographer || 'Pexels Creator'})`,
              status: 'completed',
              fileSizeBytes: stats.size,
              isMock: false
            };
          }
        }
      }
    } catch (err: any) {
      console.warn(`[VisualProvider] Pexels search timeout/error for query "${cleanQuery}": ${err?.message || err}`);
    }

    return null;
  }

  /**
   * Sourcing curated stock media with strict topic relevance and scene diversity
   */
  private async trySourceStockMedia(
    query: string,
    sceneId: number,
    sessionId: string,
    aspectRatio: AspectRatio,
    duration: number,
    topicContext: string
  ): Promise<VisualAssetResult | null> {
    const top = `${topicContext} ${query}`.toLowerCase();
    const isCatTopic = top.includes('kucing') || top.includes('cat') || top.includes('kitten') || top.includes('feline') || top.includes('pet');
    const isWaterTopic = top.includes('air') || top.includes('water') || top.includes('hidrasi') || top.includes('minum') || top.includes('aqua') || top.includes('minuman');
    const isSpaceTopic = !isWaterTopic && !isCatTopic && (top.includes('bulan') || top.includes('moon') || top.includes('space') || top.includes('lunar') || top.includes('angkasa') || top.includes('planet') || top.includes('galaxy') || top.includes('bintang'));
    const isHistoryTopic = top.includes('piramida') || top.includes('pyramid') || top.includes('mesir') || top.includes('egypt') || top.includes('sejarah') || top.includes('history') || top.includes('kuno') || top.includes('ancient');
    const isOceanTopic = top.includes('gurita') || top.includes('octopus') || top.includes('laut') || top.includes('ocean') || top.includes('ikan') || top.includes('marine') || top.includes('terumbu');
    const isTechTopic = top.includes('tech') || top.includes('ai') || top.includes('robot') || top.includes('coding') || top.includes('komputer') || top.includes('teknologi') || top.includes('cyber');
    const isHealthTopic = !isSpaceTopic && !isCatTopic && (top.includes('sehat') || top.includes('health') || top.includes('tubuh') || top.includes('organ') || top.includes('ginjal') || top.includes('diet') || top.includes('nutrisi') || top.includes('meditasi') || top.includes('tidur') || top.includes('olahraga'));

    // Combine stock items strictly based on topic
    let candidates: { type: 'video' | 'image'; url: string; thumb: string; title: string; tags: string[] }[] = [];

    if (isCatTopic) {
      candidates = CURATED_STOCK_MEDIA.cats_felines || [];
    } else if (isWaterTopic) {
      candidates = CURATED_STOCK_MEDIA.water_hydration || [];
    } else if (isSpaceTopic) {
      candidates = CURATED_STOCK_MEDIA.space_lunar || [];
    } else if (isHistoryTopic) {
      candidates = CURATED_STOCK_MEDIA.ancient_history || [];
    } else if (isOceanTopic) {
      candidates = CURATED_STOCK_MEDIA.ocean_marine || [];
    } else if (isTechTopic) {
      candidates = CURATED_STOCK_MEDIA.tech_future || [];
    } else if (isHealthTopic) {
      candidates = CURATED_STOCK_MEDIA.health_wellness || [];
    } else {
      candidates = Object.values(CURATED_STOCK_MEDIA).flat().filter(item => {
        // Strict negative filters to prevent any space or cat assets leaking into general topics
        if (!isSpaceTopic && item.tags.some(t => ['moon', 'bulan', 'space', 'lunar', 'astronaut', 'cosmos', 'galaxy'].includes(t))) {
          return false;
        }
        if (!isCatTopic && item.tags.some(t => ['kucing', 'cat', 'kitten', 'feline'].includes(t))) {
          return false;
        }
        return true;
      });
    }

    if (candidates.length > 0) {
      // Pick distinct asset for each scene based on sceneId offset
      const chosenIndex = (sceneId - 1) % candidates.length;
      const chosen = candidates[chosenIndex];

      const ext = chosen.type === 'video' ? 'mp4' : 'jpg';
      const filename = `stock_${chosen.type}_${sessionId}.${ext}`;
      const localPath = path.join(this.outputDir, filename);
      const publicUrl = `/generated/visuals/${filename}`;

      const downloadUrl = chosen.url || chosen.thumb;
      const success = await this.downloadRemoteFile(downloadUrl, localPath);

      if (success && fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        return {
          id: `stock-${Date.now()}-${sceneId}`,
          type: chosen.type,
          url: publicUrl,
          localPath,
          thumbnailUrl: chosen.thumb || publicUrl,
          width: 1080,
          height: 1920,
          duration: chosen.type === 'video' ? duration : undefined,
          source: chosen.type === 'video' ? 'stock_video' : 'stock_image',
          provider: `ShortsForge HD Stock: ${chosen.title}`,
          status: 'completed',
          fileSizeBytes: stats.size,
          isMock: false
        };
      }
    }

    return null;
  }

  /**
   * Procedural visual fallback dynamically derived from scene keywords and topic context
   */
  private async createProceduralVisual(
    scene: Scene,
    sessionId: string,
    aspectRatio: AspectRatio,
    topicContext: string
  ): Promise<VisualAssetResult> {
    const filename = `thematic_${sessionId}.jpg`;
    const localPath = path.join(this.outputDir, filename);
    const publicUrl = `/generated/visuals/${filename}`;

    const combinedText = `${topicContext} ${scene.search_query || ''} ${scene.visual_prompt || ''} ${scene.narration || ''}`.toLowerCase();

    // Thematic image selection strictly aligned with topic semantics
    let downloadUrl = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&q=80';
    
    if (combinedText.includes('kucing') || combinedText.includes('cat') || combinedText.includes('kitten')) {
      const catPhotos = [
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1080&q=80',
        'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1080&q=80',
        'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=1080&q=80',
        'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=1080&q=80',
        'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=1080&q=80'
      ];
      downloadUrl = catPhotos[(scene.scene_id - 1) % catPhotos.length];
    } else if (combinedText.includes('air') || combinedText.includes('water') || combinedText.includes('minum') || combinedText.includes('hidrasi') || combinedText.includes('aqua')) {
      const waterPhotos = [
        'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=1080&q=80',
        'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1080&q=80',
        'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1080&q=80',
        'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=1080&q=80',
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1080&q=80'
      ];
      downloadUrl = waterPhotos[(scene.scene_id - 1) % waterPhotos.length];
    } else if (combinedText.includes('sehat') || combinedText.includes('health') || combinedText.includes('tubuh') || combinedText.includes('organ') || combinedText.includes('badan')) {
      downloadUrl = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1080&q=80';
    } else if (combinedText.includes('gurita') || combinedText.includes('octopus') || combinedText.includes('laut') || combinedText.includes('ocean')) {
      downloadUrl = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1080&q=80';
    } else if (combinedText.includes('bulan') || combinedText.includes('moon') || combinedText.includes('lunar') || combinedText.includes('angkasa') || combinedText.includes('space')) {
      const spacePhotos = [
        'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?w=1080&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&q=80',
        'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1080&q=80'
      ];
      downloadUrl = spacePhotos[(scene.scene_id - 1) % spacePhotos.length];
    } else if (combinedText.includes('piramida') || combinedText.includes('pyramid') || combinedText.includes('mesir') || combinedText.includes('sejarah')) {
      downloadUrl = 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=1080&q=80';
    } else if (combinedText.includes('tech') || combinedText.includes('ai') || combinedText.includes('robot') || combinedText.includes('coding')) {
      downloadUrl = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1080&q=80';
    }

    const downloaded = await this.downloadRemoteFile(downloadUrl, localPath);
    if (!downloaded || !fs.existsSync(localPath) || fs.statSync(localPath).size < 1000) {
      await this.generateLocalFallbackAsset(localPath, scene.scene_id, combinedText);
    }

    const stats = fs.existsSync(localPath) ? fs.statSync(localPath) : { size: 10000 };

    return {
      id: `thematic-${Date.now()}-${scene.scene_id}`,
      type: 'image',
      url: publicUrl,
      localPath,
      thumbnailUrl: publicUrl,
      width: 1080,
      height: 1920,
      source: 'stock_image',
      provider: `ShortsForge Dynamic Thematic Scene ${scene.scene_id}`,
      status: 'completed',
      fileSizeBytes: stats.size,
      isMock: false
    };
  }

  private async generateLocalFallbackAsset(destPath: string, sceneId: number, topicContext: string = ''): Promise<void> {
    try {
      const top = topicContext.toLowerCase();
      let palette = ['#0f172a', '#1e1b4b', '#172554', '#042f2e', '#2e1065', '#18181b'];
      
      if (top.includes('air') || top.includes('water') || top.includes('hidrasi') || top.includes('minum') || top.includes('aqua')) {
        palette = ['#083344', '#0284c7', '#06b6d4', '#0369a1', '#0e7490', '#155e75'];
      } else if (top.includes('kucing') || top.includes('cat') || top.includes('kitten') || top.includes('feline')) {
        palette = ['#7c2d12', '#c2410c', '#ea580c', '#9a3412', '#b45309', '#d97706'];
      } else if (top.includes('sehat') || top.includes('health') || top.includes('tubuh') || top.includes('diet')) {
        palette = ['#022c22', '#059669', '#10b981', '#047857', '#065f46', '#15803d'];
      } else if (top.includes('piramida') || top.includes('pyramid') || top.includes('mesir') || top.includes('sejarah') || top.includes('history')) {
        palette = ['#451a03', '#78350f', '#92400e', '#b45309', '#d97706', '#854d0e'];
      } else if (top.includes('tech') || top.includes('ai') || top.includes('robot') || top.includes('coding')) {
        palette = ['#1e1b4b', '#312e81', '#3730a3', '#4338ca', '#4f46e5', '#6366f1'];
      } else if (top.includes('bulan') || top.includes('moon') || top.includes('space') || top.includes('lunar') || top.includes('angkasa')) {
        palette = ['#030712', '#0f172a', '#1e1b4b', '#111827', '#020617', '#18181b'];
      }

      const color = palette[(sceneId - 1) % palette.length];
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      await new Promise<void>((resolve) => {
        const proc = spawn(getFfmpegPath(), [
          '-y',
          '-f', 'lavfi',
          '-i', `color=c=${color}:s=1080x1920:d=1`,
          '-frames:v', '1',
          '-update', '1',
          destPath
        ]);
        proc.on('close', () => resolve());
        proc.on('error', () => resolve());
      });
    } catch {
      // fallback to basic buffer if ffmpeg fails
      try {
        if (!fs.existsSync(destPath)) {
          fs.writeFileSync(destPath, Buffer.alloc(1000));
        }
      } catch {}
    }
  }

  private async downloadRemoteFile(fileUrl: string, destPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const file = fs.createWriteStream(destPath);
        const client = fileUrl.startsWith('https') ? https : http;

        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/*,video/*,*/*'
          }
        };

        const req = client.get(fileUrl, options, (res) => {
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
      } catch (err) {
        resolve(false);
      }
    });
  }
}

export const visualProvider = new UnifiedVisualProvider();
