import Foundation
import Combine

class ProgressService {
    static let shared = ProgressService()
    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Dashboard
    func getDashboard(language: String) -> AnyPublisher<ProgressDashboard, APIError> {
        return apiClient.request(endpoint: "progress/dashboard?language=\(language)")
            .map { (response: APIResponse<ProgressDashboard>) -> ProgressDashboard in
                response.data!
            }
            .eraseToAnyPublisher()
    }

    // MARK: - Progress Snapshots
    func getProgressHistory(
        language: String,
        startDate: Date,
        endDate: Date,
        periodType: String = "daily"
    ) -> AnyPublisher<[ProgressSnapshot], APIError> {
        let dateFormatter = ISO8601DateFormatter()
        let start = dateFormatter.string(from: startDate)
        let end = dateFormatter.string(from: endDate)

        return apiClient.request(
            endpoint: "progress/history?language=\(language)&startDate=\(start)&endDate=\(end)&periodType=\(periodType)"
        )
        .map { (response: APIResponse<[ProgressSnapshot]>) -> [ProgressSnapshot] in
            response.data ?? []
        }
        .eraseToAnyPublisher()
    }

    // MARK: - Insights
    func getInsights(language: String) -> AnyPublisher<ProgressInsights, APIError> {
        return apiClient.request(endpoint: "progress/insights?language=\(language)")
            .map { (response: APIResponse<ProgressInsights>) -> ProgressInsights in
                response.data!
            }
            .eraseToAnyPublisher()
    }

    // MARK: - Goal Prediction
    func predictGoal(
        language: String,
        targetLevel: String
    ) -> AnyPublisher<GoalPrediction, APIError> {
        return apiClient.request(
            endpoint: "progress/predict-goal?language=\(language)&targetLevel=\(targetLevel)"
        )
        .map { (response: APIResponse<GoalPrediction>) -> GoalPrediction in
            response.data!
        }
        .eraseToAnyPublisher()
    }

    // MARK: - Streak
    func getStreak() -> AnyPublisher<StreakData, APIError> {
        return apiClient.request(endpoint: "progress/streak")
            .map { (response: APIResponse<StreakData>) -> StreakData in
                response.data!
            }
            .eraseToAnyPublisher()
    }
}

// MARK: - Additional Models
struct ProgressDashboard: Codable {
    let totalStudyMinutes: Int
    let currentStreak: Int
    let longestStreak: Int
    let skillScores: SkillScores
    let recentActivities: [ActivitySummary]
    let weeklyProgress: [ProgressSnapshot]
    let achievements: [Achievement]
}

struct ActivitySummary: Codable, Identifiable {
    let id: String
    let activityType: String
    let timestamp: Date
    let score: Double?
    let duration: Int?
}

struct Achievement: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let icon: String
    let unlockedAt: Date?
    let isUnlocked: Bool
}

struct GoalPrediction: Codable {
    let estimatedTimeToGoal: Int
    let confidence: Double
    let factors: [String]
    let milestones: [Milestone]
}

struct Milestone: Codable, Identifiable {
    let id: String
    let title: String
    let estimatedDate: Date
    let requirements: String
}

struct StreakData: Codable {
    let currentStreak: Int
    let longestStreak: Int
    let lastStudyDate: Date?
    let streakHistory: [StreakDay]
}

struct StreakDay: Codable, Identifiable {
    var id: String { date.ISO8601Format() }
    let date: Date
    let studyMinutes: Int
}
