import Foundation
import Combine

class VocabularyService {
    static let shared = VocabularyService()
    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Decks
    func getMyDecks(language: String) -> AnyPublisher<[VocabularyDeck], APIError> {
        return apiClient.request(endpoint: "vocabulary/decks?language=\(language)")
            .map { (response: APIResponse<[VocabularyDeck]>) -> [VocabularyDeck] in
                response.data ?? []
            }
            .eraseToAnyPublisher()
    }

    func createDeck(
        language: String,
        name: String,
        description: String?,
        theme: String?,
        difficulty: String
    ) -> AnyPublisher<VocabularyDeck, APIError> {
        let parameters: [String: Any] = [
            "language": language,
            "name": name,
            "description": description as Any,
            "theme": theme as Any,
            "difficulty": difficulty
        ]

        return apiClient.request(
            endpoint: "vocabulary/decks",
            method: "POST",
            body: parameters
        )
        .map { (response: APIResponse<VocabularyDeck>) -> VocabularyDeck in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    func generateDeck(
        language: String,
        theme: String,
        difficulty: String,
        cardCount: Int = 20
    ) -> AnyPublisher<VocabularyDeck, APIError> {
        let parameters: [String: Any] = [
            "language": language,
            "theme": theme,
            "difficulty": difficulty,
            "cardCount": cardCount
        ]

        return apiClient.request(
            endpoint: "vocabulary/decks/generate",
            method: "POST",
            body: parameters
        )
        .map { (response: APIResponse<VocabularyDeck>) -> VocabularyDeck in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    // MARK: - Cards
    func getCards(deckId: String) -> AnyPublisher<[VocabularyCard], APIError> {
        return apiClient.request(endpoint: "vocabulary/decks/\(deckId)/cards")
            .map { (response: APIResponse<[VocabularyCard]>) -> [VocabularyCard] in
                response.data ?? []
            }
            .eraseToAnyPublisher()
    }

    func addCard(
        deckId: String,
        word: String,
        translation: String,
        partOfSpeech: String?,
        exampleSentences: [String]?
    ) -> AnyPublisher<VocabularyCard, APIError> {
        let parameters: [String: Any] = [
            "word": word,
            "translation": translation,
            "partOfSpeech": partOfSpeech as Any,
            "exampleSentences": exampleSentences as Any
        ]

        return apiClient.request(
            endpoint: "vocabulary/decks/\(deckId)/cards",
            method: "POST",
            body: parameters
        )
        .map { (response: APIResponse<VocabularyCard>) -> VocabularyCard in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    // MARK: - Reviews (SM-2 Algorithm)
    func getDueCards(language: String) -> AnyPublisher<[VocabularyCard], APIError> {
        return apiClient.request(endpoint: "vocabulary/reviews/due?language=\(language)")
            .map { (response: APIResponse<[VocabularyCard]>) -> [VocabularyCard] in
                response.data ?? []
            }
            .eraseToAnyPublisher()
    }

    func recordReview(cardId: String, quality: Int) -> AnyPublisher<VocabularyReview, APIError> {
        let parameters: [String: Any] = [
            "quality": quality
        ]

        return apiClient.request(
            endpoint: "vocabulary/cards/\(cardId)/review",
            method: "POST",
            body: parameters
        )
        .map { (response: APIResponse<VocabularyReview>) -> VocabularyReview in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    func getReviewStatistics(language: String) -> AnyPublisher<[String: Any], APIError> {
        return apiClient.request(endpoint: "vocabulary/reviews/statistics?language=\(language)")
            .map { (response: APIResponse<[String: Any]>) -> [String: Any] in
                response.data ?? [:]
            }
            .eraseToAnyPublisher()
    }

    // MARK: - Public Decks
    func getPublicDecks(language: String) -> AnyPublisher<[VocabularyDeck], APIError> {
        return apiClient.request(endpoint: "vocabulary/decks/public?language=\(language)")
            .map { (response: APIResponse<[VocabularyDeck]>) -> [VocabularyDeck] in
                response.data ?? []
            }
            .eraseToAnyPublisher()
    }

    func subscribeToDeck(deckId: String) -> AnyPublisher<Bool, APIError> {
        return apiClient.request(
            endpoint: "vocabulary/decks/\(deckId)/subscribe",
            method: "POST"
        )
        .map { (response: APIResponse<Bool>) -> Bool in
            response.data ?? true
        }
        .eraseToAnyPublisher()
    }
}
