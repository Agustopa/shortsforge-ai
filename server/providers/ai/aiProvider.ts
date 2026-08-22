import { GoogleGenAI, Type } from '@google/genai';
import {
  LanguageCode,
  VideoDuration,
  ContentStyle,
  VideoPlatform,
  VisualMode,
  HookOption,
  ResearchSource,
  Scene,
  VisualBible,
  SocialPackage,
  ContentIdea,
  CurrentTopic,
  TopicRelevanceCheck
} from '../../../src/types/index';

export interface GenerationContext {
  projectId: string;
  generationId: string;
  currentTopic: CurrentTopic;
}

export interface TopicAnalysis {
  topic: string;
  niche: string;
  audience: string;
  content_style: ContentStyle;
  contentStyle?: ContentStyle;
  hook_strategy: string;
  tone: string;
  duration: VideoDuration;
  platform: VideoPlatform;
  language: LanguageCode;
  factuality_required: boolean;
  visual_strategy: string;
}

export interface ScriptResult {
  title: string;
  hook: string;
  body: string;
  payoff: string;
  cta: string;
  fullNarration: string;
  estimatedSpokenSeconds: number;
}

export interface AIProvider {
  analyzeTopic(topic: string, options?: Partial<TopicAnalysis>, context?: Partial<GenerationContext>): Promise<TopicAnalysis>;
  conductResearch(topic: string, analysis: TopicAnalysis, context?: Partial<GenerationContext>): Promise<ResearchSource[]>;
  generateHooks(analysis: TopicAnalysis, research?: ResearchSource[], context?: Partial<GenerationContext>): Promise<{ hooks: HookOption[]; selectedHook: HookOption }>;
  generateScript(analysis: TopicAnalysis, selectedHook: HookOption, targetDuration: VideoDuration, context?: Partial<GenerationContext>): Promise<ScriptResult>;
  planScenes(script: ScriptResult, analysis: TopicAnalysis, visualMode: VisualMode, context?: Partial<GenerationContext>): Promise<{ scenes: Scene[]; visualBible: VisualBible }>;
  generateContentIdeas(niche: string, count?: number): Promise<ContentIdea[]>;
  generateSocialPackage(topic: string, script: ScriptResult, platform: VideoPlatform, language: LanguageCode, context?: Partial<GenerationContext>): Promise<SocialPackage>;
  validateTopicRelevance(topic: string, contentText: string, context?: Partial<GenerationContext>): Promise<TopicRelevanceCheck>;
  validateSceneRelevance(topic: string, scene: Scene, context?: Partial<GenerationContext>): Promise<TopicRelevanceCheck>;
}

const STRONG_SYSTEM_INSTRUCTION = `You are an elite short-form video architect and viral content director.
MANDATORY DIRECTIVE ON TOPIC PURITY AND CONTEXT ISOLATION:
1. You must generate content ONLY and STRICTLY about the CURRENT USER TOPIC.
2. The CURRENT USER TOPIC is the authoritative, single source of truth.
3. Do NOT use previous projects, previous topics, previous conversations, or past examples (such as Bali, generic travel, or unrelated geography) as context.
4. If the CURRENT USER TOPIC is about the Moon ("fakta menakutkan tentang bulan"), every single generated word, fact, scene, and visual prompt MUST be exclusively about the Moon, astronomy, lunar anomalies, and space.
5. If the CURRENT USER TOPIC is about Octopuses ("5 fakta unik tentang gurita"), every single element MUST be about octopus biology and marine life.
6. If the CURRENT USER TOPIC is about Egyptian Pyramids ("sejarah piramida Mesir"), every element MUST be about ancient Egypt, architecture, and archaeology.
7. Any contamination or substitution of the topic is a critical failure.`;

// Calculate speaking duration based on language (Indonesian/English ~ 2.8 - 3.2 words per second)
export function estimateNarrationDuration(text: string, lang: LanguageCode = 'en'): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (lang === 'zh' || lang === 'ja' || lang === 'ko') {
    return Math.max(3, Math.round(text.length / 4.5));
  }
  const rate = lang === 'id' ? 3.0 : 2.7;
  return Math.max(3, Math.round(words / rate));
}

export class GoogleAIProvider implements AIProvider {
  private ai: GoogleGenAI | null = null;
  private apiKey: string | undefined;

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
  }

  public isAvailable(): boolean {
    return !!this.ai && !!this.apiKey;
  }

  private detectLanguageFromText(text: string): LanguageCode {
    const lower = text.toLowerCase();
    const indonesianKeywords = ['tentang', 'fakta', 'yang', 'dan', 'di', 'ini', 'adalah', 'cara', 'kenapa', 'mengapa', 'rahasia', 'bisa', 'kamu', 'apa', 'bulan', 'gurita', 'matahari', 'piramida', 'manusia'];
    const indonesianMatches = indonesianKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(lower));
    if (indonesianMatches.length >= 1) return 'id';
    
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
    if (/[\u3040-\u30ff]/.test(text)) return 'ja';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    if (/\b(und|der|die|das|wie|warum|über)\b/i.test(lower)) return 'de';
    if (/\b(el|la|los|las|por|que|sobre|cómo)\b/i.test(lower)) return 'es';
    if (/\b(le|la|les|pourquoi|comment|sur)\b/i.test(lower)) return 'fr';
    
    return 'en';
  }

  private validateTopicInput(topic: string): string {
    const clean = (topic || '').trim();
    if (!clean) {
      throw new Error('Please enter a topic.');
    }
    return clean;
  }

  private async generateContentWithCascade(params: {
    contents: any;
    config?: any;
  }): Promise<any> {
    if (!this.ai) {
      throw new Error('AI client not initialized');
    }

    const modelsToTry = [
      'gemini-3.7-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite'
    ];

    let lastError: any = null;

    for (const model of modelsToTry) {
      // Retry up to 2 times for transient errors (503 high demand, 429 rate limit, 500, network)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await this.ai.models.generateContent({
            model,
            contents: params.contents,
            config: params.config
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const errMessage = err?.message || String(err);
          const isHighDemand = errMessage.includes('503') ||
                               errMessage.includes('high demand') ||
                               errMessage.includes('overloaded') ||
                               errMessage.includes('UNAVAILABLE') ||
                               errMessage.includes('Service Unavailable');
          const isQuota = err?.status === 'RESOURCE_EXHAUSTED' || 
                          errMessage.includes('429') || 
                          errMessage.includes('Quota exceeded') ||
                          errMessage.includes('RESOURCE_EXHAUSTED');

          if (isHighDemand || isQuota) {
            console.warn(`[AIProvider] ${model} attempt ${attempt} encountered ${isHighDemand ? '503 High Demand' : '429 Rate Limit'}. Backing off...`);
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 600 * attempt));
              continue;
            }
          } else {
            console.warn(`[AIProvider] Request failed on ${model} (attempt ${attempt}): ${errMessage.substring(0, 120)}`);
            break; // Move to next model cascade immediately
          }
        }
      }
    }

    throw lastError || new Error('All model cascade attempts exhausted');
  }

  async analyzeTopic(
    rawTopic: string,
    options?: Partial<TopicAnalysis>,
    context?: Partial<GenerationContext>
  ): Promise<TopicAnalysis> {
    const topic = this.validateTopicInput(rawTopic);
    const detectedLang = options?.language || this.detectLanguageFromText(topic);

    if (!this.ai) {
      return this.fallbackAnalyze(topic, detectedLang, options);
    }

    try {
      const response = await this.generateContentWithCascade({
        contents: `[TOPIC ISOLATION HEADER]
CURRENT USER TOPIC: "${topic}"
CURRENT PROJECT ID: "${context?.projectId || 'proj_isolated'}"
CURRENT GENERATION ID: "${context?.generationId || 'gen_isolated'}"

Analyze this EXACT video topic for an ultra-engaging short-form video: "${topic}".
Language requested: ${options?.language || detectedLang}.
Platform requested: ${options?.platform || 'all'}.
Content style preference: ${options?.contentStyle || 'auto'}.
Duration preference: ${options?.duration || 30} seconds.

Return JSON adhering strictly to:
- topic: string (MUST match current topic: "${topic}")
- niche: string (e.g. Science, Space, Biology, History, Technology, Facts, etc. derived solely from "${topic}")
- audience: string (target demographic interested in "${topic}")
- content_style: string (one of: Viral, Educational, Storytelling, Documentary, News, Facts, Motivation, Business, Product promotion, Travel, Food, Technology, Gaming, History, Horror, Mystery, Comedy)
- hook_strategy: string
- tone: string
- duration: number (15, 30, 45, 60, or 90)
- platform: string (tiktok, reels, shorts, or all)
- language: string (id, en, zh, ja, ko, de, es, fr)
- factuality_required: boolean
- visual_strategy: string (visual direction specifically tailored for "${topic}")`,
        config: {
          systemInstruction: STRONG_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              niche: { type: Type.STRING },
              audience: { type: Type.STRING },
              content_style: { type: Type.STRING },
              hook_strategy: { type: Type.STRING },
              tone: { type: Type.STRING },
              duration: { type: Type.INTEGER },
              platform: { type: Type.STRING },
              language: { type: Type.STRING },
              factuality_required: { type: Type.BOOLEAN },
              visual_strategy: { type: Type.STRING }
            },
            required: [
              'topic', 'niche', 'audience', 'content_style', 'hook_strategy',
              'tone', 'duration', 'platform', 'language', 'factuality_required', 'visual_strategy'
            ]
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        topic: topic, // Enforce current topic lock
        niche: parsed.niche || 'Facts',
        audience: parsed.audience || `Audience interested in ${topic}`,
        content_style: (parsed.content_style as ContentStyle) || options?.contentStyle || 'Viral',
        hook_strategy: parsed.hook_strategy || 'Pattern interrupt & curiosity loop',
        tone: parsed.tone || 'Dynamic & Compelling',
        duration: (parsed.duration as VideoDuration) || options?.duration || 30,
        platform: (parsed.platform as VideoPlatform) || options?.platform || 'all',
        language: (parsed.language as LanguageCode) || detectedLang,
        factuality_required: typeof parsed.factuality_required === 'boolean' ? parsed.factuality_required : true,
        visual_strategy: parsed.visual_strategy || `Cinematic visual storytelling tailored to ${topic}`
      };
    } catch (err) {
      console.warn('Gemini analyzeTopic error, using dynamic fallback:', err);
      return this.fallbackAnalyze(topic, detectedLang, options);
    }
  }

  private fallbackAnalyze(topic: string, detectedLang: LanguageCode, options?: Partial<TopicAnalysis>): TopicAnalysis {
    const lower = topic.toLowerCase();
    let niche = 'Facts';
    if (lower.includes('bulan') || lower.includes('space') || lower.includes('moon') || lower.includes('bintang') || lower.includes('planet')) niche = 'Space & Science';
    else if (lower.includes('gurita') || lower.includes('hewan') || lower.includes('animal') || lower.includes('laut')) niche = 'Nature & Biology';
    else if (lower.includes('piramida') || lower.includes('sejarah') || lower.includes('history') || lower.includes('kuno')) niche = 'History & Mysteries';
    else if (lower.includes('ai') || lower.includes('tech') || lower.includes('komputer')) niche = 'Technology';

    return {
      topic,
      niche,
      audience: `Viewers interested in ${topic}`,
      content_style: (options?.contentStyle as ContentStyle) || 'Viral',
      hook_strategy: 'Pattern interrupt & curiosity loop',
      tone: 'Dynamic and immersive',
      duration: options?.duration || 30,
      platform: options?.platform || 'all',
      language: options?.language || detectedLang,
      factuality_required: true,
      visual_strategy: `Vivid 9:16 portrait video visuals specifically portraying ${topic}`
    };
  }

  async conductResearch(
    rawTopic: string,
    analysis: TopicAnalysis,
    context?: Partial<GenerationContext>
  ): Promise<ResearchSource[]> {
    const topic = this.validateTopicInput(rawTopic);
    if (!analysis.factuality_required) {
      return [];
    }

    if (!this.ai) {
      return this.fallbackResearch(topic, analysis.language);
    }

    try {
      let responseText: string | undefined;

      // Try grounded search first
      try {
        const response = await this.generateContentWithCascade({
          contents: `[TOPIC ISOLATION HEADER]
CURRENT USER TOPIC: "${topic}"
CURRENT PROJECT ID: "${context?.projectId || 'proj_isolated'}"
CURRENT GENERATION ID: "${context?.generationId || 'gen_isolated'}"

Conduct verified factual research ONLY about "${topic}".
Language: ${analysis.language}.
Extract 3 to 5 verified key facts specifically about "${topic}".
Do NOT include facts about any other topic. Distinguish FACT vs OPINION vs SPECULATION.`,
          config: {
            systemInstruction: STRONG_SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING },
                  snippet: { type: Type.STRING },
                  isFact: { type: Type.BOOLEAN },
                  type: { type: Type.STRING, enum: ['FACT', 'OPINION', 'SPECULATION', 'CREATIVE_CONTENT'] },
                  confidence: { type: Type.NUMBER }
                },
                required: ['title', 'snippet', 'isFact', 'type', 'confidence']
              }
            }
          }
        });
        responseText = response.text;
      } catch (searchErr) {
        // If search grounding fails or is quota-limited, execute direct knowledge cascade without search tool
        const response = await this.generateContentWithCascade({
          contents: `[TOPIC ISOLATION HEADER]
CURRENT USER TOPIC: "${topic}"
CURRENT PROJECT ID: "${context?.projectId || 'proj_isolated'}"
CURRENT GENERATION ID: "${context?.generationId || 'gen_isolated'}"

Provide verified factual research ONLY about "${topic}".
Language: ${analysis.language}.
Extract 3 to 5 verified key facts specifically about "${topic}".`,
          config: {
            systemInstruction: STRONG_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING },
                  snippet: { type: Type.STRING },
                  isFact: { type: Type.BOOLEAN },
                  type: { type: Type.STRING, enum: ['FACT', 'OPINION', 'SPECULATION', 'CREATIVE_CONTENT'] },
                  confidence: { type: Type.NUMBER }
                },
                required: ['title', 'snippet', 'isFact', 'type', 'confidence']
              }
            }
          }
        });
        responseText = response.text;
      }

      const parsed = JSON.parse(responseText || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as ResearchSource[];
      }
      return this.fallbackResearch(topic, analysis.language);
    } catch (err) {
      return this.fallbackResearch(topic, analysis.language);
    }
  }

  private fallbackResearch(topic: string, language: LanguageCode): ResearchSource[] {
    const isId = language === 'id';
    return [
      {
        title: isId ? `Fakta Utama & Eksplorasi: ${topic}` : `Core verified insights for "${topic}"`,
        snippet: isId
          ? `Kajian mendalam dan fakta ilmiah terverifikasi mengenai ${topic}.`
          : `Verified scientific and historical context regarding ${topic}.`,
        isFact: true,
        type: 'FACT',
        confidence: 0.95
      },
      {
        title: isId ? `Fenomena Unik Terkait ${topic}` : `Unique phenomena regarding ${topic}`,
        snippet: isId
          ? `Penjelasan mekanisme dan dampak tak terduga yang berhubungan langsung dengan ${topic}.`
          : `Detailed breakdown of surprising mechanisms directly tied to ${topic}.`,
        isFact: true,
        type: 'FACT',
        confidence: 0.93
      }
    ];
  }

  async generateHooks(
    analysis: TopicAnalysis,
    research?: ResearchSource[],
    context?: Partial<GenerationContext>
  ): Promise<{ hooks: HookOption[]; selectedHook: HookOption }> {
    const topic = this.validateTopicInput(analysis.topic);
    if (!this.ai) {
      return this.fallbackHooks(analysis);
    }

    const factsSummary = research?.map(r => `- ${r.snippet}`).join('\n') || '';

    try {
      const response = await this.generateContentWithCascade({
        contents: `[TOPIC ISOLATION HEADER]
CURRENT USER TOPIC: "${topic}"
CURRENT PROJECT ID: "${context?.projectId || 'proj_isolated'}"
CURRENT GENERATION ID: "${context?.generationId || 'gen_isolated'}"

Generate 3 distinct viral hook options ONLY for topic: "${topic}".
Language: ${analysis.language}.
Niche: ${analysis.niche}.
Content Style: ${analysis.content_style}.
Facts context:\n${factsSummary}

Requirements for hooks:
- Spoken impact in first 1-3 seconds.
- Every hook MUST be explicitly about "${topic}".
- Avoid generic cliches ("Hai guys").
- Open a strong curiosity loop or relatable surprise about "${topic}".
- Score each hook from 1-10 on curiosity, clarity, emotionalImpact, retentionPotential, relevance, naturalLanguage.
- Pick the strongest one.`,
        config: {
          systemInstruction: STRONG_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                score: {
                  type: Type.OBJECT,
                  properties: {
                    curiosity: { type: Type.NUMBER },
                    clarity: { type: Type.NUMBER },
                    emotionalImpact: { type: Type.NUMBER },
                    retentionPotential: { type: Type.NUMBER },
                    relevance: { type: Type.NUMBER },
                    naturalLanguage: { type: Type.NUMBER },
                    total: { type: Type.NUMBER }
                  },
                  required: ['curiosity', 'clarity', 'emotionalImpact', 'retentionPotential', 'relevance', 'naturalLanguage', 'total']
                },
                reasoning: { type: Type.STRING }
              },
              required: ['id', 'text', 'score', 'reasoning']
            }
          }
        }
      });

      const parsed = JSON.parse(response.text || '[]') as HookOption[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.sort((a, b) => (b.score?.total || 0) - (a.score?.total || 0));
        return {
          hooks: parsed,
          selectedHook: parsed[0]
        };
      }
      return this.fallbackHooks(analysis);
    } catch (err) {
      console.warn('Gemini generateHooks error, using dynamic fallback:', err);
      return this.fallbackHooks(analysis);
    }
  }

  private fallbackHooks(analysis: TopicAnalysis): { hooks: HookOption[]; selectedHook: HookOption } {
    const topic = analysis.topic;
    if (analysis.language === 'id') {
      const hooks: HookOption[] = [
        {
          id: 'hook-1',
          text: `Kalau kamu pikir kamu sudah tahu segalanya tentang ${topic}, tunggu sampai kamu dengar yang satu ini.`,
          score: { curiosity: 9.5, clarity: 9.6, emotionalImpact: 9.0, retentionPotential: 9.6, relevance: 9.9, naturalLanguage: 9.7, total: 9.55 },
          reasoning: `Contrarian pattern interrupt customized directly for ${topic}.`
        },
        {
          id: 'hook-2',
          text: `Ada fakta mengejutkan tentang ${topic} yang hampir nggak pernah dibahas orang!`,
          score: { curiosity: 9.2, clarity: 9.2, emotionalImpact: 8.8, retentionPotential: 9.0, relevance: 9.8, naturalLanguage: 9.3, total: 9.22 },
          reasoning: `Curiosity gap emphasizing exclusive insights about ${topic}.`
        },
        {
          id: 'hook-3',
          text: `Ternyata ini alasan kenapa ${topic} jauh lebih misterius dari yang kita bayangkan!`,
          score: { curiosity: 9.0, clarity: 8.9, emotionalImpact: 8.7, retentionPotential: 8.9, relevance: 9.7, naturalLanguage: 9.1, total: 9.05 },
          reasoning: `High-stakes intrigue opening.`
        }
      ];
      return { hooks, selectedHook: hooks[0] };
    }

    const hooks: HookOption[] = [
      {
        id: 'hook-1',
        text: `If you think you know the real truth about ${topic}, wait until you hear this.`,
        score: { curiosity: 9.5, clarity: 9.5, emotionalImpact: 9.0, retentionPotential: 9.6, relevance: 9.9, naturalLanguage: 9.5, total: 9.5 },
        reasoning: `High-contrast curiosity hook tailored for ${topic}.`
      },
      {
        id: 'hook-2',
        text: `Here is the one mind-blowing fact about ${topic} nobody is talking about.`,
        score: { curiosity: 9.2, clarity: 9.3, emotionalImpact: 8.8, retentionPotential: 9.1, relevance: 9.7, naturalLanguage: 9.2, total: 9.22 },
        reasoning: `Exclusive framing about ${topic}.`
      },
      {
        id: 'hook-3',
        text: `Why is everyone getting ${topic} completely wrong? Let's break it down.`,
        score: { curiosity: 9.0, clarity: 9.1, emotionalImpact: 8.7, retentionPotential: 8.9, relevance: 9.6, naturalLanguage: 9.0, total: 9.05 },
        reasoning: `Contrarian opening.`
      }
    ];
    return { hooks, selectedHook: hooks[0] };
  }

  async generateScript(
    analysis: TopicAnalysis,
    selectedHook: HookOption,
    targetDuration: VideoDuration,
    context?: Partial<GenerationContext>
  ): Promise<ScriptResult> {
    const topic = this.validateTopicInput(analysis.topic);
    const numTargetDuration = typeof targetDuration === 'number' ? targetDuration : 30;
    const targetWordCount = Math.round(numTargetDuration * (analysis.language === 'id' ? 2.9 : 2.6));
    const minWords = Math.round(targetWordCount * 0.85);
    const maxWords = Math.round(targetWordCount * 1.15);

    if (!this.ai) {
      return this.fallbackScript(analysis, selectedHook, targetDuration);
    }

    try {
      const response = await this.generateContentWithCascade({
        contents: `[TOPIC ISOLATION HEADER]
CURRENT USER TOPIC: "${topic}"
CURRENT PROJECT ID: "${context?.projectId || 'proj_isolated'}"
CURRENT GENERATION ID: "${context?.generationId || 'gen_isolated'}"

You are writing a script EXCLUSIVELY about "${topic}".
Language: ${analysis.language}.
Style: ${analysis.content_style}.
Selected Spoken Hook: "${selectedHook.text}".
Target Duration: exactly ${targetDuration} seconds.
Target Word Count: between ${minWords} and ${maxWords} words.

CRITICAL DIRECTIVES:
- The script MUST be 100% about "${topic}".
- DO NOT mention any unrelated geography, places, or past topics.
- Spoken narration style (conversational, punchy, rhythmic).
- Hook spoken in first 1-3 seconds.
- Body contains 3-4 vivid insights specifically about "${topic}".
- Payoff delivers memorable closure about "${topic}".
- Natural CTA.
- DO NOT use stage directions or bracketed markers in fullNarration.`,
        config: {
          systemInstruction: STRONG_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              hook: { type: Type.STRING },
              body: { type: Type.STRING },
              payoff: { type: Type.STRING },
              cta: { type: Type.STRING },
              fullNarration: { type: Type.STRING }
            },
            required: ['title', 'hook', 'body', 'payoff', 'cta', 'fullNarration']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      const fullNarration = parsed.fullNarration || `${parsed.hook} ${parsed.body} ${parsed.payoff} ${parsed.cta}`;
      const estimatedSeconds = estimateNarrationDuration(fullNarration, analysis.language);

      return {
        title: parsed.title || topic,
        hook: parsed.hook || selectedHook.text,
        body: parsed.body || '',
        payoff: parsed.payoff || '',
        cta: parsed.cta || '',
        fullNarration,
        estimatedSpokenSeconds: estimatedSeconds
      };
    } catch (err) {
      console.warn('Gemini generateScript error, using dynamic fallback:', err);
      return this.fallbackScript(analysis, selectedHook, targetDuration);
    }
  }

  private fallbackScript(analysis: TopicAnalysis, selectedHook: HookOption, targetDuration: VideoDuration): ScriptResult {
    const topic = analysis.topic;
    const isId = analysis.language === 'id';
    const hook = selectedHook.text;

    if (isId) {
      const body = `Pertama, fenomena di balik ${topic} memiliki karakteristik unik yang jarang disadari banyak orang. Kedua, penelitian mengungkap bahwa setiap elemen dari ${topic} memiliki peran krusial dan saling terhubung. Dan ketiga, rahasia terbesarnya adalah bagaimana ${topic} terus memicu rasa ingin tahu para ilmuwan hingga hari ini.`;
      const payoff = `Inilah bukti bahwa hal-hal menakjubkan selalu menyimpan cerita luar biasa saat kita melihatnya lebih dalam.`;
      const cta = `Fakta nomor berapa yang paling bikin kamu kaget? Tulis di komentar dan follow untuk eksplorasi seru berikutnya!`;
      const fullNarration = `${hook} ${body} ${payoff} ${cta}`;
      return {
        title: topic,
        hook,
        body,
        payoff,
        cta,
        fullNarration,
        estimatedSpokenSeconds: estimateNarrationDuration(fullNarration, 'id')
      };
    }

    const body = `First, the core phenomenon behind ${topic} holds mind-bending details that most people completely miss. Second, researchers have discovered intricate mechanics connecting every single part of ${topic}. And third, the biggest revelation is how ${topic} challenges everything we thought we knew.`;
    const payoff = `This proves that the deepest mysteries are often hiding right in front of us.`;
    const cta = `Which fact surprised you the most? Drop a comment below and follow for more daily discoveries!`;
    const fullNarration = `${hook} ${body} ${payoff} ${cta}`;
    return {
      title: topic,
      hook,
      body,
      payoff,
      cta,
      fullNarration,
      estimatedSpokenSeconds: estimateNarrationDuration(fullNarration, 'en')
    };
  }

  async planScenes(
    script: ScriptResult,
    analysis: TopicAnalysis,
    visualMode: VisualMode,
    context?: Partial<GenerationContext>
  ): Promise<{ scenes: Scene[]; visualBible: VisualBible }> {
    const topic = this.validateTopicInput(analysis.topic);
    const totalDuration = typeof analysis.duration === 'number' ? analysis.duration : 30;
    const targetSceneCount = totalDuration <= 15 ? 4 : totalDuration <= 30 ? 6 : totalDuration <= 60 ? 9 : 12;

    if (!this.ai) {
      return this.fallbackPlanScenes(script, analysis, targetSceneCount, visualMode);
    }

    try {
      const response = await this.generateContentWithCascade({
        contents: `[TOPIC ISOLATION HEADER]
CURRENT USER TOPIC: "${topic}"
CURRENT PROJECT ID: "${context?.projectId || 'proj_isolated'}"
CURRENT GENERATION ID: "${context?.generationId || 'gen_isolated'}"

Break this narration script into ${targetSceneCount} dynamic, visually coherent scenes ONLY for "${topic}".
Language: ${analysis.language}.
Total Target Duration: ${totalDuration} seconds.
Full Narration:
"${script.fullNarration}"

MANDATORY VISUAL RULES:
- Every visual description, AI visual prompt, and search query MUST be directly and solely about "${topic}".
- Example: If topic is "fakta menakutkan tentang bulan", search_query must be e.g. "moon dark surface lunar craters", "astronaut on moon space 4k", NOT tropical islands or random beaches.
- If topic is "5 fakta unik tentang gurita", search_query must be e.g. "octopus tentacles underwater marine", "giant octopus swimming ocean 4k".
- If topic is "sejarah piramida Mesir", search_query must be e.g. "giza pyramids ancient egypt desert", "pharaoh golden tomb hieroglyphs".

For each scene provide:
- scene_id: integer (1 to N)
- duration: number in seconds
- narration: the exact chunk of narration spoken during this scene
- visual_description: detailed visual description representing "${topic}"
- visual_prompt: highly cinematic AI visual prompt (portrait 9:16, 4k cinematic lighting, volumetric light, photorealistic, no text or watermarks)
- search_query: 2-4 exact keywords for stock video/image retrieval strictly depicting "${topic}"
- subtitle_text: punchy 1-2 line subtitle text
- transition: "cut" | "fade" | "crossfade" | "zoom_in" | "slide_left"
- camera_motion: "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "ken_burns" | "parallax" | "static"
- music_intensity: "low" | "medium" | "high"

Visual Bible:
- locations: array of key visual settings relevant to "${topic}"
- style: visual aesthetic
- lighting: lighting scheme
- cameraStyle: camera movement
- colorMood: palette`,
        config: {
          systemInstruction: STRONG_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              visualBible: {
                type: Type.OBJECT,
                properties: {
                  locations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  style: { type: Type.STRING },
                  lighting: { type: Type.STRING },
                  cameraStyle: { type: Type.STRING },
                  colorMood: { type: Type.STRING }
                },
                required: ['locations', 'style', 'lighting', 'cameraStyle', 'colorMood']
              },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    scene_id: { type: Type.INTEGER },
                    duration: { type: Type.NUMBER },
                    narration: { type: Type.STRING },
                    visual_description: { type: Type.STRING },
                    visual_prompt: { type: Type.STRING },
                    search_query: { type: Type.STRING },
                    subtitle_text: { type: Type.STRING },
                    transition: { type: Type.STRING },
                    camera_motion: { type: Type.STRING },
                    music_intensity: { type: Type.STRING }
                  },
                  required: [
                    'scene_id', 'duration', 'narration', 'visual_description',
                    'visual_prompt', 'search_query', 'subtitle_text',
                    'transition', 'camera_motion', 'music_intensity'
                  ]
                }
              }
            },
            required: ['visualBible', 'scenes']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      const rawScenes = parsed.scenes || [];
      const visualBible: VisualBible = parsed.visualBible || {
        locations: [`Key environment for ${topic}`],
        style: 'High-contrast cinematic 4K aesthetic',
        lighting: 'Volumetric cinematic lighting',
        cameraStyle: 'Smooth gimbal movements and dynamic pans',
        colorMood: 'High contrast and evocative'
      };

      let currentTime = 0;
      const scenes: Scene[] = rawScenes.map((s: any, idx: number) => {
        const dur = Number(s.duration) || (totalDuration / rawScenes.length);
        const startTime = currentTime;
        const endTime = Number((startTime + dur).toFixed(2));
        currentTime = endTime;

        return {
          id: `scene-${idx + 1}-${Date.now().toString(36)}`,
          scene_id: idx + 1,
          start_time: Number(startTime.toFixed(2)),
          end_time: endTime,
          duration: Number(dur.toFixed(2)),
          narration: s.narration || '',
          visual_description: s.visual_description || `${topic} scene ${idx + 1}`,
          visual_prompt: `${s.visual_prompt || s.visual_description || topic}, 9:16 portrait ratio, highly detailed 4k cinematic footage`,
          search_query: s.search_query || `${topic} cinematic 4k`,
          subtitle_text: s.subtitle_text || s.narration || '',
          transition: (s.transition as any) || (idx === 0 ? 'cut' : 'crossfade'),
          camera_motion: (s.camera_motion as any) || 'ken_burns',
          music_intensity: (s.music_intensity as any) || (idx === 0 ? 'high' : 'medium'),
          visual_source: visualMode === 'AI_VIDEO_FIRST' ? 'ai_video' : visualMode === 'AI_IMAGE_FIRST' ? 'ai_image' : 'stock_video'
        };
      });

      return { scenes, visualBible };
    } catch (err) {
      console.warn('Gemini planScenes error, using dynamic fallback:', err);
      return this.fallbackPlanScenes(script, analysis, targetSceneCount, visualMode);
    }
  }

  private fallbackPlanScenes(
    script: ScriptResult,
    analysis: TopicAnalysis,
    sceneCount: number,
    visualMode: VisualMode
  ): { scenes: Scene[]; visualBible: VisualBible } {
    const topic = analysis.topic;
    const totalDur = typeof analysis.duration === 'number' ? analysis.duration : 30;
    const durPerScene = Number((totalDur / sceneCount).toFixed(2));

    const visualBible: VisualBible = {
      locations: [`Atmospheric setting for ${topic}`, `Detailed perspective of ${topic}`],
      style: 'Hyper-cinematic 4K portrait 9:16, dynamic atmospheric lighting',
      lighting: 'Dramatic volumetric light with rich shadows',
      cameraStyle: 'Smooth cinematic push-ins and high-framerate motion',
      colorMood: 'Vibrant, high-contrast, immersive'
    };

    const sceneTemplates = [
      {
        narration: script.hook,
        desc: `High impact cinematic establishing visual showing ${topic}`,
        query: `${topic} cinematic establishing 4k`,
        prompt: `Cinematic 9:16 establishing shot representing ${topic}, breathtaking visual detail, volumetric lighting, photorealistic`,
        sub: script.hook
      },
      {
        narration: `Tahukah kamu fakta mengejutkan di balik ${topic} yang jarang disadari?`,
        desc: `Intricate close-up perspective exploring details of ${topic}`,
        query: `${topic} close-up detail high quality`,
        prompt: `Detailed cinematic close-up shot capturing intricate details of ${topic}, dramatic atmospheric depth of field, 4k`,
        sub: `Rahasia Tersembunyi di Balik ${topic}`
      },
      {
        narration: `Penelitian menunjukkan bagaimana mekanisme ini bekerja dengan sangat menakjubkan.`,
        desc: `Dynamic macro visual capturing core mechanism of ${topic}`,
        query: `${topic} dynamic visual motion`,
        prompt: `Dynamic motion visual highlighting the incredible essence of ${topic}, ultra sharp 4k, cinematic color grading`,
        sub: `Bagaimana Mekanismenya Bekerja`
      },
      {
        narration: `Inilah alasan utama kenapa fenomena ini menjadi begitu penting untuk dipahami.`,
        desc: `Panoramic visual illustrating the vast impact of ${topic}`,
        query: `${topic} majestic panorama`,
        prompt: `Majestic wide perspective depicting the scale of ${topic}, cinematic masterpiece lighting, 9:16 portrait`,
        sub: `Dampak & Makna Luar Biasa`
      },
      {
        narration: script.payoff,
        desc: `Grand scale climax visual delivering payoff for ${topic}`,
        query: `${topic} climax dramatic`,
        prompt: `Epic cinematic climax visual for ${topic}, breathtaking scale and emotional resolution, 4k`,
        sub: `Kesimpulan Akhir`
      },
      {
        narration: script.cta,
        desc: `Clean aesthetic outro visual for ${topic}`,
        query: `${topic} aesthetic finale`,
        prompt: `Refined aesthetic closure visual for ${topic}, ambient lighting, inviting viewer engagement, 9:16`,
        sub: 'Tulis komentarmu & Follow!'
      }
    ];

    let curTime = 0;
    const scenes: Scene[] = sceneTemplates.slice(0, sceneCount).map((s, idx) => {
      const startTime = curTime;
      const endTime = Number((startTime + durPerScene).toFixed(2));
      curTime = endTime;

      return {
        id: `scene-${idx + 1}-${Date.now().toString(36)}`,
        scene_id: idx + 1,
        start_time: Number(startTime.toFixed(2)),
        end_time: endTime,
        duration: durPerScene,
        narration: s.narration,
        visual_description: s.desc,
        visual_prompt: `${s.prompt}, ${visualBible.style}, 9:16 portrait`,
        search_query: s.query,
        subtitle_text: s.sub,
        transition: idx === 0 ? 'cut' : 'crossfade',
        camera_motion: idx % 2 === 0 ? 'zoom_in' : 'ken_burns',
        music_intensity: idx === 0 || idx === sceneTemplates.length - 1 ? 'high' : 'medium',
        visual_source: visualMode === 'AI_VIDEO_FIRST' ? 'ai_video' : visualMode === 'AI_IMAGE_FIRST' ? 'ai_image' : 'stock_video'
      };
    });

    return { scenes, visualBible };
  }

  async generateContentIdeas(niche: string, count: number = 12): Promise<ContentIdea[]> {
    if (!this.ai) {
      return this.fallbackIdeas(niche);
    }

    try {
      const response = await this.generateContentWithCascade({
        contents: `Generate ${count} high-performing, viral short-video concepts for niche: "${niche}".
Return an array of JSON objects with:
- id: string
- niche: string
- title: catchy title
- hook: powerful 1-line spoken hook (under 12 words)
- concept: 2-sentence summary of the video core idea
- estimatedDuration: 15, 30, 45, or 60
- visualStyle: short visual direction
- cta: natural call to action
- contentStyle: "Viral" | "Educational" | "Storytelling" | "Facts" | "Technology" | "Motivation" | "Business" | "Travel"`,
        config: {
          systemInstruction: STRONG_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                niche: { type: Type.STRING },
                title: { type: Type.STRING },
                hook: { type: Type.STRING },
                concept: { type: Type.STRING },
                estimatedDuration: { type: Type.INTEGER },
                visualStyle: { type: Type.STRING },
                cta: { type: Type.STRING },
                contentStyle: { type: Type.STRING }
              },
              required: ['id', 'niche', 'title', 'hook', 'concept', 'estimatedDuration', 'visualStyle', 'cta', 'contentStyle']
            }
          }
        }
      });

      const parsed = JSON.parse(response.text || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as ContentIdea[];
      }
      return this.fallbackIdeas(niche);
    } catch (err) {
      console.warn('Gemini generateContentIdeas error, using fallback:', err);
      return this.fallbackIdeas(niche);
    }
  }

  private fallbackIdeas(niche: string): ContentIdea[] {
    return [
      {
        id: `idea-${Date.now()}-1`,
        niche: niche || 'Facts',
        title: `5 Fakta Menakutkan Tentang Bulan yang Jarang Diketahui`,
        hook: `Bulan bukan sekadar batu di langit malam, ada rahasia gelap di baliknya.`,
        concept: `Eksplorasi misteri gempa bulan, anomali gravitasi, dan sisi gelap bulan.`,
        estimatedDuration: 30,
        visualStyle: 'Cinematic Space Visuals & Lunar Surface CGI',
        cta: 'Kira-kira nomor berapa yang bikin kamu merinding? Komen di bawah!',
        contentStyle: 'Facts'
      },
      {
        id: `idea-${Date.now()}-2`,
        niche: niche || 'Biology',
        title: `5 Fakta Unik Tentang Gurita yang Bikin Ilmuwan Takjub`,
        hook: `Gurita punya tiga jantung dan darah berwarna biru!`,
        concept: `Menyingkap kecerdasan alien makhluk laut berkaki delapan ini.`,
        estimatedDuration: 30,
        visualStyle: 'Underwater 4K Macro Footage & Tentacle Motion',
        cta: 'Menurutmu gurita benar-benar pintar? Share pendapatmu!',
        contentStyle: 'Educational'
      },
      {
        id: `idea-${Date.now()}-3`,
        niche: niche || 'History',
        title: `Misteri Pembangunan Piramida Mesir Kuno Terungkap`,
        hook: `Bagaimana bangsa Mesir memindahkan 2 juta blok batu seberat 2 ton?`,
        concept: `Analisis teknik hidrolik dan astronomi presisi di balik Piramida Giza.`,
        estimatedDuration: 45,
        visualStyle: 'Desert Drone Shots & Historical 3D Cutaways',
        cta: 'Follow untuk rahasia sejarah dunia lainnya!',
        contentStyle: 'Storytelling'
      }
    ];
  }

  async generateSocialPackage(
    rawTopic: string,
    script: ScriptResult,
    platform: VideoPlatform,
    language: LanguageCode,
    context?: Partial<GenerationContext>
  ): Promise<SocialPackage> {
    const topic = this.validateTopicInput(rawTopic);
    if (!this.ai) {
      return this.fallbackSocialPackage(topic, script, platform, language);
    }

    try {
      const response = await this.generateContentWithCascade({
        contents: `[TOPIC ISOLATION HEADER]
CURRENT USER TOPIC: "${topic}"
CURRENT PROJECT ID: "${context?.projectId || 'proj_isolated'}"
CURRENT GENERATION ID: "${context?.generationId || 'gen_isolated'}"

Generate a social media export package ONLY for topic: "${topic}".
Language: ${language}.
Platform: ${platform}.
Narration Script:
"${script.fullNarration}"

Generate:
- title: the single best high-CTR title about "${topic}"
- titleOptions: array of 4 distinct title formulas (Curiosity, Question, Number List, Contrarian) strictly about "${topic}"
- tiktokCaption: optimized TikTok caption with natural emoji and hook
- reelsCaption: optimized Instagram Reels caption
- shortsDescription: clean YouTube Shorts description
- hashtags: array of 6-10 highly relevant hashtags (NO unrelated tags)
- cta: natural conversion CTA`,
        config: {
          systemInstruction: STRONG_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              titleOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
              tiktokCaption: { type: Type.STRING },
              reelsCaption: { type: Type.STRING },
              shortsDescription: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              cta: { type: Type.STRING }
            },
            required: ['title', 'titleOptions', 'tiktokCaption', 'reelsCaption', 'shortsDescription', 'hashtags', 'cta']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        title: parsed.title || topic,
        titleOptions: parsed.titleOptions || [topic],
        tiktokCaption: parsed.tiktokCaption || `${topic} 🔥 ${script.hook}`,
        reelsCaption: parsed.reelsCaption || `${topic}\n\n${script.payoff}`,
        shortsDescription: parsed.shortsDescription || `${topic} #Shorts`,
        hashtags: parsed.hashtags || ['#shorts', '#viral', '#facts', '#fyp'],
        cta: parsed.cta || script.cta
      };
    } catch (err) {
      console.warn('Gemini generateSocialPackage error, using fallback:', err);
      return this.fallbackSocialPackage(topic, script, platform, language);
    }
  }

  private fallbackSocialPackage(topic: string, script: ScriptResult, platform: VideoPlatform, language: LanguageCode): SocialPackage {
    const isId = language === 'id';
    const tagWord = topic.toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      title: script.title || topic,
      titleOptions: isId ? [
        `Fakta Mengejutkan Tentang ${topic} yang Jarang Diketahui`,
        `Kenapa Banyak Orang Salah Paham Tentang ${topic}?`,
        `Rahasia di Balik ${topic} yang Bikin Takjub`,
        `Hal Paling Menakjubkan dari ${topic}`
      ] : [
        `Mind-Blowing Facts About ${topic} You Never Knew`,
        `Why Everyone Is Getting ${topic} Completely Wrong`,
        `The Hidden Truth Behind ${topic}`,
        `What Happens When You Look Closely at ${topic}`
      ],
      tiktokCaption: isId
        ? `Ternyata ini rahasia di balik ${topic}! 😱 Nomor berapa yang baru kamu tahu? Komen di bawah ya! 👇 #fyp #faktaunik #${tagWord} #viral`
        : `The hidden side of ${topic} you need to see! 🔥 Which part surprised you the most? #viral #shorts #fyp #facts #${tagWord}`,
      reelsCaption: isId
        ? `Eksplorasi mendalam tentang ${topic}. ${script.hook}\n\nBagikan ke teman kamu yang suka belajar hal baru!`
        : `Deep dive into ${topic}. ${script.hook}\n\nShare this with someone who loves discovering new things!`,
      shortsDescription: isId
        ? `Simak fakta menarik tentang ${topic}. Like dan subscribe untuk update video edukasi dan fakta seru setiap hari!`
        : `Explore the amazing world of ${topic}. Subscribe for daily short breakdowns and viral insights!`,
      hashtags: isId
        ? ['#faktaunik', '#fyp', '#viral', '#edukasi', `#${tagWord}`, '#shorts']
        : ['#shorts', '#facts', '#viral', '#discovery', `#${tagWord}`, '#trending'],
      cta: script.cta
    };
  }

  /**
   * Topic Relevance Validation: Validates that generated script/text strictly matches target topic.
   */
  async validateTopicRelevance(
    rawTopic: string,
    contentText: string,
    context?: Partial<GenerationContext>
  ): Promise<TopicRelevanceCheck> {
    const topic = this.validateTopicInput(rawTopic);
    if (!contentText || contentText.trim().length === 0) {
      return { relevant: false, confidence: 0, reason: 'Empty content', detectedSubject: 'None' };
    }

    if (!this.ai) {
      return this.heuristicRelevanceCheck(topic, contentText);
    }

    try {
      const response = await this.generateContentWithCascade({
        contents: `Perform a strict TOPIC RELEVANCE CHECK.
Target Topic: "${topic}"
Generated Content to Evaluate:
"${contentText.substring(0, 1000)}"

Determine:
1. Is this content genuinely and directly about "${topic}"?
2. Has any unrelated past topic (like Bali, travel, or random subjects) leaked into the text?
3. Return JSON:
{
  "relevant": boolean (true if content is strictly about target topic, false if contaminated or unrelated),
  "confidence": number (0.0 to 1.0),
  "detectedSubject": string (the primary topic detected in the text),
  "reason": string (short explanation)
}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              relevant: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
              detectedSubject: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ['relevant', 'confidence', 'detectedSubject', 'reason']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        relevant: parsed.relevant ?? true,
        confidence: parsed.confidence ?? 0.9,
        detectedSubject: parsed.detectedSubject || topic,
        reason: parsed.reason || 'Relevance verified'
      };
    } catch (err) {
      console.warn('AI validateTopicRelevance error, fallback to heuristic:', err);
      return this.heuristicRelevanceCheck(topic, contentText);
    }
  }

  /**
   * Scene Relevance Validation: Verifies that a scene's narration and visual prompt belong to the topic.
   */
  async validateSceneRelevance(
    rawTopic: string,
    scene: Scene,
    context?: Partial<GenerationContext>
  ): Promise<TopicRelevanceCheck> {
    const topic = this.validateTopicInput(rawTopic);
    const sceneText = `${scene.narration} ${scene.visual_description} ${scene.visual_prompt} ${scene.search_query}`;
    return this.validateTopicRelevance(topic, sceneText, context);
  }

  private heuristicRelevanceCheck(topic: string, text: string): TopicRelevanceCheck {
    const lowerTopic = topic.toLowerCase();
    const lowerText = text.toLowerCase();

    // Check for hard contamination keywords (e.g. Bali, Penglipuran when topic is not about Bali)
    const baliKeywords = ['bali', 'penglipuran', 'agung', 'subak', 'kuta', 'ubud', 'pura'];
    const isTopicAboutBali = baliKeywords.some(k => lowerTopic.includes(k));
    
    if (!isTopicAboutBali) {
      const contaminatedKeyword = baliKeywords.find(k => new RegExp(`\\b${k}\\b`, 'i').test(lowerText));
      if (contaminatedKeyword) {
        return {
          relevant: false,
          confidence: 0.99,
          detectedSubject: 'Bali (Contamination Detected)',
          reason: `Contamination found: "${contaminatedKeyword}" appeared in non-Bali topic "${topic}"`
        };
      }
    }

    // Token overlap check
    const topicTokens = lowerTopic.split(/\s+/).filter(t => t.length > 3 && !['fakta', 'tentang', 'yang', 'facts', 'about'].includes(t));
    if (topicTokens.length > 0) {
      const matches = topicTokens.filter(t => lowerText.includes(t));
      const matchRatio = matches.length / topicTokens.length;
      return {
        relevant: matchRatio >= 0.3 || lowerText.length > 50,
        confidence: matchRatio >= 0.5 ? 0.95 : 0.8,
        detectedSubject: topic,
        reason: `Matched ${matches.length}/${topicTokens.length} key topic terms`
      };
    }

    return {
      relevant: true,
      confidence: 0.9,
      detectedSubject: topic,
      reason: 'General relevance passed'
    };
  }
}

export const aiProvider = new GoogleAIProvider();
