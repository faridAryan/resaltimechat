# Learno iOS App

Native iOS application for Learno - Complete AI Language Learning Platform built with Swift and SwiftUI.

## Features

### 📚 Core Learning Features
- **Short Story Practice**: AI-generated level-adaptive stories with comprehension questions
- **Spaced Repetition Vocabulary**: SM-2 algorithm-based flashcard system
- **Real-Time Dialogue Practice**: Live voice conversation with AI feedback
- **Writing Practice**: AI-powered correction and feedback
- **Progress Analytics**: Comprehensive dashboards with AI insights

### 🎯 30 Real-World Scenarios
- Restaurant, Airport, Job Interview, Shopping
- Doctor, Hotel, Pharmacy, Bank
- Gym, Real Estate, Hair Salon, Post Office
- And 22 more practical scenarios

### 🗣️ Practice Modes
- Free Conversation
- Guided Topic Discussion
- Pronunciation Drills
- Debate Practice
- Storytelling

## Requirements

- iOS 15.0+
- Xcode 14.0+
- Swift 5.7+

## Installation

### 1. Clone the Repository

```bash
cd mobile/ios
```

### 2. Open in Xcode

```bash
open Learno.xcodeproj
```

Or open the project manually in Xcode.

### 3. Configure Backend URL

Update the API base URL in `Config.swift`:

```swift
static let apiBaseURL: String = "https://your-api-url.com"
static let websocketURL: String = "wss://your-api-url.com/ws"
```

### 4. Build and Run

1. Select your target device or simulator
2. Press `Cmd + R` to build and run

## Project Structure

```
ios/
├── LearnoApp.swift          # Main app entry point
├── Config.swift             # Configuration and environment settings
├── Info.plist               # App metadata and permissions
├── Models/
│   └── Models.swift         # Data models
├── Services/
│   ├── APIClient.swift      # Core networking layer
│   ├── AuthService.swift    # Authentication
│   ├── ShortStoryService.swift
│   ├── VocabularyService.swift
│   ├── DialogueService.swift
│   ├── WritingService.swift
│   └── ProgressService.swift
├── ViewModels/
│   ├── AuthViewModel.swift
│   ├── ShortStoryViewModel.swift
│   ├── VocabularyViewModel.swift
│   └── ProgressViewModel.swift
└── Views/
    ├── MainTabView.swift
    ├── HomeView.swift
    ├── Auth/
    │   ├── LoginView.swift
    │   └── RegisterView.swift
    ├── Stories/
    │   └── ShortStoriesView.swift
    ├── Vocabulary/
    │   └── VocabularyView.swift
    ├── Dialogue/
    │   └── DialogueView.swift
    └── Progress/
        └── ProgressView.swift
```

## Architecture

### MVVM Pattern
- **Models**: Data structures matching backend API
- **ViewModels**: Business logic and state management
- **Views**: SwiftUI declarative UI components

### Networking
- Combine framework for reactive networking
- Generic APIClient for all HTTP requests
- Multipart form data support for audio uploads

### State Management
- `@Published` properties for reactive updates
- `@EnvironmentObject` for shared app state
- UserDefaults for local persistence

## API Integration

All services connect to the backend API defined in `Config.swift`:

```swift
// Example API call
ShortStoryService.shared.getStories(
    language: "spanish",
    level: "B1"
)
.sink { completion in
    // Handle completion
} receiveValue: { stories in
    // Handle stories
}
.store(in: &cancellables)
```

## Permissions

The app requests the following permissions:

- **Microphone**: For pronunciation practice and dialogue sessions
- **Speech Recognition**: For transcription and pronunciation feedback

Update descriptions in `Info.plist` as needed.

## Configuration

### Debug vs Release

The app automatically switches between development and production APIs based on build configuration:

```swift
#if DEBUG
return "https://dev-api.learno.app"
#else
return "https://api.learno.app"
#endif
```

### Supported Languages

```swift
["spanish", "french", "german", "italian", "portuguese",
 "russian", "chinese", "japanese", "korean", "arabic"]
```

### CEFR Levels

```swift
["A1", "A2", "B1", "B2", "C1", "C2"]
```

## Key Features Implementation

### 1. Authentication

```swift
authViewModel.login(email: email, password: password)
```

Automatically stores auth token in UserDefaults and includes it in all subsequent API requests.

### 2. Story Generation

```swift
storyViewModel.generateStory(
    language: "spanish",
    level: "B1",
    genre: "adventure",
    imageStyle: "cartoon"
)
```

### 3. Vocabulary Review (SM-2 Algorithm)

```swift
vocabularyViewModel.recordReview(
    cardId: card.id,
    quality: 4  // 0-5 scale
)
```

### 4. Real-Time Dialogue

```swift
dialogueService.processAudio(
    sessionId: session.id,
    audioData: recordedAudio,
    language: "spanish"
)
```

## Version

Current version: **7.1.0**

Matches backend version for feature parity.

## License

MIT License

## Support

For issues or questions, please contact the Learno team or file an issue in the repository.
