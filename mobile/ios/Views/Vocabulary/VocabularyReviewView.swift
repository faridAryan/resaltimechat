import SwiftUI

struct VocabularyReviewView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = VocabularyViewModel()
    @State private var currentCardIndex = 0
    @State private var isFlipped = false
    @State private var reviewComplete = false

    var body: some View {
        VStack {
            if viewModel.dueCards.isEmpty {
                // No cards to review
                VStack(spacing: 20) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.green)

                    Text("All caught up!")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("No cards due for review")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
            } else if reviewComplete {
                // Review complete
                ReviewCompletionView(
                    cardsReviewed: currentCardIndex,
                    onContinue: {
                        reviewComplete = false
                        currentCardIndex = 0
                        viewModel.loadDueCards(language: appState.selectedLanguage)
                    }
                )
            } else {
                // Active review
                VStack(spacing: 20) {
                    // Progress
                    HStack {
                        Text("\(currentCardIndex + 1) / \(viewModel.dueCards.count)")
                            .font(.headline)

                        Spacer()

                        Button("End Review") {
                            reviewComplete = true
                        }
                        .font(.subheadline)
                    }
                    .padding(.horizontal)

                    // Progress Bar
                    ProgressView(value: Double(currentCardIndex), total: Double(viewModel.dueCards.count))
                        .padding(.horizontal)

                    Spacer()

                    // Flashcard
                    FlashCard(
                        card: viewModel.dueCards[currentCardIndex],
                        isFlipped: $isFlipped
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: 300)
                    .padding()

                    // Flip Button
                    if !isFlipped {
                        Button(action: {
                            withAnimation(.spring()) {
                                isFlipped = true
                            }
                        }) {
                            Text("Show Answer")
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(10)
                        }
                        .padding(.horizontal)
                    }

                    Spacer()

                    // SM-2 Quality Buttons
                    if isFlipped {
                        VStack(spacing: 12) {
                            Text("How well did you know this?")
                                .font(.subheadline)
                                .foregroundColor(.gray)

                            VStack(spacing: 8) {
                                SM2QualityButton(
                                    title: "Perfect",
                                    subtitle: "Easy recall",
                                    color: .green,
                                    quality: 5
                                ) {
                                    recordReview(quality: 5)
                                }

                                SM2QualityButton(
                                    title: "Good",
                                    subtitle: "Correct with effort",
                                    color: .blue,
                                    quality: 4
                                ) {
                                    recordReview(quality: 4)
                                }

                                SM2QualityButton(
                                    title: "Hard",
                                    subtitle: "Difficult to recall",
                                    color: .orange,
                                    quality: 3
                                ) {
                                    recordReview(quality: 3)
                                }

                                SM2QualityButton(
                                    title: "Again",
                                    subtitle: "Incorrect",
                                    color: .red,
                                    quality: 0
                                ) {
                                    recordReview(quality: 0)
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
        }
        .navigationTitle("Review")
        .onAppear {
            viewModel.loadDueCards(language: appState.selectedLanguage)
        }
    }

    private func recordReview(quality: Int) {
        let card = viewModel.dueCards[currentCardIndex]
        viewModel.recordReview(cardId: card.id, quality: quality)

        // Move to next card
        withAnimation {
            if currentCardIndex < viewModel.dueCards.count - 1 {
                currentCardIndex += 1
                isFlipped = false
            } else {
                reviewComplete = true
            }
        }
    }
}

struct FlashCard: View {
    let card: VocabularyCard
    @Binding var isFlipped: Bool

    var body: some View {
        ZStack {
            // Front (Word)
            CardFace(isVisible: !isFlipped) {
                VStack(spacing: 16) {
                    Text(card.word)
                        .font(.system(size: 36, weight: .bold))

                    if let partOfSpeech = card.partOfSpeech {
                        Text(partOfSpeech)
                            .font(.caption)
                            .foregroundColor(.gray)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(Color.gray.opacity(0.2))
                            .cornerRadius(8)
                    }

                    if let ipa = card.ipa {
                        Text("[\(ipa)]")
                            .font(.body)
                            .foregroundColor(.blue)
                    }
                }
            }

            // Back (Translation & Examples)
            CardFace(isVisible: isFlipped) {
                VStack(alignment: .leading, spacing: 16) {
                    Text(card.translation)
                        .font(.title2)
                        .fontWeight(.semibold)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)

                    if let examples = card.exampleSentences, !examples.isEmpty {
                        Divider()

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Examples:")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.gray)

                            ForEach(examples.prefix(2), id: \.self) { example in
                                Text("• \(example)")
                                    .font(.body)
                            }
                        }
                    }

                    if let mnemonic = card.mnemonic {
                        Divider()

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Mnemonic:")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.gray)

                            Text(mnemonic)
                                .font(.body)
                                .italic()
                        }
                    }
                }
                .padding()
            }
        }
        .rotation3DEffect(
            .degrees(isFlipped ? 180 : 0),
            axis: (x: 0, y: 1, z: 0)
        )
    }
}

struct CardFace<Content: View>: View {
    let isVisible: Bool
    let content: Content

    init(isVisible: Bool, @ViewBuilder content: () -> Content) {
        self.isVisible = isVisible
        self.content = content()
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 4)

            content
                .padding()
        }
        .opacity(isVisible ? 1 : 0)
        .rotation3DEffect(
            .degrees(isVisible ? 0 : 180),
            axis: (x: 0, y: 1, z: 0)
        )
    }
}

struct SM2QualityButton: View {
    let title: String
    let subtitle: String
    let color: Color
    let quality: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(.white)

                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.9))
                }

                Spacer()

                Text("\(quality)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(color)
            .cornerRadius(10)
        }
    }
}

struct ReviewCompletionView: View {
    let cardsReviewed: Int
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.green)

            Text("Review Complete!")
                .font(.title)
                .fontWeight(.bold)

            Text("You reviewed \(cardsReviewed) cards")
                .font(.subheadline)
                .foregroundColor(.gray)

            Button(action: onContinue) {
                Text("Continue Learning")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
            }
            .padding(.horizontal)
            .padding(.top, 20)
        }
    }
}
