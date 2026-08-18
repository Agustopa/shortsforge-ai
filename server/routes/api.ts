import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { db } from '../db/database';
import { jobQueue } from '../queue/jobQueue';
import { aiProvider } from '../providers/ai/aiProvider';
import { ttsProvider } from '../providers/tts/ttsProvider';
import { visualProvider } from '../providers/visual/visualProvider';
import { musicProvider } from '../providers/music/musicProvider';
import { videoEngine } from '../engine/videoEngine';
import {
  Project,
  LanguageCode,
  VideoPlatform,
  AspectRatio,
  VideoDuration,
  ContentStyle,
  VoiceGender,
  VoiceStyle,
  SubtitlePreset,
  MusicCategory,
  QualityMode,
  VisualMode,
  ProviderStatus,
  MediaAsset
} from '../../src/types/index';

const router = Router();

// Configure file uploads for user media
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanName}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// GET /api/v1/providers/status
router.get('/providers/status', (req: Request, res: Response) => {
  const geminiConfigured = aiProvider.isAvailable();
  const statuses: ProviderStatus[] = [
    {
      name: 'Google Gemini 3.7 Flash',
      type: 'AI',
      isConfigured: geminiConfigured,
      isAvailable: true,
      statusText: geminiConfigured ? 'Connected & Active' : 'Fallback Engine (Mock/Heuristic)',
      description: 'Drives topic analysis, search grounding, hook scoring, scriptwriting and scene planning.',
      isMock: !geminiConfigured
    },
    {
      name: 'Google Gemini TTS & Synthesis',
      type: 'TTS',
      isConfigured: geminiConfigured,
      isAvailable: true,
      statusText: geminiConfigured ? '24kHz HD Voice Active' : 'ShortsForge Synthesis Active',
      description: 'Generates natural spoken narration with word-level timestamps.',
      isMock: !geminiConfigured
    },
    {
      name: 'Google Veo & Nano Banana Vision',
      type: 'VIDEO',
      isConfigured: geminiConfigured,
      isAvailable: true,
      statusText: geminiConfigured ? 'Veo 3.1 & Nano Banana Ready' : 'Curated 4K Stock Engine Active',
      description: 'Generates 9:16 portrait visuals, cinematic video scenes, and cover thumbnails.',
      isMock: !geminiConfigured
    },
    {
      name: 'Curated 4K Stock Library',
      type: 'STOCK',
      isConfigured: true,
      isAvailable: true,
      statusText: '100% Royalty-Free Available',
      description: 'Extensive high-resolution drone, tropical, tech, and cultural footage repository.',
      isMock: false
    },
    {
      name: 'ShortsForge Music Studio',
      type: 'MUSIC',
      isConfigured: true,
      isAvailable: true,
      statusText: 'Licensed Catalog Loaded',
      description: 'Multi-genre background music with intelligent voice ducking.',
      isMock: false
    },
    {
      name: 'FFmpeg Video Processing Pipeline',
      type: 'RENDER',
      isConfigured: true,
      isAvailable: true,
      statusText: '1080x1920 9:16 Native Engine',
      description: 'Hardware accelerated concatenation, Ken Burns motion, and subtitle burn-in.',
      isMock: false
    }
  ];

  res.json({ success: true, providers: statuses });
});

// GET /api/v1/projects
router.get('/projects', (req: Request, res: Response) => {
  const projects = db.getProjects();
  res.json({ success: true, projects });
});

// POST /api/v1/projects
router.post('/projects', (req: Request, res: Response) => {
  const {
    topic,
    language = 'id',
    platform = 'all',
    aspectRatio = '9:16',
    duration = 30,
    contentStyle = 'Viral',
    voiceGender = 'Male',
    voiceStyle = 'Energetic',
    subtitlePreset = 'Viral',
    musicCategory = 'Cinematic',
    autoMode = true,
    qualityMode = 'BALANCED',
    visualMode = 'AUTO',
    autoGenerate = true
  } = req.body;

  if (!topic || topic.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Topic is required.' });
  }

  const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const project: Project = {
    id,
    title: topic.trim(),
    topic: topic.trim(),
    language: language as LanguageCode,
    platform: platform as VideoPlatform,
    aspectRatio: aspectRatio as AspectRatio,
    duration: Number(duration) as VideoDuration,
    contentStyle: contentStyle as ContentStyle,
    voiceGender: voiceGender as VoiceGender,
    voiceStyle: voiceStyle as VoiceStyle,
    subtitlePreset: subtitlePreset as SubtitlePreset,
    musicCategory: musicCategory as MusicCategory,
    autoMode: Boolean(autoMode),
    qualityMode: qualityMode as QualityMode,
    visualMode: visualMode as VisualMode,
    status: 'DRAFT',
    progress: 0,
    currentStage: 'Ready to generate',
    scenes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.setProject(project);

  let job = null;
  if (autoGenerate) {
    job = jobQueue.enqueue(project.id);
  }

  res.status(201).json({ success: true, project: db.getProject(project.id), job });
});

// GET /api/v1/projects/:id
router.get('/projects/:id', (req: Request, res: Response) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });
  const job = project.jobId ? db.getJob(project.jobId) : null;
  res.json({ success: true, project, job });
});

// POST /api/v1/projects/:id/generate
router.post('/projects/:id/generate', (req: Request, res: Response) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

  const job = jobQueue.enqueue(project.id);
  res.json({ success: true, job, project: db.getProject(project.id) });
});

// POST /api/v1/projects/:id/cancel
router.post('/projects/:id/cancel', (req: Request, res: Response) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

  if (project.jobId) {
    jobQueue.cancelJob(project.jobId);
  }
  res.json({ success: true, message: 'Generation cancelled.' });
});

// POST /api/v1/projects/:id/duplicate
router.post('/projects/:id/duplicate', (req: Request, res: Response) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

  const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const duplicated: Project = {
    ...project,
    id: newId,
    title: `${project.title} (Copy)`,
    status: 'DRAFT',
    progress: 0,
    currentStage: 'Ready',
    videoUrl: undefined,
    thumbnailUrl: undefined,
    jobId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.setProject(duplicated);
  res.json({ success: true, project: duplicated });
});

// DELETE /api/v1/projects/:id
router.delete('/projects/:id', (req: Request, res: Response) => {
  const deleted = db.deleteProject(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Project not found.' });
  res.json({ success: true, message: 'Project deleted.' });
});

// POST /api/v1/projects/:id/variations (Generates 3 stylistic versions or 3 hooks)
router.post('/api/v1/projects/:id/variations', async (req: Request, res: Response) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

  const styles: ContentStyle[] = ['Viral', 'Educational', 'Storytelling'];
  const createdProjects: Project[] = [];

  for (const style of styles) {
    if (style === project.contentStyle) continue;
    const newId = `proj_var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const variation: Project = {
      ...project,
      id: newId,
      title: `${project.topic} [${style} Version]`,
      contentStyle: style,
      status: 'DRAFT',
      progress: 0,
      currentStage: 'Queued variation',
      videoUrl: undefined,
      thumbnailUrl: undefined,
      scenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.setProject(variation);
    jobQueue.enqueue(newId);
    createdProjects.push(db.getProject(newId)!);
  }

  res.json({ success: true, variations: createdProjects });
});

// PUT /api/v1/projects/:id/scenes/:sceneId
router.put('/projects/:id/scenes/:sceneId', (req: Request, res: Response) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

  const sceneIndex = project.scenes.findIndex(s => s.id === req.params.sceneId);
  if (sceneIndex === -1) return res.status(404).json({ success: false, error: 'Scene not found.' });

  const updates = req.body;
  project.scenes[sceneIndex] = { ...project.scenes[sceneIndex], ...updates };
  db.setProject(project);

  res.json({ success: true, scene: project.scenes[sceneIndex], project });
});

// POST /api/v1/projects/:id/scenes/:sceneId/regenerate-visual
router.post('/projects/:id/scenes/:sceneId/regenerate-visual', async (req: Request, res: Response) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

  const sceneIndex = project.scenes.findIndex(s => s.id === req.params.sceneId);
  if (sceneIndex === -1) return res.status(404).json({ success: false, error: 'Scene not found.' });

  const scene = project.scenes[sceneIndex];
  const mode = req.body.visualMode || project.visualMode;

  try {
    const visualRes = await visualProvider.generateSceneVisual(
      scene,
      project.id,
      mode,
      project.aspectRatio
    );

    scene.visual_url = visualRes.url;
    scene.visualAsset = visualRes.localPath;
    scene.visualAssetType = visualRes.type;
    scene.visual_type = visualRes.type;
    scene.visual_source = visualRes.source;
    scene.visual_provider = visualRes.provider;
    scene.visual_status = visualRes.status;
    scene.visual_details = {
      provider: visualRes.provider,
      model: visualRes.modelName,
      width: visualRes.width,
      height: visualRes.height,
      duration: visualRes.duration,
      fileSizeBytes: visualRes.fileSizeBytes,
      localPath: visualRes.localPath,
      isMock: visualRes.isMock,
      error: visualRes.error
    };

    project.scenes[sceneIndex] = scene;
    db.setProject(project);
    res.json({ success: true, scene, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/projects/:id/scenes/:sceneId/regenerate-voice
router.post('/projects/:id/scenes/:sceneId/regenerate-voice', async (req: Request, res: Response) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

  const sceneIndex = project.scenes.findIndex(s => s.id === req.params.sceneId);
  if (sceneIndex === -1) return res.status(404).json({ success: false, error: 'Scene not found.' });

  const scene = project.scenes[sceneIndex];
  try {
    const ttsRes = await ttsProvider.generateSpeech(
      scene.narration,
      {
        gender: project.voiceGender,
        style: project.voiceStyle,
        language: project.language
      },
      `scene_${scene.scene_id}_regen_${project.id}`
    );
    scene.voice_audio_url = ttsRes.audioUrl;
    scene.voice_audio_duration = ttsRes.duration;
    scene.word_timestamps = ttsRes.wordTimestamps;

    project.scenes[sceneIndex] = scene;
    db.setProject(project);
    res.json({ success: true, scene, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/projects/:id/rerender (Fast selective re-render)
router.post('/projects/:id/rerender', async (req: Request, res: Response) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

  try {
    project.status = 'RENDERING';
    project.currentStage = 'Re-rendering updated video timeline';
    db.setProject(project);

    const renderRes = await videoEngine.renderVideo(project, {
      aspectRatio: project.aspectRatio,
      subtitlePreset: project.subtitlePreset,
      backgroundMusicUrl: project.backgroundMusicUrl,
      burnSubtitles: true
    });

    project.videoUrl = renderRes.videoUrl;
    project.thumbnailUrl = renderRes.thumbnailUrl;
    project.status = 'COMPLETED';
    project.progress = 100;
    project.currentStage = 'Re-render completed';
    db.setProject(project);

    res.json({ success: true, project });
  } catch (err: any) {
    project.status = 'FAILED';
    project.error = err.message;
    db.setProject(project);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/jobs/:id
router.get('/jobs/:id', (req: Request, res: Response) => {
  const job = db.getJob(req.params.id);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found.' });
  res.json({ success: true, job });
});

// GET /api/v1/ideas
router.get('/ideas', (req: Request, res: Response) => {
  const niche = req.query.niche as string;
  const ideas = db.getContentIdeas(niche);
  res.json({ success: true, ideas });
});

// POST /api/v1/ideas/generate
router.post('/ideas/generate', async (req: Request, res: Response) => {
  const { niche = 'Facts', count = 12 } = req.body;
  try {
    const ideas = await aiProvider.generateContentIdeas(niche, Number(count));
    db.setContentIdeas(ideas);
    res.json({ success: true, ideas });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/batch/generate
router.post('/batch/generate', (req: Request, res: Response) => {
  const { topics, language = 'id', duration = 30, contentStyle = 'Viral' } = req.body;
  if (!Array.isArray(topics) || topics.length === 0) {
    return res.status(400).json({ success: false, error: 'Topics array required.' });
  }

  const createdProjects: Project[] = [];
  topics.forEach((t: string) => {
    if (!t || !t.trim()) return;
    const id = `proj_batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const project: Project = {
      id,
      title: t.trim(),
      topic: t.trim(),
      language: language as LanguageCode,
      platform: 'all',
      aspectRatio: '9:16',
      duration: Number(duration) as VideoDuration,
      contentStyle: contentStyle as ContentStyle,
      voiceGender: 'Male',
      voiceStyle: 'Energetic',
      subtitlePreset: 'Viral',
      musicCategory: 'Cinematic',
      autoMode: true,
      qualityMode: 'FAST',
      visualMode: 'AUTO',
      status: 'DRAFT',
      progress: 0,
      currentStage: 'Queued in batch',
      scenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.setProject(project);
    jobQueue.enqueue(id);
    createdProjects.push(db.getProject(id)!);
  });

  res.json({ success: true, projects: createdProjects });
});

// GET /api/v1/media
router.get('/media', (req: Request, res: Response) => {
  const assets = db.getMediaAssets();
  res.json({ success: true, assets });
});

// POST /api/v1/media/upload
router.post('/media/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' });

  const mime = req.file.mimetype;
  const isVideo = mime.startsWith('video');
  const isImage = mime.startsWith('image');
  const isAudio = mime.startsWith('audio');

  const asset: MediaAsset = {
    id: `media_${Date.now()}`,
    name: req.file.originalname,
    type: isVideo ? 'video' : isImage ? 'image' : isAudio ? 'audio' : 'music',
    source: 'user',
    url: `/uploads/${req.file.filename}`,
    thumbnailUrl: isImage ? `/uploads/${req.file.filename}` : undefined,
    sizeBytes: req.file.size,
    mimeType: mime,
    createdAt: new Date().toISOString()
  };

  db.addMediaAsset(asset);
  res.status(201).json({ success: true, asset });
});

// DELETE /api/v1/media/:id
router.delete('/media/:id', (req: Request, res: Response) => {
  const deleted = db.deleteMediaAsset(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Asset not found.' });
  res.json({ success: true, message: 'Asset deleted.' });
});

// GET /api/v1/settings
router.get('/settings', (req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json({ success: true, settings });
});

// POST /api/v1/settings
router.post('/settings', (req: Request, res: Response) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

export default router;
