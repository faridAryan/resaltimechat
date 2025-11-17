import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }

            ShortStoriesView()
                .tabItem {
                    Label("Stories", systemImage: "book.fill")
                }

            VocabularyView()
                .tabItem {
                    Label("Vocabulary", systemImage: "text.book.closed.fill")
                }

            DialogueView()
                .tabItem {
                    Label("Practice", systemImage: "mic.fill")
                }

            ProgressView()
                .tabItem {
                    Label("Progress", systemImage: "chart.bar.fill")
                }
        }
        .accentColor(.blue)
    }
}
