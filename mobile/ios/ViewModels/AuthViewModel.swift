import Foundation
import Combine
import SwiftUI

class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let authService = AuthService.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        checkAuthStatus()
    }

    private func checkAuthStatus() {
        // Check if we have a stored auth token
        if UserDefaults.standard.string(forKey: "authToken") != nil {
            loadCurrentUser()
        }
    }

    func login(email: String, password: String) {
        isLoading = true
        errorMessage = nil

        authService.login(email: email, password: password)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] authResponse in
                self?.currentUser = authResponse.user
                self?.isAuthenticated = true
                self?.saveUser(authResponse.user)
            }
            .store(in: &cancellables)
    }

    func register(
        email: String,
        password: String,
        username: String,
        nativeLanguage: String,
        targetLanguages: [String]
    ) {
        isLoading = true
        errorMessage = nil

        authService.register(
            email: email,
            password: password,
            username: username,
            nativeLanguage: nativeLanguage,
            targetLanguages: targetLanguages
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] completion in
            self?.isLoading = false
            if case .failure(let error) = completion {
                self?.errorMessage = error.localizedDescription
            }
        } receiveValue: { [weak self] authResponse in
            self?.currentUser = authResponse.user
            self?.isAuthenticated = true
            self?.saveUser(authResponse.user)
        }
        .store(in: &cancellables)
    }

    func logout() {
        authService.logout()
        isAuthenticated = false
        currentUser = nil
        UserDefaults.standard.removeObject(forKey: "currentUser")
    }

    private func loadCurrentUser() {
        authService.getCurrentUser()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure = completion {
                    self?.logout()
                }
            } receiveValue: { [weak self] user in
                self?.currentUser = user
                self?.isAuthenticated = true
                self?.saveUser(user)
            }
            .store(in: &cancellables)
    }

    private func saveUser(_ user: User) {
        if let encoded = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(encoded, forKey: "currentUser")
        }
    }
}
