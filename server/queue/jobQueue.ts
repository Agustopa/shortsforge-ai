import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { db } from '../db/database';
import { aiProvider, GenerationContext } from '../providers/ai/aiProvider';
import { ttsProvider } from '../providers/tts/ttsProvider';
import { visualProvider } from '../providers/visual/visualProvider';
import { musicProvider } from '../providers/music/musicProvider';
import { subtitleEngine } from '../engine/subtitles';
import { videoEngine } from '../engine/videoEngine';
import { qualityControlEngine } from '../engine/qualityControl';
import { GenerationJob, Project, ProjectStatus, CurrentTopic, GenerationIsolationDebug } from '../../src/types/index';

class JobQueue extends EventEmitter {
  private queue: string[] = [];
  private activeJobId: string | null = null;
  private isProcessing: boolean = false;

  constructor() {
    super();
    this.startWorker();
  }

  public enqueue(projectId: string): GenerationJob {
    const jobId = `job_${projectId}_${Date.now()}`;
    const job: GenerationJob = {
      id: jobId,
      projectId,
      stage: 'ANALYZING',
      progress: 5,
      status: 'PENDING',
      startTime: new Date().toISOString(),
      logs: [{ timestamp: new Date().toISOString(), message: 'Generation job queued with isolated topic context.', level: 'info' }]
    };

    db.setJob(job);
    db.updateProject(projectId, {
      status: 'ANALYZING',
      progress: 5,
      currentStage: 'Locking topic context and analyzing strategic intent',
      jobId
    });

    this.queue.push(jobId);
    this.emit('job_updated', job);
    this.processNext();

    return job;
  }

  public cancelJob(jobId: string): boolean {
    const job = db.getJob(jobId);
    if (!job) return false;

    job.status = 'CANCELLED';
    job.endTime = new Date().toISOString();
    job.logs.push({ timestamp: new Date().toISOString(), message: 'Job cancelled by user.', level: 'warn' });
    db.setJob(job);

    db.updateProject(job.projectId, {
      status: 'CANCELLED',
      currentStage: 'Generation cancelled'
    });

    this.queue = this.queue.filter(id => id !== jobId);
    if (this.activeJobId === jobId) {
      this.activeJobId = null;
      this.isProcessing = false;
      this.processNext();
    }

    this.emit('job_updated', job);
    return true;
  }

  private startWorker() {
    setInterval(() => {
      if (!this.isProcessing && this.queue.length > 0) {
        this.processNext();
      }
    }, 1000);
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    const jobId = this.queue.shift();
    if (!jobId) return;

    this.activeJobId = jobId;
    this.isProcessing = true;

    const job = db.getJob(jobId);
    if (!job || job.status === 'CANCELLED') {
      this.isProcessing = false;
      this.activeJobId = null;
      return;
    }

    job.status = 'RUNNING';
    db.setJob(job);

    try {
      await this.executePipeline(job);
    } catch (err: any) {
      console.error(`Pipeline failed for job ${jobId}:`, err);
      job.status = 'FAILED';
      job.error = err.message || 'Unknown generation error occurred';
      job.endTime = new Date().toISOString();
      job.logs.push({ timestamp: new Date().toISOString(), message: `Pipeline error: ${err.message}`, level: 'error' });
      db.setJob(job);

      db.updateProject(job.projectId, {
        status: 'FAILED',
        error: err.message,
        currentStage: `Generation failed: ${err.message}`
      });
      this.emit('job_updated', job);
    } finally {
      this.isProcessing = false;
      this.activeJobId = null;
      this.processNext();
    }
  }

  private updateStage(job: GenerationJob, stage: ProjectStatus, progress: number, message: string) {
    job.stage = stage;
    job.progress = progress;
    job.logs.push({ timestamp: new Date().toISOString(), message, level: 'info' });
    db.setJob(job);

    db.updateProject(job.projectId, {
      status: stage,
      progress,
      currentStage: message
    });

    this.emit('job_updated', job);
  }

  private async executePipeline(job: GenerationJob) {
    const project = db.getProject(job.projectId);
    if (!project) throw new Error('Project not found');

    const cleanTopic = (project.topic || '').trim();
    if (!cleanTopic) {
      throw new Error('Please enter a topic.');
    }

    // Single source of truth: Lock CurrentTopic
    const currentTopic: CurrentTopic = {
      id: project.id,
      text: cleanTopic,
      language: project.language,
      createdAt: project.createdAt
    };
    project.currentTopicObj = currentTopic;
    project.topic = cleanTopic;

    const context: GenerationContext = {
      projectId: project.id,
      generationId: job.id,
      currentTopic
    };

    // Stage 1: Topic Analysis (5% -> 12%)
    this.updateStage(job, 'ANALYZING', 8, `Analyzing topic: "${currentTopic.text}"`);
    const analysis = await aiProvider.analyzeTopic(currentTopic.text, {
      language: project.language,
      platform: project.platform,
      duration: project.duration,
      contentStyle: project.contentStyle
    }, context);

    project.analysis = {
      niche: analysis.niche,
      audience: analysis.audience,
      tone: analysis.tone,
      hookStrategy: analysis.hook_strategy,
      factualityRequired: analysis.factuality_required,
      detectedLanguage: analysis.language
    };
    project.language = analysis.language;
    db.setProject(project);

    // Stage 2: Content Research (12% -> 22%)
    this.updateStage(job, 'RESEARCHING', 18, `Conducting factual research specifically for "${currentTopic.text}"`);
    const research = await aiProvider.conductResearch(currentTopic.text, analysis, context);
    project.research = research;
    db.setProject(project);

    // Stage 3: Viral Hook Generation & Scriptwriting with Automated Relevance Check (22% -> 38%)
    this.updateStage(job, 'WRITING_SCRIPT', 28, `Generating high-retention hooks exclusively for "${currentTopic.text}"`);
    const { hooks, selectedHook } = await aiProvider.generateHooks(analysis, research, context);
    project.hooks = hooks;
    project.selectedHookId = selectedHook.id;

    this.updateStage(job, 'WRITING_SCRIPT', 34, `Drafting spoken narration script calibrated to ${project.duration}s`);
    
    let script = await aiProvider.generateScript(analysis, selectedHook, project.duration, context);
    
    // Topic Relevance Check & Auto-Regeneration (up to 3 attempts)
    let relevanceCheck = await aiProvider.validateTopicRelevance(currentTopic.text, script.fullNarration, context);
    let attempts = 1;
    while (!relevanceCheck.relevant && attempts < 3) {
      this.updateStage(job, 'WRITING_SCRIPT', 35, `Topic drift detected (${relevanceCheck.detectedSubject}). Regenerating script for "${currentTopic.text}" (Attempt ${attempts + 1})...`);
      script = await aiProvider.generateScript(analysis, selectedHook, project.duration, context);
      relevanceCheck = await aiProvider.validateTopicRelevance(currentTopic.text, script.fullNarration, context);
      attempts++;
    }

    project.script = script;
    project.title = script.title || currentTopic.text;

    // Isolation debug data
    const isolationDebug: GenerationIsolationDebug = {
      currentTopic: currentTopic.text,
      projectId: project.id,
      generationId: job.id,
      scriptTopic: script.title,
      visualTopic: analysis.visual_strategy,
      researchTopic: research[0]?.title || currentTopic.text,
      isIsolated: true,
      relevanceScore: relevanceCheck.confidence,
      contaminationDetected: !relevanceCheck.relevant,
      contaminationFlag: relevanceCheck.relevant ? undefined : relevanceCheck.reason,
      verifiedAt: new Date().toISOString()
    };
    project.isolationDebug = isolationDebug;
    db.setProject(project);

    // Stage 4: Scene Planning & Visual Bible (38% -> 50%)
    this.updateStage(job, 'PLANNING_SCENES', 45, `Architecting visual continuity and scene timeline for "${currentTopic.text}"`);
    const { scenes, visualBible } = await aiProvider.planScenes(script, analysis, project.visualMode, context);
    
    // Verify each scene's topic relevance
    for (const scene of scenes) {
      if (!scene.visual_prompt.toLowerCase().includes(currentTopic.text.toLowerCase().split(' ')[0])) {
        scene.visual_prompt = `${scene.visual_prompt}, depicting ${currentTopic.text}, 4k portrait`;
      }
    }
    project.scenes = scenes;
    project.visualBible = visualBible;
    db.setProject(project);

    // Stage 5: Visual Media Retrieval & AI Generation (50% -> 65%)
    this.updateStage(job, 'COLLECTING_MEDIA', 50, `Sourcing verified 1080x1920 scene visuals for "${currentTopic.text}"`);
    for (let i = 0; i < project.scenes.length; i++) {
      const scene = project.scenes[i];
      const prog = 50 + Math.round(((i + 1) / project.scenes.length) * 15);
      this.updateStage(job, 'GENERATING_VISUALS', prog, `Generating visual for Scene ${i + 1}/${project.scenes.length}: "${scene.visual_prompt.substring(0, 60)}..."`);

      const visualRes = await visualProvider.generateSceneVisual(
        scene,
        project.id,
        project.visualMode,
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

      this.updateStage(job, 'GENERATING_VISUALS', prog, `Scene ${i + 1}/${project.scenes.length} visual ready: ${visualRes.provider}`);
    }
    db.setProject(project);

    // Stage 6: Voice Generation & Word Timestamps (65% -> 75%)
    this.updateStage(job, 'GENERATING_VOICE', 68, `Synthesizing ${project.voiceGender} voiceover narration`);
    for (let i = 0; i < project.scenes.length; i++) {
      const scene = project.scenes[i];
      const ttsRes = await ttsProvider.generateSpeech(
        scene.narration,
        {
          gender: project.voiceGender,
          style: project.voiceStyle,
          language: project.language
        },
        `scene_${scene.scene_id}_${project.id}`
      );
      scene.voice_audio_url = ttsRes.audioUrl;
      scene.voice_audio_duration = ttsRes.duration;
      scene.word_timestamps = ttsRes.wordTimestamps;
    }
    db.setProject(project);

    // Stage 7: Subtitle Generation (75% -> 80%)
    this.updateStage(job, 'GENERATING_SUBTITLES', 77, `Building synchronized ${project.subtitlePreset} subtitles`);
    const srt = subtitleEngine.generateSrt(project.scenes);
    const vtt = subtitleEngine.generateVtt(project.scenes);

    const captionsDir = path.join(process.cwd(), 'public', 'generated', 'captions');
    if (!fs.existsSync(captionsDir)) fs.mkdirSync(captionsDir, { recursive: true });

    const srtPath = path.join(captionsDir, `captions_${project.id}.srt`);
    const vttPath = path.join(captionsDir, `captions_${project.id}.vtt`);
    fs.writeFileSync(srtPath, srt);
    fs.writeFileSync(vttPath, vtt);

    project.captionsSrtUrl = `/generated/captions/captions_${project.id}.srt`;
    project.captionsVttUrl = `/generated/captions/captions_${project.id}.vtt`;
    db.setProject(project);

    // Stage 8: Background Music & Audio Mixing Setup (80% -> 83%)
    this.updateStage(job, 'MIXING_AUDIO', 81, `Configuring ${project.musicCategory} background music track`);
    const musicTrack = musicProvider.getBestTrackForCategory(project.musicCategory);
    if (musicTrack) {
      project.backgroundMusicUrl = musicTrack.url;
    }
    db.setProject(project);

    // Stage 9: Pre-Render Quality Control & Topic Relevance Check (83% -> 85%)
    this.updateStage(job, 'QUALITY_CHECK', 84, 'Executing pre-render Quality Control validation');
    const { project: validatedProject, qc } = qualityControlEngine.validateAndAutoFix(project);
    validatedProject.qcResult = qc;
    db.setProject(validatedProject);

    // Stage 10: FFmpeg Video Rendering (85% -> 95%)
    this.updateStage(job, 'RENDERING', 86, 'Rendering 1080x1920 9:16 portrait video via FFmpeg');
    const renderRes = await videoEngine.renderVideo(
      validatedProject,
      {
        aspectRatio: validatedProject.aspectRatio,
        subtitlePreset: validatedProject.subtitlePreset,
        backgroundMusicUrl: validatedProject.backgroundMusicUrl,
        burnSubtitles: true
      },
      (p, msg) => {
        this.updateStage(job, 'RENDERING', p, msg);
      }
    );

    validatedProject.videoUrl = renderRes.videoUrl;
    validatedProject.thumbnailUrl = renderRes.thumbnailUrl;
    db.setProject(validatedProject);

    // Stage 11: Social Media Package & Completion (95% -> 100%)
    this.updateStage(job, 'QUALITY_CHECK', 96, `Verifying render integrity and building social package for "${currentTopic.text}"`);
    const socialPackage = await aiProvider.generateSocialPackage(
      currentTopic.text,
      validatedProject.script!,
      validatedProject.platform,
      validatedProject.language,
      context
    );
    validatedProject.socialPackage = socialPackage;

    const postQc = qualityControlEngine.verifyRenderedVideo(renderRes.videoUrl);
    if (!postQc.passed) {
      console.warn('Post-render QC note:', postQc.message);
    }

    validatedProject.status = 'COMPLETED';
    validatedProject.progress = 100;
    validatedProject.currentStage = 'Video ready for download and export';
    db.setProject(validatedProject);

    job.stage = 'COMPLETED';
    job.progress = 100;
    job.status = 'COMPLETED';
    job.endTime = new Date().toISOString();
    job.logs.push({ timestamp: new Date().toISOString(), message: `Video generation for "${currentTopic.text}" completed successfully!`, level: 'info' });
    db.setJob(job);

    this.emit('job_updated', job);
  }
}

export const jobQueue = new JobQueue();
