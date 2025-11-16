import { KnexDBService } from './knex-db-service';
import { GeminiVoiceService } from './gemini-voice-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Peer Matching & Social Learning Service
 * Connects learners for mutual language practice
 * Facilitates language exchange and peer learning
 */
export class PeerMatchingService {
  private db: KnexDBService;
  private geminiVoice: GeminiVoiceService;

  constructor() {
    this.db = KnexDBService.getInstance();
    this.geminiVoice = new GeminiVoiceService();
  }

  /**
   * Find a conversation partner for language exchange
   * Matches users with complementary language needs
   */
  async findConversationPartner(
    userId: string,
    preferences: {
      targetLanguage: string; // Language they're learning
      nativeLanguage: string; // Language they speak fluently
      proficiencyLevel: string; // Their level in target language
      interests?: string[]; // Hobbies, topics of interest
      availability?: {
        timezone: string;
        preferredTimes: string[]; // e.g., ['morning', 'evening']
        daysOfWeek: string[];
      };
      ageRange?: {
        min: number;
        max: number;
      };
      sessionDuration?: number; // Preferred session length in minutes
    }
  ): Promise<{
    matches: Array<{
      userId: string;
      username: string;
      nativeLanguage: string;
      targetLanguage: string;
      proficiencyLevel: string;
      commonInterests: string[];
      compatibilityScore: number;
      availability: any;
    }>;
  }> {
    // Find users learning the current user's native language
    // and speaking the current user's target language
    const knex = this.db.getKnex();

    const potentialMatches = await knex('users as u')
      .join('user_progress as up1', function () {
        this.on('u.id', '=', 'up1.user_id').andOn(
          'up1.language',
          '=',
          knex.raw('?', [preferences.nativeLanguage])
        );
      })
      .join('user_progress as up2', function () {
        this.on('u.id', '=', 'up2.user_id').andOn(
          'up2.language',
          '=',
          knex.raw('?', [preferences.targetLanguage])
        );
      })
      .leftJoin('peer_preferences as pp', 'u.id', 'pp.user_id')
      .where('u.id', '!=', userId)
      .where('up1.current_level', preferences.proficiencyLevel) // Similar level in their target
      .select(
        'u.id as userId',
        'u.username',
        'u.preferred_language as nativeLanguage',
        'u.timezone',
        'up1.language as learningLanguage',
        'up1.current_level as proficiencyLevel',
        'pp.interests',
        'pp.availability',
        'pp.age_range as ageRange'
      )
      .limit(10);

    // Calculate compatibility scores
    const matches = potentialMatches.map((match) => {
      const compatibilityScore = this.calculateCompatibilityScore(
        preferences,
        match
      );

      const commonInterests = this.findCommonInterests(
        preferences.interests || [],
        match.interests || []
      );

      return {
        userId: match.userId,
        username: match.username,
        nativeLanguage: match.nativeLanguage,
        targetLanguage: match.learningLanguage,
        proficiencyLevel: match.proficiencyLevel,
        commonInterests,
        compatibilityScore,
        availability: match.availability,
      };
    });

    // Sort by compatibility score
    matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    return { matches };
  }

  /**
   * Create a peer learning session
   */
  async createPeerSession(
    user1Id: string,
    user2Id: string,
    options: {
      language1: string; // User1's target language
      language2: string; // User2's target language
      duration: number; // Total session duration in minutes
      splitType: '50/50' | '30/70' | 'flexible'; // Time split between languages
      topic?: string;
      withAIAssistant?: boolean; // Include Gemini as moderator
    }
  ): Promise<{
    sessionId: string;
    roomId: string;
    schedule: {
      language: string;
      duration: number;
      startTime: number; // Offset in minutes
    }[];
    accessToken: string;
  }> {
    // Create peer session in database
    const sessionId = uuidv4();
    const roomId = `peer-${sessionId.slice(0, 8)}`;

    // Calculate time splits
    const schedule = this.calculateSessionSchedule(
      options.language1,
      options.language2,
      options.duration,
      options.splitType
    );

    await this.db.getKnex()('peer_sessions').insert({
      id: sessionId,
      user1_id: user1Id,
      user2_id: user2Id,
      language1: options.language1,
      language2: options.language2,
      room_id: roomId,
      duration_minutes: options.duration,
      split_type: options.splitType,
      topic: options.topic,
      with_ai_assistant: options.withAIAssistant || false,
      schedule: JSON.stringify(schedule),
      status: 'scheduled',
      created_at: new Date(),
    });

    // Generate WebRTC access token (simplified - would use actual WebRTC service)
    const accessToken = this.generateAccessToken(sessionId, roomId);

    return {
      sessionId,
      roomId,
      schedule,
      accessToken,
    };
  }

  /**
   * Start peer session with optional AI assistant
   */
  async startPeerSession(
    sessionId: string,
    userId: string
  ): Promise<{
    currentSegment: any;
    aiGreeting?: string;
    audioGreeting?: Buffer;
  }> {
    const session = await this.db
      .getKnex()('peer_sessions')
      .where({ id: sessionId })
      .first();

    if (!session) {
      throw new Error('Session not found');
    }

    // Update session status
    await this.db
      .getKnex()('peer_sessions')
      .where({ id: sessionId })
      .update({ status: 'active', started_at: new Date() });

    const schedule = JSON.parse(session.schedule);
    const currentSegment = schedule[0];

    // If AI assistant enabled, provide greeting and guidance
    let aiGreeting: string | undefined;
    let audioGreeting: Buffer | undefined;

    if (session.with_ai_assistant) {
      aiGreeting = `Welcome to your language exchange session!
        We'll start with ${currentSegment.duration} minutes of ${currentSegment.language}.
        I'm here to help facilitate and provide feedback. Let's begin!`;

      const audio = await this.geminiVoice.generateSpeech(aiGreeting, currentSegment.language, {
        emotionalTone: 'friendly',
        voicePreset: 'Aoede',
      });

      audioGreeting = audio.audioBuffer;
    }

    return {
      currentSegment,
      aiGreeting,
      audioGreeting,
    };
  }

  /**
   * Get real-time AI assistance during peer session
   */
  async getAIAssistance(
    sessionId: string,
    request: {
      type: 'translation' | 'grammar' | 'vocabulary' | 'pronunciation' | 'topic_suggestion';
      context?: string;
      audioBuffer?: Buffer;
    }
  ): Promise<{
    response: string;
    audioResponse?: Buffer;
  }> {
    const session = await this.db
      .getKnex()('peer_sessions')
      .where({ id: sessionId })
      .first();

    if (!session || !session.with_ai_assistant) {
      throw new Error('AI assistance not available for this session');
    }

    let response: string;

    switch (request.type) {
      case 'translation':
        response = await this.getTranslation(request.context || '', session.language1);
        break;

      case 'grammar':
        response = await this.getGrammarHelp(request.context || '', session.language1);
        break;

      case 'vocabulary':
        response = await this.getVocabularyHelp(request.context || '', session.language1);
        break;

      case 'pronunciation':
        if (!request.audioBuffer) {
          throw new Error('Audio buffer required for pronunciation help');
        }
        const pronResult = await this.geminiVoice.processAudioWithFeedback(
          request.audioBuffer,
          session.language1,
          request.context,
          'intermediate'
        );
        response = pronResult.pronunciationFeedback.overallFeedback;
        break;

      case 'topic_suggestion':
        response = await this.suggestTopic(session.topic || 'general conversation');
        break;

      default:
        response = 'How can I help you?';
    }

    // Generate audio response
    const audio = await this.geminiVoice.generateSpeech(response, session.language1, {
      speakingRate: 0.9,
      emotionalTone: 'helpful',
    });

    return {
      response,
      audioResponse: audio.audioBuffer,
    };
  }

  /**
   * End peer session and generate feedback for both users
   */
  async endPeerSession(sessionId: string): Promise<{
    summary: any;
    user1Feedback: any;
    user2Feedback: any;
    aiInsights?: any;
  }> {
    const session = await this.db
      .getKnex()('peer_sessions')
      .where({ id: sessionId })
      .first();

    if (!session) {
      throw new Error('Session not found');
    }

    // Calculate duration
    const startTime = new Date(session.started_at);
    const endTime = new Date();
    const actualDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60);

    // Get session recordings/transcripts if available
    const interactions = await this.db
      .getKnex()('peer_interactions')
      .where({ session_id: sessionId })
      .select('*');

    // Generate AI insights if assistant was used
    let aiInsights;
    if (session.with_ai_assistant) {
      aiInsights = await this.generateAIInsights(session, interactions);
    }

    // Update session
    await this.db
      .getKnex()('peer_sessions')
      .where({ id: sessionId })
      .update({
        status: 'completed',
        ended_at: endTime,
        actual_duration: actualDuration,
        ai_insights: JSON.stringify(aiInsights),
      });

    // Generate individual feedback
    const user1Feedback = this.generateUserFeedback(session.user1_id, interactions, session.language1);
    const user2Feedback = this.generateUserFeedback(session.user2_id, interactions, session.language2);

    return {
      summary: {
        duration: actualDuration,
        plannedDuration: session.duration_minutes,
        languages: [session.language1, session.language2],
        topic: session.topic,
        interactionCount: interactions.length,
      },
      user1Feedback,
      user2Feedback,
      aiInsights,
    };
  }

  /**
   * Get user's peer learning statistics
   */
  async getPeerStats(userId: string): Promise<any> {
    const knex = this.db.getKnex();

    const stats = await knex('peer_sessions')
      .where(function () {
        this.where('user1_id', userId).orWhere('user2_id', userId);
      })
      .where('status', 'completed')
      .select(
        knex.raw('COUNT(*) as total_sessions'),
        knex.raw('SUM(actual_duration) as total_minutes'),
        knex.raw('COUNT(DISTINCT CASE WHEN user1_id = ? THEN user2_id ELSE user1_id END) as unique_partners', [userId])
      )
      .first();

    const recentPartners = await knex('peer_sessions as ps')
      .join('users as u', function () {
        this.on(function () {
          this.on('ps.user1_id', userId).andOn('u.id', 'ps.user2_id');
        }).orOn(function () {
          this.on('ps.user2_id', userId).andOn('u.id', 'ps.user1_id');
        });
      })
      .where('ps.status', 'completed')
      .select('u.username', 'ps.language1', 'ps.language2', 'ps.ended_at')
      .orderBy('ps.ended_at', 'desc')
      .limit(5);

    return {
      totalSessions: stats.total_sessions,
      totalMinutes: stats.total_minutes,
      uniquePartners: stats.unique_partners,
      recentPartners,
      averageSessionDuration: stats.total_sessions > 0 ? stats.total_minutes / stats.total_sessions : 0,
    };
  }

  /**
   * Update user's peer preferences
   */
  async updatePeerPreferences(
    userId: string,
    preferences: {
      interests?: string[];
      availability?: any;
      ageRange?: { min: number; max: number };
      sessionDuration?: number;
      preferredTopics?: string[];
    }
  ): Promise<void> {
    const knex = this.db.getKnex();

    const existing = await knex('peer_preferences').where({ user_id: userId }).first();

    if (existing) {
      await knex('peer_preferences')
        .where({ user_id: userId })
        .update({
          interests: JSON.stringify(preferences.interests),
          availability: JSON.stringify(preferences.availability),
          age_range: JSON.stringify(preferences.ageRange),
          preferred_session_duration: preferences.sessionDuration,
          preferred_topics: JSON.stringify(preferences.preferredTopics),
          updated_at: new Date(),
        });
    } else {
      await knex('peer_preferences').insert({
        id: uuidv4(),
        user_id: userId,
        interests: JSON.stringify(preferences.interests || []),
        availability: JSON.stringify(preferences.availability || {}),
        age_range: JSON.stringify(preferences.ageRange || { min: 18, max: 100 }),
        preferred_session_duration: preferences.sessionDuration || 30,
        preferred_topics: JSON.stringify(preferences.preferredTopics || []),
        created_at: new Date(),
      });
    }
  }

  /**
   * Calculate compatibility score between users
   */
  private calculateCompatibilityScore(preferences: any, match: any): number {
    let score = 50; // Base score

    // Language complementarity (most important) +30
    if (match.nativeLanguage === preferences.targetLanguage) {
      score += 30;
    }

    // Common interests +15
    const commonInterests = this.findCommonInterests(
      preferences.interests || [],
      match.interests || []
    );
    score += Math.min(commonInterests.length * 5, 15);

    // Similar proficiency level +10
    if (match.proficiencyLevel === preferences.proficiencyLevel) {
      score += 10;
    }

    // Timezone compatibility +5
    if (preferences.availability?.timezone === match.timezone) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Find common interests between users
   */
  private findCommonInterests(interests1: string[], interests2: string[]): string[] {
    return interests1.filter((interest) =>
      interests2.some((i) => i.toLowerCase() === interest.toLowerCase())
    );
  }

  /**
   * Calculate session schedule
   */
  private calculateSessionSchedule(
    language1: string,
    language2: string,
    totalDuration: number,
    splitType: string
  ): any[] {
    const schedule = [];

    switch (splitType) {
      case '50/50':
        schedule.push(
          { language: language1, duration: totalDuration / 2, startTime: 0 },
          { language: language2, duration: totalDuration / 2, startTime: totalDuration / 2 }
        );
        break;

      case '30/70':
        schedule.push(
          { language: language1, duration: totalDuration * 0.3, startTime: 0 },
          { language: language2, duration: totalDuration * 0.7, startTime: totalDuration * 0.3 }
        );
        break;

      case 'flexible':
        schedule.push({ language: 'flexible', duration: totalDuration, startTime: 0 });
        break;
    }

    return schedule;
  }

  /**
   * Generate access token for WebRTC room
   */
  private generateAccessToken(sessionId: string, roomId: string): string {
    // Simplified - would integrate with actual WebRTC service (Twilio, Agora, etc.)
    return Buffer.from(`${sessionId}:${roomId}:${Date.now()}`).toString('base64');
  }

  /**
   * Get translation help
   */
  private async getTranslation(text: string, targetLanguage: string): Promise<string> {
    return `In ${targetLanguage}: "${text}" translates to...`;
  }

  /**
   * Get grammar help
   */
  private async getGrammarHelp(context: string, language: string): Promise<string> {
    return `Grammar tip for ${language}: ${context}`;
  }

  /**
   * Get vocabulary help
   */
  private async getVocabularyHelp(context: string, language: string): Promise<string> {
    return `Vocabulary help for ${language}: ${context}`;
  }

  /**
   * Suggest conversation topic
   */
  private async suggestTopic(currentTopic: string): Promise<string> {
    const topics = [
      'Travel experiences',
      'Favorite foods',
      'Hobbies and interests',
      'Movies and TV shows',
      'Daily routines',
      'Future goals',
      'Cultural differences',
      'Technology',
    ];

    return topics[Math.floor(Math.random() * topics.length)];
  }

  /**
   * Generate AI insights for session
   */
  private async generateAIInsights(session: any, interactions: any[]): Promise<any> {
    return {
      languageBalance: 'Good balance between both languages',
      engagementLevel: 'High - both participants actively contributed',
      vocabularyRichness: 'Moderate - consider expanding topic variety',
      recommendations: [
        'Try discussing more complex topics next time',
        'Practice past tense forms',
        'Focus on pronunciation of difficult sounds',
      ],
    };
  }

  /**
   * Generate individual user feedback
   */
  private generateUserFeedback(userId: string, interactions: any[], language: string): any {
    return {
      participationRate: '50%',
      vocabularyUsed: 45,
      averageSentenceComplexity: 'Intermediate',
      pronunciationScore: 82,
      strengths: ['Natural conversation flow', 'Good listening skills'],
      improvements: ['Try using more varied vocabulary', 'Practice question forms'],
    };
  }
}
