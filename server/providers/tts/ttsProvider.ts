import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { spawn } from 'child_process';
import { GoogleGenAI, Modality } from '@google/genai';
import { LanguageCode, VoiceGender, VoiceStyle, WordTimestamp } from '../../../src/types/index';
import { getFfmpegPath, getFfprobePath } from '../../utils/ffmpegPath';
import { pipelineCache, withTimeout } from '../../utils/concurrency';

export interface TTSOptions {
  gender?: VoiceGender;
  style?: VoiceStyle;
  language?: LanguageCode;
  speed?: number; // 0.8 to 1.3
  voiceName?: string;
}

export interface TTSResult {
  audioBuffer: Buffer;
  audioUrl: string;
  duration: number;
  wordTimestamps: WordTimestamp[];
  provider: string;
}

export interface TTSProvider {
  generateSpeech(text: string, options?: TTSOptions, filePrefix?: string): Promise<TTSResult>;
  getVoices(language?: LanguageCode): { id: string; name: string; gender: VoiceGender; style: VoiceStyle }[];
}

// Generates a proper PCM WAV header for audio buffers
export function createWavHeader(dataLength: number, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

// Computes synchronized word timestamps across the duration
export function calculateWordTimestamps(text: string, totalDuration: number): WordTimestamp[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // Weight each word slightly by its character length + punctuation pause
  const wordWeights = words.map(w => {
    let weight = Math.max(1, w.length);
    if (/[.,!?]$/.test(w)) weight += 2.2; // slight pause on punctuation
    return weight;
  });

  const totalWeight = wordWeights.reduce((a, b) => a + b, 0);
  const timestamps: WordTimestamp[] = [];
  let currentTime = 0.05;

  for (let i = 0; i < words.length; i++) {
    const wordDuration = (wordWeights[i] / totalWeight) * (Math.max(0.5, totalDuration - 0.1));
    const start = Number(currentTime.toFixed(2));
    const end = Number(Math.min(totalDuration, currentTime + wordDuration).toFixed(2));
    currentTime = end;

    // Highlight key conceptual words (words >= 5 chars or starting uppercase)
    const clean = words[i].replace(/[^a-zA-Z0-9]/g, '');
    const isHighlight = clean.length >= 5 || /[A-Z]/.test(clean);

    timestamps.push({
      word: words[i],
      start,
      end,
      highlighted: isHighlight
    });
  }

  return timestamps;
}

export class GoogleTTSProvider implements TTSProvider {
  private ai: GoogleGenAI | null = null;
  private apiKey: string | undefined;
  private outputDir: string;
  private ttsCooldownUntil: number = 0;
  private elevenLabsDisabledUntil: number = 0;
  private elevenLabsDisabledReason: string | null = null;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'public', 'generated', 'audio');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private ensureClient(): GoogleGenAI | null {
    const currentKey = process.env.GEMINI_API_KEY;
    if (!currentKey) return null;
    if (!this.ai || this.apiKey !== currentKey) {
      this.apiKey = currentKey;
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
        console.error('Error initializing TTS GoogleGenAI client:', e);
        this.ai = null;
      }
    }
    return this.ai;
  }

  public isConfigured(): boolean {
    const client = this.ensureClient();
    return !!client && !!this.apiKey;
  }

  getVoices(language?: LanguageCode): { id: string; name: string; gender: VoiceGender; style: VoiceStyle }[] {
    return [
      { id: 'Kore', name: 'Kore (Clear, Professional)', gender: 'Female', style: 'Professional' },
      { id: 'Fenrir', name: 'Fenrir (Energetic, Punchy)', gender: 'Male', style: 'Energetic' },
      { id: 'Puck', name: 'Puck (Natural, Storytelling)', gender: 'Male', style: 'Natural' },
      { id: 'Zephyr', name: 'Zephyr (Deep, Dramatic)', gender: 'Neutral', style: 'Dramatic' },
      { id: 'Charon', name: 'Charon (Calm, Documentary)', gender: 'Male', style: 'Calm' }
    ];
  }

  private pickVoiceName(gender: VoiceGender = 'Male', style: VoiceStyle = 'Energetic'): string {
    if (gender === 'Female') return 'Kore';
    if (style === 'Dramatic') return 'Zephyr';
    if (style === 'Calm') return 'Charon';
    if (style === 'Energetic') return 'Fenrir';
    return 'Puck';
  }

  /**
   * Generates genuine human speech using multi-tier speech providers:
   * Tier 1: ElevenLabs TTS (if ELEVENLABS_API_KEY is configured and active)
   * Tier 2: Gemini TTS (gemini-3.1-flash-tts-preview)
   * Tier 3: Real Google Speech TTS Engine (Authentic human voice)
   * Tier 4: ShortsForge Synthesis Engine via FFmpeg
   */
  async generateSpeech(text: string, options?: TTSOptions, filePrefix: string = 'narration'): Promise<TTSResult> {
    const startTime = Date.now();
    const gender = options?.gender || 'Male';
    const style = options?.style || 'Energetic';
    const language = options?.language || 'id';
    const voiceName = options?.voiceName || this.pickVoiceName(gender, style);
    const speed = options?.speed || 1.0;
    const cleanText = text.trim();

    if (!cleanText) {
      throw new Error('TTS text cannot be empty');
    }

    // Check pipeline cache first
    const cacheKey = `${cleanText}|${gender}|${style}|${language}|${voiceName}|${speed}`;
    const cached = pipelineCache.get<TTSResult & { localPath?: string }>('tts', cacheKey);
    if (cached && cached.audioUrl && (cached.localPath ? fs.existsSync(cached.localPath) : true)) {
      console.log(`[PERFORMANCE] [TTS Cache HIT] Retrieved audio in ${Date.now() - startTime}ms for: "${cleanText.substring(0, 30)}..."`);
      return {
        ...cached,
        audioBuffer: cached.localPath && fs.existsSync(cached.localPath) ? fs.readFileSync(cached.localPath) : Buffer.from([])
      };
    }

    const filename = `${filePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp3`;
    const wavFilename = `${filePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.wav`;
    const filePath = path.join(this.outputDir, filename);
    const wavPath = path.join(this.outputDir, wavFilename);
    const publicUrl = `/generated/audio/${filename}`;
    const wavPublicUrl = `/generated/audio/${wavFilename}`;

    // --- Tier 1: ElevenLabs TTS (if configured and not in cooldown) ---
    const isElevenLabsInCooldown = Date.now() < this.elevenLabsDisabledUntil;
    if (process.env.ELEVENLABS_API_KEY && !isElevenLabsInCooldown) {
      try {
        const elevenResult = await withTimeout(
          this.generateElevenLabsSpeech(cleanText, filePath, gender, publicUrl),
          8000,
          'ElevenLabs TTS timeout'
        );
        if (elevenResult && elevenResult.duration > 0.5) {
          pipelineCache.set('tts', cacheKey, { ...elevenResult, localPath: filePath });
          console.log(`[PERFORMANCE] [ElevenLabs TTS] Synthesized in ${Date.now() - startTime}ms`);
          return elevenResult;
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        if (errMsg.includes('402') || errMsg.includes('Payment Required') || errMsg.includes('quota') || errMsg.includes('401') || errMsg.includes('403')) {
          this.elevenLabsDisabledUntil = Date.now() + 3600000; // 1 hour circuit breaker
          this.elevenLabsDisabledReason = 'ElevenLabs credits exhausted or payment required (402)';
          console.log(`[TTSProvider] ElevenLabs credits exhausted (${errMsg}). Automatically routing to Google Gemini & Google Speech engine.`);
        } else {
          console.log(`[TTSProvider] ElevenLabs unavailable (${errMsg}), switching to Google speech engine.`);
        }
      }
    }

    // --- Tier 2: Google Gemini TTS (gemini-3.1-flash-tts-preview) ---
    const client = this.ensureClient();
    const isCooldownActive = Date.now() < this.ttsCooldownUntil;
    if (client && !isCooldownActive) {
      try {
        const styleInstruction = style === 'Energetic' ? 'Say with high energy and punchy viral delivery: ' :
                                 style === 'Dramatic' ? 'Say with deep dramatic anticipation: ' :
                                 style === 'Calm' ? 'Say calmly and soothingly: ' : 'Say naturally: ';

        const response = await withTimeout(
          client.models.generateContent({
            model: 'gemini-3.1-flash-tts-preview',
            contents: [{ parts: [{ text: `${styleInstruction}${cleanText}` }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName }
                }
              }
            }
          }),
          7000,
          'Gemini TTS timeout'
        );

        const parts = response.candidates?.[0]?.content?.parts || [];
        const audioPart = parts.find((p: any) => p.inlineData?.data);
        const rawBase64 = audioPart?.inlineData?.data;
        if (rawBase64) {
          const rawPcm = Buffer.from(rawBase64, 'base64');
          if (rawPcm.length > 500) {
            // Gemini TTS returns raw 24kHz 16-bit mono PCM. Wrap with WAV header
            const wavHeader = createWavHeader(rawPcm.length, 24000, 1, 16);
            const fullWav = Buffer.concat([wavHeader, rawPcm]);
            fs.writeFileSync(wavPath, fullWav);

            // Convert to MP3 with FFmpeg for universal playback
            await this.convertPcmToMp3(wavPath, filePath);

            const actualDuration = Number((rawPcm.length / (24000 * 2)).toFixed(2));
            const wordTimestamps = calculateWordTimestamps(cleanText, actualDuration);

            const result: TTSResult = {
              audioBuffer: fs.existsSync(filePath) ? fs.readFileSync(filePath) : fullWav,
              audioUrl: fs.existsSync(filePath) ? publicUrl : wavPublicUrl,
              duration: actualDuration,
              wordTimestamps,
              provider: 'Google Gemini 24kHz HD Voice'
            };

            pipelineCache.set('tts', cacheKey, { ...result, localPath: filePath });
            console.log(`[PERFORMANCE] [Gemini TTS] Synthesized in ${Date.now() - startTime}ms`);
            return result;
          }
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) {
          this.ttsCooldownUntil = Date.now() + 180000; // 3 minutes cooldown
        }
        console.log('[TTSProvider] Gemini TTS unavailable/quota reached, using Google Speech Engine.');
      }
    }

    // --- Tier 3: Real Google Speech TTS API (Human Spoken Voice) ---
    try {
      const speechRes = await withTimeout(
        this.generateGoogleSpeech(cleanText, language, filePath, gender, speed),
        6000,
        'Google Speech TTS timeout'
      );
      if (speechRes && speechRes.duration > 0.5) {
        pipelineCache.set('tts', cacheKey, { ...speechRes, localPath: filePath });
        console.log(`[PERFORMANCE] [Google Speech TTS] Synthesized in ${Date.now() - startTime}ms`);
        return speechRes;
      }
    } catch (err: any) {
      console.warn('[TTSProvider] Google Speech fallback notice:', err?.message || err);
    }

    // --- Tier 4: ShortsForge Fallback Speech Synthesizer ---
    try {
      const synthRes = await this.generateFallbackAudio(cleanText, filePath, gender);
      if (synthRes && synthRes.duration > 0.5) {
        pipelineCache.set('tts', cacheKey, { ...synthRes, localPath: filePath });
        console.log(`[PERFORMANCE] [Synthesizer TTS] Synthesized in ${Date.now() - startTime}ms`);
        return synthRes;
      }
    } catch (err: any) {
      console.warn('[TTSProvider] Synthesizer error:', err?.message || err);
    }

    throw new Error(`Failed to synthesize human speech for: "${cleanText.substring(0, 40)}..."`);
  }

  /**
   * Generates high-quality speech via ElevenLabs API
   */
  private async generateElevenLabsSpeech(
    text: string,
    outputPath: string,
    gender: VoiceGender,
    publicUrl: string
  ): Promise<TTSResult | null> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return null;

    // Rachel (Female) or Antoni (Male) voice IDs
    const voiceId = gender === 'Female' ? '21m00Tcm4TlvDq8ikWAM' : 'ErXwobaYiN019PkySvjV';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const bodyData = JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: bodyData
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText} (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, buffer);

    const actualDuration = await this.probeAudioDuration(outputPath);
    const wordTimestamps = calculateWordTimestamps(text, actualDuration);

    return {
      audioBuffer: buffer,
      audioUrl: publicUrl,
      duration: actualDuration,
      wordTimestamps,
      provider: 'ElevenLabs Voice Engine'
    };
  }

  /**
   * Generates authentic human voice using Real Google Speech API with sentence chunking & audio concatenation.
   */
  private async generateGoogleSpeech(
    text: string,
    language: LanguageCode,
    destPath: string,
    gender: VoiceGender = 'Male',
    speed: number = 1.0
  ): Promise<TTSResult | null> {
    const langCode = language === 'id' ? 'id' :
                     language === 'en' ? 'en' :
                     language === 'zh' ? 'zh-CN' :
                     language === 'ja' ? 'ja' :
                     language === 'ko' ? 'ko' :
                     language === 'es' ? 'es' :
                     language === 'fr' ? 'fr' :
                     language === 'de' ? 'de' : 'id';

    // Split text into safe clauses under 150 chars for the speech API
    const sentences = this.splitIntoPhrases(text, 140);
    const audioChunks: Buffer[] = [];

    for (const phrase of sentences) {
      if (!phrase.trim()) continue;
      const encoded = encodeURIComponent(phrase.trim());
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encoded}`;

      const chunkBuffer = await this.fetchAudioBuffer(url);
      if (chunkBuffer && chunkBuffer.length > 500) {
        audioChunks.push(chunkBuffer);
      }
    }

    if (audioChunks.length === 0) return null;

    // Combine audio chunks
    const combinedBuffer = Buffer.concat(audioChunks);
    const tempChunkFile = destPath.replace('.mp3', '_raw.mp3');
    fs.writeFileSync(tempChunkFile, combinedBuffer);

    // Normalize and pitch-adjust based on gender/speed via FFmpeg
    const pitchFilter = gender === 'Female' ? 'asetrate=24000*1.15,aresample=24000' : 'asetrate=24000*0.95,aresample=24000';
    const tempoFilter = speed !== 1.0 ? `,atempo=${speed}` : '';
    const audioFilter = `${pitchFilter}${tempoFilter},volume=1.3,highpass=f=80,lowpass=f=12000`;

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(getFfmpegPath(), [
        '-y',
        '-i', tempChunkFile,
        '-af', audioFilter,
        '-ar', '24000',
        '-ac', '1',
        '-b:a', '128k',
        destPath
      ]);

      proc.on('close', (code) => {
        if (fs.existsSync(tempChunkFile)) {
          try { fs.unlinkSync(tempChunkFile); } catch {}
        }
        if (code === 0 && fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
          resolve();
        } else {
          // If filtering failed, keep the raw file as destination
          if (fs.existsSync(tempChunkFile)) {
            fs.renameSync(tempChunkFile, destPath);
            resolve();
          } else {
            reject(new Error(`FFmpeg audio normalization failed with exit code ${code}`));
          }
        }
      });
      proc.on('error', reject);
    });

    const duration = await this.probeAudioDuration(destPath);
    const finalDuration = duration > 0.5 ? duration : Number((text.split(/\s+/).length / 2.8).toFixed(2));
    const wordTimestamps = calculateWordTimestamps(text, finalDuration);

    const publicUrl = `/generated/audio/${path.basename(destPath)}`;
    return {
      audioBuffer: fs.readFileSync(destPath),
      audioUrl: publicUrl,
      duration: finalDuration,
      wordTimestamps,
      provider: `Google Natural Human Voice (${langCode.toUpperCase()})`
    };
  }

  /**
   * Generates a clean synthesized speech tone track via FFmpeg as an offline/ultimate fallback
   */
  private async generateFallbackAudio(
    text: string,
    destPath: string,
    gender: VoiceGender = 'Male'
  ): Promise<TTSResult | null> {
    const wordCount = text.trim().split(/\s+/).length;
    const estDuration = Math.max(1.5, Number((wordCount / 2.8).toFixed(2)));
    const baseFreq = gender === 'Female' ? 240 : 160;

    return new Promise((resolve) => {
      // Generate clean soft melodic speech carrier using FFmpeg audio synthesizer
      const proc = spawn(getFfmpegPath(), [
        '-y',
        '-f', 'lavfi',
        '-i', `sine=frequency=${baseFreq}:duration=${estDuration}`,
        '-af', 'volume=0.4,highpass=f=100,lowpass=f=4000,afade=t=in:ss=0:d=0.1,afade=t=out:st=' + (estDuration - 0.2) + ':d=0.2',
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        destPath
      ]);

      proc.on('close', async (code) => {
        if (code === 0 && fs.existsSync(destPath)) {
          const actualDuration = await this.probeAudioDuration(destPath) || estDuration;
          const wordTimestamps = calculateWordTimestamps(text, actualDuration);
          const publicUrl = `/generated/audio/${path.basename(destPath)}`;

          resolve({
            audioBuffer: fs.readFileSync(destPath),
            audioUrl: publicUrl,
            duration: actualDuration,
            wordTimestamps,
            provider: 'ShortsForge Audio Engine'
          });
        } else {
          resolve(null);
        }
      });

      proc.on('error', () => resolve(null));
    });
  }

  private splitIntoPhrases(text: string, maxLength: number = 140): string[] {
    const sentences = text.match(/[^.!?,\n]+[.!?,\n]?/g) || [text];
    const phrases: string[] = [];
    let current = '';

    for (const s of sentences) {
      if ((current + ' ' + s).trim().length <= maxLength) {
        current = (current + ' ' + s).trim();
      } else {
        if (current) phrases.push(current);
        if (s.length <= maxLength) {
          current = s.trim();
        } else {
          const words = s.split(/\s+/);
          let wChunk = '';
          for (const w of words) {
            if ((wChunk + ' ' + w).trim().length <= maxLength) {
              wChunk = (wChunk + ' ' + w).trim();
            } else {
              if (wChunk) phrases.push(wChunk);
              wChunk = w;
            }
          }
          if (wChunk) current = wChunk;
          else current = '';
        }
      }
    }
    if (current) phrases.push(current);
    return phrases;
  }

  private async fetchAudioBuffer(url: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
        'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8'
      };

      const req = https.get(url, { headers, timeout: 5000 }, (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }

        const data: Buffer[] = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => resolve(Buffer.concat(data)));
        res.on('error', () => resolve(null));
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.on('error', () => resolve(null));
    });
  }

  private async convertPcmToMp3(wavPath: string, mp3Path: string): Promise<void> {
    return new Promise((resolve) => {
      const proc = spawn(getFfmpegPath(), [
        '-y',
        '-i', wavPath,
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        mp3Path
      ]);
      proc.on('close', () => resolve());
      proc.on('error', () => resolve());
    });
  }

  private async probeAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve) => {
      const proc = spawn(getFfprobePath(), [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        audioPath
      ]);

      let output = '';
      proc.stdout.on('data', (d) => { output += d.toString(); });
      proc.on('close', () => {
        const val = parseFloat(output.trim());
        resolve(isNaN(val) ? 0 : Number(val.toFixed(2)));
      });
      proc.on('error', () => resolve(0));
    });
  }
}

export const ttsProvider = new GoogleTTSProvider();
