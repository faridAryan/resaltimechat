import Foundation
import AVFoundation
import Combine

class AudioRecordingService: NSObject, ObservableObject {
    static let shared = AudioRecordingService()

    @Published var isRecording = false
    @Published var recordingDuration: TimeInterval = 0
    @Published var errorMessage: String?

    private var audioRecorder: AVAudioRecorder?
    private var audioPlayer: AVAudioPlayer?
    private var recordingTimer: Timer?
    private var currentRecordingURL: URL?

    private override init() {
        super.init()
        setupAudioSession()
    }

    // MARK: - Audio Session Setup
    private func setupAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            try audioSession.setActive(true)
        } catch {
            errorMessage = "Failed to setup audio session: \(error.localizedDescription)"
        }
    }

    // MARK: - Recording
    func startRecording() {
        // Request microphone permission
        AVAudioSession.sharedInstance().requestRecordPermission { [weak self] allowed in
            DispatchQueue.main.async {
                if allowed {
                    self?.beginRecording()
                } else {
                    self?.errorMessage = "Microphone access denied"
                }
            }
        }
    }

    private func beginRecording() {
        let audioFilename = getDocumentsDirectory().appendingPathComponent("recording_\(Date().timeIntervalSince1970).wav")
        currentRecordingURL = audioFilename

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 16000.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsFloatKey: false
        ]

        do {
            audioRecorder = try AVAudioRecorder(url: audioFilename, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.record()

            isRecording = true
            recordingDuration = 0

            // Start timer
            recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
                self?.recordingDuration = self?.audioRecorder?.currentTime ?? 0
            }
        } catch {
            errorMessage = "Failed to start recording: \(error.localizedDescription)"
        }
    }

    func stopRecording() -> URL? {
        audioRecorder?.stop()
        recordingTimer?.invalidate()
        recordingTimer = nil
        isRecording = false

        return currentRecordingURL
    }

    // MARK: - Playback
    func playRecording(url: URL) {
        do {
            audioPlayer = try AVAudioPlayer(contentsOf: url)
            audioPlayer?.play()
        } catch {
            errorMessage = "Failed to play recording: \(error.localizedDescription)"
        }
    }

    func stopPlayback() {
        audioPlayer?.stop()
    }

    // MARK: - Get Audio Data
    func getAudioData(from url: URL) -> Data? {
        return try? Data(contentsOf: url)
    }

    // MARK: - Helpers
    private func getDocumentsDirectory() -> URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    func deleteRecording(url: URL) {
        try? FileManager.default.removeItem(at: url)
    }
}

// MARK: - AVAudioRecorderDelegate
extension AudioRecordingService: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        if !flag {
            errorMessage = "Recording failed"
        }
    }

    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        errorMessage = error?.localizedDescription ?? "Encoding error occurred"
    }
}
