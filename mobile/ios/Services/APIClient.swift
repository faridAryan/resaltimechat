import Foundation
import Combine

enum APIError: Error, LocalizedError {
    case invalidURL
    case networkError(Error)
    case decodingError(Error)
    case serverError(String)
    case unauthorized
    case notFound
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .serverError(let message):
            return "Server error: \(message)"
        case .unauthorized:
            return "Unauthorized. Please log in again."
        case .notFound:
            return "Resource not found"
        case .unknown:
            return "An unknown error occurred"
        }
    }
}

class APIClient {
    static let shared = APIClient()

    private let baseURL = Config.apiBaseURL
    private let session: URLSession
    private var authToken: String?

    private init() {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = Config.timeout
        configuration.timeoutIntervalForResource = Config.timeout
        session = URLSession(configuration: configuration)

        // Load stored auth token
        loadAuthToken()
    }

    // MARK: - Authentication Token Management
    func setAuthToken(_ token: String) {
        authToken = token
        UserDefaults.standard.set(token, forKey: "authToken")
    }

    func clearAuthToken() {
        authToken = nil
        UserDefaults.standard.removeObject(forKey: "authToken")
    }

    private func loadAuthToken() {
        authToken = UserDefaults.standard.string(forKey: "authToken")
    }

    // MARK: - Request Builder
    private func createRequest(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        requiresAuth: Bool = true
    ) -> URLRequest? {
        guard let url = URL(string: "\(baseURL)/\(Config.apiVersion)/\(endpoint)") else {
            return nil
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if requiresAuth, let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = body
        }

        return request
    }

    // MARK: - Generic Request Method
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Encodable? = nil,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        let bodyData: Data?
        if let body = body {
            do {
                bodyData = try JSONEncoder().encode(body)
            } catch {
                return Fail(error: .decodingError(error)).eraseToAnyPublisher()
            }
        } else {
            bodyData = nil
        }

        guard let request = createRequest(
            endpoint: endpoint,
            method: method,
            body: bodyData,
            requiresAuth: requiresAuth
        ) else {
            return Fail(error: .invalidURL).eraseToAnyPublisher()
        }

        return session.dataTaskPublisher(for: request)
            .tryMap { data, response -> Data in
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw APIError.unknown
                }

                switch httpResponse.statusCode {
                case 200...299:
                    return data
                case 401:
                    throw APIError.unauthorized
                case 404:
                    throw APIError.notFound
                default:
                    if let errorResponse = try? JSONDecoder().decode(APIResponse<String>.self, from: data),
                       let errorMessage = errorResponse.error {
                        throw APIError.serverError(errorMessage)
                    }
                    throw APIError.unknown
                }
            }
            .decode(type: T.self, decoder: JSONDecoder.iso8601Decoder)
            .mapError { error in
                if let apiError = error as? APIError {
                    return apiError
                } else if error is DecodingError {
                    return .decodingError(error)
                } else {
                    return .networkError(error)
                }
            }
            .eraseToAnyPublisher()
    }

    // MARK: - File Upload
    func uploadAudio(
        endpoint: String,
        audioData: Data,
        parameters: [String: String]
    ) -> AnyPublisher<Data, APIError> {
        guard let url = URL(string: "\(baseURL)/\(Config.apiVersion)/\(endpoint)") else {
            return Fail(error: .invalidURL).eraseToAnyPublisher()
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()

        // Add parameters
        for (key, value) in parameters {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }

        // Add audio data
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"audio\"; filename=\"audio.wav\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/wav\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        return session.dataTaskPublisher(for: request)
            .tryMap { data, response -> Data in
                guard let httpResponse = response as? HTTPURLResponse,
                      (200...299).contains(httpResponse.statusCode) else {
                    throw APIError.unknown
                }
                return data
            }
            .mapError { error in
                if let apiError = error as? APIError {
                    return apiError
                } else {
                    return .networkError(error)
                }
            }
            .eraseToAnyPublisher()
    }
}

// MARK: - JSONDecoder Extension
extension JSONDecoder {
    static var iso8601Decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}

// MARK: - Data Extension
extension Data {
    mutating func append(_ string: String) {
        if let data = string.data(using: .utf8) {
            append(data)
        }
    }
}
