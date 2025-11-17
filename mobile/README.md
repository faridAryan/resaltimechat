# Learno Mobile Applications

Native mobile applications for iOS and Android that connect to the Learno backend API.

## Overview

This directory contains two native mobile applications:

- **iOS** (`/ios`): Swift + SwiftUI
- **Android** (`/android`): Kotlin + Jetpack Compose

Both apps provide the complete Learno experience with all features from the backend:

- 📚 Short Story Practice with AI-generated content
- 🎯 Spaced Repetition Vocabulary (SM-2 algorithm)
- 🗣️ Real-Time Dialogue Practice with 30 scenarios
- ✍️ Writing Practice with AI correction
- 📊 Progress Analytics with AI insights

## Quick Start

### iOS

```bash
cd ios
open Learno.xcodeproj
# or
xed .
```

Requirements:
- macOS with Xcode 14.0+
- iOS 15.0+ target
- Swift 5.7+

See [iOS README](./ios/README.md) for detailed setup instructions.

### Android

```bash
cd android
# Open in Android Studio
```

Requirements:
- Android Studio Hedgehog (2023.1.1) or later
- Minimum SDK 26 (Android 8.0)
- Target SDK 34 (Android 14)
- Kotlin 1.9.10+

See [Android README](./android/README.md) for detailed setup instructions.

## Architecture

Both apps follow modern mobile architecture patterns:

### iOS Architecture
- **MVVM Pattern** with SwiftUI
- **Combine** for reactive programming
- **URLSession** for networking
- **UserDefaults** for local storage
- **AVFoundation** for audio

### Android Architecture
- **MVVM Pattern** with Jetpack Compose
- **Kotlin Coroutines** + StateFlow for reactive programming
- **Retrofit** + OkHttp for networking
- **SharedPreferences** for local storage
- **Media3** for audio

## API Configuration

Both apps connect to the backend API. Configure the base URL:

### iOS (`Config.swift`)

```swift
static let apiBaseURL: String = {
    #if DEBUG
    return "https://dev-api.learno.app"
    #else
    return "https://api.learno.app"
    #endif
}()
```

### Android (`app/build.gradle.kts`)

```kotlin
buildTypes {
    debug {
        buildConfigField("String", "API_BASE_URL", "\"https://dev-api.learno.app\"")
    }
    release {
        buildConfigField("String", "API_BASE_URL", "\"https://api.learno.app\"")
    }
}
```

## Features

### Authentication
- Login / Register
- JWT token management
- Auto-refresh on app launch

### Home Dashboard
- Current streak display
- Study time tracking
- Quick action buttons
- Recent activities

### Short Stories
- Browse by level and genre
- AI-generated stories with images
- Comprehension questions
- Bookmark favorites
- Track reading progress

### Vocabulary
- Create custom decks
- AI-generated themed decks
- Spaced repetition reviews
- Public deck marketplace
- SM-2 algorithm implementation

### Dialogue Practice
- 5 practice modes:
  - Free Conversation
  - Guided Topic
  - Pronunciation Drills
  - Debate
  - Storytelling
- 30 real-world scenarios
- Real-time audio processing
- Pronunciation feedback

### Progress Analytics
- Skill breakdown (Speaking, Listening, Reading, Writing, Vocabulary)
- Weekly/monthly trends
- AI-powered insights
- Goal predictions
- Achievement system

## Supported Languages

Both apps support learning the following languages:

- Spanish
- French
- German
- Italian
- Portuguese
- Russian
- Chinese
- Japanese
- Korean
- Arabic

## CEFR Levels

All content adapts to user proficiency level:

- **A1** - Beginner
- **A2** - Elementary
- **B1** - Intermediate
- **B2** - Upper Intermediate
- **C1** - Advanced
- **C2** - Proficiency

## Development

### iOS Development

1. Clone repository
2. Open `ios/Learno.xcodeproj` in Xcode
3. Update `Config.swift` with API URL
4. Run on simulator or device

### Android Development

1. Clone repository
2. Open `android/` in Android Studio
3. Sync Gradle
4. Update API URL in `build.gradle.kts`
5. Run on emulator or device

## Testing

### iOS

```bash
# Run unit tests
cmd + U in Xcode
```

### Android

```bash
# Run unit tests
./gradlew test

# Run instrumentation tests
./gradlew connectedAndroidTest
```

## Building for Release

### iOS

1. Update version in Info.plist
2. Archive: Product → Archive
3. Distribute to App Store or TestFlight

### Android

1. Update version in `app/build.gradle.kts`
2. Build → Generate Signed Bundle / APK
3. Upload to Google Play Console

## Version History

### 7.1.0 (Current)
- Initial mobile app release
- Full feature parity with backend
- iOS (Swift/SwiftUI) and Android (Kotlin/Compose)
- Complete API integration
- All 10 services accessible

## Technology Stack

### iOS
- Swift 5.7+
- SwiftUI
- Combine
- URLSession
- AVFoundation

### Android
- Kotlin 1.9.10
- Jetpack Compose
- Material 3
- Retrofit 2
- Kotlin Coroutines
- StateFlow

## License

MIT License

## Support

For issues or questions:
- Check individual app READMEs ([iOS](./ios/README.md) | [Android](./android/README.md))
- File an issue in the repository
- Contact the Learno development team
