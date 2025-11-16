// Core domain types for Learno platform

export interface User {
  userId: string;
  username: string;
  email?: string;
  createdAt: string;
  lastLogin: string;
}

export interface UserProgress {
  userId: string;
  language: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  totalMessages: number;
  perfectMessages: number;
  totalCorrections: number;
  totalPracticeTime: number;
  lastPracticed: string;
  updatedAt: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  language: string;
  difficulty: string;
  messageCount: number;
  perfectMessages: number;
  corrections: number;
  duration: number;
  accuracyRate: number;
  createdAt: string;
  endedAt?: string;
  ttl?: number;
}

export interface ShortTermMemory {
  memoryId: string;
  userId: string;
  sessionId: string;
  language: string;
  memoryType: 'conversation' | 'correction' | 'topic_interest' | 'difficulty_feedback';
  content: string;
  context: Record<string, any>;
  importanceScore: number;
  createdAt: string;
  expiresAt: number; // Unix timestamp for TTL
}

export interface LongTermPattern {
  patternId: string;
  userId: string;
  language: string;
  patternType: 'topic_preference' | 'learning_style' | 'skill_progression' |
                'time_preference' | 'difficulty_comfort' | 'error_patterns';
  patternData: Record<string, any>;
  confidenceScore: number;
  accessCount: number;
  lastAccessed: string;
  createdAt: string;
  updatedAt: string;
}

export interface QValue {
  stateActionKey: string; // Composite key: userId#language#state#action
  userId: string;
  language: string;
  stateKey: string;
  actionKey: string;
  qValue: number;
  updateCount: number;
  lastUpdated: string;
}

export interface VocabularyExercise {
  exerciseId: string;
  userId: string;
  language: string;
  word: string;
  translation: string;
  exerciseType: string;
  correct: number;
  attempts: number;
  proficiencyLevel: number;
  lastPracticed?: string;
  nextReview?: string;
  createdAt: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface LangChainContext {
  language: string;
  difficulty: string;
  userLevel: string;
  recentTopics: string[];
  commonErrors: string[];
  preferences: Record<string, any>;
}
