import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

function ensureExecutable(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      // Check if executable by owner/group/others
      if ((stat.mode & 0o111) === 0) {
        fs.chmodSync(filePath, 0o755);
      }
    }
  } catch (err) {
    console.warn(`[ffmpegPath] Failed to set executable permissions for ${filePath}:`, err);
  }
}

export function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    ensureExecutable(process.env.FFMPEG_PATH);
    return process.env.FFMPEG_PATH;
  }
  if (typeof ffmpegStatic === 'string' && fs.existsSync(ffmpegStatic)) {
    ensureExecutable(ffmpegStatic);
    return ffmpegStatic;
  }
  if (ffmpegStatic && (ffmpegStatic as any).path && fs.existsSync((ffmpegStatic as any).path)) {
    const p = (ffmpegStatic as any).path;
    ensureExecutable(p);
    return p;
  }
  // Try common linux paths
  const commonPaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg'];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      ensureExecutable(p);
      return p;
    }
  }
  return 'ffmpeg';
}

export function getFfprobePath(): string {
  if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
    ensureExecutable(process.env.FFPROBE_PATH);
    return process.env.FFPROBE_PATH;
  }
  if (ffprobeStatic && (ffprobeStatic as any).path && fs.existsSync((ffprobeStatic as any).path)) {
    const p = (ffprobeStatic as any).path;
    ensureExecutable(p);
    return p;
  }
  if (typeof ffprobeStatic === 'string' && fs.existsSync(ffprobeStatic)) {
    ensureExecutable(ffprobeStatic);
    return ffprobeStatic;
  }
  const commonPaths = ['/usr/bin/ffprobe', '/usr/local/bin/ffprobe', '/opt/homebrew/bin/ffprobe'];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      ensureExecutable(p);
      return p;
    }
  }
  return 'ffprobe';
}

export function isFfmpegAvailable(): boolean {
  try {
    const p = getFfmpegPath();
    if (p !== 'ffmpeg') {
      return fs.existsSync(p);
    }
    return true;
  } catch {
    return false;
  }
}

