import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  LanguageCode,
} from '@aws-sdk/client-transcribe-streaming';
import { PollyClient, SynthesizeSpeechCommand, VoiceId, Engine } from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

/**
 * Real-Time Voice Service for Language Learning
 * Integrates AWS Transcribe (speech-to-text) and Polly (text-to-speech)
 * for pronunciation practice and conversational learning
 */
export class VoiceService {
  private transcribeClient: TranscribeStreamingClient;
  private pollyClient: PollyClient;
  private s3Client: S3Client;

  // Language code mapping for AWS services
  private readonly LANGUAGE_CODES: Record<string, LanguageCode> = {
    English: 'en-US',
    Spanish: 'es-ES',
    French: 'fr-FR',
    German: 'de-DE',
    Italian: 'it-IT',
    Portuguese: 'pt-BR',
    Chinese: 'zh-CN',
    Japanese: 'ja-JP',
    Korean: 'ko-KR',
    Arabic: 'ar-SA',
  };

  // Voice mapping for Polly (Neural voices for natural-sounding speech)
  private readonly VOICE_IDS: Record<string, VoiceId> = {
    English: 'Joanna', // Neural voice
    Spanish: 'Lucia', // Neural voice
    French: 'Lea', // Neural voice
    German: 'Vicki', // Neural voice
    Italian: 'Bianca', // Neural voice
    Portuguese: 'Camila', // Neural voice
    Chinese: 'Zhiyu', // Neural voice
    Japanese: 'Takumi', // Neural voice
    Korean: 'Seoyeon', // Standard voice
    Arabic: 'Zeina', // Neural voice
  };

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.transcribeClient = new TranscribeStreamingClient({ region });
    this.pollyClient = new PollyClient({ region });
    this.s3Client = new S3Client({ region });
  }

  /**
   * Transcribe audio stream in real-time using WebSocket
   * Returns transcript and pronunciation analysis
   */
  async transcribeAudioStream(
    audioStream: AsyncIterable<Uint8Array>,
    language: string,
    expectedText?: string
  ): Promise<{
    transcript: string;
    confidence: number;
    pronunciationScore: number;
    pronunciationFeedback: any;
    isCorrect: boolean;
  }> {
    const languageCode = this.LANGUAGE_CODES[language] || 'en-US';

    try {
      // Create audio stream for Transcribe
      const audioStreamGenerator = async function* () {
        for await (const chunk of audioStream) {
          yield { AudioEvent: { AudioChunk: chunk } };
        }
      };

      const command = new StartStreamTranscriptionCommand({
        LanguageCode: languageCode,
        MediaEncoding: 'pcm',
        MediaSampleRateHertz: 16000,
        AudioStream: audioStreamGenerator(),
        EnableChannelIdentification: false,
        ShowSpeakerLabel: false,
      });

      const response = await this.transcribeClient.send(command);

      // Process transcription results
      let fullTranscript = '';
      let totalConfidence = 0;
      let itemCount = 0;

      if (response.TranscriptResultStream) {
        for await (const event of response.TranscriptResultStream) {
          if (event.TranscriptEvent?.Transcript?.Results) {
            for (const result of event.TranscriptEvent.Transcript.Results) {
              if (result.Alternatives && result.Alternatives.length > 0) {
                const alternative = result.Alternatives[0];
                if (alternative.Transcript) {
                  fullTranscript += alternative.Transcript + ' ';
                }

                // Calculate average confidence
                if (alternative.Items) {
                  for (const item of alternative.Items) {
                    if (item.Confidence !== undefined) {
                      totalConfidence += item.Confidence;
                      itemCount++;
                    }
                  }
                }
              }
            }
          }
        }
      }

      const avgConfidence = itemCount > 0 ? totalConfidence / itemCount : 0;
      fullTranscript = fullTranscript.trim();

      // Analyze pronunciation if expected text provided
      const pronunciationAnalysis = expectedText
        ? this.analyzePronunciation(fullTranscript, expectedText, avgConfidence)
        : { score: avgConfidence, isCorrect: true, feedback: {} };

      return {
        transcript: fullTranscript,
        confidence: avgConfidence,
        pronunciationScore: pronunciationAnalysis.score,
        pronunciationFeedback: pronunciationAnalysis.feedback,
        isCorrect: pronunciationAnalysis.isCorrect,
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate speech from text using AWS Polly
   * Returns audio stream that can be sent to client
   */
  async synthesizeSpeech(
    text: string,
    language: string,
    options: {
      engine?: 'standard' | 'neural';
      speed?: number; // 0.5 to 2.0
      saveToS3?: boolean;
      userId?: string;
    } = {}
  ): Promise<{
    audioStream: Buffer;
    s3Key?: string;
    duration?: number;
  }> {
    const voiceId = this.VOICE_IDS[language] || 'Joanna';
    const engine: Engine = options.engine === 'standard' ? 'standard' : 'neural';

    try {
      // Add SSML for speed control if needed
      let ssmlText = text;
      if (options.speed && options.speed !== 1.0) {
        const speedPercentage = Math.round(options.speed * 100);
        ssmlText = `<speak><prosody rate="${speedPercentage}%">${text}</prosody></speak>`;
      }

      const command = new SynthesizeSpeechCommand({
        Text: ssmlText,
        TextType: options.speed ? 'ssml' : 'text',
        VoiceId: voiceId,
        Engine: engine,
        OutputFormat: 'mp3',
        LanguageCode: this.LANGUAGE_CODES[language],
      });

      const response = await this.pollyClient.send(command);

      if (!response.AudioStream) {
        throw new Error('No audio stream returned from Polly');
      }

      // Convert stream to buffer
      const audioBuffer = await this.streamToBuffer(response.AudioStream as Readable);

      // Optionally save to S3
      let s3Key: string | undefined;
      if (options.saveToS3 && options.userId) {
        s3Key = `voice-synthesis/${options.userId}/${language}/${uuidv4()}.mp3`;
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.DOCUMENTS_BUCKET,
            Key: s3Key,
            Body: audioBuffer,
            ContentType: 'audio/mpeg',
            Metadata: {
              language,
              voiceId,
              engine,
              text: text.substring(0, 200), // Store first 200 chars
            },
          })
        );
      }

      return {
        audioStream: audioBuffer,
        s3Key,
      };
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw new Error(`Failed to synthesize speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze pronunciation by comparing transcript with expected text
   * Uses Levenshtein distance and word-level comparison
   */
  private analyzePronunciation(
    transcript: string,
    expectedText: string,
    confidence: number
  ): {
    score: number;
    isCorrect: boolean;
    feedback: {
      wordAccuracy: number;
      missedWords: string[];
      extraWords: string[];
      incorrectWords: Array<{ expected: string; actual: string }>;
    };
  } {
    const transcriptWords = transcript.toLowerCase().split(/\s+/);
    const expectedWords = expectedText.toLowerCase().split(/\s+/);

    const missedWords: string[] = [];
    const extraWords: string[] = [];
    const incorrectWords: Array<{ expected: string; actual: string }> = [];

    // Word-level comparison
    let matchedWords = 0;
    const maxLength = Math.max(transcriptWords.length, expectedWords.length);

    for (let i = 0; i < maxLength; i++) {
      const expected = expectedWords[i];
      const actual = transcriptWords[i];

      if (!expected && actual) {
        extraWords.push(actual);
      } else if (expected && !actual) {
        missedWords.push(expected);
      } else if (expected && actual) {
        if (expected === actual) {
          matchedWords++;
        } else if (this.levenshteinDistance(expected, actual) <= 2) {
          // Close enough (1-2 character difference)
          matchedWords += 0.5;
          incorrectWords.push({ expected, actual });
        } else {
          incorrectWords.push({ expected, actual });
        }
      }
    }

    const wordAccuracy = expectedWords.length > 0 ? matchedWords / expectedWords.length : 0;

    // Overall score combines word accuracy and confidence
    const pronunciationScore = (wordAccuracy * 0.7 + confidence * 0.3) * 100;

    // Consider correct if score >= 70%
    const isCorrect = pronunciationScore >= 70;

    return {
      score: Math.round(pronunciationScore),
      isCorrect,
      feedback: {
        wordAccuracy,
        missedWords,
        extraWords,
        incorrectWords,
      },
    };
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Convert readable stream to buffer
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return Object.keys(this.LANGUAGE_CODES);
  }

  /**
   * Test voice synthesis (useful for demos)
   */
  async testVoice(language: string, sampleText?: string): Promise<Buffer> {
    const defaultTexts: Record<string, string> = {
      English: 'Hello! This is a test of the voice synthesis system.',
      Spanish: '¡Hola! Esta es una prueba del sistema de síntesis de voz.',
      French: 'Bonjour! Ceci est un test du système de synthèse vocale.',
      German: 'Hallo! Dies ist ein Test des Sprachsynthesesystems.',
      Italian: 'Ciao! Questo è un test del sistema di sintesi vocale.',
      Portuguese: 'Olá! Este é um teste do sistema de síntese de voz.',
      Chinese: '你好！这是语音合成系统的测试。',
      Japanese: 'こんにちは！これは音声合成システムのテストです。',
      Korean: '안녕하세요! 이것은 음성 합성 시스템 테스트입니다.',
      Arabic: 'مرحبا! هذا اختبار لنظام تركيب الصوت.',
    };

    const text = sampleText || defaultTexts[language] || defaultTexts.English;
    const result = await this.synthesizeSpeech(text, language);
    return result.audioStream;
  }
}
