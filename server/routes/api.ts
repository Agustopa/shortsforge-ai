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
import { autoEditorEngine } from '../engine/autoEditorEngine';
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
  MediaAsset,
  AutoEditorProject,
  AutoEditorStyle,
  UploadedMediaItem
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
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
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
      name: 'AI Internet Research Engine',
      type: 'SEARCH',
      isConfigured: true,
      isAvailable: true,
      statusText: 'Multi-Source Knowledge & Wiki Grounding Active',
      description: 'Performs live internet research, Wikipedia querying, fact verification, and citation logging with strict topic isolation.',
      isMock: false
    },
    {
      name: 'Dynamic Visual Sourcing Engine',
      type: 'STOCK',
      isConfigured: true,
      isAvailable: true,
      statusText: 'Open Stock & Semantic Synthesizer Active',
      description: 'Sources scene-specific visuals from Pexels, Unsplash, Wikimedia Commons, and AI image generation with zero asset repetition.',
      isMock: false
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

// GET /api/v1/projects/:id/validate-video - Diagnostic inspection of rendered MP4
router.get('/projects/:id/validate-video', async (req: Request, res: Response) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

  if (!project.videoUrl) {
    return res.status(400).json({ success: false, error: 'Project does not have a rendered video yet.' });
  }

  const cleanUrl = project.videoUrl.split('?')[0].replace(/^\/+/, '');
  const localPath = path.join(process.cwd(), 'public', cleanUrl);

  if (!fs.existsSync(localPath)) {
    return res.status(404).json({ success: false, error: 'Rendered video file was not found on server disk.' });
  }

  const validation = await videoEngine.validateRenderedVideo(localPath);
  const stats = fs.statSync(localPath);

  res.json({
    success: true,
    projectId: project.id,
    title: project.title,
    videoUrl: project.videoUrl,
    fileSizeBytes: stats.size,
    validation: {
      ...validation,
      isCompliantMp4: validation.passed && validation.videoCodec === 'h264' && validation.audioCodec === 'aac',
      compatibilityStatus: validation.passed ? 'Universal Compatibility (Windows, macOS/QuickTime, iOS, Android, VLC, Socials)' : 'Validation Warning'
    }
  });
});

// GET /api/v1/projects/:id/download - High-reliability binary streaming download for MP4 video
router.get('/projects/:id/download', async (req: Request, res: Response) => {
  try {
    const project = db.getProject(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

    if (!project.videoUrl) {
      return res.status(400).json({ success: false, error: 'Video is not yet rendered for this project.' });
    }

    const cleanUrl = project.videoUrl.split('?')[0].replace(/^\/+/, '');
    let localPath = path.join(process.cwd(), 'public', cleanUrl);

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ success: false, error: 'Video file not found on disk.' });
    }

    // Verify and ensure file integrity before download
    const stats = fs.statSync(localPath);
    if (stats.size < 20000) {
      console.warn(`[Download] File size is suspiciously small (${stats.size} bytes). Attempting re-mux repair...`);
      const repairPath = localPath.replace('.mp4', '_repaired.mp4');
      try {
        await videoEngine.ensureMp4Compliance(localPath, repairPath);
        if (fs.existsSync(repairPath) && fs.statSync(repairPath).size > 20000) {
          localPath = repairPath;
        }
      } catch (repErr) {
        console.error('[Download] Re-mux repair failed:', repErr);
      }
    }

    const cleanTitle = (project.title || 'ShortsForge_Video')
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 50);
    const downloadFilename = `ShortsForge_${cleanTitle}_${project.id}.mp4`;

    const finalStats = fs.statSync(localPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Length', finalStats.size.toString());
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.sendFile(localPath);
  } catch (err: any) {
    console.error('[API Project Download Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error processing video download.' });
  }
});

// GET /api/v1/download/video - Generic safe binary video file download endpoint
router.get('/download/video', (req: Request, res: Response) => {
  try {
    const rawUrl = req.query.url as string;
    const rawFilename = (req.query.filename as string) || 'video.mp4';
    if (!rawUrl) return res.status(400).json({ success: false, error: 'URL parameter is required' });

    const cleanUrl = rawUrl.split('?')[0].replace(/^\/+/, '');
    const publicDir = path.join(process.cwd(), 'public');
    const localPath = path.join(publicDir, cleanUrl);

    // Prevent path traversal
    if (!localPath.startsWith(publicDir)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ success: false, error: 'Video file not found on disk' });
    }

    const stats = fs.statSync(localPath);
    const safeFilename = rawFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename.endsWith('.mp4') ? safeFilename : safeFilename + '.mp4'}"`);
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Accept-Ranges', 'bytes');

    res.sendFile(localPath);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/projects/:id/variations (Generates 3 stylistic versions or 3 hooks)
router.post('/projects/:id/variations', async (req: Request, res: Response) => {
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
      project.aspectRatio,
      project.topic,
      project.jobId || 'manual_regen'
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

// POST /api/v1/projects/:id/rerender & /api/v1/projects/:id/render
const handleRenderProject = async (req: Request, res: Response) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

  try {
    project.status = 'RENDERING';
    project.currentStage = 'Rendering updated video timeline';
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
    project.currentStage = 'Render completed';
    db.setProject(project);

    res.json({ success: true, project });
  } catch (err: any) {
    project.status = 'FAILED';
    project.error = err.message;
    db.setProject(project);
    res.status(500).json({ success: false, error: err.message });
  }
};

router.post('/projects/:id/rerender', handleRenderProject);
router.post('/projects/:id/render', handleRenderProject);

// POST /api/v1/generate-video (Direct Async Pipeline Entry Point)
router.post('/generate-video', (req: Request, res: Response) => {
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
    visualMode = 'AUTO'
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
  const job = jobQueue.enqueue(project.id);

  res.status(202).json({
    success: true,
    jobId: job.id,
    projectId: project.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    pollUrl: `/api/v1/jobs/${job.id}`
  });
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
router.post('/media/upload', upload.single('file') as any, (req: Request, res: Response) => {
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

// ============================================================
// AI AUTO EDITOR ENDPOINTS
// ============================================================

// POST /api/v1/auto-editor/upload-chunk - Chunked upload for large raw media files (bypasses 413 limits)
router.post('/auto-editor/upload-chunk', upload.single('chunk') as any, async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { uploadId, chunkIndex, totalChunks, fileName } = req.body;

    if (!file || !uploadId || chunkIndex === undefined || !totalChunks || !fileName) {
      return res.status(400).json({ success: false, error: 'Missing chunk upload parameters.' });
    }

    const currentIdx = parseInt(chunkIndex, 10);
    const total = parseInt(totalChunks, 10);
    const tempFilePath = path.join(uploadsDir, `tmp_${uploadId}.part`);

    // Append chunk to temp file
    const chunkBuffer = fs.readFileSync(file.path);
    fs.appendFileSync(tempFilePath, chunkBuffer);
    try { fs.unlinkSync(file.path); } catch {}

    // Check if this was the last chunk
    if (currentIdx >= total - 1) {
      const ext = path.extname(fileName) || '.mp4';
      const cleanName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const finalFileName = `${cleanName}_${Date.now()}${ext}`;
      const finalFilePath = path.join(uploadsDir, finalFileName);

      fs.renameSync(tempFilePath, finalFilePath);

      const isVideo = fileName.match(/\.(mp4|mov|webm|m4v|mkv)$/i) !== null;
      let probe = { duration: 10, width: 1080, height: 1920, aspectRatio: '9:16', hasAudio: false };
      try {
        probe = await autoEditorEngine.probeMediaFile(finalFilePath);
      } catch (err) {
        console.warn('[AutoEditor Chunk] Probe note:', err);
      }

      const stats = fs.statSync(finalFilePath);
      const mediaItem: UploadedMediaItem = {
        id: `media_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        originalName: fileName,
        filePath: finalFilePath,
        url: `/uploads/${finalFileName}`,
        type: isVideo ? 'video' : 'image',
        sizeBytes: stats.size,
        duration: probe.duration,
        width: probe.width,
        height: probe.height,
        aspectRatio: probe.aspectRatio,
        hasAudio: probe.hasAudio
      };

      return res.json({
        success: true,
        isComplete: true,
        mediaItem
      });
    }

    return res.json({
      success: true,
      isComplete: false,
      chunkIndex: currentIdx,
      totalChunks: total
    });
  } catch (err: any) {
    console.error('[API AutoEditor] Chunk upload error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error processing upload chunk' });
  }
});

// POST /api/v1/auto-editor/create-project - Initialize project from uploaded media items
router.post('/auto-editor/create-project', (req: Request, res: Response) => {
  try {
    const { mediaItems, style = 'Viral Shorts', duration = 'AUTO', autoCta = true, title } = req.body;

    if (!mediaItems || !Array.isArray(mediaItems) || mediaItems.length === 0) {
      return res.status(400).json({ success: false, error: 'No media items provided.' });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(Math.random() * 900 + 100);
    const jobId = `autoedit_${dateStr}_${randNum}`;
    const projectId = `ae_proj_${Date.now()}`;

    const isVideo = mediaItems.some((m: UploadedMediaItem) => m.type === 'video');
    const mediaType: 'video' | 'images' = isVideo ? 'video' : 'images';

    const project: AutoEditorProject = {
      id: projectId,
      jobId,
      title: title || mediaItems[0].originalName.replace(/\.[^/.]+$/, ''),
      style: (style as AutoEditorStyle) || 'Viral Shorts',
      targetDuration: duration || 'AUTO',
      autoCta: autoCta !== false && autoCta !== 'false',
      status: 'DRAFT',
      progress: 0,
      stageName: 'Media Uploaded',
      statusMessage: 'Ready for AI Auto Editing',
      mediaType,
      uploadedMedia: mediaItems,
      cuts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.setAutoEditorProject(project);

    res.status(201).json({
      success: true,
      jobId,
      projectId,
      project
    });
  } catch (err: any) {
    console.error('[API AutoEditor] Create project error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error creating Auto Editor project' });
  }
});

// POST /api/v1/auto-editor/upload - Upload raw video or images (direct)
router.post('/auto-editor/upload', upload.array('files', 20) as any, async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded. Please select at least one video or image.' });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(Math.random() * 900 + 100);
    const jobId = `autoedit_${dateStr}_${randNum}`;
    const projectId = `ae_proj_${Date.now()}`;

    const isVideo = files.some(f => f.mimetype.startsWith('video') || f.originalname.match(/\.(mp4|mov|webm|m4v)$/i));
    const mediaType: 'video' | 'images' = isVideo ? 'video' : 'images';

    const uploadedMediaItems: UploadedMediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const probe = await autoEditorEngine.probeMediaFile(file.path);
        uploadedMediaItems.push({
          id: `media_${i + 1}`,
          originalName: file.originalname,
          filePath: file.path,
          url: `/uploads/${file.filename}`,
          type: file.mimetype.startsWith('video') || file.originalname.match(/\.(mp4|mov|webm|m4v)$/i) ? 'video' : 'image',
          sizeBytes: file.size,
          duration: probe.duration,
          width: probe.width,
          height: probe.height,
          aspectRatio: probe.aspectRatio,
          hasAudio: probe.hasAudio
        });
      } catch (err) {
        console.warn(`[AutoEditor] Probing error on ${file.originalname}:`, err);
        uploadedMediaItems.push({
          id: `media_${i + 1}`,
          originalName: file.originalname,
          filePath: file.path,
          url: `/uploads/${file.filename}`,
          type: file.mimetype.startsWith('video') || file.originalname.match(/\.(mp4|mov|webm|m4v)$/i) ? 'video' : 'image',
          sizeBytes: file.size,
          duration: 10,
          width: 1080,
          height: 1920,
          aspectRatio: '9:16',
          hasAudio: false
        });
      }
    }

    const project: AutoEditorProject = {
      id: projectId,
      jobId,
      title: uploadedMediaItems[0].originalName.replace(/\.[^/.]+$/, ''),
      style: (req.body.style as AutoEditorStyle) || 'Professional',
      targetDuration: req.body.duration || 'AUTO',
      autoCta: req.body.autoCta !== 'false',
      status: 'DRAFT',
      progress: 0,
      stageName: 'Media Uploaded',
      statusMessage: 'Ready for AI Auto Editing',
      mediaType,
      uploadedMedia: uploadedMediaItems,
      cuts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.setAutoEditorProject(project);

    res.status(201).json({
      success: true,
      jobId,
      projectId,
      project
    });
  } catch (err: any) {
    console.error('[API AutoEditor] Upload handling error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error processing uploaded media files'
    });
  }
});

// POST /api/v1/auto-editor/create-sample - Create project from pre-bundled sample footage
router.post('/auto-editor/create-sample', async (req: Request, res: Response) => {
  try {
    const { sampleTopic = 'Deep Ocean Mysteries', style = 'Viral Shorts' } = req.body;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(Math.random() * 900 + 100);
    const jobId = `autoedit_${dateStr}_${randNum}`;
    const projectId = `ae_sample_${Date.now()}`;

    // Sample video placeholders from reliable royalty free CDN
    const sampleItems: UploadedMediaItem[] = [
      {
        id: 'media_sample_1',
        originalName: `${sampleTopic.replace(/\s+/g, '_')}_Part1.mp4`,
        filePath: path.join(uploadsDir, 'sample_clip_1.mp4'),
        url: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
        type: 'video',
        sizeBytes: 8500000,
        duration: 15,
        width: 1080,
        height: 1920,
        aspectRatio: '9:16',
        hasAudio: true
      },
      {
        id: 'media_sample_2',
        originalName: `${sampleTopic.replace(/\s+/g, '_')}_Part2.mp4`,
        filePath: path.join(uploadsDir, 'sample_clip_2.mp4'),
        url: 'https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4',
        type: 'video',
        sizeBytes: 9200000,
        duration: 18,
        width: 1080,
        height: 1920,
        aspectRatio: '9:16',
        hasAudio: true
      }
    ];

    const project: AutoEditorProject = {
      id: projectId,
      jobId,
      title: `${sampleTopic} (AI Sample Clip)`,
      style: (style as AutoEditorStyle) || 'Viral Shorts',
      targetDuration: 'AUTO',
      autoCta: true,
      status: 'DRAFT',
      progress: 0,
      stageName: 'Media Uploaded',
      statusMessage: 'Ready for AI Auto Editing',
      mediaType: 'video',
      uploadedMedia: sampleItems,
      cuts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.setAutoEditorProject(project);

    res.status(201).json({
      success: true,
      jobId,
      projectId,
      project
    });
  } catch (err: any) {
    console.error('[API AutoEditor] Sample project creation error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to create sample project' });
  }
});

// POST /api/v1/auto-editor/process - Trigger full AI Auto Edit pipeline
router.post('/auto-editor/process', async (req: Request, res: Response) => {
  const { projectId, jobId, style = 'Professional', duration = 'AUTO', autoCta = true, musicCategory, subtitlePreset } = req.body;

  let project = db.getAutoEditorProject(projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Auto Editor project not found.' });
  }

  if (project.uploadedMedia.length === 0) {
    return res.status(400).json({ success: false, error: 'No media uploaded in this project.' });
  }

  // Respond immediately with queued status, then process asynchronously
  project.status = 'ANALYZING';
  project.progress = 5;
  project.stageName = 'Starting AI Auto Edit';
  project.style = style;
  project.targetDuration = duration;
  project.autoCta = autoCta;
  db.setAutoEditorProject(project);

  res.json({ success: true, message: 'AI Auto Edit process initiated.', project });

  // Async Execution
  try {
    await autoEditorEngine.executeAutoEditJob({
      projectId: project.id,
      jobId: project.jobId || jobId,
      mediaType: project.mediaType,
      uploadedFiles: project.uploadedMedia.map(m => ({
        originalName: m.originalName,
        filePath: m.filePath,
        url: m.url,
        sizeBytes: m.sizeBytes
      })),
      style,
      targetDuration: duration,
      autoCta,
      musicCategory,
      subtitlePreset
    });
  } catch (e: any) {
    console.error('[API AutoEditor] Execution error:', e);
  }
});

// GET /api/v1/auto-editor/projects - List all Auto Editor projects
router.get('/auto-editor/projects', (req: Request, res: Response) => {
  const projects = db.getAutoEditorProjects();
  res.json({ success: true, projects });
});

// GET /api/v1/auto-editor/projects/:id - Get specific Auto Editor project
router.get('/auto-editor/projects/:id', (req: Request, res: Response) => {
  const project = db.getAutoEditorProject(req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found.' });
  }
  res.json({ success: true, project });
});

// PUT /api/v1/auto-editor/projects/:id - Update Auto Editor project
router.put('/auto-editor/projects/:id', (req: Request, res: Response) => {
  const updated = db.updateAutoEditorProject(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Project not found.' });
  }
  res.json({ success: true, project: updated });
});

// GET /api/v1/auto-editor/projects/:id/download - Streaming binary download for Auto Editor video
router.get('/auto-editor/projects/:id/download', async (req: Request, res: Response) => {
  try {
    const project = db.getAutoEditorProject(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Auto Editor project not found.' });

    if (!project.outputVideoUrl) {
      return res.status(400).json({ success: false, error: 'Rendered video is not available yet.' });
    }

    const cleanUrl = project.outputVideoUrl.split('?')[0].replace(/^\/+/, '');
    const localPath = path.join(process.cwd(), 'public', cleanUrl);

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ success: false, error: 'Video file not found on disk.' });
    }

    const cleanTitle = (project.title || 'ShortsForge_AutoEdit')
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 50);
    const downloadFilename = `ShortsForge_AutoEdit_${cleanTitle}_${project.id}.mp4`;

    const stats = fs.statSync(localPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.sendFile(localPath);
  } catch (err: any) {
    console.error('[API AutoEditor Download Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error processing download.' });
  }
});

// DELETE /api/v1/auto-editor/projects/:id - Delete Auto Editor project
router.delete('/auto-editor/projects/:id', (req: Request, res: Response) => {
  const deleted = db.deleteAutoEditorProject(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Project not found.' });
  }
  res.json({ success: true, message: 'Auto Editor project deleted.' });
});

export default router;
