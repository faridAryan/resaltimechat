import { KnexDBService } from './knex-db-service';

/**
 * Reinforcement Learning Curriculum Service
 * Implements Adaptive Curriculum Learning inspired by:
 * - AdaCuRL (Adaptive Curriculum RL with difficulty estimation)
 * - AVAR-RL (Tailored RL for Vocabulary Mastery)
 * - AdaRFT (Adaptive Curriculum Reinforcement Finetuning)
 */
export class RLCurriculumService {
  private db: KnexDBService;

  // RL Hyperparameters
  private readonly LEARNING_RATE = 0.1; // α
  private readonly DISCOUNT_FACTOR = 0.95; // γ
  private readonly EPSILON = 0.2; // Exploration rate

  // Curriculum difficulty bands
  private readonly DIFFICULTY_LEVELS = ['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced'];
  private readonly TOPICS = [
    'grammar',
    'vocabulary',
    'conversation',
    'pronunciation',
    'listening',
    'reading',
    'writing',
  ];
  private readonly CONTENT_TYPES = ['conversation', 'reading', 'listening', 'speaking', 'vocabulary', 'grammar'];

  constructor() {
    this.db = KnexDBService.getInstance();
  }

  /**
   * Initialize curriculum state for a new user/language combination
   */
  async initializeCurriculum(userId: string, language: string): Promise<any> {
    const initialState = {
      estimatedProficiency: 0.0,
      currentDifficultyBand: 'beginner',
      topicMasteryScores: this.TOPICS.reduce((acc, topic) => {
        acc[topic] = 0.0;
        return acc;
      }, {} as Record<string, number>),
      recommendedNextTopic: 'vocabulary',
      recommendedDifficulty: 'beginner',
      recommendedContentType: 'conversation',
      curriculumProgress: 0.0,
      recentAccuracy: 0.0,
      consecutiveSuccesses: 0,
      consecutiveFailures: 0,
    };

    return await this.db.updateCurriculumState(userId, language, initialState);
  }

  /**
   * Adaptive difficulty estimation based on recent performance
   * Implements coarse-to-fine difficulty estimation from AdaCuRL
   */
  async estimateDifficulty(
    userId: string,
    language: string,
    recentPerformance: Array<{ success: boolean; difficulty: string; topic: string }>
  ): Promise<string> {
    if (recentPerformance.length === 0) return 'beginner';

    // Calculate success rate
    const successRate = recentPerformance.filter(p => p.success).length / recentPerformance.length;

    // Get current curriculum state
    const state = await this.db.getCurriculumState(userId, language);
    if (!state) {
      await this.initializeCurriculum(userId, language);
      return 'beginner';
    }

    const currentDifficultyIndex = this.DIFFICULTY_LEVELS.indexOf(state.currentDifficultyBand || 'beginner');

    // Adaptive difficulty adjustment
    let newDifficultyIndex = currentDifficultyIndex;

    if (successRate >= 0.85 && state.consecutiveSuccesses >= 3) {
      // Increase difficulty if performing very well consistently
      newDifficultyIndex = Math.min(currentDifficultyIndex + 1, this.DIFFICULTY_LEVELS.length - 1);
    } else if (successRate < 0.5 && state.consecutiveFailures >= 3) {
      // Decrease difficulty if struggling
      newDifficultyIndex = Math.max(currentDifficultyIndex - 1, 0);
    }

    return this.DIFFICULTY_LEVELS[newDifficultyIndex];
  }

  /**
   * Generate personalized next lesson recommendation
   * Uses Q-learning to select optimal (topic, difficulty, content_type) combination
   */
  async getPersonalizedRecommendation(
    userId: string,
    language: string
  ): Promise<{
    topic: string;
    difficulty: string;
    contentType: string;
    rationale: string;
  }> {
    const state = await this.db.getCurriculumState(userId, language);
    if (!state) {
      await this.initializeCurriculum(userId, language);
      return {
        topic: 'vocabulary',
        difficulty: 'beginner',
        contentType: 'conversation',
        rationale: 'Starting with foundational vocabulary through conversation',
      };
    }

    // Build current state representation
    const stateKey = this.encodeState(state);

    // Epsilon-greedy action selection
    let selectedAction: { topic: string; difficulty: string; contentType: string };

    if (Math.random() < this.EPSILON) {
      // Exploration: random action
      selectedAction = this.getRandomAction(state);
    } else {
      // Exploitation: best known action
      selectedAction = await this.getBestAction(userId, language, stateKey, state);
    }

    const rationale = this.generateRationale(selectedAction, state);

    return {
      ...selectedAction,
      rationale,
    };
  }

  /**
   * Update Q-values based on learning outcome
   * Implements Q-learning update rule: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
   */
  async updateFromPerformance(
    userId: string,
    language: string,
    action: { topic: string; difficulty: string; contentType: string },
    performance: {
      accuracy: number;
      timeSpent: number;
      completed: boolean;
      enjoyment?: number;
    }
  ): Promise<void> {
    // Get current state
    const state = await this.db.getCurriculumState(userId, language);
    if (!state) return;

    const stateKey = this.encodeState(state);
    const actionKey = this.encodeAction(action);

    // Calculate reward
    const reward = this.calculateReward(performance, action.difficulty);

    // Get current Q-value
    const currentQValue = await this.db.getQValue(userId, language, stateKey, actionKey);
    const currentQ = currentQValue?.qValue || 0.0;

    // Update curriculum state based on performance
    const updatedState = this.updateState(state, performance, action);

    // Get next state key
    const nextStateKey = this.encodeState(updatedState);

    // Get max Q-value for next state
    const maxNextQ = await this.getMaxQValue(userId, language, nextStateKey);

    // Q-learning update
    const newQ = currentQ + this.LEARNING_RATE * (reward + this.DISCOUNT_FACTOR * maxNextQ - currentQ);

    // Store updated Q-value
    await this.db.updateQValue(userId, language, stateKey, actionKey, newQ);

    // Update curriculum state
    await this.db.updateCurriculumState(userId, language, updatedState);

    // Update memory patterns for error analysis
    if (performance.accuracy < 0.7) {
      await this.updateErrorPatterns(userId, language, action.topic, action.difficulty);
    }
  }

  /**
   * Calculate reward signal for RL
   * Balances accuracy, engagement, and difficulty appropriateness
   */
  private calculateReward(
    performance: {
      accuracy: number;
      timeSpent: number;
      completed: boolean;
      enjoyment?: number;
    },
    difficulty: string
  ): number {
    let reward = 0.0;

    // Accuracy component (0-10 points)
    reward += performance.accuracy * 10;

    // Completion bonus (5 points)
    if (performance.completed) {
      reward += 5;
    }

    // Engagement component based on time spent (0-5 points)
    // Optimal time: 5-15 minutes
    const timeComponent = performance.timeSpent >= 5 && performance.timeSpent <= 15 ? 5 :
      performance.timeSpent > 15 ? Math.max(0, 5 - (performance.timeSpent - 15) / 10) :
      performance.timeSpent * 1;
    reward += timeComponent;

    // Enjoyment bonus (0-5 points)
    if (performance.enjoyment !== undefined) {
      reward += performance.enjoyment * 5;
    }

    // Sweet spot bonus: accuracy between 70-85% indicates appropriate difficulty
    if (performance.accuracy >= 0.70 && performance.accuracy <= 0.85) {
      reward += 5;
    }

    return reward;
  }

  /**
   * Get best action from Q-values
   */
  private async getBestAction(
    userId: string,
    language: string,
    stateKey: string,
    state: any
  ): Promise<{ topic: string; difficulty: string; contentType: string }> {
    // Get all possible actions and their Q-values
    const actions: Array<{ topic: string; difficulty: string; contentType: string; qValue: number }> = [];

    // Focus on topics with lower mastery scores
    const sortedTopics = Object.entries(state.topicMasteryScores || {})
      .sort(([, a], [, b]) => (a as number) - (b as number))
      .map(([topic]) => topic)
      .slice(0, 3); // Top 3 weakest topics

    for (const topic of sortedTopics) {
      for (const contentType of this.CONTENT_TYPES) {
        const action = {
          topic,
          difficulty: state.currentDifficultyBand || 'beginner',
          contentType,
        };
        const actionKey = this.encodeAction(action);
        const qValue = await this.db.getQValue(userId, language, stateKey, actionKey);
        actions.push({ ...action, qValue: qValue?.qValue || 0.0 });
      }
    }

    // Return action with highest Q-value
    actions.sort((a, b) => b.qValue - a.qValue);
    return actions[0] || this.getRandomAction(state);
  }

  /**
   * Get random action for exploration
   */
  private getRandomAction(state: any): { topic: string; difficulty: string; contentType: string } {
    return {
      topic: this.TOPICS[Math.floor(Math.random() * this.TOPICS.length)],
      difficulty: state.currentDifficultyBand || 'beginner',
      contentType: this.CONTENT_TYPES[Math.floor(Math.random() * this.CONTENT_TYPES.length)],
    };
  }

  /**
   * Get maximum Q-value for next state
   */
  private async getMaxQValue(userId: string, language: string, stateKey: string): Promise<number> {
    // In practice, this would query all actions for the state
    // For simplicity, return 0 (can be improved)
    return 0.0;
  }

  /**
   * Update curriculum state based on performance
   */
  private updateState(state: any, performance: any, action: any): any {
    const updatedState = { ...state };

    // Update recent accuracy (exponential moving average)
    updatedState.recentAccuracy = 0.7 * (state.recentAccuracy || 0) + 0.3 * performance.accuracy;

    // Update consecutive successes/failures
    if (performance.accuracy >= 0.7) {
      updatedState.consecutiveSuccesses = (state.consecutiveSuccesses || 0) + 1;
      updatedState.consecutiveFailures = 0;
    } else {
      updatedState.consecutiveFailures = (state.consecutiveFailures || 0) + 1;
      updatedState.consecutiveSuccesses = 0;
    }

    // Update topic mastery scores
    const topicMastery = state.topicMasteryScores || {};
    topicMastery[action.topic] = 0.8 * (topicMastery[action.topic] || 0) + 0.2 * performance.accuracy;
    updatedState.topicMasteryScores = topicMastery;

    // Update estimated proficiency (average of topic masteries)
    const masteryValues = Object.values(topicMastery) as number[];
    updatedState.estimatedProficiency = masteryValues.reduce((sum, val) => sum + val, 0) / masteryValues.length;

    // Update curriculum progress
    updatedState.curriculumProgress = Math.min(1.0, updatedState.estimatedProficiency);

    return updatedState;
  }

  /**
   * Encode state as string key
   */
  private encodeState(state: any): string {
    const proficiency = Math.floor((state.estimatedProficiency || 0) * 10) / 10;
    const recentAccuracy = Math.floor((state.recentAccuracy || 0) * 10) / 10;
    return `prof_${proficiency}_acc_${recentAccuracy}_diff_${state.currentDifficultyBand}`;
  }

  /**
   * Encode action as string key
   */
  private encodeAction(action: { topic: string; difficulty: string; contentType: string }): string {
    return `${action.topic}_${action.difficulty}_${action.contentType}`;
  }

  /**
   * Generate human-readable rationale for recommendation
   */
  private generateRationale(action: any, state: any): string {
    const topicMastery = (state.topicMasteryScores?.[action.topic] || 0) * 100;
    const proficiency = (state.estimatedProficiency || 0) * 100;

    return `Based on your ${proficiency.toFixed(0)}% overall proficiency and ${topicMastery.toFixed(0)}% mastery in ${action.topic}, we recommend practicing through ${action.contentType} at ${action.difficulty} level to optimize your learning.`;
  }

  /**
   * Update error patterns for long-term memory
   */
  private async updateErrorPatterns(
    userId: string,
    language: string,
    topic: string,
    difficulty: string
  ): Promise<void> {
    const patterns = await this.db.getMemoryPatterns(userId, language, 'error_patterns');
    const existingData = patterns.length > 0 ? patterns[0].patternData : {};

    const key = `${topic}_${difficulty}`;
    existingData[key] = (existingData[key] || 0) + 1;

    await this.db.createOrUpdateMemoryPattern(
      userId,
      language,
      'error_patterns',
      existingData,
      0.8 // High confidence in error patterns
    );
  }

  /**
   * Get learning analytics for user dashboard
   */
  async getLearningAnalytics(userId: string, language: string): Promise<any> {
    const state = await this.db.getCurriculumState(userId, language);
    if (!state) return null;

    const patterns = await this.db.getMemoryPatterns(userId, language);

    return {
      proficiency: state.estimatedProficiency,
      proficiencyPercentage: (state.estimatedProficiency * 100).toFixed(1),
      currentLevel: state.currentDifficultyBand,
      topicMastery: state.topicMasteryScores,
      recommendedFocus: state.recommendedNextTopic,
      curriculumProgress: state.curriculumProgress,
      recentAccuracy: state.recentAccuracy,
      streak: {
        successes: state.consecutiveSuccesses,
        failures: state.consecutiveFailures,
      },
      patterns: patterns.map(p => ({
        type: p.patternType,
        data: p.patternData,
        confidence: p.confidence,
      })),
    };
  }
}
