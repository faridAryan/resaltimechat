import SwiftUI

struct DialoguePracticeView: View {
    let mode: String
    let title: String

    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = DialogueViewModel()
    @StateObject private var audioService = AudioRecordingService.shared

    var body: some View {
        VStack(spacing: 0) {
            // Messages Area
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.messages) { message in
                            MessageBubbleView(message: message)
                                .id(message.id)
                        }

                        if viewModel.isProcessingAudio {
                            HStack {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                                Text("Processing...")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                            .padding()
                        }
                    }
                    .padding()
                }
                .onChange(of: viewModel.messages.count) { _ in
                    if let lastMessage = viewModel.messages.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }

            Divider()

            // Recording Controls
            VStack(spacing: 16) {
                // Recording Duration
                if audioService.isRecording {
                    HStack {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 12, height: 12)

                        Text(formatDuration(audioService.recordingDuration))
                            .font(.subheadline)
                            .foregroundColor(.red)
                    }
                }

                // Record Button
                Button(action: {
                    if audioService.isRecording {
                        if let url = audioService.stopRecording() {
                            viewModel.processRecording(
                                audioURL: url,
                                language: appState.selectedLanguage
                            )
                        }
                    } else {
                        audioService.startRecording()
                    }
                }) {
                    VStack(spacing: 10) {
                        Image(systemName: audioService.isRecording ? "stop.circle.fill" : "mic.circle.fill")
                            .font(.system(size: 70))
                            .foregroundColor(audioService.isRecording ? .red : .blue)

                        Text(audioService.isRecording ? "Stop Recording" : "Tap to Speak")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                }
                .disabled(viewModel.isProcessingAudio)
            }
            .padding()
            .background(Color(.systemBackground))
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("End Session") {
                    viewModel.endSession()
                }
            }
        }
        .onAppear {
            if viewModel.currentSession == nil {
                viewModel.startSession(
                    language: appState.selectedLanguage,
                    practiceMode: mode,
                    difficulty: appState.userLevel
                )
            }
        }
        .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("OK") {
                viewModel.errorMessage = nil
            }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

struct MessageBubbleView: View {
    let message: DialogueTurn

    var isUser: Bool {
        message.speaker == "user"
    }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 50) }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                Text(message.transcript)
                    .padding(12)
                    .background(isUser ? Color.blue : Color.gray.opacity(0.2))
                    .foregroundColor(isUser ? .white : .primary)
                    .cornerRadius(16)

                if let score = message.pronunciationScore {
                    HStack(spacing: 4) {
                        Image(systemName: "waveform")
                            .font(.caption2)
                        Text("Pronunciation: \(Int(score))%")
                            .font(.caption)
                    }
                    .foregroundColor(scoreColor(score))
                }
            }

            if !isUser { Spacer(minLength: 50) }
        }
    }

    private func scoreColor(_ score: Double) -> Color {
        if score >= 80 { return .green }
        if score >= 60 { return .orange }
        return .red
    }
}
