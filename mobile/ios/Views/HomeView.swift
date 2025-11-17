import SwiftUI

struct HomeView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var appState: AppState
    @StateObject private var progressViewModel = ProgressViewModel()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Welcome Section
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Hello, \(authViewModel.currentUser?.username ?? "Learner")!")
                            .font(.title)
                            .fontWeight(.bold)

                        Text("Keep up the great work!")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal)

                    // Streak Card
                    if let streak = progressViewModel.streakData {
                        StreakCard(streak: streak)
                            .padding(.horizontal)
                    }

                    // Today's Progress
                    if let dashboard = progressViewModel.dashboard {
                        TodayProgressCard(dashboard: dashboard)
                            .padding(.horizontal)
                    }

                    // Quick Actions
                    Text("Quick Actions")
                        .font(.headline)
                        .padding(.horizontal)

                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 15) {
                        QuickActionCard(
                            icon: "book.fill",
                            title: "Read Story",
                            color: .purple
                        )

                        QuickActionCard(
                            icon: "text.book.closed.fill",
                            title: "Review Words",
                            color: .orange
                        )

                        QuickActionCard(
                            icon: "mic.fill",
                            title: "Practice Speaking",
                            color: .blue
                        )

                        QuickActionCard(
                            icon: "pencil",
                            title: "Write Essay",
                            color: .green
                        )
                    }
                    .padding(.horizontal)

                    // Recent Activities
                    if let activities = progressViewModel.dashboard?.recentActivities, !activities.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Recent Activities")
                                .font(.headline)
                                .padding(.horizontal)

                            ForEach(activities.prefix(5)) { activity in
                                ActivityRow(activity: activity)
                                    .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Home")
            .onAppear {
                progressViewModel.loadDashboard(language: appState.selectedLanguage)
                progressViewModel.loadStreak()
            }
        }
    }
}

struct StreakCard: View {
    let streak: StreakData

    var body: some View {
        VStack(spacing: 10) {
            HStack {
                Image(systemName: "flame.fill")
                    .font(.title)
                    .foregroundColor(.orange)

                VStack(alignment: .leading) {
                    Text("\(streak.currentStreak) Day Streak")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Longest: \(streak.longestStreak) days")
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Spacer()
            }
            .padding()
            .background(Color.orange.opacity(0.1))
            .cornerRadius(15)
        }
    }
}

struct TodayProgressCard: View {
    let dashboard: ProgressDashboard

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Today's Progress")
                .font(.headline)

            HStack(spacing: 20) {
                ProgressStat(
                    icon: "clock.fill",
                    value: "\(dashboard.totalStudyMinutes)",
                    label: "Minutes",
                    color: .blue
                )

                ProgressStat(
                    icon: "checkmark.circle.fill",
                    value: "\(dashboard.recentActivities.count)",
                    label: "Activities",
                    color: .green
                )

                if let avgScore = dashboard.skillScores.speaking {
                    ProgressStat(
                        icon: "star.fill",
                        value: String(format: "%.0f%%", avgScore),
                        label: "Score",
                        color: .yellow
                    )
                }
            }
        }
        .padding()
        .background(Color.blue.opacity(0.05))
        .cornerRadius(15)
    }
}

struct ProgressStat: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack {
            Image(systemName: icon)
                .foregroundColor(color)

            Text(value)
                .font(.title3)
                .fontWeight(.bold)

            Text(label)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
    }
}

struct QuickActionCard: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.largeTitle)
                .foregroundColor(color)

            Text(title)
                .font(.caption)
                .fontWeight(.medium)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(15)
    }
}

struct ActivityRow: View {
    let activity: ActivitySummary

    var body: some View {
        HStack {
            Image(systemName: activityIcon)
                .foregroundColor(.blue)
                .frame(width: 30)

            VStack(alignment: .leading) {
                Text(activity.activityType.capitalized)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(formatDate(activity.timestamp))
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            if let score = activity.score {
                Text(String(format: "%.0f%%", score))
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.green)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(10)
    }

    var activityIcon: String {
        switch activity.activityType {
        case "reading": return "book.fill"
        case "vocabulary": return "text.book.closed.fill"
        case "dialogue": return "mic.fill"
        case "writing": return "pencil"
        default: return "checkmark.circle.fill"
        }
    }

    func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
