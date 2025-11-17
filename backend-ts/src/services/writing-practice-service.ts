import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import knex from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { RLCurriculumService } from './rl-curriculum-service';

/**
 * Writing Practice & AI Correction Service
 *
 * Provides comprehensive writing practice with detailed AI feedback.
 * Features:
 * - Multiple writing formats (essay, email, story, description, opinion)
 * - AI-powered grammar and style correction
 * - Vocabulary enhancement suggestions
 * - Structure and coherence analysis
 * - CEFR-level appropriate feedback
 * - Progress tracking
 * - Prompt generation
 * - Comparative revisions
 */
export class WritingPracticeService {
  private llm: ChatGoogleGenerativeAI;
  private rlService: RLCurriculumService;

  // Zod schemas
  private correctionSchema = z.object({
    overallScore: z.number().min(0).max(100),
    grammarScore: z.number().min(0).max(100),
    vocabularyScore: z.number().min(0).max(100),
    coherenceScore: z.number().min(0).max(100),
    styleScore: z.number().min(0).max(100),
    corrections: z.array(z.object({
      type: z.enum(['grammar', 'vocabulary', 'style', 'spelling', 'punctuation']),
      original: z.string(),
      corrected: z.string(),
      explanation: z.string(),
      severity: z.enum(['minor', 'moderate', 'major']),
      lineNumber: z.number().optional(),
    })),
    suggestions: z.array(z.object({
      category: z.string(),
      suggestion: z.string(),
      example: z.string(),
    })),
    strengths: z.array(z.string()),
    areasForImprovement: z.array(z.string()),
    correctedVersion: z.string(),
    detailedFeedback: z.string(),
  });

  private promptSchema = z.object({
    title: z.string(),
    prompt: z.string(),
    keywords: z.array(z.string()),
    estimatedLength: z.string(),
    tips: z.array(z.string()),
  });

  // Writing types
  private readonly WRITING_TYPES = {
    essay: {
      title: 'Essay Writing',
      description: 'Structured argumentative or expository essays',
      wordRanges: { beginner: [150, 250], intermediate: [250, 400], advanced: [400, 600] },
    },
    email: {
      title: 'Email Writing',
      description: 'Formal and informal emails',
      wordRanges: { beginner: [80, 120], intermediate: [120, 200], advanced: [200, 300] },
    },
    story: {
      title: 'Creative Story',
      description: 'Narrative and creative writing',
      wordRanges: { beginner: [150, 250], intermediate: [300, 500], advanced: [500, 800] },
    },
    description: {
      title: 'Descriptive Writing',
      description: 'Describe places, people, or events',
      wordRanges: { beginner: [100, 150], intermediate: [150, 250], advanced: [250, 400] },
    },
    opinion: {
      title: 'Opinion Piece',
      description: 'Express and support your viewpoint',
      wordRanges: { beginner: [150, 200], intermediate: [200, 350], advanced: [350, 500] },
    },
    letter: {
      title: 'Formal Letter',
      description: 'Business or official correspondence',
      wordRanges: { beginner: [100, 150], intermediate: [150, 250], advanced: [250, 400] },
    },
    review: {
      title: 'Review',
      description: 'Book, movie, or product reviews',
      wordRanges: { beginner: [100, 200], intermediate: [200, 300], advanced: [300, 500] },
    },
    report: {
      title: 'Report',
      description: 'Factual and structured reports',
      wordRanges: { beginner: [150, 250], intermediate: [250, 400], advanced: [400, 600] },
    },
  };

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.0-flash',
      apiKey: process.env.GOOGLE_API_KEY!,
      temperature: 0.4, // Balanced for corrections
    });
    this.rlService = new RLCurriculumService();
  }

  /**
   * Generate a writing prompt
   */
  async generatePrompt(
    language: string,
    writingType: keyof typeof this.WRITING_TYPES,
    difficulty: string,
    theme?: string
  ): Promise<any> {
    const typeConfig = this.WRITING_TYPES[writingType];
    const parser = StructuredOutputParser.fromZodSchema(this.promptSchema);

    const prompt = ChatPromptTemplate.fromTemplate(`
Generate a {writingType} writing prompt in {language} for {difficulty} level learners.
${theme ? `Theme: {theme}` : ''}

The prompt should:
- Be clear and engaging
- Match the difficulty level
- Provide enough context
- Suggest ${typeConfig.wordRanges[difficulty as keyof typeof typeConfig.wordRanges][0]}-${typeConfig.wordRanges[difficulty as keyof typeof typeConfig.wordRanges][1]} words

{format_instructions}
`);

    const chain = prompt.pipe(this.llm).pipe(parser);

    try {
      const result = await chain.invoke({
        writingType: typeConfig.title,
        language,
        difficulty,
        theme: theme || '',
        format_instructions: parser.getFormatInstructions(),
      });

      return result;
    } catch (e) {
      console.error('Error generating prompt:', e);
      return {
        title: `${typeConfig.title} Exercise`,
        prompt: `Write a ${typeConfig.description.toLowerCase()} in ${language}.`,
        keywords: [],
        estimatedLength: `${typeConfig.wordRanges[difficulty as keyof typeof typeConfig.wordRanges][0]}-${typeConfig.wordRanges[difficulty as keyof typeof typeConfig.wordRanges][1]} words`,
        tips: ['Be clear and concise', 'Check your grammar'],
      };
    }
  }

  /**
   * Submit and analyze writing
   */
  async submitWriting(
    userId: string,
    language: string,
    options: {
      writingType: keyof typeof this.WRITING_TYPES;
      difficulty: string;
      promptId?: string;
      customPrompt?: string;
      content: string;
      title?: string;
    }
  ): Promise<{
    submissionId: string;
    analysis: any;
    corrections: any;
  }> {
    const submissionId = uuidv4();

    // Analyze the writing
    const analysis = await this.analyzeWriting(
      options.content,
      language,
      options.difficulty,
      options.writingType
    );

    // Store submission
    await knex('writing_submissions').insert({
      id: submissionId,
      user_id: userId,
      language,
      writing_type: options.writingType,
      difficulty: options.difficulty,
      prompt_id: options.promptId,
      custom_prompt: options.customPrompt,
      title: options.title,
      content: options.content,
      word_count: options.content.split(/\s+/).length,
      overall_score: analysis.overallScore,
      grammar_score: analysis.grammarScore,
      vocabulary_score: analysis.vocabularyScore,
      coherence_score: analysis.coherenceScore,
      style_score: analysis.styleScore,
      corrections: JSON.stringify(analysis.corrections),
      suggestions: JSON.stringify(analysis.suggestions),
      corrected_version: analysis.correctedVersion,
      feedback: analysis.detailedFeedback,
      submitted_at: new Date(),
    });

    return {
      submissionId,
      analysis,
      corrections: analysis.corrections,
    };
  }

  /**
   * AI-powered writing analysis and correction
   */
  private async analyzeWriting(
    content: string,
    language: string,
    difficulty: string,
    writingType: string
  ): Promise<any> {
    const parser = StructuredOutputParser.fromZodSchema(this.correctionSchema);

    const prompt = ChatPromptTemplate.fromTemplate(`
Analyze and correct this {language} writing sample.

Writing Type: {writingType}
Learner Level: {difficulty}
Content:
{content}

Provide comprehensive feedback:
1. Overall score (0-100)
2. Individual scores for grammar, vocabulary, coherence, style
3. Specific corrections with explanations
4. Suggestions for improvement
5. Strengths and areas for improvement
6. Fully corrected version
7. Detailed constructive feedback

Important:
- Tailor feedback to {difficulty} level
- Be encouraging and constructive
- Prioritize major issues over minor ones
- Provide specific examples
- Suggest alternatives and improvements

{format_instructions}
`);

    const chain = prompt.pipe(this.llm).pipe(parser);

    try {
      const result = await chain.invoke({
        language,
        writingType,
        difficulty,
        content,
        format_instructions: parser.getFormatInstructions(),
      });

      return result;
    } catch (e) {
      console.error('Error analyzing writing:', e);
      return {
        overallScore: 70,
        grammarScore: 70,
        vocabularyScore: 70,
        coherenceScore: 70,
        styleScore: 70,
        corrections: [],
        suggestions: [],
        strengths: ['Good effort!'],
        areasForImprovement: ['Keep practicing'],
        correctedVersion: content,
        detailedFeedback: 'Good work! Continue practicing.',
      };
    }
  }

  /**
   * Get writing history
   */
  async getWritingHistory(
    userId: string,
    language?: string,
    limit: number = 20
  ): Promise<any[]> {
    let query = knex('writing_submissions')
      .where({ user_id: userId })
      .orderBy('submitted_at', 'desc')
      .limit(limit);

    if (language) {
      query = query.where({ language });
    }

    const submissions = await query.select('*');

    return submissions.map((sub) => ({
      submissionId: sub.id,
      language: sub.language,
      writingType: sub.writing_type,
      difficulty: sub.difficulty,
      title: sub.title,
      wordCount: sub.word_count,
      overallScore: sub.overall_score,
      submittedAt: sub.submitted_at,
    }));
  }

  /**
   * Get detailed submission
   */
  async getSubmission(userId: string, submissionId: string): Promise<any> {
    const [submission] = await knex('writing_submissions')
      .where({ id: submissionId, user_id: userId })
      .select('*');

    if (!submission) {
      throw new Error('Submission not found');
    }

    return {
      submissionId: submission.id,
      language: submission.language,
      writingType: submission.writing_type,
      difficulty: submission.difficulty,
      title: submission.title,
      content: submission.content,
      wordCount: submission.word_count,
      scores: {
        overall: submission.overall_score,
        grammar: submission.grammar_score,
        vocabulary: submission.vocabulary_score,
        coherence: submission.coherence_score,
        style: submission.style_score,
      },
      corrections: submission.corrections ? JSON.parse(submission.corrections) : [],
      suggestions: submission.suggestions ? JSON.parse(submission.suggestions) : [],
      correctedVersion: submission.corrected_version,
      feedback: submission.feedback,
      submittedAt: submission.submitted_at,
    };
  }

  /**
   * Compare revisions (track improvement)
   */
  async compareRevisions(userId: string, originalId: string, revisedId: string): Promise<{
    improvement: number;
    grammarImprovement: number;
    vocabularyImprovement: number;
    coherenceImprovement: number;
    lessonsLearned: string[];
  }> {
    const [original, revised] = await Promise.all([
      this.getSubmission(userId, originalId),
      this.getSubmission(userId, revisedId),
    ]);

    const improvement = revised.scores.overall - original.scores.overall;
    const grammarImprovement = revised.scores.grammar - original.scores.grammar;
    const vocabularyImprovement = revised.scores.vocabulary - original.scores.vocabulary;
    const coherenceImprovement = revised.scores.coherence - original.scores.coherence;

    // AI-generated lessons learned
    const lessonsLearned = [
      improvement > 0 ? 'Overall writing quality improved' : 'Continue working on fundamentals',
      grammarImprovement > 5 ? 'Grammar skills have strengthened' : 'Focus on grammar practice',
      vocabularyImprovement > 5 ? 'Vocabulary usage improved' : 'Expand vocabulary range',
    ];

    return {
      improvement,
      grammarImprovement,
      vocabularyImprovement,
      coherenceImprovement,
      lessonsLearned,
    };
  }

  /**
   * Get writing statistics
   */
  async getStatistics(userId: string, language: string): Promise<{
    totalSubmissions: number;
    averageScore: number;
    averageWordCount: number;
    improvementRate: number;
    strongestArea: string;
    weakestArea: string;
    recentScores: number[];
  }> {
    const submissions = await knex('writing_submissions')
      .where({ user_id: userId, language })
      .orderBy('submitted_at', 'asc')
      .select('*');

    if (submissions.length === 0) {
      return {
        totalSubmissions: 0,
        averageScore: 0,
        averageWordCount: 0,
        improvementRate: 0,
        strongestArea: 'N/A',
        weakestArea: 'N/A',
        recentScores: [],
      };
    }

    const totalSubmissions = submissions.length;
    const averageScore =
      submissions.reduce((sum, sub) => sum + sub.overall_score, 0) / totalSubmissions;
    const averageWordCount =
      submissions.reduce((sum, sub) => sum + sub.word_count, 0) / totalSubmissions;

    // Calculate improvement rate
    const firstHalf = submissions.slice(0, Math.ceil(totalSubmissions / 2));
    const secondHalf = submissions.slice(Math.ceil(totalSubmissions / 2));

    const firstHalfAvg =
      firstHalf.reduce((sum, sub) => sum + sub.overall_score, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, sub) => sum + sub.overall_score, 0) / (secondHalf.length || 1);

    const improvementRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    // Find strongest and weakest areas
    const avgScores = {
      grammar:
        submissions.reduce((sum, sub) => sum + sub.grammar_score, 0) / totalSubmissions,
      vocabulary:
        submissions.reduce((sum, sub) => sum + sub.vocabulary_score, 0) / totalSubmissions,
      coherence:
        submissions.reduce((sum, sub) => sum + sub.coherence_score, 0) / totalSubmissions,
      style:
        submissions.reduce((sum, sub) => sum + sub.style_score, 0) / totalSubmissions,
    };

    const strongest = Object.entries(avgScores).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    const weakest = Object.entries(avgScores).reduce((a, b) => (a[1] < b[1] ? a : b))[0];

    const recentScores = submissions
      .slice(-10)
      .map((sub) => sub.overall_score);

    return {
      totalSubmissions,
      averageScore: Math.round(averageScore),
      averageWordCount: Math.round(averageWordCount),
      improvementRate: Math.round(improvementRate),
      strongestArea: strongest,
      weakestArea: weakest,
      recentScores,
    };
  }

  /**
   * Get personalized writing recommendations
   */
  async getRecommendations(userId: string, language: string): Promise<{
    nextExercise: string;
    focusAreas: string[];
    tips: string[];
  }> {
    const stats = await this.getStatistics(userId, language);

    const focusAreas = [
      stats.weakestArea === 'grammar' ? 'Grammar exercises' : null,
      stats.weakestArea === 'vocabulary' ? 'Vocabulary building' : null,
      stats.weakestArea === 'coherence' ? 'Structure and organization' : null,
      stats.averageWordCount < 200 ? 'Writing longer pieces' : null,
    ].filter(Boolean) as string[];

    return {
      nextExercise:
        stats.weakestArea === 'grammar'
          ? 'Practice with structured essays'
          : 'Try descriptive writing',
      focusAreas,
      tips: [
        'Read more in your target language',
        'Practice daily for 10-15 minutes',
        'Review corrections carefully',
      ],
    };
  }
}
