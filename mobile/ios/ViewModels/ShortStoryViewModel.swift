import Foundation
import Combine

class ShortStoryViewModel: ObservableObject {
    @Published var stories: [ShortStory] = []
    @Published var currentStory: ShortStory?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var bookmarkedStories: [ShortStory] = []
    @Published var currentSession: ReadingSession?

    private let storyService = ShortStoryService.shared
    private var cancellables = Set<AnyCancellable>()

    func loadStories(language: String, level: String? = nil, genre: String? = nil) {
        isLoading = true
        errorMessage = nil

        storyService.getStories(language: language, level: level, genre: genre)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] response in
                self?.stories = response.items
            }
            .store(in: &cancellables)
    }

    func loadStory(id: String) {
        isLoading = true

        storyService.getStory(id: id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] story in
                self?.currentStory = story
            }
            .store(in: &cancellables)
    }

    func generateStory(
        language: String,
        level: String,
        genre: String,
        theme: String? = nil,
        imageStyle: String = "cartoon"
    ) {
        isLoading = true

        storyService.generateStory(
            language: language,
            level: level,
            genre: genre,
            theme: theme,
            imageStyle: imageStyle
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] completion in
            self?.isLoading = false
            if case .failure(let error) = completion {
                self?.errorMessage = error.localizedDescription
            }
        } receiveValue: { [weak self] story in
            self?.currentStory = story
        }
        .store(in: &cancellables)
    }

    func startReadingSession(storyId: String) {
        storyService.startReadingSession(storyId: storyId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] session in
                self?.currentSession = session
            }
            .store(in: &cancellables)
    }

    func completeSession(answers: [Int], vocabularyLookedUp: [String]) {
        guard let sessionId = currentSession?.id else { return }

        storyService.completeReadingSession(
            sessionId: sessionId,
            answers: answers,
            vocabularyLookedUp: vocabularyLookedUp
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] completion in
            if case .failure(let error) = completion {
                self?.errorMessage = error.localizedDescription
            }
        } receiveValue: { [weak self] session in
            self?.currentSession = session
        }
        .store(in: &cancellables)
    }

    func bookmarkStory(storyId: String) {
        storyService.bookmarkStory(storyId: storyId)
            .receive(on: DispatchQueue.main)
            .sink { _ in } receiveValue: { _ in }
            .store(in: &cancellables)
    }

    func loadBookmarkedStories() {
        storyService.getBookmarkedStories()
            .receive(on: DispatchQueue.main)
            .sink { _ in } receiveValue: { [weak self] stories in
                self?.bookmarkedStories = stories
            }
            .store(in: &cancellables)
    }
}
