import Foundation

struct Config {
    // MARK: - API Configuration
    static let apiBaseURL: String = {
        #if DEBUG
        return "https://dev-api.learno.app"
        #else
        return "https://api.learno.app"
        #endif
    }()

    static let apiVersion = "v1"
    static let timeout: TimeInterval = 30.0

    // MARK: - WebSocket Configuration
    static let websocketURL: String = {
        #if DEBUG
        return "wss://dev-api.learno.app/ws"
        #else
        return "wss://api.learno.app/ws"
        #endif
    }()

    // MARK: - Feature Flags
    static let enableRealTimeDialogue = true
    static let enablePeerLearning = true
    static let enableOfflineMode = false

    // MARK: - App Constants
    static let supportedLanguages = [
        "spanish", "french", "german", "italian", "portuguese",
        "russian", "chinese", "japanese", "korean", "arabic"
    ]

    static let cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"]

    static let maxAudioDuration: TimeInterval = 300 // 5 minutes
    static let maxStorySaveCount = 50
}
