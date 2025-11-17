import SwiftUI

struct ProgressView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = ProgressViewModel()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Streak Section
                    if let streak = viewModel.streakData {
                        StreakCard(streak: streak)
                            .padding(.horizontal)
                    }

                    // Skill Scores
                    if let dashboard = viewModel.dashboard {
                        SkillScoresCard(skillScores: dashboard.skillScores)
                            .padding(.horizontal)
                    }

                    // Recent Progress
                    if let dashboard = viewModel.dashboard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("This Week")
                                .font(.headline)
                                .padding(.horizontal)

                            HStack(spacing: 15) {
                                StatCard(
                                    title: "Study Time",
                                    value: "\(dashboard.totalStudyMinutes)",
                                    unit: "min",
                                    icon: "clock.fill",
                                    color: .blue
                                )

                                StatCard(
                                    title: "Activities",
                                    value: "\(dashboard.recentActivities.count)",
                                    unit: "",
                                    icon: "checkmark.circle.fill",
                                    color: .green
                                )
                            }
                            .padding(.horizontal)
                        }
                    }

                    // AI Insights
                    if let insights = viewModel.insights {
                        InsightsCard(insights: insights)
                            .padding(.horizontal)
                    }

                    // Achievements
                    if let achievements = viewModel.dashboard?.achievements {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Achievements")
                                .font(.headline)
                                .padding(.horizontal)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 15) {
                                    ForEach(achievements) { achievement in
                                        AchievementBadge(achievement: achievement)
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Progress")
            .onAppear {
                viewModel.loadDashboard(language: appState.selectedLanguage)
                viewModel.loadStreak()
                viewModel.loadInsights(language: appState.selectedLanguage)
            }
        }
    }
}

struct SkillScoresCard: View {
    let skillScores: SkillScores

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Skill Levels")
                .font(.headline)

            VStack(spacing: 12) {
                if let speaking = skillScores.speaking {
                    SkillBar(skill: "Speaking", score: speaking, color: .blue)
                }
                if let listening = skillScores.listening {
                    SkillBar(skill: "Listening", score: listening, color: .green)
                }
                if let reading = skillScores.reading {
                    SkillBar(skill: "Reading", score: reading, color: .orange)
                }
                if let writing = skillScores.writing {
                    SkillBar(skill: "Writing", score: writing, color: .purple)
                }
                if let vocabulary = skillScores.vocabulary {
                    SkillBar(skill: "Vocabulary", score: vocabulary, color: .pink)
                }
            }
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(15)
    }
}

struct SkillBar: View {
    let skill: String
    let score: Double
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text(skill)
                    .font(.subheadline)
                Spacer()
                Text("\(Int(score))%")
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 8)

                    Rectangle()
                        .fill(color)
                        .frame(width: geometry.size.width * (score / 100), height: 8)
                }
            }
            .frame(height: 8)
            .cornerRadius(4)
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let unit: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text("\(value)\(unit)")
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(15)
    }
}

struct InsightsCard: View {
    let insights: ProgressInsights

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Image(systemName: "lightbulb.fill")
                    .foregroundColor(.yellow)
                Text("AI Insights")
                    .font(.headline)
            }

            VStack(alignment: .leading, spacing: 10) {
                if !insights.keyStrengths.isEmpty {
                    InsightSection(title: "Strengths", items: insights.keyStrengths, color: .green)
                }

                if !insights.areasForImprovement.isEmpty {
                    InsightSection(title: "Areas to Improve", items: insights.areasForImprovement, color: .orange)
                }
            }

            if !insights.motivationalMessage.isEmpty {
                Text(insights.motivationalMessage)
                    .font(.caption)
                    .italic()
                    .foregroundColor(.gray)
                    .padding(.top, 5)
            }
        }
        .padding()
        .background(Color.yellow.opacity(0.05))
        .cornerRadius(15)
    }
}

struct InsightSection: View {
    let title: String
    let items: [String]
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.semibold)

            ForEach(items.prefix(3), id: \.self) { item in
                HStack(alignment: .top, spacing: 5) {
                    Text("•")
                        .foregroundColor(color)
                    Text(item)
                        .font(.caption)
                }
            }
        }
    }
}

struct AchievementBadge: View {
    let achievement: Achievement

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: achievement.icon)
                .font(.title)
                .foregroundColor(achievement.isUnlocked ? .yellow : .gray)

            Text(achievement.title)
                .font(.caption)
                .fontWeight(.medium)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(width: 100, height: 100)
        .padding()
        .background(achievement.isUnlocked ? Color.yellow.opacity(0.1) : Color.gray.opacity(0.1))
        .cornerRadius(15)
        .opacity(achievement.isUnlocked ? 1.0 : 0.5)
    }
}
