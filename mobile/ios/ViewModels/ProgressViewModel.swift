import Foundation
import Combine

class ProgressViewModel: ObservableObject {
    @Published var dashboard: ProgressDashboard?
    @Published var insights: ProgressInsights?
    @Published var streakData: StreakData?
    @Published var progressHistory: [ProgressSnapshot] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let progressService = ProgressService.shared
    private var cancellables = Set<AnyCancellable>()

    func loadDashboard(language: String) {
        isLoading = true

        progressService.getDashboard(language: language)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] dashboard in
                self?.dashboard = dashboard
            }
            .store(in: &cancellables)
    }

    func loadInsights(language: String) {
        progressService.getInsights(language: language)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] insights in
                self?.insights = insights
            }
            .store(in: &cancellables)
    }

    func loadStreak() {
        progressService.getStreak()
            .receive(on: DispatchQueue.main)
            .sink { _ in } receiveValue: { [weak self] streak in
                self?.streakData = streak
            }
            .store(in: &cancellables)
    }

    func loadProgressHistory(language: String, days: Int = 30) {
        let endDate = Date()
        let startDate = Calendar.current.date(byAdding: .day, value: -days, to: endDate)!

        progressService.getProgressHistory(
            language: language,
            startDate: startDate,
            endDate: endDate
        )
        .receive(on: DispatchQueue.main)
        .sink { _ in } receiveValue: { [weak self] history in
            self?.progressHistory = history
        }
        .store(in: &cancellables)
    }
}
