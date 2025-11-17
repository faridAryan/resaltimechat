import Foundation
import Combine

class VocabularyViewModel: ObservableObject {
    @Published var myDecks: [VocabularyDeck] = []
    @Published var publicDecks: [VocabularyDeck] = []
    @Published var currentDeck: VocabularyDeck?
    @Published var cards: [VocabularyCard] = []
    @Published var dueCards: [VocabularyCard] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let vocabularyService = VocabularyService.shared
    private var cancellables = Set<AnyCancellable>()

    func loadMyDecks(language: String) {
        isLoading = true

        vocabularyService.getMyDecks(language: language)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] decks in
                self?.myDecks = decks
            }
            .store(in: &cancellables)
    }

    func loadPublicDecks(language: String) {
        vocabularyService.getPublicDecks(language: language)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] decks in
                self?.publicDecks = decks
            }
            .store(in: &cancellables)
    }

    func generateDeck(language: String, theme: String, difficulty: String, cardCount: Int = 20) {
        isLoading = true

        vocabularyService.generateDeck(
            language: language,
            theme: theme,
            difficulty: difficulty,
            cardCount: cardCount
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] completion in
            self?.isLoading = false
            if case .failure(let error) = completion {
                self?.errorMessage = error.localizedDescription
            }
        } receiveValue: { [weak self] deck in
            self?.currentDeck = deck
            self?.myDecks.append(deck)
        }
        .store(in: &cancellables)
    }

    func loadCards(deckId: String) {
        isLoading = true

        vocabularyService.getCards(deckId: deckId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] cards in
                self?.cards = cards
            }
            .store(in: &cancellables)
    }

    func loadDueCards(language: String) {
        vocabularyService.getDueCards(language: language)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] cards in
                self?.dueCards = cards
            }
            .store(in: &cancellables)
    }

    func recordReview(cardId: String, quality: Int) {
        vocabularyService.recordReview(cardId: cardId, quality: quality)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { _ in
                // Review recorded successfully
            }
            .store(in: &cancellables)
    }

    func subscribeToDeck(deckId: String) {
        vocabularyService.subscribeToDeck(deckId: deckId)
            .receive(on: DispatchQueue.main)
            .sink { _ in } receiveValue: { _ in }
            .store(in: &cancellables)
    }
}
