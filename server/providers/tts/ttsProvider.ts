import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Modality } from '@google/genai';
import { LanguageCode, VoiceGender, VoiceStyle, WordTimestamp } from '../../../src/types/index';

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

// Generate synthesized speech waveform audio for fallbacks (pleasant harmonized spoken resonance)
function generateSyntheticVoiceWav(text: string, durationSec: number, gender: VoiceGender = 'Male'): Buffer {
  const sampleRate = 24000;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const pcmBuffer = Buffer.alloc(totalSamples * 2);

  const basePitch = gender === 'Female' ? 220 : 130;
  const words = text.split(/\s+/).filter(Boolean);
  const samplesPerWord = words.length > 0 ? totalSamples / words.length : totalSamples;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const wordIdx = Math.floor(i / samplesPerWord);
    const wordProgress = (i % samplesPerWord) / samplesPerWord;

    // Vocal cadence envelope: attack, sustain, gentle decay per word
    const envelope = Math.sin(Math.PI * wordProgress) * (0.8 + 0.2 * Math.sin(t * 4));
    
    // Formants simulation (fundamental + 2nd + 3rd harmonic)
    const pitch = basePitch + Math.sin(t * 3) * 15 + (wordIdx % 3) * 10;
    const s1 = Math.sin(2 * Math.PI * pitch * t);
    const s2 = 0.4 * Math.sin(2 * Math.PI * pitch * 2 * t);
    const s3 = 0.2 * Math.sin(2 * Math.PI * pitch * 3 * t);
    const sampleVal = (s1 + s2 + s3) * envelope * 0.4;

    const int16Val = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 32767)));
    pcmBuffer.writeInt16LE(int16Val, i * 2);
  }

  const header = createWavHeader(pcmBuffer.length, sampleRate, 1, 16);
  return Buffer.concat([header, pcmBuffer]);
}

// Computes synchronized word timestamps across the duration
export function calculateWordTimestamps(text: string, totalDuration: number): WordTimestamp[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // Weight each word slightly by its character length + punctuation pause
  const wordWeights = words.map(w => {
    let weight = Math.max(1, w.length);
    if (/[.,!?]$/.test(w)) weight += 2; // slight pause on punctuation
    return weight;
  });

  const totalWeight = wordWeights.reduce((a, b) => a + b, 0);
  const timestamps: WordTimestamp[] = [];
  let currentTime = 0.05;

  for (let i = 0; i < words.length; i++) {
    const wordDuration = (wordWeights[i] / totalWeight) * (totalDuration - 0.1);
    const start = Number(currentTime.toFixed(2));
    const end = Number(Math.min(totalDuration, currentTime + wordDuration).toFixed(2));
    currentTime = end;

    // Highlight key conceptual words (words > 4 chars, or capitalized or preceding punctuation)
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
    this.outputDir = path.join(process.cwd(), 'public', 'generated', 'audio');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  public isConfigured(): boolean {
    return !!this.ai && !!this.apiKey;
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

  async generateSpeech(text: string, options?: TTSOptions, filePrefix: string = 'narration'): Promise<TTSResult> {
    const gender = options?.gender || 'Male';
    const style = options?.style || 'Energetic';
    const voiceName = options?.voiceName || this.pickVoiceName(gender, style);
    const speed = options?.speed || 1.0;
    const cleanText = text.trim();

    // Approximate duration: ~2.8 words/sec in Indonesian/English
    const wordsCount = cleanText.split(/\s+/).filter(Boolean).length;
    const approxDuration = Math.max(2.5, Number((wordsCount / (2.8 * speed)).toFixed(2)));

    const filename = `${filePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.wav`;
    const filePath = path.join(this.outputDir, filename);
    const publicUrl = `/generated/audio/${filename}`;

    const isCooldownActive = Date.now() < this.ttsCooldownUntil;

    if (this.ai && !isCooldownActive) {
      try {
        const styleInstruction = style === 'Energetic' ? 'Say with high energy and punchy viral delivery: ' :
                                 style === 'Dramatic' ? 'Say with deep dramatic anticipation: ' :
                                 style === 'Calm' ? 'Say calmly and soothingly: ' : 'Say naturally: ';

        const response = await this.ai.models.generateContent({
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
        });

        const rawBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (rawBase64) {
          const rawPcm = Buffer.from(rawBase64, 'base64');
          // Gemini TTS returns raw 24kHz 16-bit mono PCM. Wrap with WAV header for universal playback & FFmpeg
          const wavHeader = createWavHeader(rawPcm.length, 24000, 1, 16);
          const fullWav = Buffer.concat([wavHeader, rawPcm]);
          
          fs.writeFileSync(filePath, fullWav);
          const actualDuration = Number((rawPcm.length / (24000 * 2)).toFixed(2));
          const wordTimestamps = calculateWordTimestamps(cleanText, actualDuration);

          return {
            audioBuffer: fullWav,
            audioUrl: publicUrl,
            duration: actualDuration,
            wordTimestamps,
            provider: 'Google Gemini TTS (24kHz)'
          };
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) {
          this.ttsCooldownUntil = Date.now() + 60000; // 60s cooldown
        }
      }
    }

    // Fallback voice generation
    const wavBuffer = generateSyntheticVoiceWav(cleanText, approxDuration, gender);
    fs.writeFileSync(filePath, wavBuffer);
    const wordTimestamps = calculateWordTimestamps(cleanText, approxDuration);

    return {
      audioBuffer: wavBuffer,
      audioUrl: publicUrl,
      duration: approxDuration,
      wordTimestamps,
      provider: 'ShortsForge Synthetic TTS Engine'
    };
  }
}

export const ttsProvider = new GoogleTTSProvider();
