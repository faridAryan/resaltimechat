import SwiftUI

struct DialogueView: View {
    @EnvironmentObject var appState: AppState

    let practiceModes = [
        ("free_conversation", "Free Conversation", "bubble.left.and.bubble.right.fill", Color.blue),
        ("guided_topic", "Guided Topic", "map.fill", Color.green),
        ("pronunciation_drill", "Pronunciation", "waveform", Color.orange),
        ("debate", "Debate", "person.2.fill", Color.purple),
        ("storytelling", "Storytelling", "book.fill", Color.pink)
    ]

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Practice Speaking")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("Choose a practice mode to get started")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal)

                    // Practice Modes
                    ForEach(practiceModes, id: \.0) { mode in
                        PracticeModeCard(
                            mode: mode.0,
                            title: mode.1,
                            icon: mode.2,
                            color: mode.3
                        )
                    }
                    .padding(.horizontal)

                    // Scenarios Section
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Real-World Scenarios")
                            .font(.headline)
                            .padding(.horizontal)

                        NavigationLink(destination: ScenariosListView()) {
                            HStack {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text("30 Practice Scenarios")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)

                                    Text("Restaurant, Airport, Job Interview & more")
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }

                                Spacer()

                                Image(systemName: "chevron.right")
                                    .foregroundColor(.gray)
                            }
                            .padding()
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [.blue.opacity(0.1), .purple.opacity(0.1)]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(15)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Practice")
        }
    }
}

struct PracticeModeCard: View {
    let mode: String
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        NavigationLink(destination: PracticeSessionView(mode: mode, title: title)) {
            HStack(spacing: 15) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                    .frame(width: 50, height: 50)
                    .background(color.opacity(0.2))
                    .cornerRadius(10)

                VStack(alignment: .leading, spacing: 5) {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text(getModeDescription(mode))
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.gray)
            }
            .padding()
            .background(Color.gray.opacity(0.05))
            .cornerRadius(15)
        }
        .buttonStyle(PlainButtonStyle())
    }

    func getModeDescription(_ mode: String) -> String {
        switch mode {
        case "free_conversation": return "Natural conversation practice"
        case "guided_topic": return "Structured topic discussion"
        case "pronunciation_drill": return "Perfect your pronunciation"
        case "debate": return "Argue your point"
        case "storytelling": return "Create and tell stories"
        default: return ""
        }
    }
}

struct PracticeSessionView: View {
    let mode: String
    let title: String
    @EnvironmentObject var appState: AppState
    @State private var isRecording = false
    @State private var transcript = ""

    var body: some View {
        VStack {
            Spacer()

            // Conversation Area
            ScrollView {
                VStack(alignment: .leading, spacing: 15) {
                    if !transcript.isEmpty {
                        MessageBubble(text: transcript, isUser: true)
                    }
                }
                .padding()
            }

            Spacer()

            // Recording Button
            Button(action: {
                isRecording.toggle()
            }) {
                VStack(spacing: 10) {
                    Image(systemName: isRecording ? "stop.circle.fill" : "mic.circle.fill")
                        .font(.system(size: 80))
                        .foregroundColor(isRecording ? .red : .blue)

                    Text(isRecording ? "Recording..." : "Tap to speak")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }
            .padding(.bottom, 50)
        }
        .navigationTitle(title)
    }
}

struct MessageBubble: View {
    let text: String
    let isUser: Bool

    var body: some View {
        HStack {
            if isUser { Spacer() }

            Text(text)
                .padding()
                .background(isUser ? Color.blue : Color.gray.opacity(0.2))
                .foregroundColor(isUser ? .white : .primary)
                .cornerRadius(15)

            if !isUser { Spacer() }
        }
    }
}

struct ScenariosListView: View {
    var body: some View {
        List {
            Text("Restaurant Ordering")
            Text("Airport Check-in")
            Text("Job Interview")
            Text("Doctor Appointment")
            Text("Shopping")
            Text("And 25 more scenarios...")
        }
        .navigationTitle("Scenarios")
    }
}
