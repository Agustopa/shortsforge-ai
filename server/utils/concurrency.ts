import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Lightweight in-memory and disk persistent caching utility for audio, visuals, and music
 */
export class PipelineCache {
  private cacheDir: string;
  private memoryCache: Map<string, { data: any; expiry: number }> = new Map();

  constructor() {
    this.cacheDir = path.join(process.cwd(), 'data', 'cache');
    ['tts', 'visuals', 'music', 'scripts'].forEach((sub) => {
      const dir = path.join(this.cacheDir, sub);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  public hashKey(input: string): string {
    return crypto.createHash('sha256').update(input.trim().toLowerCase()).digest('hex');
  }

  public get<T>(namespace: 'tts' | 'visuals' | 'music' | 'scripts', key: string): T | null {
    const hashed = this.hashKey(key);
    const mem = this.memoryCache.get(`${namespace}:${hashed}`);
    if (mem && mem.expiry > Date.now()) {
      return mem.data as T;
    }

    const diskMetaPath = path.join(this.cacheDir, namespace, `${hashed}.json`);
    if (fs.existsSync(diskMetaPath)) {
      try {
        const raw = fs.readFileSync(diskMetaPath, 'utf8');
        const parsed = JSON.parse(raw);
        // If file references a local media file, make sure it still exists on disk
        if (parsed.localPath && !fs.existsSync(parsed.localPath)) {
          return null;
        }
        this.memoryCache.set(`${namespace}:${hashed}`, { data: parsed, expiry: Date.now() + 3600000 });
        return parsed as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  public set<T>(namespace: 'tts' | 'visuals' | 'music' | 'scripts', key: string, value: T, ttlMs: number = 86400000): void {
    const hashed = this.hashKey(key);
    this.memoryCache.set(`${namespace}:${hashed}`, { data: value, expiry: Date.now() + ttlMs });

    const diskMetaPath = path.join(this.cacheDir, namespace, `${hashed}.json`);
    try {
      fs.writeFileSync(diskMetaPath, JSON.stringify(value, null, 2), 'utf8');
    } catch (err) {
      console.warn(`[PipelineCache] Failed to write cache to disk: ${err}`);
    }
  }

  public getCachePath(namespace: 'tts' | 'visuals' | 'music' | 'scripts', key: string, ext: string): string {
    const hashed = this.hashKey(key);
    return path.join(this.cacheDir, namespace, `${hashed}.${ext.replace(/^\./, '')}`);
  }
}

export const pipelineCache = new PipelineCache();

/**
 * Concurrency runner for limiting simultaneous asynchronous operations (e.g. max 3-4 parallel requests)
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Timeout wrapper for external API calls
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string = 'Operation timed out'): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${errorMessage} (${timeoutMs}ms)`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Retry helper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 200,
  fallback?: () => Promise<T>
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  if (fallback) {
    return await fallback();
  }
  throw lastError;
}
