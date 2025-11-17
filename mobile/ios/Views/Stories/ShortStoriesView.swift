import SwiftUI

struct ShortStoriesView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = ShortStoryViewModel()
    @State private var selectedGenre: String?
    @State private var showingGenerateSheet = false

    let genres = ["adventure", "mystery", "romance", "scifi", "fantasy", "historical", "slice_of_life"]

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Genre Filter
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            FilterChip(
                                title: "All",
                                isSelected: selectedGenre == nil,
                                action: {
                                    selectedGenre = nil
                                    viewModel.loadStories(language: appState.selectedLanguage)
                                }
                            )

                            ForEach(genres, id: \.self) { genre in
                                FilterChip(
                                    title: genre.capitalized,
                                    isSelected: selectedGenre == genre,
                                    action: {
                                        selectedGenre = genre
                                        viewModel.loadStories(
                                            language: appState.selectedLanguage,
                                            level: appState.userLevel,
                                            genre: genre
                                        )
                                    }
                                )
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Bookmarked Stories
                    if !viewModel.bookmarkedStories.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Bookmarked")
                                .font(.headline)
                                .padding(.horizontal)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 15) {
                                    ForEach(viewModel.bookmarkedStories) { story in
                                        StoryCard(story: story)
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    // All Stories
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Explore Stories")
                            .font(.headline)
                            .padding(.horizontal)

                        if viewModel.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else {
                            LazyVStack(spacing: 15) {
                                ForEach(viewModel.stories) { story in
                                    NavigationLink(destination: StoryDetailView(story: story)) {
                                        StoryRow(story: story)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Stories")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingGenerateSheet = true
                    }) {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
            .sheet(isPresented: $showingGenerateSheet) {
                GenerateStorySheet(viewModel: viewModel)
                    .environmentObject(appState)
            }
            .onAppear {
                viewModel.loadStories(
                    language: appState.selectedLanguage,
                    level: appState.userLevel
                )
                viewModel.loadBookmarkedStories()
            }
        }
    }
}

struct StoryCard: View {
    let story: ShortStory

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let imageUrl = story.images?.first {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                }
                .frame(width: 200, height: 150)
                .cornerRadius(10)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(story.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(2)

                HStack {
                    Text(story.level)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.2))
                        .cornerRadius(5)

                    Text("\(story.wordCount) words")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
        }
        .frame(width: 200)
    }
}

struct StoryRow: View {
    let story: ShortStory

    var body: some View {
        HStack(spacing: 15) {
            if let imageUrl = story.images?.first {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                }
                .frame(width: 80, height: 80)
                .cornerRadius(10)
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(story.title)
                    .font(.headline)
                    .foregroundColor(.primary)

                Text(story.genre.capitalized)
                    .font(.caption)
                    .foregroundColor(.blue)

                HStack {
                    Label(story.level, systemImage: "star.fill")
                        .font(.caption)
                        .foregroundColor(.orange)

                    Text("•")

                    Label("\(story.estimatedReadingTime ?? 5) min", systemImage: "clock")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(10)
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .padding(.horizontal, 15)
                .padding(.vertical, 8)
                .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

struct GenerateStorySheet: View {
    @ObservedObject var viewModel: ShortStoryViewModel
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss
    @State private var selectedGenre = "adventure"
    @State private var selectedTheme = "friendship"
    @State private var imageStyle = "cartoon"

    let genres = ["adventure", "mystery", "romance", "scifi", "fantasy"]
    let themes = ["friendship", "courage", "family", "honesty", "perseverance"]
    let imageStyles = ["cartoon", "black-white", "watercolor", "minimalist"]

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Story Settings")) {
                    Picker("Genre", selection: $selectedGenre) {
                        ForEach(genres, id: \.self) { genre in
                            Text(genre.capitalized).tag(genre)
                        }
                    }

                    Picker("Theme", selection: $selectedTheme) {
                        ForEach(themes, id: \.self) { theme in
                            Text(theme.capitalized).tag(theme)
                        }
                    }

                    Picker("Image Style", selection: $imageStyle) {
                        ForEach(imageStyles, id: \.self) { style in
                            Text(style.capitalized).tag(style)
                        }
                    }
                }

                Section {
                    Button(action: {
                        viewModel.generateStory(
                            language: appState.selectedLanguage,
                            level: appState.userLevel,
                            genre: selectedGenre,
                            theme: selectedTheme,
                            imageStyle: imageStyle
                        )
                        dismiss()
                    }) {
                        if viewModel.isLoading {
                            HStack {
                                Spacer()
                                ProgressView()
                                Spacer()
                            }
                        } else {
                            Text("Generate Story")
                                .frame(maxWidth: .infinity)
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
            .navigationTitle("Generate New Story")
            .navigationBarItems(trailing: Button("Cancel") {
                dismiss()
            })
        }
    }
}

struct StoryDetailView: View {
    let story: ShortStory

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Story image
                if let imageUrl = story.images?.first {
                    AsyncImage(url: URL(string: imageUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        ProgressView()
                    }
                    .cornerRadius(10)
                }

                // Story content
                Text(story.content)
                    .font(.body)
                    .lineSpacing(8)

                // Vocabulary section
                if let vocabulary = story.vocabulary, !vocabulary.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Key Vocabulary")
                            .font(.headline)

                        ForEach(vocabulary) { word in
                            VStack(alignment: .leading, spacing: 5) {
                                Text(word.word)
                                    .fontWeight(.bold)
                                Text(word.translation)
                                    .foregroundColor(.gray)
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(8)
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle(story.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
