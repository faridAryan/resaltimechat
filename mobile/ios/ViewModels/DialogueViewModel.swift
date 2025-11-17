import Foundation
import Combine

class DialogueViewModel: ObservableObject {
    @Published var currentSession: DialogueSession?
    @Published var messages: [DialogueTurn] = []
    @Published var scenarios: [ConversationScenario] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isProcessingAudio = false

    private let dialogueService = DialogueService.shared
    private let audioService = AudioRecordingService.shared
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Session Management
    func startSession(
        language: String,
        practiceMode: String,
        topic: String? = nil,
        difficulty: String = "intermediate"
    ) {
        isLoading = true

        dialogueService.startSession(
            language: language,
            practiceMode: practiceMode,
            topic: topic,
            difficulty: difficulty
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] completion in
            self?.isLoading = false
            if case .failure(let error) = completion {
                self?.errorMessage = error.localizedDescription
            }
        } receiveValue: { [weak self] session in
            self?.currentSession = session
            self?.messages = []
        }
        .store(in: &cancellables)
    }

    func endSession() {
        guard let sessionId = currentSession?.id else { return }

        dialogueService.endSession(sessionId: sessionId)
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

    // MARK: - Audio Processing
    func processRecording(audioURL: URL, language: String) {
        guard let sessionId = currentSession?.id,
              let audioData = audioService.getAudioData(from: audioURL) else {
            return
        }

        isProcessingAudio = true

        dialogueService.processAudio(
            sessionId: sessionId,
            audioData: audioData,
            language: language
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] completion in
            self?.isProcessingAudio = false
            if case .failure(let error) = completion {
                self?.errorMessage = error.localizedDescription
            }
        } receiveValue: { [weak self] turn in
            self?.messages.append(turn)

            // Play AI response if available
            if let audioUrl = turn.audioUrl, let url = URL(string: audioUrl) {
                self?.downloadAndPlayAudio(url: url)
            }
        }
        .store(in: &cancellables)
    }

    // MARK: - Scenarios
    func loadScenarios(language: String, difficulty: String? = nil) {
        dialogueService.getScenarios(language: language, difficulty: difficulty)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] scenarios in
                self?.scenarios = scenarios
            }
            .store(in: &cancellables)
    }

    func startScenario(scenarioId: String, language: String, difficulty: String) {
        isLoading = true

        dialogueService.startScenario(
            scenarioId: scenarioId,
            language: language,
            difficulty: difficulty
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] completion in
            self?.isLoading = false
            if case .failure(let error) = completion {
                self?.errorMessage = error.localizedDescription
            }
        } receiveValue: { [weak self] session in
            self?.currentSession = session
            self?.messages = []
        }
        .store(in: &cancellables)
    }

    // MARK: - Audio Playback
    private func downloadAndPlayAudio(url: URL) {
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let data = data, error == nil else { return }

            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("response.mp3")
            try? data.write(to: tempURL)

            DispatchQueue.main.async {
                self?.audioService.playRecording(url: tempURL)
            }
        }.resume()
    }
}
