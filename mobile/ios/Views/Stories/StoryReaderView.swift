import SwiftUI

struct StoryReaderView: View {
    let story: ShortStory
    @StateObject private var viewModel = ShortStoryViewModel()
    @State private var currentPage = 0
    @State private var showQuestions = false
    @State private var selectedAnswers: [Int] = []
    @State private var vocabularyLookedUp: Set<String> = []
    @State private var showVocabularyDetail: VocabularyItem?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Story Image
                if let imageUrl = story.images?.first, let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .aspectRatio(16/9, contentMode: .fit)
                    }
                    .cornerRadius(12)
                }

                // Story Metadata
                VStack(alignment: .leading, spacing: 8) {
                    Text(story.title)
                        .font(.title)
                        .fontWeight(.bold)

                    HStack {
                        Label(story.level, systemImage: "star.fill")
                            .font(.caption)
                            .foregroundColor(.orange)

                        Text("•")

                        Label(story.genre.capitalized, systemImage: "book.fill")
                            .font(.caption)

                        Text("•")

                        if let readingTime = story.estimatedReadingTime {
                            Label("\(readingTime) min", systemImage: "clock")
                                .font(.caption)
                        }
                    }
                    .foregroundColor(.gray)
                }

                Divider()

                // Story Content
                if let paragraphs = story.paragraphs {
                    ForEach(Array(paragraphs.enumerated()), id: \.offset) { index, paragraph in
                        ParagraphView(
                            paragraph: paragraph,
                            vocabulary: story.vocabulary ?? [],
                            onVocabularyTapped: { item in
                                showVocabularyDetail = item
                                vocabularyLookedUp.insert(item.word)
                            }
                        )
                    }
                } else {
                    Text(story.content)
                        .font(.body)
                        .lineSpacing(8)
                }

                // Vocabulary Section
                if let vocabulary = story.vocabulary, !vocabulary.isEmpty {
                    Divider()

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Key Vocabulary")
                            .font(.headline)

                        ForEach(vocabulary) { word in
                            VocabularyCardView(item: word)
                                .onTapGesture {
                                    showVocabularyDetail = word
                                    vocabularyLookedUp.insert(word.word)
                                }
                        }
                    }
                }

                // Grammar Concepts
                if let grammar = story.grammarConcepts, !grammar.isEmpty {
                    Divider()

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Grammar Points")
                            .font(.headline)

                        ForEach(grammar) { concept in
                            GrammarCardView(concept: concept)
                        }
                    }
                }

                // Moral Lesson
                if let moral = story.moralLesson {
                    Divider()

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Moral of the Story")
                            .font(.headline)

                        Text(moral)
                            .font(.body)
                            .italic()
                            .padding()
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                    }
                }

                // Comprehension Questions Button
                if let questions = story.comprehensionQuestions, !questions.isEmpty {
                    Button(action: {
                        startQuiz()
                    }) {
                        Label("Test Your Understanding", systemImage: "checkmark.circle.fill")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(10)
                    }
                }
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $showVocabularyDetail) { item in
            VocabularyDetailView(item: item)
        }
        .sheet(isPresented: $showQuestions) {
            if let questions = story.comprehensionQuestions {
                ComprehensionQuizView(
                    questions: questions,
                    onComplete: { answers in
                        selectedAnswers = answers
                        completeReading(answers: answers)
                    }
                )
            }
        }
    }

    private func startQuiz() {
        selectedAnswers = []
        showQuestions = true

        // Start reading session if not already started
        if viewModel.currentSession == nil {
            viewModel.startReadingSession(storyId: story.id)
        }
    }

    private func completeReading(answers: [Int]) {
        viewModel.completeSession(
            answers: answers,
            vocabularyLookedUp: Array(vocabularyLookedUp)
        )
    }
}

struct ParagraphView: View {
    let paragraph: StoryParagraph
    let vocabulary: [VocabularyItem]
    let onVocabularyTapped: (VocabularyItem) -> Void

    var body: some View {
        Text(highlightedText())
            .font(.body)
            .lineSpacing(8)
            .padding(.vertical, 8)
    }

    private func highlightedText() -> AttributedString {
        var attributedString = AttributedString(paragraph.text)

        // Highlight key vocabulary words
        if let keyWords = paragraph.keyVocabulary {
            for word in keyWords {
                if let range = attributedString.range(of: word, options: .caseInsensitive) {
                    attributedString[range].foregroundColor = .blue
                    attributedString[range].font = .body.bold()
                }
            }
        }

        return attributedString
    }
}

struct VocabularyCardView: View {
    let item: VocabularyItem

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(item.word)
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Spacer()

                if let pos = item.partOfSpeech {
                    Text(pos)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(4)
                }
            }

            Text(item.translation)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(8)
    }
}

struct GrammarCardView: View {
    let concept: GrammarConcept

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(concept.concept)
                .font(.subheadline)
                .fontWeight(.semibold)

            Text(concept.explanation)
                .font(.caption)
                .foregroundColor(.gray)

            if !concept.examples.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(concept.examples, id: \.self) { example in
                        HStack(alignment: .top, spacing: 4) {
                            Text("•")
                            Text(example)
                                .font(.caption)
                                .italic()
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color.green.opacity(0.05))
        .cornerRadius(8)
    }
}

struct VocabularyDetailView: View {
    let item: VocabularyItem
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Word
                    VStack(alignment: .leading, spacing: 8) {
                        Text(item.word)
                            .font(.largeTitle)
                            .fontWeight(.bold)

                        if let pos = item.partOfSpeech {
                            Text(pos)
                                .font(.caption)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 4)
                                .background(Color.gray.opacity(0.2))
                                .cornerRadius(8)
                        }
                    }

                    // Translation
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Translation")
                            .font(.caption)
                            .foregroundColor(.gray)

                        Text(item.translation)
                            .font(.title2)
                    }

                    // Definition
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Definition")
                            .font(.caption)
                            .foregroundColor(.gray)

                        Text(item.definition)
                            .font(.body)
                    }

                    // Example
                    if let example = item.exampleSentence {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Example")
                                .font(.caption)
                                .foregroundColor(.gray)

                            Text(example)
                                .font(.body)
                                .italic()
                                .padding()
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(8)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Vocabulary")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct ComprehensionQuizView: View {
    let questions: [ComprehensionQuestion]
    let onComplete: ([Int]) -> Void

    @State private var currentQuestion = 0
    @State private var selectedAnswers: [Int] = []
    @State private var showExplanation = false

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Progress
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Question \(currentQuestion + 1) of \(questions.count)")
                            .font(.caption)
                            .foregroundColor(.gray)

                        Spacer()

                        Text("\(selectedAnswers.filter { $0 == questions[selectedAnswers.count - 1].correctAnswer }.count) / \(selectedAnswers.count) correct")
                            .font(.caption)
                            .foregroundColor(.green)
                    }

                    ProgressView(value: Double(currentQuestion), total: Double(questions.count))
                }
                .padding(.horizontal)

                Spacer()

                // Question
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        Text(questions[currentQuestion].question)
                            .font(.title3)
                            .fontWeight(.semibold)

                        // Options
                        ForEach(Array(questions[currentQuestion].options.enumerated()), id: \.offset) { index, option in
                            OptionButton(
                                text: option,
                                isSelected: selectedAnswers.indices.contains(currentQuestion) && selectedAnswers[currentQuestion] == index,
                                isCorrect: showExplanation ? index == questions[currentQuestion].correctAnswer : nil,
                                isWrong: showExplanation && selectedAnswers.indices.contains(currentQuestion) && selectedAnswers[currentQuestion] == index && index != questions[currentQuestion].correctAnswer,
                                onTap: {
                                    if selectedAnswers.count == currentQuestion {
                                        selectedAnswers.append(index)
                                        showExplanation = true
                                    }
                                }
                            )
                        }

                        // Explanation
                        if showExplanation {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Explanation")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.gray)

                                Text(questions[currentQuestion].explanation)
                                    .font(.body)
                                    .padding()
                                    .background(Color.blue.opacity(0.1))
                                    .cornerRadius(8)
                            }
                        }
                    }
                    .padding()
                }

                // Next/Finish Button
                if showExplanation {
                    Button(action: {
                        if currentQuestion < questions.count - 1 {
                            currentQuestion += 1
                            showExplanation = false
                        } else {
                            onComplete(selectedAnswers)
                        }
                    }) {
                        Text(currentQuestion < questions.count - 1 ? "Next Question" : "Finish Quiz")
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
            }
            .navigationTitle("Comprehension Quiz")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct OptionButton: View {
    let text: String
    let isSelected: Bool
    let isCorrect: Bool?
    let isWrong: Bool
    let onTap: () -> Void

    var backgroundColor: Color {
        if isWrong {
            return .red.opacity(0.2)
        } else if isCorrect == true {
            return .green.opacity(0.2)
        } else if isSelected {
            return .blue.opacity(0.1)
        } else {
            return .gray.opacity(0.05)
        }
    }

    var borderColor: Color {
        if isWrong {
            return .red
        } else if isCorrect == true {
            return .green
        } else if isSelected {
            return .blue
        } else {
            return .clear
        }
    }

    var body: some View {
        Button(action: onTap) {
            HStack {
                Text(text)
                    .font(.body)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.leading)

                Spacer()

                if isCorrect == true {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                } else if isWrong {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.red)
                }
            }
            .padding()
            .background(backgroundColor)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(borderColor, lineWidth: 2)
            )
            .cornerRadius(10)
        }
        .disabled(isCorrect != nil)
    }
}
