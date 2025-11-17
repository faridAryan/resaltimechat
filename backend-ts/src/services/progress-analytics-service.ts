import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import knex from '../config/database';
import { RLCurriculumService } from './rl-curriculum-service';

/**
 * Progress Analytics Dashboard Service
 *
 * Provides comprehensive learning analytics, insights, and predictions.
 * Features:
 * - Time-series progress tracking
 * - Skill breakdown analysis
 * - Learning velocity metrics
 * - Predictive goal achievement estimates
 * - Personalized recommendations
 * - Comparative benchmarking
 * - Weak area identification
 * - Study habit analysis
 */
export class ProgressAnalyticsService {
  private llm: ChatGoogleGenerativeAI;
  private rlService: RLCurriculumService;

  // Zod schemas
  private insightsSchema = z.object({
    keyStrengths: z.array(z.string()),
    areasForImprovement: z.array(z.string()),
    learningPatterns: z.array(z.string()),
    recommendations: z.array(z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(['high', 'medium', 'low']),
    })),
    motivationalMessage: z.string(),
  });

  private predictionSchema = z.object({
    estimatedTimeToGoal: z.number().describe('Days to reach goal'),
    confidence: z.number().min(0).max(100),
    factors: z.array(z.string()),
    milestones: z.array(z.object({
      date: z.string(),
      description: z.string(),
    })),
  });

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.0-flash',
      apiKey: process.env.GOOGLE_API_KEY!,
      temperature: 0.3, // Lower for more factual insights
    });
    this.rlService = new RLCurriculumService();
  }

  /**
   * Get comprehensive dashboard overview
   */
  async getDashboard(userId: string, language: string): Promise<{
    overview: any;
    skillBreakdown: any;
    activityTimeline: any[];
    achievements: any[];
    insights: any;
    predictions: any;
  }> {
    const [overview, skillBreakdown, activityTimeline, achievements, insights, predictions] =
      await Promise.all([
        this.getOverview(userId, language),
        this.getSkillBreakdown(userId, language),
        this.getActivityTimeline(userId, language, 30),
        this.getRecentAchievements(userId, language),
        this.generateInsights(userId, language),
        this.predictGoalAchievement(userId, language, 'B2'),
      ]);

    return {
      overview,
      skillBreakdown,
      activityTimeline,
      achievements,
      insights,
      predictions,
    };
  }

  /**
   * Get overview statistics
   */
  async getOverview(userId: string, language: string): Promise<{
    totalStudyTime: number;
    currentStreak: number;
    longestStreak: number;
    wordsLearned: number;
    conversationsCompleted: number;
    pronunciationScore: number;
    fluencyScore: number;
    currentLevel: string;
    nextMilestone: string;
  }> {
    // Total study time from all sessions
    const dialogueSessions = await knex('real_time_dialogue_sessions')
      .where({ user_id: userId, language, status: 'completed' })
      .select('started_at', 'ended_at');

    const totalStudyTime = dialogueSessions.reduce((total, session) => {
      if (session.ended_at) {
        return total + (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime());
      }
      return total;
    }, 0) / (1000 * 60); // Convert to minutes

    // Current streak
    const currentStreak = await this.calculateCurrentStreak(userId, language);
    const longestStreak = await this.calculateLongestStreak(userId, language);

    // Words learned
    const wordsLearned = await knex('vocabulary_reviews')
      .join('vocabulary_cards', 'vocabulary_reviews.card_id', 'vocabulary_cards.id')
      .join('vocabulary_decks', 'vocabulary_cards.deck_id', 'vocabulary_decks.id')
      .where({ 'vocabulary_reviews.user_id': userId, 'vocabulary_decks.language': language })
      .where('vocabulary_reviews.repetitions', '>=', 1)
      .countDistinct('vocabulary_cards.id as count')
      .first();

    // Conversations completed
    const conversationsCompleted = await knex('real_time_dialogue_sessions')
      .where({ user_id: userId, language, status: 'completed' })
      .count('id as count')
      .first();

    // Average pronunciation and fluency
    const avgScores = await knex('real_time_dialogue_sessions')
      .where({ user_id: userId, language, status: 'completed' })
      .whereNotNull('avg_pronunciation_score')
      .avg('avg_pronunciation_score as pronunciation')
      .avg('avg_fluency_score as fluency')
      .first();

    // Current level from user profile
    const [profile] = await knex('user_profiles')
      .where({ user_id: userId })
      .select('proficiency_level');

    return {
      totalStudyTime: Math.round(totalStudyTime),
      currentStreak,
      longestStreak,
      wordsLearned: parseInt(wordsLearned?.count as string) || 0,
      conversationsCompleted: parseInt(conversationsCompleted?.count as string) || 0,
      pronunciationScore: Math.round(parseFloat(avgScores?.pronunciation as string) || 0),
      fluencyScore: Math.round(parseFloat(avgScores?.fluency as string) || 0),
      currentLevel: profile?.proficiency_level || 'A1',
      nextMilestone: this.getNextMilestone(profile?.proficiency_level || 'A1'),
    };
  }

  /**
   * Get skill breakdown
   */
  async getSkillBreakdown(userId: string, language: string): Promise<{
    speaking: number;
    listening: number;
    reading: number;
    writing: number;
    vocabulary: number;
    grammar: number;
    pronunciation: number;
  }> {
    const curriculumState = await this.rlService.getCurriculumState(userId, language);

    // Calculate scores from various sources
    const dialogueScores = await knex('real_time_dialogue_sessions')
      .where({ user_id: userId, language, status: 'completed' })
      .avg('avg_pronunciation_score as pronunciation')
      .avg('avg_fluency_score as fluency')
      .first();

    const vocabularyScore = await this.calculateVocabularyScore(userId, language);
    const grammarScore = await this.calculateGrammarScore(userId, language);

    return {
      speaking: Math.round(parseFloat(dialogueScores?.fluency as string) || 50),
      listening: curriculumState.overallProgress || 50,
      reading: 50, // Placeholder - will be calculated from reading exercises
      writing: 50, // Placeholder - will be calculated from writing exercises
      vocabulary: vocabularyScore,
      grammar: grammarScore,
      pronunciation: Math.round(parseFloat(dialogueScores?.pronunciation as string) || 50),
    };
  }

  /**
   * Get activity timeline
   */
  async getActivityTimeline(
    userId: string,
    language: string,
    days: number = 30
  ): Promise<Array<{
    date: string;
    studyMinutes: number;
    activitiesCompleted: number;
    wordsReviewed: number;
    conversationsSessions: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get dialogue sessions
    const dialogueSessions = await knex('real_time_dialogue_sessions')
      .where({ user_id: userId, language, status: 'completed' })
      .where('started_at', '>=', startDate)
      .select('started_at', 'ended_at');

    // Get vocabulary reviews
    const vocabReviews = await knex('vocabulary_review_history')
      .join('vocabulary_cards', 'vocabulary_review_history.card_id', 'vocabulary_cards.id')
      .join('vocabulary_decks', 'vocabulary_cards.deck_id', 'vocabulary_decks.id')
      .where({ 'vocabulary_review_history.user_id': userId, 'vocabulary_decks.language': language })
      .where('vocabulary_review_history.reviewed_at', '>=', startDate)
      .select(knex.raw('DATE(reviewed_at) as date'), knex.raw('COUNT(*) as count'))
      .groupByRaw('DATE(reviewed_at)');

    // Build timeline
    const timeline: any[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Calculate study minutes for this day
      const daySessions = dialogueSessions.filter((session) => {
        const sessionDate = new Date(session.started_at).toISOString().split('T')[0];
        return sessionDate === dateStr;
      });

      const studyMinutes = daySessions.reduce((total, session) => {
        if (session.ended_at) {
          return total + (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime());
        }
        return total;
      }, 0) / (1000 * 60);

      const dayReviews = vocabReviews.find((r) => r.date === dateStr);

      timeline.push({
        date: dateStr,
        studyMinutes: Math.round(studyMinutes),
        activitiesCompleted: daySessions.length + (dayReviews ? parseInt(dayReviews.count) : 0),
        wordsReviewed: dayReviews ? parseInt(dayReviews.count) : 0,
        conversationsSessions: daySessions.length,
      });
    }

    return timeline.reverse();
  }

  /**
   * Get recent achievements
   */
  async getRecentAchievements(
    userId: string,
    language: string,
    limit: number = 10
  ): Promise<any[]> {
    // Get from dialogue achievements
    const dialogueAchievements = await knex('dialogue_achievements')
      .where({ user_id: userId, language })
      .orderBy('earned_at', 'desc')
      .limit(limit)
      .select('*');

    return dialogueAchievements.map((ach) => ({
      type: ach.achievement_type,
      name: ach.achievement_name,
      description: ach.description,
      earnedAt: ach.earned_at,
    }));
  }

  /**
   * Generate AI-powered insights
   */
  async generateInsights(userId: string, language: string): Promise<any> {
    const overview = await this.getOverview(userId, language);
    const skillBreakdown = await this.getSkillBreakdown(userId, language);
    const timeline = await this.getActivityTimeline(userId, language, 30);

    const parser = StructuredOutputParser.fromZodSchema(this.insightsSchema);

    const prompt = ChatPromptTemplate.fromTemplate(`
Analyze this language learning progress data and provide personalized insights for a {language} learner.

Progress Overview:
- Total study time: {totalStudyTime} minutes
- Current streak: {currentStreak} days
- Longest streak: {longestStreak} days
- Words learned: {wordsLearned}
- Conversations completed: {conversationsCompleted}
- Current level: {currentLevel}

Skill Breakdown (0-100):
- Speaking: {speaking}
- Vocabulary: {vocabulary}
- Grammar: {grammar}
- Pronunciation: {pronunciation}

Recent Activity:
{activitySummary}

Provide:
1. Key strengths (3-5 specific strengths)
2. Areas for improvement (3-5 specific areas)
3. Learning patterns observed (2-3 patterns)
4. Personalized recommendations (3-5 actionable recommendations with priority)
5. Motivational message (encouraging and specific)

{format_instructions}
`);

    const chain = prompt.pipe(this.llm).pipe(parser);

    const activitySummary = timeline
      .slice(-7)
      .map((day) => `${day.date}: ${day.studyMinutes}min, ${day.activitiesCompleted} activities`)
      .join('\n');

    try {
      const insights = await chain.invoke({
        language,
        totalStudyTime: overview.totalStudyTime.toString(),
        currentStreak: overview.currentStreak.toString(),
        longestStreak: overview.longestStreak.toString(),
        wordsLearned: overview.wordsLearned.toString(),
        conversationsCompleted: overview.conversationsCompleted.toString(),
        currentLevel: overview.currentLevel,
        speaking: skillBreakdown.speaking.toString(),
        vocabulary: skillBreakdown.vocabulary.toString(),
        grammar: skillBreakdown.grammar.toString(),
        pronunciation: skillBreakdown.pronunciation.toString(),
        activitySummary,
        format_instructions: parser.getFormatInstructions(),
      });

      return insights;
    } catch (e) {
      console.error('Error generating insights:', e);
      return {
        keyStrengths: ['Making consistent progress'],
        areasForImprovement: ['Continue practicing regularly'],
        learningPatterns: ['Steady learning pace'],
        recommendations: [
          {
            title: 'Keep up the good work',
            description: 'Continue your current study routine',
            priority: 'medium',
          },
        ],
        motivationalMessage: 'Great job on your learning journey!',
      };
    }
  }

  /**
   * Predict goal achievement
   */
  async predictGoalAchievement(
    userId: string,
    language: string,
    targetLevel: string
  ): Promise<any> {
    const overview = await this.getOverview(userId, language);
    const timeline = await this.getActivityTimeline(userId, language, 30);

    // Calculate learning velocity
    const recentProgress = timeline.slice(-14); // Last 2 weeks
    const avgDailyMinutes =
      recentProgress.reduce((sum, day) => sum + day.studyMinutes, 0) / recentProgress.length;

    const parser = StructuredOutputParser.fromZodSchema(this.predictionSchema);

    const prompt = ChatPromptTemplate.fromTemplate(`
Predict when a {language} learner will reach {targetLevel} level.

Current Progress:
- Current level: {currentLevel}
- Total study time: {totalStudyTime} minutes
- Average daily study: {avgDailyMinutes} minutes
- Current streak: {currentStreak} days
- Words learned: {wordsLearned}

Provide a realistic prediction with:
1. Estimated time to goal (in days)
2. Confidence level (0-100)
3. Key factors affecting the prediction
4. Milestones along the way

{format_instructions}
`);

    const chain = prompt.pipe(this.llm).pipe(parser);

    try {
      const prediction = await chain.invoke({
        language,
        targetLevel,
        currentLevel: overview.currentLevel,
        totalStudyTime: overview.totalStudyTime.toString(),
        avgDailyMinutes: avgDailyMinutes.toFixed(1),
        currentStreak: overview.currentStreak.toString(),
        wordsLearned: overview.wordsLearned.toString(),
        format_instructions: parser.getFormatInstructions(),
      });

      return prediction;
    } catch (e) {
      console.error('Error generating prediction:', e);
      return {
        estimatedTimeToGoal: 180,
        confidence: 50,
        factors: ['Based on average learning pace'],
        milestones: [],
      };
    }
  }

  /**
   * Compare with peers (anonymized benchmarking)
   */
  async compareWithPeers(userId: string, language: string): Promise<{
    percentile: number;
    averageStudyTime: number;
    yourStudyTime: number;
    averageStreak: number;
    yourStreak: number;
    averageWordsLearned: number;
    yourWordsLearned: number;
  }> {
    const yourOverview = await this.getOverview(userId, language);

    // Get anonymized peer statistics
    const peerStats = await knex('user_profiles')
      .join('users', 'user_profiles.user_id', 'users.id')
      .where('user_profiles.proficiency_level', yourOverview.currentLevel)
      .select(knex.raw('AVG(total_study_minutes) as avg_study_time'))
      .first();

    // Calculate percentile based on study time
    const usersWithLessTime = await knex('user_profiles')
      .where('total_study_minutes', '<', yourOverview.totalStudyTime)
      .count('user_id as count')
      .first();

    const totalUsers = await knex('user_profiles').count('user_id as count').first();

    const percentile =
      (parseInt(usersWithLessTime?.count as string) / parseInt(totalUsers?.count as string)) * 100;

    return {
      percentile: Math.round(percentile),
      averageStudyTime: Math.round(parseFloat(peerStats?.avg_study_time as string) || 0),
      yourStudyTime: yourOverview.totalStudyTime,
      averageStreak: 7, // Placeholder
      yourStreak: yourOverview.currentStreak,
      averageWordsLearned: 500, // Placeholder
      yourWordsLearned: yourOverview.wordsLearned,
    };
  }

  /**
   * Get learning velocity (progress rate)
   */
  async getLearningVelocity(
    userId: string,
    language: string
  ): Promise<{
    wordsPerWeek: number;
    minutesPerDay: number;
    sessionsPerWeek: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }> {
    const timeline = await this.getActivityTimeline(userId, language, 28);

    const lastWeek = timeline.slice(-7);
    const previousWeek = timeline.slice(-14, -7);

    const lastWeekWords = lastWeek.reduce((sum, day) => sum + day.wordsReviewed, 0);
    const previousWeekWords = previousWeek.reduce((sum, day) => sum + day.wordsReviewed, 0);

    const lastWeekMinutes = lastWeek.reduce((sum, day) => sum + day.studyMinutes, 0);
    const lastWeekSessions = lastWeek.reduce((sum, day) => sum + day.conversationsSessions, 0);

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (lastWeekMinutes > lastWeek.reduce((sum, day) => sum + day.studyMinutes, 0) * 1.1) {
      trend = 'increasing';
    } else if (lastWeekMinutes < previousWeek.reduce((sum, day) => sum + day.studyMinutes, 0) * 0.9) {
      trend = 'decreasing';
    }

    return {
      wordsPerWeek: lastWeekWords,
      minutesPerDay: Math.round(lastWeekMinutes / 7),
      sessionsPerWeek: lastWeekSessions,
      trend,
    };
  }

  // Helper methods

  private async calculateCurrentStreak(userId: string, language: string): Promise<number> {
    const activities = await knex.raw(`
      SELECT DISTINCT DATE(started_at) as activity_date
      FROM real_time_dialogue_sessions
      WHERE user_id = ? AND language = ? AND status = 'completed'
      UNION
      SELECT DISTINCT DATE(reviewed_at) as activity_date
      FROM vocabulary_review_history
      WHERE user_id = ?
      ORDER BY activity_date DESC
    `, [userId, language, userId]);

    if (activities.rows.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < activities.rows.length; i++) {
      const activityDate = new Date(activities.rows[i].activity_date);
      activityDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (activityDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private async calculateLongestStreak(userId: string, language: string): Promise<number> {
    // Similar to current streak but finds the longest consecutive period
    // Simplified implementation
    return 14; // Placeholder
  }

  private async calculateVocabularyScore(userId: string, language: string): Promise<number> {
    const stats = await knex('vocabulary_reviews')
      .join('vocabulary_cards', 'vocabulary_reviews.card_id', 'vocabulary_cards.id')
      .join('vocabulary_decks', 'vocabulary_cards.deck_id', 'vocabulary_decks.id')
      .where({ 'vocabulary_reviews.user_id': userId, 'vocabulary_decks.language': language })
      .avg('easiness_factor as avg_ef')
      .first();

    const avgEF = parseFloat(stats?.avg_ef as string) || 2.5;
    // Convert EF (1.3-2.5) to score (0-100)
    return Math.round(((avgEF - 1.3) / (2.5 - 1.3)) * 100);
  }

  private async calculateGrammarScore(userId: string, language: string): Promise<number> {
    const sessions = await knex('real_time_dialogue_sessions')
      .where({ user_id: userId, language, status: 'completed' })
      .select('grammar_issues', 'user_turns');

    if (sessions.length === 0) return 50;

    const avgIssuesPerTurn =
      sessions.reduce((sum, s) => sum + (s.grammar_issues || 0) / (s.user_turns || 1), 0) /
      sessions.length;

    // Convert issues per turn to score (fewer issues = higher score)
    return Math.max(0, Math.min(100, 100 - avgIssuesPerTurn * 10));
  }

  private getNextMilestone(currentLevel: string): string {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : 'Mastery';
  }
}
