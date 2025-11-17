import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import knex from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RLCurriculumService } from './rl-curriculum-service';

/**
 * Interactive Short Story Practice Service
 *
 * Provides level-appropriate reading practice with AI-generated stories and images.
 * Features:
 * - AI-generated stories tailored to CEFR level
 * - Adaptive vocabulary and grammar complexity
 * - AI-generated illustrations (cartoon/black&white)
 * - Interactive reading with inline definitions
 * - Comprehension questions
 * - Vocabulary extraction and tracking
 * - Reading speed and comprehension metrics
 * - Progress-based difficulty adjustment
 *
 * Story Generation:
 * - A1: 100-200 words, present tense, basic vocabulary
 * - A2: 200-350 words, simple past, common phrases
 * - B1: 350-500 words, multiple tenses, idioms
 * - B2: 500-750 words, complex structures, nuanced vocabulary
 * - C1: 750-1000 words, advanced grammar, sophisticated style
 * - C2: 1000+ words, native-level complexity
 */
export class ShortStoryPracticeService {
  private llm: ChatGoogleGenerativeAI;
  private genAI: GoogleGenerativeAI;
  private rlService: RLCurriculumService;

  // Zod schemas
  private storySchema = z.object({
    title: z.string(),
    genre: z.string(),
    story: z.string(),
    paragraphs: z.array(z.object({
      text: z.string(),
      keyVocabulary: z.array(z.string()),
      grammarPoints: z.array(z.string()),
    })),
    vocabulary: z.array(z.object({
      word: z.string(),
      definition: z.string(),
      partOfSpeech: z.string(),
      exampleSentence: z.string(),
      difficulty: z.string(),
    })),
    grammarConcepts: z.array(z.object({
      concept: z.string(),
      explanation: z.string(),
      examples: z.array(z.string()),
    })),
    comprehensionQuestions: z.array(z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctAnswer: z.number(),
      explanation: z.string(),
    })),
    moralLesson: z.string().optional(),
    estimatedReadingTime: z.number().describe('Minutes'),
  });

  private imagePromptSchema = z.object({
    sceneDescriptions: z.array(z.object({
      paragraphIndex: z.number(),
      description: z.string(),
      style: z.string(),
      keyElements: z.array(z.string()),
    })),
  });

  // Story genres and themes
  private readonly GENRES = [
    'adventure', 'mystery', 'fantasy', 'slice-of-life',
    'historical', 'science-fiction', 'fairy-tale', 'comedy',
    'drama', 'fable', 'legend', 'myth'
  ];

  private readonly THEMES = [
    'friendship', 'courage', 'honesty', 'perseverance',
    'kindness', 'family', 'discovery', 'transformation',
    'justice', 'love', 'wisdom', 'adventure', 'growth'
  ];

  // Level-specific constraints
  private readonly LEVEL_CONFIG = {
    A1: {
      wordRange: [100, 200],
      sentenceLength: 'short (5-10 words)',
      tenses: ['present simple'],
      vocabulary: 'basic everyday words (A1 CEFR)',
      grammar: 'simple sentences, basic subject-verb-object',
      complexity: 'very simple plot, clear cause and effect',
    },
    A2: {
      wordRange: [200, 350],
      sentenceLength: 'short to medium (8-12 words)',
      tenses: ['present simple', 'past simple', 'present continuous'],
      vocabulary: 'common words and phrases (A2 CEFR)',
      grammar: 'compound sentences with "and", "but", "because"',
      complexity: 'simple plot with clear resolution',
    },
    B1: {
      wordRange: [350, 500],
      sentenceLength: 'medium (10-15 words)',
      tenses: ['all common tenses', 'simple conditionals'],
      vocabulary: 'varied vocabulary, some idioms (B1 CEFR)',
      grammar: 'complex sentences, relative clauses, passive voice',
      complexity: 'multiple plot points, character development',
    },
    B2: {
      wordRange: [500, 750],
      sentenceLength: 'medium to long (12-20 words)',
      tenses: ['all tenses including perfect', 'conditionals'],
      vocabulary: 'sophisticated vocabulary, idioms, nuanced meanings (B2 CEFR)',
      grammar: 'varied sentence structures, subjunctive, reported speech',
      complexity: 'layered plot, subtext, character depth',
    },
    C1: {
      wordRange: [750, 1000],
      sentenceLength: 'varied (10-25 words)',
      tenses: ['all tenses', 'advanced conditionals'],
      vocabulary: 'advanced vocabulary, figurative language, cultural references (C1 CEFR)',
      grammar: 'sophisticated structures, inversion, emphasis',
      complexity: 'complex narrative, themes, symbolism',
    },
    C2: {
      wordRange: [1000, 1500],
      sentenceLength: 'varied and natural',
      tenses: ['native-level usage'],
      vocabulary: 'native-level vocabulary, subtle nuances (C2 CEFR)',
      grammar: 'native-level complexity and style',
      complexity: 'literary quality, multiple themes, sophisticated storytelling',
    },
  };

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.0-flash',
      apiKey: process.env.GOOGLE_API_KEY!,
      temperature: 0.8, // Creative for storytelling
    });
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    this.rlService = new RLCurriculumService();
  }

  /**
   * Generate a new story tailored to user level
   */
  async generateStory(
    userId: string,
    language: string,
    level: keyof typeof this.LEVEL_CONFIG,
    options: {
      genre?: string;
      theme?: string;
      customPrompt?: string;
      imageStyle?: 'cartoon' | 'black-white' | 'watercolor' | 'minimalist';
    } = {}
  ): Promise<{
    storyId: string;
    story: any;
    images: string[];
  }> {
    const storyId = uuidv4();

    // Get user's learning history for personalization
    const curriculumState = await this.rlService.getCurriculumState(userId, language);
    const weakAreas = curriculumState.weakAreas || [];

    const levelConfig = this.LEVEL_CONFIG[level];
    const genre = options.genre || this.GENRES[Math.floor(Math.random() * this.GENRES.length)];
    const theme = options.theme || this.THEMES[Math.floor(Math.random() * this.THEMES.length)];

    // Generate story with LangChain
    const story = await this.generateStoryContent(
      language,
      level,
      levelConfig,
      genre,
      theme,
      weakAreas,
      options.customPrompt
    );

    // Generate images for the story
    const images = await this.generateStoryImages(
      story,
      language,
      options.imageStyle || 'cartoon'
    );

    // Store story in database
    await knex('short_stories').insert({
      id: storyId,
      language,
      level,
      genre,
      theme,
      title: story.title,
      content: story.story,
      paragraphs: JSON.stringify(story.paragraphs),
      vocabulary: JSON.stringify(story.vocabulary),
      grammar_concepts: JSON.stringify(story.grammarConcepts),
      comprehension_questions: JSON.stringify(story.comprehensionQuestions),
      moral_lesson: story.moralLesson,
      word_count: story.story.split(/\s+/).length,
      estimated_reading_time: story.estimatedReadingTime,
      images: JSON.stringify(images),
      created_at: new Date(),
    });

    return {
      storyId,
      story: {
        ...story,
        level,
        genre,
        theme,
      },
      images,
    };
  }

  /**
   * Generate story content using LangChain
   */
  private async generateStoryContent(
    language: string,
    level: string,
    levelConfig: any,
    genre: string,
    theme: string,
    weakAreas: any[],
    customPrompt?: string
  ): Promise<any> {
    const parser = StructuredOutputParser.fromZodSchema(this.storySchema);

    const prompt = ChatPromptTemplate.fromTemplate(`
Create an engaging short story in {language} for {level} level learners.

Genre: {genre}
Theme: {theme}
{customPromptText}

Story Requirements:
- Length: {wordRangeMin}-{wordRangeMax} words
- Sentence length: {sentenceLength}
- Tenses: {tenses}
- Vocabulary: {vocabulary}
- Grammar: {grammar}
- Complexity: {complexity}

{weakAreasText}

Include:
1. A compelling title
2. Story divided into clear paragraphs (3-5 paragraphs)
3. For each paragraph: identify key vocabulary and grammar points
4. Complete vocabulary list with definitions, part of speech, examples
5. Grammar concepts explained with examples
6. 5 comprehension questions (multiple choice with 4 options each)
7. Moral lesson or takeaway
8. Estimated reading time

Make the story:
- Culturally appropriate and universal
- Engaging with clear narrative arc
- Educational but entertaining
- Appropriate for language learners

{format_instructions}
`);

    const chain = prompt.pipe(this.llm).pipe(parser);

    const weakAreasText = weakAreas.length > 0
      ? `Focus areas for this learner: ${weakAreas.map(wa => wa.skill).join(', ')}.
         Incorporate these concepts naturally in the story.`
      : '';

    try {
      const result = await chain.invoke({
        language,
        level,
        genre,
        theme,
        customPromptText: customPrompt ? `Custom prompt: ${customPrompt}` : '',
        wordRangeMin: levelConfig.wordRange[0].toString(),
        wordRangeMax: levelConfig.wordRange[1].toString(),
        sentenceLength: levelConfig.sentenceLength,
        tenses: levelConfig.tenses.join(', '),
        vocabulary: levelConfig.vocabulary,
        grammar: levelConfig.grammar,
        complexity: levelConfig.complexity,
        weakAreasText,
        format_instructions: parser.getFormatInstructions(),
      });

      return result;
    } catch (e) {
      console.error('Error generating story:', e);
      throw new Error('Failed to generate story');
    }
  }

  /**
   * Generate images for story scenes
   */
  private async generateStoryImages(
    story: any,
    language: string,
    imageStyle: string
  ): Promise<string[]> {
    // First, generate image prompts for key scenes
    const imagePromptParser = StructuredOutputParser.fromZodSchema(this.imagePromptSchema);

    const promptTemplate = ChatPromptTemplate.fromTemplate(`
Analyze this story and identify 3-5 key scenes that would make good illustrations.

Story Title: {title}
Story Content:
{story}

For each scene, provide:
- Which paragraph it corresponds to
- Detailed description for image generation
- Style notes for {imageStyle} style
- Key visual elements

{format_instructions}
`);

    const chain = promptTemplate.pipe(this.llm).pipe(imagePromptParser);

    let sceneDescriptions;
    try {
      const result = await chain.invoke({
        title: story.title,
        story: story.story,
        imageStyle,
        format_instructions: imagePromptParser.getFormatInstructions(),
      });
      sceneDescriptions = result.sceneDescriptions;
    } catch (e) {
      console.error('Error generating image prompts:', e);
      // Fallback: create simple scene descriptions
      sceneDescriptions = story.paragraphs.slice(0, 3).map((p: any, idx: number) => ({
        paragraphIndex: idx,
        description: `Scene from paragraph ${idx + 1}`,
        style: imageStyle,
        keyElements: [],
      }));
    }

    // Generate images using Gemini's image generation
    const images: string[] = [];

    for (const scene of sceneDescriptions.slice(0, 4)) { // Max 4 images
      try {
        const imagePrompt = this.buildImagePrompt(scene, imageStyle);

        // Using Gemini's imagen capability (if available)
        // For now, we'll store the prompt as placeholder
        // In production, integrate with Gemini's image generation API or use DALL-E/Stable Diffusion

        const imageUrl = await this.generateImage(imagePrompt);
        images.push(imageUrl);
      } catch (e) {
        console.error('Error generating image:', e);
        // Placeholder image URL
        images.push(`/placeholder-image-${scene.paragraphIndex}.png`);
      }
    }

    return images;
  }

  /**
   * Build detailed image generation prompt
   */
  private buildImagePrompt(scene: any, imageStyle: string): string {
    const styleDescriptions = {
      cartoon: 'colorful cartoon style, friendly and approachable, bold outlines, vibrant colors, suitable for all ages',
      'black-white': 'black and white illustration, pen and ink style, high contrast, detailed linework, classic storybook aesthetic',
      watercolor: 'soft watercolor illustration, gentle colors, painterly style, dreamy and artistic',
      minimalist: 'minimalist illustration, simple shapes, limited color palette, clean and modern',
    };

    const styleDesc = styleDescriptions[imageStyle as keyof typeof styleDescriptions] || styleDescriptions.cartoon;

    return `${scene.description}.
    Style: ${styleDesc}.
    Key elements: ${scene.keyElements.join(', ')}.
    Suitable for language learning context, culturally neutral, family-friendly.`;
  }

  /**
   * Generate image (placeholder - integrate with actual image generation API)
   */
  private async generateImage(prompt: string): Promise<string> {
    // Placeholder for actual image generation
    // In production, integrate with:
    // - Gemini's imagen (when available)
    // - DALL-E API
    // - Stable Diffusion
    // - Midjourney API

    // For now, return a placeholder URL
    // The prompt would be used to generate the actual image
    return `/generated-images/${uuidv4()}.png`;
  }

  /**
   * Start reading a story (track session)
   */
  async startReading(
    userId: string,
    storyId: string
  ): Promise<{
    sessionId: string;
    story: any;
    images: string[];
    interactiveElements: any;
  }> {
    const sessionId = uuidv4();

    // Get story
    const [story] = await knex('short_stories')
      .where({ id: storyId })
      .select('*');

    if (!story) {
      throw new Error('Story not found');
    }

    // Create reading session
    await knex('story_reading_sessions').insert({
      id: sessionId,
      user_id: userId,
      story_id: storyId,
      started_at: new Date(),
      status: 'reading',
    });

    // Prepare interactive elements (inline definitions)
    const vocabulary = JSON.parse(story.vocabulary);
    const interactiveElements = this.createInteractiveElements(
      story.content,
      vocabulary
    );

    return {
      sessionId,
      story: {
        storyId: story.id,
        title: story.title,
        level: story.level,
        genre: story.genre,
        theme: story.theme,
        content: story.content,
        paragraphs: JSON.parse(story.paragraphs),
        vocabulary,
        grammarConcepts: JSON.parse(story.grammar_concepts),
        estimatedReadingTime: story.estimated_reading_time,
        moralLesson: story.moral_lesson,
      },
      images: JSON.parse(story.images),
      interactiveElements,
    };
  }

  /**
   * Create interactive reading elements (word definitions on hover/click)
   */
  private createInteractiveElements(
    content: string,
    vocabulary: any[]
  ): any {
    const elements: any = {};

    vocabulary.forEach((vocab) => {
      const regex = new RegExp(`\\b${vocab.word}\\b`, 'gi');
      const matches = content.match(regex);

      if (matches) {
        elements[vocab.word.toLowerCase()] = {
          word: vocab.word,
          definition: vocab.definition,
          partOfSpeech: vocab.partOfSpeech,
          exampleSentence: vocab.exampleSentence,
          occurrences: matches.length,
        };
      }
    });

    return elements;
  }

  /**
   * Complete reading and answer comprehension questions
   */
  async completeReading(
    userId: string,
    sessionId: string,
    answers: number[], // Array of selected answer indices
    readingTimeSeconds: number
  ): Promise<{
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    feedback: any[];
    readingSpeed: number; // Words per minute
    comprehensionLevel: string;
    achievements: string[];
    rlUpdate: any;
  }> {
    // Get session and story
    const [session] = await knex('story_reading_sessions')
      .where({ id: sessionId, user_id: userId })
      .select('*');

    if (!session) {
      throw new Error('Session not found');
    }

    const [story] = await knex('short_stories')
      .where({ id: session.story_id })
      .select('*');

    const comprehensionQuestions = JSON.parse(story.comprehension_questions);

    // Check answers
    let correctAnswers = 0;
    const feedback = comprehensionQuestions.map((q: any, idx: number) => {
      const isCorrect = answers[idx] === q.correctAnswer;
      if (isCorrect) correctAnswers++;

      return {
        question: q.question,
        userAnswer: q.options[answers[idx]],
        correctAnswer: q.options[q.correctAnswer],
        isCorrect,
        explanation: q.explanation,
      };
    });

    const score = Math.round((correctAnswers / comprehensionQuestions.length) * 100);

    // Calculate reading speed (words per minute)
    const readingSpeed = Math.round((story.word_count / readingTimeSeconds) * 60);

    // Determine comprehension level
    let comprehensionLevel = 'needs-improvement';
    if (score >= 90) comprehensionLevel = 'excellent';
    else if (score >= 75) comprehensionLevel = 'good';
    else if (score >= 60) comprehensionLevel = 'fair';

    // Update session
    await knex('story_reading_sessions')
      .where({ id: sessionId })
      .update({
        ended_at: new Date(),
        reading_time_seconds: readingTimeSeconds,
        comprehension_score: score,
        reading_speed_wpm: readingSpeed,
        answers: JSON.stringify(answers),
        status: 'completed',
      });

    // Determine achievements
    const achievements: string[] = [];
    if (score === 100) achievements.push('perfect_comprehension');
    if (score >= 90) achievements.push('excellent_reader');
    if (readingSpeed >= 200) achievements.push('speed_reader');
    if (readingTimeSeconds <= story.estimated_reading_time * 60) {
      achievements.push('time_efficient');
    }

    // Check if first story completed
    const previousSessions = await knex('story_reading_sessions')
      .where({ user_id: userId, status: 'completed' })
      .count('id as count')
      .first();

    if (parseInt(previousSessions?.count as string) === 1) {
      achievements.push('first_story');
    }

    // Update RL curriculum
    const rlUpdate = await this.rlService.updateFromReadingSession(
      userId,
      story.language,
      {
        level: story.level,
        comprehensionScore: score,
        readingSpeed,
        vocabularyCount: JSON.parse(story.vocabulary).length,
        grammarConcepts: JSON.parse(story.grammar_concepts).length,
      }
    );

    return {
      score,
      correctAnswers,
      totalQuestions: comprehensionQuestions.length,
      feedback,
      readingSpeed,
      comprehensionLevel,
      achievements,
      rlUpdate,
    };
  }

  /**
   * Get reading history
   */
  async getReadingHistory(
    userId: string,
    language?: string,
    limit: number = 20
  ): Promise<any[]> {
    let query = knex('story_reading_sessions as srs')
      .join('short_stories as ss', 'srs.story_id', 'ss.id')
      .where({ 'srs.user_id': userId, 'srs.status': 'completed' })
      .orderBy('srs.ended_at', 'desc')
      .limit(limit);

    if (language) {
      query = query.where({ 'ss.language': language });
    }

    const sessions = await query.select(
      'srs.*',
      'ss.title',
      'ss.level',
      'ss.genre',
      'ss.theme',
      'ss.word_count'
    );

    return sessions.map((session) => ({
      sessionId: session.id,
      storyId: session.story_id,
      title: session.title,
      level: session.level,
      genre: session.genre,
      theme: session.theme,
      wordCount: session.word_count,
      comprehensionScore: session.comprehension_score,
      readingSpeedWpm: session.reading_speed_wpm,
      readingTimeSeconds: session.reading_time_seconds,
      completedAt: session.ended_at,
    }));
  }

  /**
   * Get reading statistics
   */
  async getStatistics(userId: string, language: string): Promise<{
    totalStoriesRead: number;
    averageComprehension: number;
    averageReadingSpeed: number;
    favoriteGenre: string;
    currentLevel: string;
    improvementRate: number;
    totalReadingTime: number;
  }> {
    const sessions = await knex('story_reading_sessions as srs')
      .join('short_stories as ss', 'srs.story_id', 'ss.id')
      .where({ 'srs.user_id': userId, 'ss.language': language, 'srs.status': 'completed' })
      .select('srs.*', 'ss.genre', 'ss.level');

    if (sessions.length === 0) {
      return {
        totalStoriesRead: 0,
        averageComprehension: 0,
        averageReadingSpeed: 0,
        favoriteGenre: 'N/A',
        currentLevel: 'A1',
        improvementRate: 0,
        totalReadingTime: 0,
      };
    }

    const totalStoriesRead = sessions.length;
    const averageComprehension =
      sessions.reduce((sum, s) => sum + s.comprehension_score, 0) / totalStoriesRead;
    const averageReadingSpeed =
      sessions.reduce((sum, s) => sum + s.reading_speed_wpm, 0) / totalStoriesRead;

    // Find favorite genre
    const genreCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
    });
    const favoriteGenre = Object.entries(genreCounts).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    // Current level (most recent)
    const currentLevel = sessions[0].level;

    // Calculate improvement rate
    const firstHalf = sessions.slice(Math.ceil(sessions.length / 2));
    const secondHalf = sessions.slice(0, Math.ceil(sessions.length / 2));

    const firstHalfAvg =
      firstHalf.reduce((sum, s) => sum + s.comprehension_score, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, s) => sum + s.comprehension_score, 0) / (secondHalf.length || 1);

    const improvementRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    const totalReadingTime =
      sessions.reduce((sum, s) => sum + s.reading_time_seconds, 0) / 60; // minutes

    return {
      totalStoriesRead,
      averageComprehension: Math.round(averageComprehension),
      averageReadingSpeed: Math.round(averageReadingSpeed),
      favoriteGenre,
      currentLevel,
      improvementRate: Math.round(improvementRate),
      totalReadingTime: Math.round(totalReadingTime),
    };
  }

  /**
   * Browse available stories
   */
  async browseStories(
    language: string,
    filters: {
      level?: string;
      genre?: string;
      theme?: string;
    } = {},
    limit: number = 20
  ): Promise<any[]> {
    let query = knex('short_stories')
      .where({ language })
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (filters.level) query = query.where({ level: filters.level });
    if (filters.genre) query = query.where({ genre: filters.genre });
    if (filters.theme) query = query.where({ theme: filters.theme });

    const stories = await query.select('*');

    return stories.map((story) => ({
      storyId: story.id,
      title: story.title,
      level: story.level,
      genre: story.genre,
      theme: story.theme,
      wordCount: story.word_count,
      estimatedReadingTime: story.estimated_reading_time,
      moralLesson: story.moral_lesson,
      createdAt: story.created_at,
    }));
  }

  /**
   * Get recommended stories based on user level and history
   */
  async getRecommendedStories(
    userId: string,
    language: string,
    count: number = 5
  ): Promise<any[]> {
    // Get user's reading history
    const history = await this.getReadingHistory(userId, language, 10);

    // Get user's current level
    const stats = await this.getStatistics(userId, language);

    // Find genres the user hasn't tried or enjoyed
    const readGenres = new Set(history.map((h) => h.genre));
    const allGenres = this.GENRES;
    const newGenres = allGenres.filter((g) => !readGenres.has(g));

    // Build recommendation query
    let query = knex('short_stories')
      .where({ language, level: stats.currentLevel })
      .whereNotIn(
        'id',
        history.map((h) => h.storyId)
      )
      .limit(count);

    // Prefer new genres
    if (newGenres.length > 0) {
      query = query.whereIn('genre', newGenres);
    }

    const recommendations = await query.select('*');

    return recommendations.map((story) => ({
      storyId: story.id,
      title: story.title,
      level: story.level,
      genre: story.genre,
      theme: story.theme,
      wordCount: story.word_count,
      estimatedReadingTime: story.estimated_reading_time,
      reason: readGenres.has(story.genre) ? 'Popular genre' : 'New genre to explore',
    }));
  }
}
