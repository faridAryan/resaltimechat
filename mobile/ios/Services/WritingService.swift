import Foundation
import Combine

class WritingService {
    static let shared = WritingService()
    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Submit Writing
    func submitWriting(
        language: String,
        writingType: String,
        difficulty: String,
        title: String?,
        content: String,
        promptId: String? = nil
    ) -> AnyPublisher<WritingSubmission, APIError> {
        let parameters: [String: Any] = [
            "language": language,
            "writingType": writingType,
            "difficulty": difficulty,
            "title": title as Any,
            "content": content,
            "promptId": promptId as Any
        ]

        return apiClient.request(
            endpoint: "writing/submissions",
            method: "POST",
            body: parameters
        )
        .map { (response: APIResponse<WritingSubmission>) -> WritingSubmission in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    // MARK: - Get Submissions
    func getSubmissions(
        language: String,
        page: Int = 1,
        pageSize: Int = 20
    ) -> AnyPublisher<PaginatedResponse<WritingSubmission>, APIError> {
        return apiClient.request(
            endpoint: "writing/submissions?language=\(language)&page=\(page)&pageSize=\(pageSize)"
        )
        .map { (response: APIResponse<PaginatedResponse<WritingSubmission>>) -> PaginatedResponse<WritingSubmission> in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    func getSubmission(id: String) -> AnyPublisher<WritingSubmission, APIError> {
        return apiClient.request(endpoint: "writing/submissions/\(id)")
            .map { (response: APIResponse<WritingSubmission>) -> WritingSubmission in
                response.data!
            }
            .eraseToAnyPublisher()
    }

    // MARK: - Writing Prompts
    func getPrompts(
        language: String,
        writingType: String? = nil,
        difficulty: String? = nil
    ) -> AnyPublisher<[WritingPrompt], APIError> {
        var endpoint = "writing/prompts?language=\(language)"
        if let writingType = writingType {
            endpoint += "&writingType=\(writingType)"
        }
        if let difficulty = difficulty {
            endpoint += "&difficulty=\(difficulty)"
        }

        return apiClient.request(endpoint: endpoint)
            .map { (response: APIResponse<[WritingPrompt]>) -> [WritingPrompt] in
                response.data ?? []
            }
            .eraseToAnyPublisher()
    }

    func generatePrompt(
        language: String,
        writingType: String,
        difficulty: String,
        theme: String? = nil
    ) -> AnyPublisher<WritingPrompt, APIError> {
        let parameters: [String: Any] = [
            "language": language,
            "writingType": writingType,
            "difficulty": difficulty,
            "theme": theme as Any
        ]

        return apiClient.request(
            endpoint: "writing/prompts/generate",
            method: "POST",
            body: parameters
        )
        .map { (response: APIResponse<WritingPrompt>) -> WritingPrompt in
            response.data!
        }
        .eraseToAnyPublisher()
    }
}

// MARK: - Writing Prompt Model
struct WritingPrompt: Codable, Identifiable {
    let id: String
    let language: String
    let writingType: String
    let difficulty: String
    let theme: String?
    let title: String
    let prompt: String
    let keywords: [String]?
    let estimatedLength: String?
    let tips: [String]?
}
