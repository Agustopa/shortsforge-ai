import fs from 'fs';
import path from 'path';
import { spawn, spawnSync, execSync } from 'child_process';
import { Scene, AspectRatio, SubtitlePreset, Project, QualityMode } from '../../src/types/index';
import { subtitleEngine } from './subtitles';
import { musicProvider } from '../providers/music/musicProvider';
import { thumbnailEngine } from './thumbnailEngine';
import { getFfmpegPath, getFfprobePath } from '../utils/ffmpegPath';
import { runWithConcurrency } from '../utils/concurrency';

export interface RenderOptions {
  aspectRatio: AspectRatio;
  subtitlePreset: SubtitlePreset;
  backgroundMusicUrl?: string;
  musicVolume?: number; // default 0.15
  voiceVolume?: number; // default 1.0
  burnSubtitles?: boolean;
  qualityMode?: QualityMode;
}

export interface RenderResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  fileSizeBytes: number;
  videoCodec: string;
  audioCodec: string;
  isValidated: boolean;
}

export class VideoEngine {
  private outputDir: string;
  private tempDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'public', 'generated', 'videos');
    this.tempDir = path.join(process.cwd(), 'data', 'temp');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private getDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
    if (aspectRatio === '16:9') return { width: 1920, height: 1080 };
    if (aspectRatio === '1:1') return { width: 1080, height: 1080 };
    return { width: 1080, height: 1920 }; // Default 9:16 portrait
  }

  public runCommand(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    const resolvedCmd = cmd === 'ffmpeg' ? getFfmpegPath() : cmd === 'ffprobe' ? getFfprobePath() : cmd;
    return new Promise((resolve, reject) => {
      const proc = spawn(resolvedCmd, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => (stdout += data.toString()));
      proc.stderr.on('data', (data) => (stderr += data.toString()));

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command ${resolvedCmd} exited with code ${code}: ${stderr || stdout}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  // Helper to reliably resolve absolute file path on disk
  private resolveLocalMediaPath(scene: Scene, sceneIndex: number = 0): string {
    const cleanPublic = (urlStr: string) => {
      const trimmed = urlStr.replace(/^\/+/, '');
      return path.join(process.cwd(), 'public', trimmed);
    };

    if (scene.visualAsset && fs.existsSync(scene.visualAsset) && fs.statSync(scene.visualAsset).size > 100) {
      return scene.visualAsset;
    }

    if (scene.visualAsset) {
      const pubPath = cleanPublic(scene.visualAsset);
      if (fs.existsSync(pubPath) && fs.statSync(pubPath).size > 100) return pubPath;
    }

    if (scene.visual_url) {
      const pubPath = cleanPublic(scene.visual_url);
      if (fs.existsSync(pubPath) && fs.statSync(pubPath).size > 100) return pubPath;
    }

    // If still not resolved or file missing, ensure a solid image frame exists
    const fallbackFilename = `res_fallback_${scene.scene_id || sceneIndex + 1}_${Date.now()}.jpg`;
    const fallbackPath = path.join(process.cwd(), 'public', 'generated', 'visuals', fallbackFilename);
    const dir = path.dirname(fallbackPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(fallbackPath)) {
      const colors = ['#0f172a', '#1e1b4b', '#172554', '#042f2e', '#2e1065', '#18181b'];
      const color = colors[sceneIndex % colors.length];
      try {
        spawnSync(getFfmpegPath(), [
          '-y',
          '-f', 'lavfi',
          '-i', `color=c=${color}:s=1080x1920:d=1`,
          '-frames:v', '1',
          '-update', '1',
          fallbackPath
        ]);
      } catch {}
    }

    scene.visualAsset = fallbackPath;
    scene.visual_url = `/generated/visuals/${fallbackFilename}`;
    return fallbackPath;
  }

  // Pre-render validation of scene visual assets with on-the-fly recovery & remote download
  private async verifySceneVisualInputs(scenes: Scene[], projectId: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const colors = ['#0f172a', '#1e1b4b', '#172554', '#042f2e', '#2e1065', '#18181b'];

    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index];
      let localPath = this.resolveLocalMediaPath(scene, index);

      // If local file is missing or too small, but scene has a remote URL, download it
      if ((!localPath || !fs.existsSync(localPath) || fs.statSync(localPath).size < 500) && scene.visual_url && scene.visual_url.startsWith('http')) {
        try {
          const ext = scene.visual_type === 'video' || scene.visual_url.includes('.mp4') ? 'mp4' : 'jpg';
          const dlFilename = `downloaded_scene_${scene.scene_id || index + 1}_${projectId}_${Date.now()}.${ext}`;
          const dlPath = path.join(process.cwd(), 'public', 'generated', 'visuals', dlFilename);
          const visualsDir = path.dirname(dlPath);
          if (!fs.existsSync(visualsDir)) fs.mkdirSync(visualsDir, { recursive: true });

          const downloaded = await this.downloadFile(scene.visual_url, dlPath);
          if (downloaded && fs.existsSync(dlPath) && fs.statSync(dlPath).size > 500) {
            scene.visualAsset = dlPath;
            scene.visual_url = `/generated/visuals/${dlFilename}`;
            localPath = dlPath;
          }
        } catch (dlErr) {
          console.warn(`[VideoEngine] Failed to download remote visual for scene ${index + 1}:`, dlErr);
        }
      }

      if (!localPath || !fs.existsSync(localPath) || fs.statSync(localPath).size < 200) {
        // Auto-recover on the fly using ffmpeg generated graphic so rendering is never blocked
        try {
          const fallbackFilename = `auto_recover_${index + 1}_${projectId}_${Date.now()}.jpg`;
          const recoveryPath = path.join(process.cwd(), 'public', 'generated', 'visuals', fallbackFilename);
          const visualsDir = path.dirname(recoveryPath);
          if (!fs.existsSync(visualsDir)) fs.mkdirSync(visualsDir, { recursive: true });

          const color = colors[index % colors.length];
          await this.runCommand('ffmpeg', [
            '-y',
            '-f', 'lavfi',
            '-i', `color=c=${color}:s=1080x1920:d=1`,
            '-frames:v', '1',
            '-update', '1',
            recoveryPath
          ]);
          scene.visualAsset = recoveryPath;
          scene.visual_url = `/generated/visuals/${fallbackFilename}`;
          localPath = recoveryPath;
        } catch (recoveryErr) {
          errors.push(`Scene ${index + 1} is missing visual asset file on disk: ${localPath || 'undefined'}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async downloadFile(fileUrl: string, destPath: string): Promise<boolean> {
    const https = await import('https');
    const http = await import('http');

    return new Promise((resolve) => {
      try {
        const file = fs.createWriteStream(destPath);
        const client = fileUrl.startsWith('https') ? https : http;

        const req = client.get(fileUrl, (res) => {
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

        req.setTimeout(15000, () => {
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

  // Post-render validation with ffprobe
  public async validateRenderedVideo(videoPath: string): Promise<{
    passed: boolean;
    width?: number;
    height?: number;
    duration?: number;
    videoCodec?: string;
    audioCodec?: string;
    pixFmt?: string;
    fileSizeBytes?: number;
    formatName?: string;
    error?: string;
  }> {
    try {
      if (!fs.existsSync(videoPath)) {
        return { passed: false, error: 'Rendered video file does not exist on disk.' };
      }

      const stats = fs.statSync(videoPath);
      if (stats.size < 20000) {
        return { passed: false, error: `Rendered file is suspiciously small or corrupted (${stats.size} bytes).` };
      }

      const { stdout } = await this.runCommand('ffprobe', [
        '-v', 'error',
        '-show_entries', 'stream=index,codec_type,codec_name,pix_fmt,width,height,duration,sample_rate,channels',
        '-show_entries', 'format=format_name,duration,size,bit_rate',
        '-of', 'json',
        videoPath
      ]);

      const data = JSON.parse(stdout);
      const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
      const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

      if (!videoStream) {
        return { passed: false, error: 'Rendered file does not contain a video stream.' };
      }

      const formatName = data.format?.format_name || '';
      const duration = parseFloat(data.format?.duration || videoStream.duration || '0');
      if (duration <= 0.5) {
        return { passed: false, error: `Rendered video duration is invalid (${duration}s).` };
      }

      if (!audioStream) {
        return { passed: false, error: 'Rendered video file is missing an audio stream (no voice or music track).' };
      }

      console.log('==================================================');
      console.log('[VIDEO ENGINE] MP4 COMPATIBILITY & PLAYBACK AUDIT');
      console.log(`- File: ${path.basename(videoPath)}`);
      console.log(`- Size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`- Container: ${formatName}`);
      console.log(`- Video: ${videoStream.codec_name} (${videoStream.pix_fmt || 'unknown'}, ${videoStream.width}x${videoStream.height})`);
      console.log(`- Audio: ${audioStream.codec_name} (${audioStream.sample_rate || '48000'}Hz, ${audioStream.channels || 2}ch)`);
      console.log(`- Duration: ${duration.toFixed(2)}s`);
      console.log(`- Moov Atom: Faststart enabled for immediate playback`);
      console.log('==================================================');

      return {
        passed: true,
        width: videoStream.width,
        height: videoStream.height,
        duration,
        videoCodec: videoStream.codec_name,
        audioCodec: audioStream.codec_name || 'aac',
        pixFmt: videoStream.pix_fmt,
        fileSizeBytes: stats.size,
        formatName
      };
    } catch (err: any) {
      console.error('[VideoEngine] FFprobe inspection error:', err);
      return { passed: false, error: `ffprobe inspection failed: ${err.message}` };
    }
  }

  // Ensure and force standard MP4 encoding compatibility (H.264/AVC, AAC, yuv420p, +faststart)
  public async ensureMp4Compliance(inputPath: string, outputPath: string): Promise<string> {
    const complianceArgs = [
      '-y',
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '20',
      '-profile:v', 'high',
      '-level', '4.0',
      '-pix_fmt', 'yuv420p',
      '-color_primaries', '1',
      '-color_trc', '1',
      '-colorspace', '1',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '48000',
      '-ac', '2',
      '-movflags', '+faststart',
      '-max_muxing_queue_size', '1024',
      outputPath
    ];
    await this.runCommand('ffmpeg', complianceArgs);
    return outputPath;
  }

  // Generate cover thumbnail with high-impact overlay
  async generateThumbnail(videoPath: string, projectTitle: string, outputPath: string, project?: Project): Promise<string> {
    try {
      const rawFramePath = outputPath.replace(/\.jpg$/, '_raw.jpg');
      await this.runCommand('ffmpeg', [
        '-y',
        '-ss', '00:00:01.0',
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        rawFramePath
      ]);

      // If we have project metadata or thumbnailEngine, generate rich overlay
      if (fs.existsSync(rawFramePath)) {
        const thumbRes = await thumbnailEngine.generateThumbnail({
          projectId: project?.id || 'thumb',
          topic: project?.topic || projectTitle,
          category: project?.category || 'SHORTSFORGE',
          videoTitle: project?.videoTitle || projectTitle,
          thumbnailTitle: project?.thumbnailTitle || projectTitle.toUpperCase(),
          baseImagePath: rawFramePath,
          outputPath
        });
        
        // Clean temp raw frame
        if (fs.existsSync(rawFramePath) && rawFramePath !== outputPath) {
          try { fs.unlinkSync(rawFramePath); } catch {}
        }
        return thumbRes.localPath || outputPath;
      }
      return outputPath;
    } catch (err) {
      console.warn('Thumbnail generation warning:', err);
      return outputPath;
    }
  }

  // Render complete short video using FFmpeg
  async renderVideo(
    project: Project,
    options: RenderOptions,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<RenderResult> {
    const { width, height } = this.getDimensions(options.aspectRatio);
    const projectId = project.id;
    const projectTempDir = path.join(this.tempDir, projectId);
    if (!fs.existsSync(projectTempDir)) {
      fs.mkdirSync(projectTempDir, { recursive: true });
    }

    const outputFilename = `shortsforge_${projectId}_${Date.now()}.mp4`;
    const finalOutputPath = path.join(this.outputDir, outputFilename);
    const thumbnailFilename = `thumb_${projectId}_${Date.now()}.jpg`;
    const thumbnailPath = path.join(this.outputDir, thumbnailFilename);

    const totalDuration = project.scenes.reduce((acc, s) => acc + s.duration, 0);

    onProgress?.(84, 'Verifying scene visual assets on disk');

    // Step 1: Pre-render verification & download
    const inputCheck = await this.verifySceneVisualInputs(project.scenes, projectId);
    if (!inputCheck.valid) {
      throw new Error(`Pre-render visual verification failed:\n${inputCheck.errors.join('\n')}`);
    }

    onProgress?.(86, 'Converting scene visuals to timeline segments with motion');

    // Step 2: Render each scene into a segment MP4 file, satu per satu (bukan paralel)
    // supaya pemakaian RAM tetap rendah - penting untuk hosting tier Free yang RAM-nya kecil.
    // Beberapa proses FFmpeg berjalan bersamaan gampang bikin container di-OOM-kill & restart.
    const qMode = options.qualityMode || project.qualityMode || 'BALANCED';
    const preset = qMode === 'FAST' ? 'ultrafast' : qMode === 'HIGH' ? 'medium' : 'fast';
    const crf = qMode === 'FAST' ? '24' : qMode === 'HIGH' ? '18' : '20';

    const segStart = Date.now();
    let completedSegs = 0;

    const renderedSegmentFiles = await runWithConcurrency(
      project.scenes,
      1, // Concurrency diturunkan dari 3 -> 1 supaya hemat RAM di tier Free (lebih lambat, tapi stabil)
      async (scene, i) => {
        const segFile = path.join(projectTempDir, `seg_${i}.mp4`);
        const dur = Math.max(1.5, scene.duration);
        const mediaPath = this.resolveLocalMediaPath(scene);
        const isVideo = scene.visual_type === 'video' || scene.visualAssetType === 'video' || mediaPath.endsWith('.mp4');

        if (isVideo) {
          // Video footage input: scale, crop to 1080x1920 9:16 portrait, trim duration, 30fps
          await this.runCommand('ffmpeg', [
            '-y',
            '-ss', '0',
            '-i', mediaPath,
            '-t', `${dur}`,
            '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,format=yuv420p`,
            '-c:v', 'libx264',
            '-preset', preset,
            '-crf', crf,
            '-profile:v', 'high',
            '-level', '4.0',
            '-threads', '0',
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            '-an',
            segFile
          ]);
        } else {
          // Image footage input: convert image to video scene with Ken Burns motion effect
          const totalFrames = Math.max(30, Math.round(dur * 30));
          const motionType = scene.camera_motion || 'zoom_in';

          let zoomFilter = `zoompan=z='min(zoom+0.0015,1.18)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=30`;
          if (motionType === 'zoom_out') {
            zoomFilter = `zoompan=z='if(lte(zoom,1.0),1.18,max(1.001,zoom-0.0015))':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=30`;
          } else if (motionType === 'pan_left') {
            zoomFilter = `zoompan=z='1.12':x='if(lte(on,-1),(iw-iw/zoom)/2,x-1)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${width}x${height}:fps=30`;
          } else if (motionType === 'pan_right') {
            zoomFilter = `zoompan=z='1.12':x='if(lte(on,-1),0,x+1)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${width}x${height}:fps=30`;
          }

          await this.runCommand('ffmpeg', [
            '-y',
            '-loop', '1',
            '-i', mediaPath,
            '-t', `${dur}`,
            '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},${zoomFilter},setsar=1,format=yuv420p`,
            '-c:v', 'libx264',
            '-preset', preset,
            '-crf', crf,
            '-profile:v', 'high',
            '-level', '4.0',
            '-threads', '0',
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            segFile
          ]);
        }

        if (!fs.existsSync(segFile) || fs.statSync(segFile).size < 1000) {
          throw new Error(`Failed to create video segment for Scene ${i + 1} (${scene.visual_prompt || scene.search_query})`);
        }

        completedSegs++;
        onProgress?.(
          86 + Math.round((completedSegs / project.scenes.length) * 5),
          `Processed Scene ${completedSegs}/${project.scenes.length} visual footage`
        );
        return segFile;
      }
    );

    console.log(`[PERFORMANCE] [FFmpeg] Generated ${project.scenes.length} video segments in parallel in ${Date.now() - segStart}ms (Mode: ${qMode})`);

    onProgress?.(91, 'Concatenating video timeline segments');

    // Step 3: Concat all video segments
    const concatListFile = path.join(projectTempDir, 'concat.txt');
    const concatContent = renderedSegmentFiles.map((f) => `file '${f}'`).join('\n');
    fs.writeFileSync(concatListFile, concatContent);

    const rawVideoPath = path.join(projectTempDir, 'video_raw.mp4');
    await this.runCommand('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListFile,
      '-c', 'copy',
      rawVideoPath
    ]);

    // Step 4: Ensure scene voice audio files exist, pad each scene audio to exact scene duration, and concatenate seamlessly
    const { ttsProvider } = await import('../providers/tts/ttsProvider');
    const alignedVoiceFiles: string[] = [];

    for (let i = 0; i < project.scenes.length; i++) {
      const s = project.scenes[i];
      const targetDuration = Math.max(1.5, s.duration);
      let localVoice = s.voice_audio_url;

      if (!localVoice || !fs.existsSync(localVoice.startsWith('/') ? path.join(process.cwd(), 'public', localVoice) : localVoice)) {
        // Auto-synthesize voice if missing
        try {
          const narrationText = s.narration || s.subtitle_text || `Scene ${i + 1}`;
          const ttsRes = await ttsProvider.generateSpeech(
            narrationText,
            {
              gender: project.voiceGender || 'Male',
              style: project.voiceStyle || 'Energetic',
              language: project.language || 'id'
            },
            `scene_${s.scene_id || i + 1}_${projectId}`
          );
          s.voice_audio_url = ttsRes.audioUrl;
          localVoice = ttsRes.audioUrl;
        } catch (synthErr) {
          console.warn(`[VideoEngine] Could not synthesize voice for scene ${i + 1}:`, synthErr);
        }
      }

      if (localVoice) {
        if (localVoice.startsWith('/')) {
          localVoice = path.join(process.cwd(), 'public', localVoice);
        }
        if (fs.existsSync(localVoice) && fs.statSync(localVoice).size > 100) {
          // Align and pad this scene's voice file to match targetDuration with subtle fade to eliminate pops
          const alignedSceneWav = path.join(projectTempDir, `aligned_voice_${i}.wav`);
          try {
            await this.runCommand('ffmpeg', [
              '-y',
              '-i', localVoice,
              '-af', `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,afade=t=in:ss=0:d=0.015,apad=whole_dur=${targetDuration},atrim=0:${targetDuration}`,
              '-c:a', 'pcm_s16le',
              alignedSceneWav
            ]);
            if (fs.existsSync(alignedSceneWav) && fs.statSync(alignedSceneWav).size > 1000) {
              alignedVoiceFiles.push(alignedSceneWav);
              continue;
            }
          } catch (alignErr) {
            console.warn(`[VideoEngine] Audio alignment warning for scene ${i + 1}:`, alignErr);
          }
          alignedVoiceFiles.push(localVoice);
        } else {
          // Add silent audio matching targetDuration so subsequent scenes stay synchronized
          const silenceWav = path.join(projectTempDir, `silence_voice_${i}.wav`);
          try {
            await this.runCommand('ffmpeg', [
              '-y',
              '-f', 'lavfi',
              '-i', `anullsrc=r=48000:cl=stereo`,
              '-t', `${targetDuration}`,
              '-c:a', 'pcm_s16le',
              silenceWav
            ]);
            if (fs.existsSync(silenceWav)) alignedVoiceFiles.push(silenceWav);
          } catch {}
        }
      }
    }

    const fullVoicePath = path.join(projectTempDir, 'full_voice.wav');
    if (alignedVoiceFiles.length > 0) {
      const audioConcatTxt = path.join(projectTempDir, 'audio_concat.txt');
      fs.writeFileSync(audioConcatTxt, alignedVoiceFiles.map((f) => `file '${f}'`).join('\n'));
      try {
        await this.runCommand('ffmpeg', [
          '-y',
          '-f', 'concat',
          '-safe', '0',
          '-i', audioConcatTxt,
          '-c:a', 'pcm_s16le',
          fullVoicePath
        ]);
      } catch (audioErr) {
        console.warn('Voice concat error:', audioErr);
      }
    }

    // Step 5: Acquire & Prepare Background Music track if specified
    const bgMusicUrl = options.backgroundMusicUrl || project.backgroundMusicUrl;
    let localBgMusicPath: string | null = null;
    if (bgMusicUrl) {
      const rawMusic = bgMusicUrl.startsWith('/') ? path.join(process.cwd(), 'public', bgMusicUrl) : bgMusicUrl;
      if (fs.existsSync(rawMusic) && fs.statSync(rawMusic).size > 1000) {
        localBgMusicPath = rawMusic;
      } else if (bgMusicUrl.startsWith('http')) {
        const musicDlPath = path.join(projectTempDir, 'bg_music.mp3');
        const dlSuccess = await this.downloadFile(bgMusicUrl, musicDlPath);
        if (dlSuccess && fs.existsSync(musicDlPath) && fs.statSync(musicDlPath).size > 1000) {
          localBgMusicPath = musicDlPath;
        }
      }
    }

    // If still null, ensure local category track is ready and available
    if (!localBgMusicPath && project.musicCategory !== 'None') {
      const category = project.musicCategory || musicProvider.detectMusicCategoryFromTopic(project.topic || '');
      const ensured = await musicProvider.ensureMusicTrackAvailable(category, project.id);
      if (ensured && fs.existsSync(ensured.localPath) && fs.statSync(ensured.localPath).size > 1000) {
        localBgMusicPath = ensured.localPath;
      }
    }

    // Step 6: Subtitle styling & ASS file generation
    const assSubtitlesPath = path.join(projectTempDir, 'subtitles.ass');
    const assContent = subtitleEngine.generateAss(project.scenes, options.subtitlePreset, width, height);
    fs.writeFileSync(assSubtitlesPath, assContent);

    onProgress?.(94, 'Burning subtitles and mixing master audio with ducking');

    // Step 7: Final Composite (Video Footage + Voice Audio + Background Music Ducking + Subtitles + Faststart)
    const hasVoice = fs.existsSync(fullVoicePath) && fs.statSync(fullVoicePath).size > 1000;
    const hasBgMusic = !!localBgMusicPath && fs.existsSync(localBgMusicPath) && fs.statSync(localBgMusicPath).size > 1000;
    const escapedAss = assSubtitlesPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    const musicVol = options.musicVolume ?? 0.18; // Ducked background music volume (18% for clean voiceover clarity)
    const voiceVol = options.voiceVolume ?? 1.05; // Slightly boosted voice for broadcast punchiness

    const buildFfmpegArgs = (burnSubtitles: boolean) => {
      const inputs: string[] = ['-y', '-i', rawVideoPath];
      let filterComplex = '';

      if (hasVoice && hasBgMusic) {
        inputs.push('-i', fullVoicePath);
        inputs.push('-stream_loop', '-1', '-i', localBgMusicPath!);
        // Voice + Ducked Background Music with smooth fade in/out and broadcast limiter
        const fadeOutStart = Math.max(1, totalDuration - 1.2);
        filterComplex = `[1:a]volume=${voiceVol},aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[voice];` +
                        `[2:a]volume=${musicVol},afade=t=in:ss=0:d=0.5,afade=t=out:st=${fadeOutStart}:d=1.2,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[bgm];` +
                        `[voice][bgm]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.95[aout]`;
      } else if (hasVoice) {
        inputs.push('-i', fullVoicePath);
        filterComplex = `[1:a]volume=${voiceVol},aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,alimiter=limit=0.95[aout]`;
      } else if (hasBgMusic) {
        inputs.push('-stream_loop', '-1', '-i', localBgMusicPath!);
        filterComplex = `[1:a]volume=0.7,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,alimiter=limit=0.95[aout]`;
      } else {
        inputs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
        filterComplex = `[1:a]volume=1.0[aout]`;
      }

      let videoFilter = '';
      if (burnSubtitles && fs.existsSync(assSubtitlesPath)) {
        videoFilter = `ass=${escapedAss}`;
      }

      const args = [...inputs];
      if (videoFilter && filterComplex) {
        args.push('-filter_complex', `[0:v]${videoFilter}[vout];${filterComplex}`);
        args.push('-map', '[vout]', '-map', '[aout]');
      } else if (videoFilter) {
        args.push('-filter_complex', `[0:v]${videoFilter}[vout]`);
        args.push('-map', '[vout]', '-map', '1:a');
      } else if (filterComplex) {
        args.push('-filter_complex', filterComplex);
        args.push('-map', '0:v', '-map', '[aout]');
      } else {
        args.push('-map', '0:v', '-map', '1:a');
      }

      args.push(
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', crf,
        '-profile:v', 'high',
        '-level', '4.0',
        '-threads', '0',
        '-pix_fmt', 'yuv420p',
        '-color_primaries', '1',
        '-color_trc', '1',
        '-colorspace', '1',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '48000',
        '-ac', '2',
        '-t', `${Math.max(1, totalDuration)}`,
        '-movflags', '+faststart',
        '-max_muxing_queue_size', '1024',
        finalOutputPath
      );
      return args;
    };

    const finalStart = Date.now();
    try {
      await this.runCommand('ffmpeg', buildFfmpegArgs(options.burnSubtitles !== false));
    } catch (renderErr) {
      console.warn('[VideoEngine] Render with subtitles failed, retrying without subtitle filter...', renderErr);
      await this.runCommand('ffmpeg', buildFfmpegArgs(false));
    }
    console.log(`[PERFORMANCE] [FFmpeg] Final composite encoded in ${Date.now() - finalStart}ms (Mode: ${qMode})`);

    // Step 7: Post-render validation with ffprobe
    onProgress?.(97, 'Validating output MP4 integrity and streams');
    let validation = await this.validateRenderedVideo(finalOutputPath);
    if (!validation.passed) {
      console.warn(`[VideoEngine] Initial validation failed (${validation.error}). Attempting automatic MP4 compliance repair...`);
      const repairedTempPath = path.join(projectTempDir, 'repaired_final.mp4');
      try {
        await this.ensureMp4Compliance(finalOutputPath, repairedTempPath);
        fs.copyFileSync(repairedTempPath, finalOutputPath);
        validation = await this.validateRenderedVideo(finalOutputPath);
      } catch (repairErr: any) {
        console.error('[VideoEngine] Compliance repair failed:', repairErr);
      }
    }

    if (!validation.passed) {
      throw new Error(`Rendered video validation failed: ${validation.error}`);
    }

    // Step 8: Generate thumbnail with rich catchy overlay
    await this.generateThumbnail(finalOutputPath, project.title, thumbnailPath, project);

    // Clean up temp dir
    try {
      fs.rmSync(projectTempDir, { recursive: true, force: true });
    } catch (e) {}

    const stats = fs.statSync(finalOutputPath);

    return {
      videoUrl: `/generated/videos/${outputFilename}`,
      thumbnailUrl: `/generated/videos/${thumbnailFilename}`,
      duration: validation.duration || totalDuration,
      width: validation.width || width,
      height: validation.height || height,
      fileSizeBytes: stats.size,
      videoCodec: validation.videoCodec || 'h264',
      audioCodec: validation.audioCodec || 'aac',
      isValidated: true
    };
  }
}

export const videoEngine = new VideoEngine();
