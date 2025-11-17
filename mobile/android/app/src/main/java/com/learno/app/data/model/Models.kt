package com.learno.app.data.model

import com.google.gson.annotations.SerializedName
import java.util.Date

// ==================== USER MODELS ====================

data class User(
    val id: String,
    val email: String,
    val username: String,
    val nativeLanguage: String,
    val targetLanguages: List<String>,
    val currentLevel: String,
    val createdAt: Date,
    val profile: UserProfile?
)

data class UserProfile(
    val avatar: String?,
    val bio: String?,
    val learningGoals: List<String>,
    val interests: List<String>,
    val streak: Int,
    val totalStudyMinutes: Int
)

// ==================== AUTHENTICATION ====================

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val email: String,
    val password: String,
    val username: String,
    val nativeLanguage: String,
    val targetLanguages: List<String>
)

data class AuthResponse(
    val token: String,
    val user: User
)

// ==================== SHORT STORY MODELS ====================

data class ShortStory(
    val id: String,
    val language: String,
    val level: String,
    val genre: String,
    val theme: String?,
    val title: String,
    val content: String,
    val paragraphs: List<StoryParagraph>?,
    val vocabulary: List<VocabularyItem>?,
    val grammarConcepts: List<GrammarConcept>?,
    val comprehensionQuestions: List<ComprehensionQuestion>?,
    val moralLesson: String?,
    val wordCount: Int,
    val estimatedReadingTime: Int?,
    val images: List<String>?,
    val createdAt: Date
)

data class StoryParagraph(
    val text: String,
    val keyVocabulary: List<String>?,
    val grammarPoints: List<String>?
)

data class VocabularyItem(
    val word: String,
    val translation: String,
    val partOfSpeech: String?,
    val definition: String,
    val exampleSentence: String?
)

data class GrammarConcept(
    val concept: String,
    val explanation: String,
    val examples: List<String>
)

data class ComprehensionQuestion(
    val question: String,
    val options: List<String>,
    val correctAnswer: Int,
    val explanation: String
)

data class ReadingSession(
    val id: String,
    val userId: String,
    val storyId: String,
    val startedAt: Date,
    val endedAt: Date?,
    val readingTimeSeconds: Int?,
    val status: String,
    val comprehensionScore: Double?,
    val answers: List<Int>?,
    val vocabularyLookedUp: List<String>?
)

// ==================== VOCABULARY MODELS ====================

data class VocabularyDeck(
    val id: String,
    val userId: String,
    val language: String,
    val name: String,
    val description: String?,
    val theme: String?,
    val difficulty: String,
    val isPublic: Boolean,
    val cardCount: Int?,
    val createdAt: Date
)

data class VocabularyCard(
    val id: String,
    val deckId: String,
    val word: String,
    val translation: String,
    val partOfSpeech: String?,
    val ipa: String?,
    val exampleSentences: List<String>?,
    val mnemonic: String?,
    val synonyms: List<String>?,
    val antonyms: List<String>?
)

data class VocabularyReview(
    val cardId: String,
    val easinessFactor: Double,
    val interval: Int,
    val repetitions: Int,
    val lastReview: Date?,
    val nextReview: Date?
)

// ==================== DIALOGUE PRACTICE MODELS ====================

data class DialogueSession(
    val id: String,
    val userId: String,
    val language: String,
    val practiceMode: String,
    val topic: String?,
    val difficulty: String,
    val startedAt: Date,
    val endedAt: Date?,
    val durationSeconds: Int?,
    val turnCount: Int?,
    val overallScore: Double?
)

data class DialogueTurn(
    val id: String,
    val sessionId: String,
    val speaker: String,
    val transcript: String,
    val audioUrl: String?,
    val pronunciationScore: Double?,
    val timestamp: Date
)

data class ConversationScenario(
    val id: String,
    val scenario: String,
    val language: String,
    val difficulty: String,
    val title: String,
    val description: String,
    val objectives: List<String>,
    val rolePrompt: String
)

// ==================== WRITING PRACTICE MODELS ====================

data class WritingSubmission(
    val id: String,
    val userId: String,
    val language: String,
    val writingType: String,
    val difficulty: String,
    val title: String?,
    val content: String,
    val wordCount: Int,
    val overallScore: Double?,
    val grammarScore: Double?,
    val vocabularyScore: Double?,
    val coherenceScore: Double?,
    val styleScore: Double?,
    val corrections: List<WritingCorrection>?,
    val correctedVersion: String?,
    val feedback: String?,
    val submittedAt: Date
)

data class WritingCorrection(
    val type: String,
    val original: String,
    val corrected: String,
    val explanation: String,
    val severity: String,
    val position: Int?
)

data class WritingPrompt(
    val id: String,
    val language: String,
    val writingType: String,
    val difficulty: String,
    val theme: String?,
    val title: String,
    val prompt: String,
    val keywords: List<String>?,
    val estimatedLength: String?,
    val tips: List<String>?
)

// ==================== PROGRESS MODELS ====================

data class ProgressSnapshot(
    val date: Date,
    val studyMinutes: Int,
    val activitiesCompleted: Int,
    val wordsReviewed: Int,
    val conversationsCompleted: Int,
    val writingsSubmitted: Int,
    val avgScore: Double?,
    val skillScores: SkillScores?
)

data class SkillScores(
    val speaking: Double?,
    val listening: Double?,
    val reading: Double?,
    val writing: Double?,
    val vocabulary: Double?,
    val grammar: Double?
)

data class ProgressDashboard(
    val totalStudyMinutes: Int,
    val currentStreak: Int,
    val longestStreak: Int,
    val skillScores: SkillScores,
    val recentActivities: List<ActivitySummary>,
    val weeklyProgress: List<ProgressSnapshot>,
    val achievements: List<Achievement>
)

data class ActivitySummary(
    val id: String,
    val activityType: String,
    val timestamp: Date,
    val score: Double?,
    val duration: Int?
)

data class Achievement(
    val id: String,
    val title: String,
    val description: String,
    val icon: String,
    val unlockedAt: Date?,
    val isUnlocked: Boolean
)

data class ProgressInsights(
    val keyStrengths: List<String>,
    val areasForImprovement: List<String>,
    val learningPatterns: List<String>,
    val recommendations: List<Recommendation>,
    val motivationalMessage: String
)

data class Recommendation(
    val type: String,
    val title: String,
    val description: String,
    val priority: String
)

data class GoalPrediction(
    val estimatedTimeToGoal: Int,
    val confidence: Double,
    val factors: List<String>,
    val milestones: List<Milestone>
)

data class Milestone(
    val id: String,
    val title: String,
    val estimatedDate: Date,
    val requirements: String
)

data class StreakData(
    val currentStreak: Int,
    val longestStreak: Int,
    val lastStudyDate: Date?,
    val streakHistory: List<StreakDay>
)

data class StreakDay(
    val date: Date,
    val studyMinutes: Int
)

// ==================== API RESPONSE MODELS ====================

data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val message: String?,
    val error: String?
)

data class PaginatedResponse<T>(
    val items: List<T>,
    val total: Int,
    val page: Int,
    val pageSize: Int,
    val hasNext: Boolean
)
