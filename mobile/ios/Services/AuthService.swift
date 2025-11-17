import Foundation
import Combine

class AuthService {
    static let shared = AuthService()
    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Authentication
    func login(email: String, password: String) -> AnyPublisher<AuthResponse, APIError> {
        let request = LoginRequest(email: email, password: password)
        return apiClient.request(
            endpoint: "auth/login",
            method: "POST",
            body: request,
            requiresAuth: false
        )
        .map { (response: APIResponse<AuthResponse>) -> AuthResponse in
            if let authResponse = response.data {
                self.apiClient.setAuthToken(authResponse.token)
                return authResponse
            }
            fatalError("Invalid response structure")
        }
        .eraseToAnyPublisher()
    }

    func register(
        email: String,
        password: String,
        username: String,
        nativeLanguage: String,
        targetLanguages: [String]
    ) -> AnyPublisher<AuthResponse, APIError> {
        let request = RegisterRequest(
            email: email,
            password: password,
            username: username,
            nativeLanguage: nativeLanguage,
            targetLanguages: targetLanguages
        )
        return apiClient.request(
            endpoint: "auth/register",
            method: "POST",
            body: request,
            requiresAuth: false
        )
        .map { (response: APIResponse<AuthResponse>) -> AuthResponse in
            if let authResponse = response.data {
                self.apiClient.setAuthToken(authResponse.token)
                return authResponse
            }
            fatalError("Invalid response structure")
        }
        .eraseToAnyPublisher()
    }

    func logout() {
        apiClient.clearAuthToken()
    }

    // MARK: - User Profile
    func getCurrentUser() -> AnyPublisher<User, APIError> {
        return apiClient.request(endpoint: "users/me")
            .map { (response: APIResponse<User>) -> User in
                response.data!
            }
            .eraseToAnyPublisher()
    }

    func updateProfile(profile: UserProfile) -> AnyPublisher<User, APIError> {
        return apiClient.request(
            endpoint: "users/me/profile",
            method: "PUT",
            body: profile
        )
        .map { (response: APIResponse<User>) -> User in
            response.data!
        }
        .eraseToAnyPublisher()
    }
}
