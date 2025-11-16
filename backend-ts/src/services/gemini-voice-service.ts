import { GoogleGenerativeAI } from '@google/generative-ai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

/**
 * Gemini 2.5 Flash Native Audio Service
 * Real-time voice interaction for pronunciation practice and conversational learning
 *
 * Features:
 * - Native audio processing (no separate speech-to-text needed)
 * - 30+ HD voices in 24+ languages
 * - Low-latency real-time conversation
 * - Affective dialog (emotion understanding)
 * - Pronunciation control and feedback
 * - Proactive audio response
 */
export class GeminiVoiceService {
  private genAI: GoogleGenerativeAI;
  private s3Client: S3Client;

  // Gemini 2.5 Flash Native Audio model
  private readonly MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

  // Supported languages for Gemini
  private readonly SUPPORTED_LANGUAGES = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian',
    'Dutch', 'Swedish', 'Polish', 'Turkish', 'Indonesian', 'Thai',
    'Vietnamese', 'Czech', 'Greek', 'Hebrew', 'Romanian', 'Hungarian',
  ];

  // Voice presets for different languages (Gemini has 30+ voices)
  private readonly VOICE_PRESETS: Record<string, string> = {
    English: 'Puck', // Energetic male voice
    Spanish: 'Aoede', // Warm female voice
    French: 'Charon', // Sophisticated voice
    German: 'Kore', // Clear professional voice
    Italian: 'Fenrir', // Expressive voice
    Portuguese: 'Puck',
    Chinese: 'Aoede',
    Japanese: 'Charon',
    Korean: 'Kore',
    Arabic: 'Fenrir',
  };

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  /**
   * Start a live audio conversation session with Gemini
   * Returns a session object for streaming audio interaction
   */
  async startLiveAudioSession(config: {
    language: string;
    learningContext: string;
    userLevel: string;
    expectedResponse?: string;
    voicePreset?: string;
  }) {
    const model = this.genAI.getGenerativeModel({
      model: this.MODEL_NAME,
    });

    const systemInstruction = this.buildLanguageTeacherPrompt(
      config.language,
      config.learningContext,
      config.userLevel,
      config.expectedResponse
    );

    // Configure for native audio dialog
    const generationConfig = {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1024,
      responseModalities: ['AUDIO'], // Native audio output
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: config.voicePreset || this.VOICE_PRESETS[config.language] || 'Puck',
          },
        },
        speaking_rate: 0.9, // Slightly slower for language learning
      },
    };

    const chatSession = model.startChat({
      generationConfig,
      systemInstruction,
      history: [],
    });

    return chatSession;
  }

  /**
   * Send audio to Gemini and get real-time response with pronunciation feedback
   */
  async processAudioWithFeedback(
    audioBuffer: Buffer,
    language: string,
    expectedText?: string,
    userLevel: string = 'intermediate'
  ): Promise<{
    transcript: string;
    audioResponse: Buffer;
    pronunciationScore: number;
    pronunciationFeedback: {
      wordAccuracy: number;
      missedWords: string[];
      incorrectWords: Array<{ expected: string; actual: string; suggestion: string }>;
      overallFeedback: string;
      strengths: string[];
      improvements: string[];
    };
    emotionalTone: string;
    conversationQuality: number;
  }> {
    const model = this.genAI.getGenerativeModel({
      model: this.MODEL_NAME,
    });

    // Build prompt for pronunciation analysis
    const prompt = this.buildPronunciationAnalysisPrompt(language, expectedText, userLevel);

    // Convert audio buffer to base64 for Gemini
    const audioBase64 = audioBuffer.toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'audio/wav', // or 'audio/mp3'
          data: audioBase64,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const analysisText = response.text();

    // Parse Gemini's analysis (JSON format requested in prompt)
    let analysis: any;
    try {
      // Extract JSON from response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (error) {
      console.error('Failed to parse Gemini analysis:', error);
      analysis = {
        transcript: analysisText.substring(0, 200),
        pronunciationScore: 70,
        wordAccuracy: 0.7,
        missedWords: [],
        incorrectWords: [],
        overallFeedback: 'Unable to parse detailed feedback',
        strengths: [],
        improvements: [],
        emotionalTone: 'neutral',
        conversationQuality: 70,
      };
    }

    // Generate audio response with corrections
    const audioResponse = await this.generateCorrectionAudio(
      analysis.overallFeedback,
      language,
      analysis.incorrectWords
    );

    return {
      transcript: analysis.transcript || '',
      audioResponse,
      pronunciationScore: analysis.pronunciationScore || 0,
      pronunciationFeedback: {
        wordAccuracy: analysis.wordAccuracy || 0,
        missedWords: analysis.missedWords || [],
        incorrectWords: analysis.incorrectWords || [],
        overallFeedback: analysis.overallFeedback || '',
        strengths: analysis.strengths || [],
        improvements: analysis.improvements || [],
      },
      emotionalTone: analysis.emotionalTone || 'neutral',
      conversationQuality: analysis.conversationQuality || 0,
    };
  }

  /**
   * Generate natural speech audio using Gemini's native audio
   */
  async generateSpeech(
    text: string,
    language: string,
    options: {
      voicePreset?: string;
      speakingRate?: number; // 0.25 to 4.0
      emotionalTone?: string; // 'enthusiastic', 'calm', 'serious', 'friendly'
      saveToS3?: boolean;
      userId?: string;
    } = {}
  ): Promise<{
    audioBuffer: Buffer;
    s3Key?: string;
    duration?: number;
  }> {
    const model = this.genAI.getGenerativeModel({
      model: this.MODEL_NAME,
    });

    const voiceName = options.voicePreset || this.VOICE_PRESETS[language] || 'Puck';
    const speakingRate = options.speakingRate || 1.0;

    // Build prompt with emotional context
    let prompt = text;
    if (options.emotionalTone) {
      prompt = `Say the following in a ${options.emotionalTone} tone: "${text}"`;
    }

    const generationConfig = {
      temperature: 0.7,
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
        speaking_rate: speakingRate,
      },
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = await result.response;

    // Extract audio from response
    const audioParts = response.candidates?.[0]?.content?.parts?.filter(
      (part: any) => part.inlineData?.mimeType?.startsWith('audio/')
    );

    if (!audioParts || audioParts.length === 0) {
      throw new Error('No audio generated by Gemini');
    }

    const audioBase64 = audioParts[0].inlineData.data;
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Optionally save to S3
    let s3Key: string | undefined;
    if (options.saveToS3 && options.userId) {
      s3Key = `voice-synthesis-gemini/${options.userId}/${language}/${uuidv4()}.mp3`;
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.DOCUMENTS_BUCKET,
          Key: s3Key,
          Body: audioBuffer,
          ContentType: 'audio/mpeg',
          Metadata: {
            language,
            voiceName,
            speakingRate: speakingRate.toString(),
            text: text.substring(0, 200),
            model: this.MODEL_NAME,
          },
        })
      );
    }

    return {
      audioBuffer,
      s3Key,
    };
  }

  /**
   * Real-time conversational practice with affective dialog
   * Gemini understands emotional context and responds appropriately
   */
  async conversationPractice(
    audioBuffer: Buffer,
    conversationContext: {
      topic: string;
      language: string;
      userLevel: string;
      previousMessages: Array<{ role: string; content: string }>;
    }
  ): Promise<{
    transcript: string;
    audioResponse: Buffer;
    emotionalAnalysis: {
      detectedEmotion: string;
      confidence: number;
      appropriateResponse: string;
    };
    feedback: string;
    suggestedFollowUp: string;
  }> {
    const model = this.genAI.getGenerativeModel({
      model: this.MODEL_NAME,
    });

    const prompt = this.buildConversationPrompt(conversationContext);

    const audioBase64 = audioBuffer.toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'audio/wav',
          data: audioBase64,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const analysisText = response.text();

    // Parse response
    let analysis: any;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      analysis = {
        transcript: analysisText,
        emotionalAnalysis: {
          detectedEmotion: 'neutral',
          confidence: 0.5,
          appropriateResponse: analysisText,
        },
        feedback: 'Good effort!',
        suggestedFollowUp: 'Continue the conversation.',
      };
    }

    // Generate audio response
    const audioResponse = await this.generateSpeech(
      analysis.emotionalAnalysis.appropriateResponse,
      conversationContext.language,
      {
        emotionalTone: this.mapEmotionToTone(analysis.emotionalAnalysis.detectedEmotion),
      }
    );

    return {
      transcript: analysis.transcript || '',
      audioResponse: audioResponse.audioBuffer,
      emotionalAnalysis: analysis.emotionalAnalysis,
      feedback: analysis.feedback || '',
      suggestedFollowUp: analysis.suggestedFollowUp || '',
    };
  }

  /**
   * Build language teacher system prompt
   */
  private buildLanguageTeacherPrompt(
    language: string,
    context: string,
    userLevel: string,
    expectedResponse?: string
  ): string {
    return `You are an expert ${language} language teacher with a focus on pronunciation and conversational fluency.

Language: ${language}
Student Level: ${userLevel}
Context: ${context}
${expectedResponse ? `Expected Response: "${expectedResponse}"` : ''}

Your role:
1. Listen carefully to the student's pronunciation
2. Provide encouraging, constructive feedback
3. Speak clearly and naturally in ${language}
4. Adjust your speaking pace based on student level (slower for beginners)
5. Use affective dialog - respond appropriately to the student's emotional tone
6. Be patient and supportive

When providing feedback:
- Highlight what they did well
- Gently correct mispronunciations
- Suggest improvements
- Encourage continued practice

Speak with warmth and enthusiasm to keep the student motivated.`;
  }

  /**
   * Build pronunciation analysis prompt
   */
  private buildPronunciationAnalysisPrompt(
    language: string,
    expectedText?: string,
    userLevel: string = 'intermediate'
  ): string {
    return `Analyze this ${language} audio for pronunciation quality.

${expectedText ? `Expected text: "${expectedText}"` : 'Transcribe and analyze the speech.'}

Student level: ${userLevel}

Provide analysis in this JSON format:
{
  "transcript": "what the user actually said",
  "pronunciationScore": 85,
  "wordAccuracy": 0.85,
  "missedWords": ["word1", "word2"],
  "incorrectWords": [
    {
      "expected": "palabra",
      "actual": "palbra",
      "suggestion": "Pay attention to the second 'a' sound in pa-la-bra"
    }
  ],
  "overallFeedback": "Great job! Your pronunciation is clear. Focus on the 'r' sound.",
  "strengths": ["Clear vowels", "Good rhythm"],
  "improvements": ["Practice rolling R's", "Emphasize stress on second syllable"],
  "emotionalTone": "confident/nervous/excited/calm",
  "conversationQuality": 85
}`;
  }

  /**
   * Build conversation practice prompt
   */
  private buildConversationPrompt(context: {
    topic: string;
    language: string;
    userLevel: string;
    previousMessages: Array<{ role: string; content: string }>;
  }): string {
    const history = context.previousMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `You are having a natural conversation in ${context.language} about ${context.topic}.

Student level: ${context.userLevel}

Previous conversation:
${history}

Analyze the user's audio message and respond naturally. Provide your response in JSON format:
{
  "transcript": "what the user said",
  "emotionalAnalysis": {
    "detectedEmotion": "excited/nervous/confident/confused",
    "confidence": 0.85,
    "appropriateResponse": "Your natural spoken response in ${context.language}"
  },
  "feedback": "Brief encouragement or gentle correction",
  "suggestedFollowUp": "A question or topic to continue the conversation"
}

Remember:
- Speak naturally and conversationally
- Match the user's emotional tone appropriately
- Keep it engaging and educational
- Use vocabulary appropriate for ${context.userLevel} level`;
  }

  /**
   * Generate audio with pronunciation corrections
   */
  private async generateCorrectionAudio(
    feedback: string,
    language: string,
    incorrectWords: Array<{ expected: string; actual: string; suggestion: string }>
  ): Promise<Buffer> {
    let correctionText = feedback;

    if (incorrectWords.length > 0) {
      correctionText += ' Let me help with these words: ';
      incorrectWords.forEach((word) => {
        correctionText += `"${word.expected}". ${word.suggestion}. `;
      });
    }

    const result = await this.generateSpeech(correctionText, language, {
      speakingRate: 0.85, // Slightly slower for corrections
      emotionalTone: 'friendly',
    });

    return result.audioBuffer;
  }

  /**
   * Map detected emotion to appropriate speaking tone
   */
  private mapEmotionToTone(emotion: string): string {
    const emotionMap: Record<string, string> = {
      excited: 'enthusiastic',
      nervous: 'calm',
      confident: 'friendly',
      confused: 'patient',
      frustrated: 'supportive',
      happy: 'enthusiastic',
      sad: 'gentle',
    };

    return emotionMap[emotion.toLowerCase()] || 'friendly';
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): string[] {
    return this.SUPPORTED_LANGUAGES;
  }

  /**
   * Get available voice presets
   */
  getAvailableVoices(): string[] {
    // Gemini 2.5 has 30+ voices
    return [
      'Puck', // Energetic male
      'Charon', // Sophisticated
      'Kore', // Professional female
      'Fenrir', // Expressive male
      'Aoede', // Warm female
      // ... Gemini has 30+ total voices
    ];
  }

  /**
   * Test voice synthesis (for demos)
   */
  async testVoice(language: string, voicePreset?: string): Promise<Buffer> {
    const testPhrases: Record<string, string> = {
      English: 'Hello! Welcome to your language learning journey.',
      Spanish: '¡Hola! Bienvenido a tu viaje de aprendizaje de idiomas.',
      French: 'Bonjour! Bienvenue dans votre parcours d\'apprentissage des langues.',
      German: 'Hallo! Willkommen auf Ihrer Sprachlernreise.',
      Italian: 'Ciao! Benvenuto nel tuo percorso di apprendimento delle lingue.',
      Portuguese: 'Olá! Bem-vindo à sua jornada de aprendizado de idiomas.',
      Chinese: '你好！欢迎来到您的语言学习之旅。',
      Japanese: 'こんにちは！言語学習の旅へようこそ。',
      Korean: '안녕하세요! 언어 학습 여정에 오신 것을 환영합니다.',
      Arabic: 'مرحبا! مرحبا بكم في رحلة تعلم اللغة الخاصة بك.',
    };

    const text = testPhrases[language] || testPhrases.English;
    const result = await this.generateSpeech(text, language, { voicePreset });
    return result.audioBuffer;
  }
}
