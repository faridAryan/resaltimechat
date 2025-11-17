import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import knex from '../config/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Spaced Repetition Vocabulary Service
 *
 * Implements SuperMemo SM-2 algorithm for optimized vocabulary retention.
 * Features:
 * - AI-generated flashcards with context
 * - Adaptive review scheduling
 * - Multi-modal learning (text, audio, images)
 * - Progress tracking and statistics
 * - Themed vocabulary decks
 * - Mnemonic device generation
 *
 * SM-2 Algorithm:
 * - EF (Easiness Factor): 1.3 - 2.5
 * - Interval: Days until next review
 * - Repetitions: Number of consecutive correct recalls
 * - Quality: 0-5 response quality rating
 */
export class SpacedRepetitionVocabularyService {
  private llm: ChatGoogleGenerativeAI;

  // Zod schemas
  private flashcardSchema = z.object({
    word: z.string(),
    translation: z.string(),
    partOfSpeech: z.string(),
    ipa: z.string().describe('IPA pronunciation'),
    exampleSentences: z.array(z.object({
      sentence: z.string(),
      translation: z.string(),
    })),
    mnemonic: z.string(),
    synonyms: z.array(z.string()),
    antonyms: z.array(z.string()),
    collocations: z.array(z.string()),
    culturalNote: z.string().optional(),
  });

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.0-flash',
      apiKey: process.env.GOOGLE_API_KEY!,
      temperature: 0.7,
    });
  }

  /**
   * Create a new vocabulary deck
   */
  async createDeck(
    userId: string,
    language: string,
    options: {
      name: string;
      description?: string;
      theme?: string;
      difficulty?: string;
      isPublic?: boolean;
    }
  ): Promise<{ deckId: string; deck: any }> {
    const deckId = uuidv4();

    const [deck] = await knex('vocabulary_decks')
      .insert({
        id: deckId,
        user_id: userId,
        language,
        name: options.name,
        description: options.description,
        theme: options.theme,
        difficulty: options.difficulty || 'intermediate',
        is_public: options.isPublic || false,
        created_at: new Date(),
      })
      .returning('*');

    return { deckId, deck };
  }

  /**
   * Generate AI flashcards for a theme
   */
  async generateFlashcards(
    deckId: string,
    language: string,
    theme: string,
    count: number = 20
  ): Promise<any[]> {
    const parser = StructuredOutputParser.fromZodSchema(
      z.array(this.flashcardSchema)
    );

    const prompt = ChatPromptTemplate.fromTemplate(`
Generate {count} high-quality vocabulary flashcards in {language} for the theme: "{theme}".

For each word, provide:
- The word in the target language
- Translation to English
- Part of speech
- IPA pronunciation
- 2-3 example sentences with translations
- A memorable mnemonic device
- Synonyms and antonyms
- Common collocations
- Cultural notes (if relevant)

Focus on practical, commonly-used words.

{format_instructions}
`);

    const chain = prompt.pipe(this.llm).pipe(parser);

    try {
      const flashcards = await chain.invoke({
        count: count.toString(),
        language,
        theme,
        format_instructions: parser.getFormatInstructions(),
      });

      // Store flashcards in database
      const cards = flashcards.map((card) => ({
        id: uuidv4(),
        deck_id: deckId,
        word: card.word,
        translation: card.translation,
        part_of_speech: card.partOfSpeech,
        ipa: card.ipa,
        example_sentences: JSON.stringify(card.exampleSentences),
        mnemonic: card.mnemonic,
        synonyms: JSON.stringify(card.synonyms),
        antonyms: JSON.stringify(card.antonyms),
        collocations: JSON.stringify(card.collocations),
        cultural_note: card.culturalNote,
        created_at: new Date(),
      }));

      await knex('vocabulary_cards').insert(cards);

      return cards;
    } catch (e) {
      console.error('Error generating flashcards:', e);
      throw new Error('Failed to generate flashcards');
    }
  }

  /**
   * Add a custom flashcard
   */
  async addCustomCard(
    deckId: string,
    cardData: {
      word: string;
      translation: string;
      partOfSpeech?: string;
      exampleSentence?: string;
      notes?: string;
    }
  ): Promise<{ cardId: string }> {
    const cardId = uuidv4();

    await knex('vocabulary_cards').insert({
      id: cardId,
      deck_id: deckId,
      word: cardData.word,
      translation: cardData.translation,
      part_of_speech: cardData.partOfSpeech || 'unknown',
      example_sentences: cardData.exampleSentence
        ? JSON.stringify([{ sentence: cardData.exampleSentence, translation: '' }])
        : JSON.stringify([]),
      notes: cardData.notes,
      created_at: new Date(),
    });

    return { cardId };
  }

  /**
   * Get cards due for review using SM-2 algorithm
   */
  async getDueCards(
    userId: string,
    deckId?: string,
    limit: number = 20
  ): Promise<any[]> {
    let query = knex('vocabulary_cards as vc')
      .leftJoin('vocabulary_reviews as vr', function () {
        this.on('vc.id', '=', 'vr.card_id').andOn('vr.user_id', '=', knex.raw('?', [userId]));
      })
      .join('vocabulary_decks as vd', 'vc.deck_id', '=', 'vd.id')
      .where(function () {
        this.where('vr.next_review', '<=', new Date())
          .orWhereNull('vr.next_review');
      })
      .orderByRaw('COALESCE(vr.next_review, vc.created_at) ASC')
      .limit(limit)
      .select(
        'vc.*',
        'vd.language',
        'vr.easiness_factor',
        'vr.interval',
        'vr.repetitions',
        'vr.last_review'
      );

    if (deckId) {
      query = query.where('vc.deck_id', deckId);
    } else {
      query = query.where('vd.user_id', userId);
    }

    const cards = await query;

    return cards.map((card) => ({
      cardId: card.id,
      deckId: card.deck_id,
      word: card.word,
      translation: card.translation,
      partOfSpeech: card.part_of_speech,
      ipa: card.ipa,
      exampleSentences: card.example_sentences ? JSON.parse(card.example_sentences) : [],
      mnemonic: card.mnemonic,
      synonyms: card.synonyms ? JSON.parse(card.synonyms) : [],
      antonyms: card.antonyms ? JSON.parse(card.antonyms) : [],
      collocations: card.collocations ? JSON.parse(card.collocations) : [],
      culturalNote: card.cultural_note,
      language: card.language,
      reviewData: {
        easinessFactor: card.easiness_factor || 2.5,
        interval: card.interval || 0,
        repetitions: card.repetitions || 0,
        lastReview: card.last_review,
      },
    }));
  }

  /**
   * Record a review and calculate next review date using SM-2
   */
  async recordReview(
    userId: string,
    cardId: string,
    quality: number // 0-5: 0=total blackout, 5=perfect recall
  ): Promise<{
    nextReview: Date;
    interval: number;
    easinessFactor: number;
    repetitions: number;
  }> {
    // Get or initialize review data
    const [existingReview] = await knex('vocabulary_reviews')
      .where({ user_id: userId, card_id: cardId })
      .select('*');

    let easinessFactor = existingReview?.easiness_factor || 2.5;
    let interval = existingReview?.interval || 0;
    let repetitions = existingReview?.repetitions || 0;

    // SM-2 Algorithm
    // Update easiness factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easinessFactor = Math.max(
      1.3,
      easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    // Update interval and repetitions
    if (quality < 3) {
      // Failed recall - restart
      repetitions = 0;
      interval = 1;
    } else {
      // Successful recall
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easinessFactor);
      }
      repetitions += 1;
    }

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    // Update or insert review record
    if (existingReview) {
      await knex('vocabulary_reviews')
        .where({ user_id: userId, card_id: cardId })
        .update({
          easiness_factor: easinessFactor,
          interval,
          repetitions,
          last_review: new Date(),
          next_review: nextReview,
          total_reviews: knex.raw('total_reviews + 1'),
        });
    } else {
      await knex('vocabulary_reviews').insert({
        id: uuidv4(),
        user_id: userId,
        card_id: cardId,
        easiness_factor: easinessFactor,
        interval,
        repetitions,
        last_review: new Date(),
        next_review: nextReview,
        total_reviews: 1,
      });
    }

    // Record review in history
    await knex('vocabulary_review_history').insert({
      id: uuidv4(),
      user_id: userId,
      card_id: cardId,
      quality,
      easiness_factor: easinessFactor,
      interval,
      reviewed_at: new Date(),
    });

    return {
      nextReview,
      interval,
      easinessFactor,
      repetitions,
    };
  }

  /**
   * Get vocabulary statistics for user
   */
  async getStatistics(
    userId: string,
    deckId?: string
  ): Promise<{
    totalCards: number;
    masteredCards: number;
    learningCards: number;
    newCards: number;
    dueToday: number;
    reviewsToday: number;
    streak: number;
    averageEasiness: number;
  }> {
    let baseQuery = knex('vocabulary_cards as vc')
      .join('vocabulary_decks as vd', 'vc.deck_id', '=', 'vd.id')
      .where('vd.user_id', userId);

    if (deckId) {
      baseQuery = baseQuery.where('vc.deck_id', deckId);
    }

    const totalCards = await baseQuery.clone().count('vc.id as count').first();

    const masteredCards = await baseQuery
      .clone()
      .join('vocabulary_reviews as vr', function () {
        this.on('vc.id', '=', 'vr.card_id').andOn('vr.user_id', '=', knex.raw('?', [userId]));
      })
      .where('vr.repetitions', '>=', 5)
      .where('vr.interval', '>=', 21)
      .count('vc.id as count')
      .first();

    const learningCards = await baseQuery
      .clone()
      .join('vocabulary_reviews as vr', function () {
        this.on('vc.id', '=', 'vr.card_id').andOn('vr.user_id', '=', knex.raw('?', [userId]));
      })
      .where('vr.repetitions', '<', 5)
      .count('vc.id as count')
      .first();

    const newCards = await baseQuery
      .clone()
      .leftJoin('vocabulary_reviews as vr', function () {
        this.on('vc.id', '=', 'vr.card_id').andOn('vr.user_id', '=', knex.raw('?', [userId]));
      })
      .whereNull('vr.card_id')
      .count('vc.id as count')
      .first();

    const dueToday = await baseQuery
      .clone()
      .join('vocabulary_reviews as vr', function () {
        this.on('vc.id', '=', 'vr.card_id').andOn('vr.user_id', '=', knex.raw('?', [userId]));
      })
      .where('vr.next_review', '<=', new Date())
      .count('vc.id as count')
      .first();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reviewsToday = await knex('vocabulary_review_history')
      .where('user_id', userId)
      .where('reviewed_at', '>=', today)
      .count('id as count')
      .first();

    // Calculate streak
    const streak = await this.calculateStreak(userId);

    // Average easiness
    const avgEasiness = await knex('vocabulary_reviews')
      .where('user_id', userId)
      .avg('easiness_factor as avg')
      .first();

    return {
      totalCards: parseInt(totalCards?.count as string) || 0,
      masteredCards: parseInt(masteredCards?.count as string) || 0,
      learningCards: parseInt(learningCards?.count as string) || 0,
      newCards: parseInt(newCards?.count as string) || 0,
      dueToday: parseInt(dueToday?.count as string) || 0,
      reviewsToday: parseInt(reviewsToday?.count as string) || 0,
      streak,
      averageEasiness: parseFloat(avgEasiness?.avg as string) || 2.5,
    };
  }

  /**
   * Calculate review streak (consecutive days with reviews)
   */
  private async calculateStreak(userId: string): Promise<number> {
    const reviews = await knex('vocabulary_review_history')
      .where('user_id', userId)
      .select(knex.raw('DATE(reviewed_at) as review_date'))
      .groupByRaw('DATE(reviewed_at)')
      .orderBy('review_date', 'desc');

    if (reviews.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < reviews.length; i++) {
      const reviewDate = new Date(reviews[i].review_date);
      reviewDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (reviewDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Get user's decks
   */
  async getUserDecks(userId: string, language?: string): Promise<any[]> {
    let query = knex('vocabulary_decks').where('user_id', userId);

    if (language) {
      query = query.where('language', language);
    }

    const decks = await query.orderBy('created_at', 'desc').select('*');

    // Get card counts for each deck
    const decksWithCounts = await Promise.all(
      decks.map(async (deck) => {
        const cardCount = await knex('vocabulary_cards')
          .where('deck_id', deck.id)
          .count('id as count')
          .first();

        const dueCount = await knex('vocabulary_cards as vc')
          .join('vocabulary_reviews as vr', function () {
            this.on('vc.id', '=', 'vr.card_id').andOn('vr.user_id', '=', knex.raw('?', [userId]));
          })
          .where('vc.deck_id', deck.id)
          .where('vr.next_review', '<=', new Date())
          .count('vc.id as count')
          .first();

        return {
          deckId: deck.id,
          name: deck.name,
          description: deck.description,
          theme: deck.theme,
          language: deck.language,
          difficulty: deck.difficulty,
          cardCount: parseInt(cardCount?.count as string) || 0,
          dueCount: parseInt(dueCount?.count as string) || 0,
          createdAt: deck.created_at,
        };
      })
    );

    return decksWithCounts;
  }

  /**
   * Browse public decks
   */
  async browsePublicDecks(
    language?: string,
    theme?: string,
    difficulty?: string
  ): Promise<any[]> {
    let query = knex('vocabulary_decks').where('is_public', true);

    if (language) query = query.where('language', language);
    if (theme) query = query.where('theme', theme);
    if (difficulty) query = query.where('difficulty', difficulty);

    const decks = await query
      .orderBy('created_at', 'desc')
      .limit(50)
      .select('*');

    return decks.map((deck) => ({
      deckId: deck.id,
      name: deck.name,
      description: deck.description,
      theme: deck.theme,
      language: deck.language,
      difficulty: deck.difficulty,
      createdAt: deck.created_at,
    }));
  }

  /**
   * Clone a public deck
   */
  async cloneDeck(userId: string, sourceDeckId: string): Promise<{ deckId: string }> {
    const [sourceDeck] = await knex('vocabulary_decks')
      .where({ id: sourceDeckId, is_public: true })
      .select('*');

    if (!sourceDeck) {
      throw new Error('Deck not found or not public');
    }

    const newDeckId = uuidv4();

    // Clone deck
    await knex('vocabulary_decks').insert({
      id: newDeckId,
      user_id: userId,
      language: sourceDeck.language,
      name: `${sourceDeck.name} (Copy)`,
      description: sourceDeck.description,
      theme: sourceDeck.theme,
      difficulty: sourceDeck.difficulty,
      is_public: false,
      created_at: new Date(),
    });

    // Clone cards
    const sourceCards = await knex('vocabulary_cards')
      .where('deck_id', sourceDeckId)
      .select('*');

    const newCards = sourceCards.map((card) => ({
      ...card,
      id: uuidv4(),
      deck_id: newDeckId,
      created_at: new Date(),
    }));

    await knex('vocabulary_cards').insert(newCards);

    return { deckId: newDeckId };
  }

  /**
   * Delete a deck
   */
  async deleteDeck(userId: string, deckId: string): Promise<void> {
    await knex('vocabulary_decks')
      .where({ id: deckId, user_id: userId })
      .delete();
  }
}
