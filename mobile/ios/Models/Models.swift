import Foundation

// MARK: - User Models
struct User: Codable, Identifiable {
    let id: String
    let email: String
    let username: String
    let nativeLanguage: String
    let targetLanguages: [String]
    let currentLevel: String
    let createdAt: Date
    var profile: UserProfile?
}

struct UserProfile: Codable {
    var avatar: String?
    var bio: String?
    var learningGoals: [String]
    var interests: [String]
    var streak: Int
    var totalStudyMinutes: Int
}

// MARK: - Authentication
struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct RegisterRequest: Codable {
    let email: String
    let password: String
    let username: String
    let nativeLanguage: String
    let targetLanguages: [String]
}

struct AuthResponse: Codable {
    let token: String
    let user: User
}

// MARK: - Short Story Models
struct ShortStory: Codable, Identifiable {
    let id: String
    let language: String
    let level: String
    let genre: String
    let theme: String?
    let title: String
    let content: String
    let paragraphs: [StoryParagraph]?
    let vocabulary: [VocabularyItem]?
    let grammarConcepts: [GrammarConcept]?
    let comprehensionQuestions: [ComprehensionQuestion]?
    let moralLesson: String?
    let wordCount: Int
    let estimatedReadingTime: Int?
    let images: [String]?
    let createdAt: Date
}

struct StoryParagraph: Codable, Identifiable {
    var id: String { UUID().uuidString }
    let text: String
    let keyVocabulary: [String]?
    let grammarPoints: [String]?
}

struct VocabularyItem: Codable, Identifiable {
    var id: String { word }
    let word: String
    let translation: String
    let partOfSpeech: String?
    let definition: String
    let exampleSentence: String?
}

struct GrammarConcept: Codable, Identifiable {
    var id: String { concept }
    let concept: String
    let explanation: String
    let examples: [String]
}

struct ComprehensionQuestion: Codable, Identifiable {
    var id: String { question }
    let question: String
    let options: [String]
    let correctAnswer: Int
    let explanation: String
}

// MARK: - Reading Session
struct ReadingSession: Codable, Identifiable {
    let id: String
    let userId: String
    let storyId: String
    let startedAt: Date
    var endedAt: Date?
    var readingTimeSeconds: Int?
    var status: String
    var comprehensionScore: Double?
    var answers: [Int]?
    var vocabularyLookedUp: [String]?
}

// MARK: - Vocabulary Models
struct VocabularyDeck: Codable, Identifiable {
    let id: String
    let userId: String
    let language: String
    let name: String
    let description: String?
    let theme: String?
    let difficulty: String
    let isPublic: Bool
    var cardCount: Int?
    let createdAt: Date
}

struct VocabularyCard: Codable, Identifiable {
    let id: String
    let deckId: String
    let word: String
    let translation: String
    let partOfSpeech: String?
    let ipa: String?
    let exampleSentences: [String]?
    let mnemonic: String?
    let synonyms: [String]?
    let antonyms: [String]?
}

struct VocabularyReview: Codable {
    let cardId: String
    var easinessFactor: Double
    var interval: Int
    var repetitions: Int
    var lastReview: Date?
    var nextReview: Date?
}

// MARK: - Dialogue Practice Models
struct DialogueSession: Codable, Identifiable {
    let id: String
    let userId: String
    let language: String
    let practiceMode: String
    let topic: String?
    let difficulty: String
    let startedAt: Date
    var endedAt: Date?
    var durationSeconds: Int?
    var turnCount: Int?
    var overallScore: Double?
}

struct DialogueTurn: Codable, Identifiable {
    let id: String
    let sessionId: String
    let speaker: String
    let transcript: String
    let audioUrl: String?
    let pronunciationScore: Double?
    let timestamp: Date
}

// MARK: - Conversation Simulator Models
struct ConversationScenario: Codable, Identifiable {
    let id: String
    let scenario: String
    let language: String
    let difficulty: String
    let title: String
    let description: String
    let objectives: [String]
    let rolePrompt: String
}

// MARK: - Writing Practice Models
struct WritingSubmission: Codable, Identifiable {
    let id: String
    let userId: String
    let language: String
    let writingType: String
    let difficulty: String
    let title: String?
    let content: String
    let wordCount: Int
    var overallScore: Double?
    var grammarScore: Double?
    var vocabularyScore: Double?
    var coherenceScore: Double?
    var styleScore: Double?
    var corrections: [WritingCorrection]?
    var correctedVersion: String?
    var feedback: String?
    let submittedAt: Date
}

struct WritingCorrection: Codable, Identifiable {
    var id: String { UUID().uuidString }
    let type: String
    let original: String
    let corrected: String
    let explanation: String
    let severity: String
    let position: Int?
}

// MARK: - Progress Analytics Models
struct ProgressSnapshot: Codable {
    let date: Date
    let studyMinutes: Int
    let activitiesCompleted: Int
    let wordsReviewed: Int
    let conversationsCompleted: Int
    let writingsSubmitted: Int
    let avgScore: Double?
    let skillScores: SkillScores?
}

struct SkillScores: Codable {
    let speaking: Double?
    let listening: Double?
    let reading: Double?
    let writing: Double?
    let vocabulary: Double?
    let grammar: Double?
}

struct ProgressInsights: Codable {
    let keyStrengths: [String]
    let areasForImprovement: [String]
    let learningPatterns: [String]
    let recommendations: [Recommendation]
    let motivationalMessage: String
}

struct Recommendation: Codable, Identifiable {
    var id: String { UUID().uuidString }
    let type: String
    let title: String
    let description: String
    let priority: String
}

// MARK: - Peer Learning Models
struct PeerUser: Codable, Identifiable {
    let id: String
    let username: String
    let avatar: String?
    let nativeLanguage: String
    let learningLanguages: [String]
    let currentLevel: String
    let interests: [String]
    let bio: String?
    let isOnline: Bool
    let matchScore: Double?
}

struct PeerSession: Codable, Identifiable {
    let id: String
    let user1Id: String
    let user2Id: String
    let language: String
    let status: String
    let startedAt: Date
    var endedAt: Date?
    var durationMinutes: Int?
}

// MARK: - API Response Models
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let message: String?
    let error: String?
}

struct PaginatedResponse<T: Codable>: Codable {
    let items: [T]
    let total: Int
    let page: Int
    let pageSize: Int
    let hasNext: Bool
}
