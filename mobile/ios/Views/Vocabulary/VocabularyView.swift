import SwiftUI

struct VocabularyView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = VocabularyViewModel()
    @State private var showingCreateDeck = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Due Cards Banner
                    if !viewModel.dueCards.isEmpty {
                        NavigationLink(destination: VocabularyReviewView()) {
                            DueCardsBanner(count: viewModel.dueCards.count)
                        }
                        .padding(.horizontal)
                    }

                    // My Decks
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("My Decks")
                                .font(.headline)

                            Spacer()

                            Button(action: {
                                showingCreateDeck = true
                            }) {
                                Label("New Deck", systemImage: "plus")
                                    .font(.subheadline)
                            }
                        }
                        .padding(.horizontal)

                        if viewModel.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else if viewModel.myDecks.isEmpty {
                            Text("No decks yet. Create your first deck!")
                                .foregroundColor(.gray)
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else {
                            ForEach(viewModel.myDecks) { deck in
                                NavigationLink(destination: DeckDetailView(deck: deck)) {
                                    DeckCard(deck: deck)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                            .padding(.horizontal)
                        }
                    }

                    // Public Decks
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Explore Public Decks")
                            .font(.headline)
                            .padding(.horizontal)

                        ForEach(viewModel.publicDecks) { deck in
                            PublicDeckCard(deck: deck, viewModel: viewModel)
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Vocabulary")
            .sheet(isPresented: $showingCreateDeck) {
                CreateDeckSheet(viewModel: viewModel)
                    .environmentObject(appState)
            }
            .onAppear {
                viewModel.loadMyDecks(language: appState.selectedLanguage)
                viewModel.loadPublicDecks(language: appState.selectedLanguage)
                viewModel.loadDueCards(language: appState.selectedLanguage)
            }
        }
    }
}

struct DueCardsBanner: View {
    let count: Int

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text("\(count) cards ready to review")
                    .font(.headline)
                    .foregroundColor(.white)

                Text("Keep your streak going!")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.9))
            }

            Spacer()

            Image(systemName: "arrow.right.circle.fill")
                .font(.title2)
                .foregroundColor(.white)
        }
        .padding()
        .background(
            LinearGradient(
                gradient: Gradient(colors: [.orange, .red]),
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(15)
    }
}

struct DeckCard: View {
    let deck: VocabularyDeck

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(deck.name)
                    .font(.headline)
                    .foregroundColor(.primary)

                Spacer()

                Text("\(deck.cardCount ?? 0) cards")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            if let description = deck.description {
                Text(description)
                    .font(.caption)
                    .foregroundColor(.gray)
                    .lineLimit(2)
            }

            HStack {
                Text(deck.difficulty.capitalized)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(5)

                if let theme = deck.theme {
                    Text(theme.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.purple.opacity(0.2))
                        .cornerRadius(5)
                }
            }
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(10)
    }
}

struct PublicDeckCard: View {
    let deck: VocabularyDeck
    @ObservedObject var viewModel: VocabularyViewModel

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 5) {
                Text(deck.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text("\(deck.cardCount ?? 0) cards • \(deck.difficulty.capitalized)")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            Button(action: {
                viewModel.subscribeToDeck(deckId: deck.id)
            }) {
                Text("Add")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(10)
    }
}

struct CreateDeckSheet: View {
    @ObservedObject var viewModel: VocabularyViewModel
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss
    @State private var theme = ""
    @State private var difficulty = "intermediate"
    @State private var cardCount = 20

    let difficulties = ["beginner", "intermediate", "advanced"]

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Deck Settings")) {
                    TextField("Theme (e.g., Food, Travel)", text: $theme)

                    Picker("Difficulty", selection: $difficulty) {
                        ForEach(difficulties, id: \.self) { level in
                            Text(level.capitalized).tag(level)
                        }
                    }

                    Stepper("Cards: \(cardCount)", value: $cardCount, in: 10...50, step: 10)
                }

                Section {
                    Button(action: {
                        viewModel.generateDeck(
                            language: appState.selectedLanguage,
                            theme: theme,
                            difficulty: difficulty,
                            cardCount: cardCount
                        )
                        dismiss()
                    }) {
                        Text("Generate AI Deck")
                            .frame(maxWidth: .infinity)
                            .foregroundColor(.blue)
                    }
                    .disabled(theme.isEmpty)
                }
            }
            .navigationTitle("Create Deck")
            .navigationBarItems(trailing: Button("Cancel") {
                dismiss()
            })
        }
    }
}

struct DeckDetailView: View {
    let deck: VocabularyDeck

    var body: some View {
        Text("Deck: \(deck.name)")
            .navigationTitle(deck.name)
    }
}

struct ReviewCardsView: View {
    let cards: [VocabularyCard]

    var body: some View {
        Text("Review \(cards.count) cards")
            .navigationTitle("Review")
    }
}
