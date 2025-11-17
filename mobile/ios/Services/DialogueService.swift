import Foundation
import Combine
import AVFoundation

class DialogueService {
    static let shared = DialogueService()
    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Dialogue Sessions
    func startSession(
        language: String,
        practiceMode: String,
        topic: String? = nil,
        difficulty: String = "intermediate"
    ) -> AnyPublisher<DialogueSession, APIError> {
        let parameters: [String: Any] = [
            "language": language,
            "practiceMode": practiceMode,
            "topic": topic as Any,
            "difficulty": difficulty
        ]

        return apiClient.request(
            endpoint: "dialogue/sessions/start",
            method: "POST",
            body: parameters
        )
        .map { (response: APIResponse<DialogueSession>) -> DialogueSession in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    func endSession(sessionId: String) -> AnyPublisher<DialogueSession, APIError> {
        return apiClient.request(
            endpoint: "dialogue/sessions/\(sessionId)/end",
            method: "POST"
        )
        .map { (response: APIResponse<DialogueSession>) -> DialogueSession in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    // MARK: - Process Audio
    func processAudio(
        sessionId: String,
        audioData: Data,
        language: String
    ) -> AnyPublisher<DialogueTurn, APIError> {
        let parameters = [
            "sessionId": sessionId,
            "language": language
        ]

        return apiClient.uploadAudio(
            endpoint: "dialogue/process-audio",
            audioData: audioData,
            parameters: parameters
        )
        .decode(type: APIResponse<DialogueTurn>.self, decoder: JSONDecoder.iso8601Decoder)
        .map { response in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    // MARK: - Get Session History
    func getSessionHistory(limit: Int = 10) -> AnyPublisher<[DialogueSession], APIError> {
        return apiClient.request(endpoint: "dialogue/sessions?limit=\(limit)")
            .map { (response: APIResponse<[DialogueSession]>) -> [DialogueSession] in
                response.data ?? []
            }
            .eraseToAnyPublisher()
    }

    func getSessionTurns(sessionId: String) -> AnyPublisher<[DialogueTurn], APIError> {
        return apiClient.request(endpoint: "dialogue/sessions/\(sessionId)/turns")
            .map { (response: APIResponse<[DialogueTurn]>) -> [DialogueTurn] in
                response.data ?? []
            }
            .eraseToAnyPublisher()
    }

    // MARK: - Conversation Scenarios
    func getScenarios(language: String, difficulty: String? = nil) -> AnyPublisher<[ConversationScenario], APIError> {
        var endpoint = "conversation/scenarios?language=\(language)"
        if let difficulty = difficulty {
            endpoint += "&difficulty=\(difficulty)"
        }

        return apiClient.request(endpoint: endpoint)
            .map { (response: APIResponse<[ConversationScenario]>) -> [ConversationScenario] in
                response.data ?? []
            }
            .eraseToAnyPublisher()
    }

    func startScenario(
        scenarioId: String,
        language: String,
        difficulty: String
    ) -> AnyPublisher<DialogueSession, APIError> {
        let parameters: [String: Any] = [
            "scenarioId": scenarioId,
            "language": language,
            "difficulty": difficulty
        ]

        return apiClient.request(
            endpoint: "conversation/scenarios/start",
            method: "POST",
            body: parameters
        )
        .map { (response: APIResponse<DialogueSession>) -> DialogueSession in
            response.data!
        }
        .eraseToAnyPublisher()
    }
}
