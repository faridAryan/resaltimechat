import knex, { Knex } from 'knex';
import config from '../../knexfile';

/**
 * Knex Database Service for PostgreSQL (Aurora Serverless v2)
 * Replaces Prisma ORM with lightweight Knex query builder
 */
export class KnexDBService {
  private db: Knex;
  private static instance: KnexDBService;

  constructor() {
    const environment = process.env.NODE_ENV || 'development';
    this.db = knex(config[environment]);
  }

  /**
   * Singleton pattern for Lambda reuse
   */
  static getInstance(): KnexDBService {
    if (!KnexDBService.instance) {
      KnexDBService.instance = new KnexDBService();
    }
    return KnexDBService.instance;
  }

  /**
   * Get raw Knex instance for custom queries
   */
  getKnex(): Knex {
    return this.db;
  }

  // ==================== User Operations ====================

  async createUser(userData: {
    cognitoSub: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    preferredLanguage?: string;
  }) {
    const [user] = await this.db('users')
      .insert({
        cognito_sub: userData.cognitoSub,
        username: userData.username,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        preferred_language: userData.preferredLanguage,
      })
      .returning('*');
    return this.snakeToCamel(user);
  }

  async getUserById(userId: string) {
    const user = await this.db('users').where({ id: userId }).first();
    return user ? this.snakeToCamel(user) : null;
  }

  async getUserByCognitoSub(cognitoSub: string) {
    const user = await this.db('users').where({ cognito_sub: cognitoSub }).first();
    return user ? this.snakeToCamel(user) : null;
  }

  async getUserByUsername(username: string) {
    const user = await this.db('users').where({ username }).first();
    return user ? this.snakeToCamel(user) : null;
  }

  async updateUserLastLogin(userId: string) {
    await this.db('users')
      .where({ id: userId })
      .update({ last_login_at: this.db.fn.now(), updated_at: this.db.fn.now() });
  }

  // ==================== User Progress Operations ====================

  async getUserProgress(userId: string, language: string) {
    const progress = await this.db('user_progress')
      .where({ user_id: userId, language })
      .first();
    return progress ? this.snakeToCamel(progress) : null;
  }

  async createOrUpdateUserProgress(userId: string, language: string, updates: any) {
    const existing = await this.getUserProgress(userId, language);

    if (existing) {
      const [updated] = await this.db('user_progress')
        .where({ user_id: userId, language })
        .update({
          ...this.camelToSnake(updates),
          updated_at: this.db.fn.now(),
        })
        .returning('*');
      return this.snakeToCamel(updated);
    } else {
      const [created] = await this.db('user_progress')
        .insert({
          user_id: userId,
          language,
          ...this.camelToSnake(updates),
        })
        .returning('*');
      return this.snakeToCamel(created);
    }
  }

  async incrementStreak(userId: string, language: string) {
    await this.db.raw(`
      UPDATE user_progress
      SET streak = streak + 1,
          longest_streak = GREATEST(longest_streak, streak + 1),
          last_practice_at = NOW(),
          updated_at = NOW()
      WHERE user_id = ? AND language = ?
    `, [userId, language]);
  }

  // ==================== Study Session Operations ====================

  async createStudySession(sessionData: {
    userId: string;
    language: string;
    sessionType: string;
    difficulty: string;
    metadata?: any;
  }) {
    const [session] = await this.db('study_sessions')
      .insert({
        user_id: sessionData.userId,
        language: sessionData.language,
        session_type: sessionData.sessionType,
        difficulty: sessionData.difficulty,
        metadata: sessionData.metadata ? JSON.stringify(sessionData.metadata) : null,
      })
      .returning('*');
    return this.snakeToCamel(session);
  }

  async updateStudySession(sessionId: string, updates: any) {
    const [session] = await this.db('study_sessions')
      .where({ id: sessionId })
      .update({
        ...this.camelToSnake(updates),
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return this.snakeToCamel(session);
  }

  async endStudySession(sessionId: string, xpEarned: number, durationMinutes: number) {
    const [session] = await this.db('study_sessions')
      .where({ id: sessionId })
      .update({
        completed: true,
        ended_at: this.db.fn.now(),
        xp_earned: xpEarned,
        duration_minutes: durationMinutes,
      })
      .returning('*');
    return this.snakeToCamel(session);
  }

  // ==================== Vocabulary Operations ====================

  async createVocabularyItem(vocabData: {
    userId: string;
    language: string;
    word: string;
    translation: string;
    context?: string;
    difficulty?: string;
    partOfSpeech?: string;
  }) {
    const [item] = await this.db('vocabulary_items')
      .insert(this.camelToSnake(vocabData))
      .returning('*');
    return this.snakeToCamel(item);
  }

  async getVocabularyItemsDue(userId: string, language: string, limit: number = 20) {
    const items = await this.db('vocabulary_items')
      .where('user_id', userId)
      .where('language', language)
      .where('next_review_at', '<=', this.db.fn.now())
      .orderBy('next_review_at', 'asc')
      .limit(limit);
    return items.map(item => this.snakeToCamel(item));
  }

  async updateVocabularyReview(itemId: string, correct: boolean) {
    // Get current item
    const item = await this.db('vocabulary_items').where({ id: itemId }).first();
    if (!item) return null;

    // Calculate SM-2 algorithm values
    const { easeFactor, interval, repetitionLevel } = this.calculateSM2(
      item.ease_factor,
      item.interval,
      item.repetition_level,
      correct
    );

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);

    const [updated] = await this.db('vocabulary_items')
      .where({ id: itemId })
      .update({
        ease_factor: easeFactor,
        interval,
        repetition_level: repetitionLevel,
        correct_count: correct ? item.correct_count + 1 : item.correct_count,
        incorrect_count: correct ? item.incorrect_count : item.incorrect_count + 1,
        last_reviewed_at: this.db.fn.now(),
        next_review_at: nextReviewAt,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return this.snakeToCamel(updated);
  }

  // ==================== Conversation Operations ====================

  async createConversation(convData: {
    userId: string;
    sessionId: string;
    language: string;
    topic?: string;
    difficulty: string;
  }) {
    const [conversation] = await this.db('conversations')
      .insert(this.camelToSnake(convData))
      .returning('*');
    return this.snakeToCamel(conversation);
  }

  async addConversationMessage(messageData: {
    conversationId: string;
    role: string;
    content: string;
    contentLanguage?: string;
    corrections?: any;
    feedback?: string;
    vocabulary?: any;
    pronunciationScore?: number;
    pronunciationFeedback?: any;
    audioS3Key?: string;
  }) {
    const [message] = await this.db('conversation_messages')
      .insert(this.camelToSnake(messageData))
      .returning('*');

    // Increment message count
    await this.db('conversations')
      .where({ id: messageData.conversationId })
      .increment('message_count', 1);

    return this.snakeToCamel(message);
  }

  async getConversationHistory(conversationId: string, limit: number = 50) {
    const messages = await this.db('conversation_messages')
      .where({ conversation_id: conversationId })
      .orderBy('created_at', 'asc')
      .limit(limit);
    return messages.map(msg => this.snakeToCamel(msg));
  }

  // ==================== RL Curriculum Operations ====================

  async getCurriculumState(userId: string, language: string) {
    const state = await this.db('curriculum_states')
      .where({ user_id: userId, language })
      .first();
    return state ? this.snakeToCamel(state) : null;
  }

  async updateCurriculumState(userId: string, language: string, updates: any) {
    const existing = await this.getCurriculumState(userId, language);

    if (existing) {
      const [updated] = await this.db('curriculum_states')
        .where({ user_id: userId, language })
        .update({
          ...this.camelToSnake(updates),
          updated_at: this.db.fn.now(),
        })
        .returning('*');
      return this.snakeToCamel(updated);
    } else {
      const [created] = await this.db('curriculum_states')
        .insert({
          user_id: userId,
          language,
          ...this.camelToSnake(updates),
        })
        .returning('*');
      return this.snakeToCamel(created);
    }
  }

  async getQValue(userId: string, language: string, stateKey: string, actionKey: string) {
    const qValue = await this.db('q_values')
      .where({ user_id: userId, language, state_key: stateKey, action_key: actionKey })
      .first();
    return qValue ? this.snakeToCamel(qValue) : null;
  }

  async updateQValue(
    userId: string,
    language: string,
    stateKey: string,
    actionKey: string,
    newQValue: number
  ) {
    const existing = await this.getQValue(userId, language, stateKey, actionKey);

    if (existing) {
      await this.db('q_values')
        .where({ user_id: userId, language, state_key: stateKey, action_key: actionKey })
        .update({
          q_value: newQValue,
          visit_count: this.db.raw('visit_count + 1'),
          last_updated_at: this.db.fn.now(),
          updated_at: this.db.fn.now(),
        });
    } else {
      await this.db('q_values').insert({
        user_id: userId,
        language,
        state_key: stateKey,
        action_key: actionKey,
        q_value: newQValue,
        visit_count: 1,
      });
    }
  }

  async getMemoryPatterns(userId: string, language: string, patternType?: string) {
    let query = this.db('memory_patterns')
      .where({ user_id: userId, language });

    if (patternType) {
      query = query.where({ pattern_type: patternType });
    }

    const patterns = await query.orderBy('confidence', 'desc');
    return patterns.map(p => this.snakeToCamel(p));
  }

  async createOrUpdateMemoryPattern(
    userId: string,
    language: string,
    patternType: string,
    patternData: any,
    confidence?: number
  ) {
    const existing = await this.db('memory_patterns')
      .where({ user_id: userId, language, pattern_type: patternType })
      .first();

    if (existing) {
      const [updated] = await this.db('memory_patterns')
        .where({ id: existing.id })
        .update({
          pattern_data: JSON.stringify(patternData),
          confidence: confidence !== undefined ? confidence : existing.confidence,
          occurrence_count: existing.occurrence_count + 1,
          last_observed_at: this.db.fn.now(),
          updated_at: this.db.fn.now(),
        })
        .returning('*');
      return this.snakeToCamel(updated);
    } else {
      const [created] = await this.db('memory_patterns')
        .insert({
          user_id: userId,
          language,
          pattern_type: patternType,
          pattern_data: JSON.stringify(patternData),
          confidence: confidence || 0.5,
        })
        .returning('*');
      return this.snakeToCamel(created);
    }
  }

  // ==================== Voice Recording Operations ====================

  async createVoiceRecording(recordingData: {
    userId: string;
    sessionId?: string;
    language: string;
    s3Key: string;
    transcript?: string;
    expectedText?: string;
    pronunciationScore?: number;
    pronunciationDetails?: any;
    transcribeMetadata?: any;
    durationSeconds?: number;
  }) {
    const [recording] = await this.db('voice_recordings')
      .insert(this.camelToSnake(recordingData))
      .returning('*');
    return this.snakeToCamel(recording);
  }

  async getVoiceRecordings(userId: string, language: string, limit: number = 20) {
    const recordings = await this.db('voice_recordings')
      .where({ user_id: userId, language })
      .orderBy('created_at', 'desc')
      .limit(limit);
    return recordings.map(r => this.snakeToCamel(r));
  }

  // ==================== Helper Methods ====================

  /**
   * SM-2 Spaced Repetition Algorithm
   */
  private calculateSM2(
    easeFactor: number,
    interval: number,
    repetitionLevel: number,
    correct: boolean
  ) {
    if (!correct) {
      return {
        easeFactor: Math.max(1.3, easeFactor - 0.2),
        interval: 0,
        repetitionLevel: 0,
      };
    }

    const quality = 4; // Assuming good performance
    const newEaseFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    let newInterval: number;
    const newRepetitionLevel = repetitionLevel + 1;

    if (newRepetitionLevel === 1) {
      newInterval = 1;
    } else if (newRepetitionLevel === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }

    return {
      easeFactor: newEaseFactor,
      interval: newInterval,
      repetitionLevel: newRepetitionLevel,
    };
  }

  /**
   * Convert snake_case to camelCase
   */
  private snakeToCamel(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.snakeToCamel(item));
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        acc[camelKey] = this.snakeToCamel(obj[key]);
        return acc;
      }, {} as any);
    }
    return obj;
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.camelToSnake(item));
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        acc[snakeKey] = this.camelToSnake(obj[key]);
        return acc;
      }, {} as any);
    }
    return obj;
  }

  /**
   * Close database connection
   */
  async close() {
    await this.db.destroy();
  }
}
