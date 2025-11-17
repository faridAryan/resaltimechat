import Foundation
import Combine

class ShortStoryService {
    static let shared = ShortStoryService()
    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Get Stories
    func getStories(
        language: String,
        level: String? = nil,
        genre: String? = nil,
        page: Int = 1,
        pageSize: Int = 20
    ) -> AnyPublisher<PaginatedResponse<ShortStory>, APIError> {
        var endpoint = "short-stories?language=\(language)&page=\(page)&pageSize=\(pageSize)"
        if let level = level {
            endpoint += "&level=\(level)"
        }
        if let genre = genre {
            endpoint += "&genre=\(genre)"
        }

        return apiClient.request(endpoint: endpoint)
            .map { (response: APIResponse<PaginatedResponse<ShortStory>>) -> PaginatedResponse<ShortStory> in
                response.data!
            }
            .eraseToAnyPublisher()
    }

    func getStory(id: String) -> AnyPublisher<ShortStory, APIError> {
        return apiClient.request(endpoint: "short-stories/\(id)")
            .map { (response: APIResponse<ShortStory>) -> ShortStory in
                response.data!
            }
            .eraseToAnyPublisher()
    }

    // MARK: - Generate Story
    func generateStory(
        language: String,
        level: String,
        genre: String,
        theme: String? = nil,
        imageStyle: String = "cartoon"
    ) -> AnyPublisher<ShortStory, APIError> {
        let parameters: [String: Any] = [
            "language": language,
            "level": level,
            "genre": genre,
            "theme": theme as Any,
            "imageStyle": imageStyle
        ]

        return apiClient.request(
            endpoint: "short-stories/generate",
            method: "POST",
            body: parameters
        )
        .map { (response: APIResponse<ShortStory>) -> ShortStory in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    // MARK: - Reading Sessions
    func startReadingSession(storyId: String) -> AnyPublisher<ReadingSession, APIError> {
        return apiClient.request(
            endpoint: "short-stories/\(storyId)/sessions/start",
            method: "POST"
        )
        .map { (response: APIResponse<ReadingSession>) -> ReadingSession in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    func completeReadingSession(
        sessionId: String,
        answers: [Int],
        vocabularyLookedUp: [String]
    ) -> AnyPublisher<ReadingSession, APIError> {
        let parameters: [String: Any] = [
            "answers": answers,
            "vocabularyLookedUp": vocabularyLookedUp
        ]

        return apiClient.request(
            endpoint: "reading-sessions/\(sessionId)/complete",
            method: "POST",
            body: parameters
        )
        .map { (response: APIResponse<ReadingSession>) -> ReadingSession in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    // MARK: - Bookmarks
    func bookmarkStory(storyId: String) -> AnyPublisher<Bool, APIError> {
        return apiClient.request(
            endpoint: "short-stories/\(storyId)/bookmark",
            method: "POST"
        )
        .map { (response: APIResponse<Bool>) -> Bool in
            response.data ?? true
        }
        .eraseToAnyPublisher()
    }

    func removeBookmark(storyId: String) -> AnyPublisher<Bool, APIError> {
        return apiClient.request(
            endpoint: "short-stories/\(storyId)/bookmark",
            method: "DELETE"
        )
        .map { (response: APIResponse<Bool>) -> Bool in
            response.data ?? true
        }
        .eraseToAnyPublisher()
    }

    func getBookmarkedStories() -> AnyPublisher<[ShortStory], APIError> {
        return apiClient.request(endpoint: "short-stories/bookmarks")
            .map { (response: APIResponse<[ShortStory]>) -> [ShortStory] in
                response.data ?? []
            }
            .eraseToAnyPublisher()
    }
}
