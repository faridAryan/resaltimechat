import SwiftUI

@main
struct LearnoApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            if authViewModel.isAuthenticated {
                MainTabView()
                    .environmentObject(authViewModel)
                    .environmentObject(appState)
            } else {
                LoginView()
                    .environmentObject(authViewModel)
            }
        }
    }
}

// MARK: - App State
class AppState: ObservableObject {
    @Published var selectedLanguage: String = "spanish"
    @Published var userLevel: String = "intermediate"
    @Published var currentUser: User?

    init() {
        loadUserPreferences()
    }

    func loadUserPreferences() {
        // Load from UserDefaults
        if let language = UserDefaults.standard.string(forKey: "selectedLanguage") {
            selectedLanguage = language
        }
        if let level = UserDefaults.standard.string(forKey: "userLevel") {
            userLevel = level
        }
    }

    func saveUserPreferences() {
        UserDefaults.standard.set(selectedLanguage, forKey: "selectedLanguage")
        UserDefaults.standard.set(userLevel, forKey: "userLevel")
    }
}
