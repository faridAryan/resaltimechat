# Learno Android App

Native Android application for Learno - Complete AI Language Learning Platform built with Kotlin and Jetpack Compose.

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

- Android Studio Hedgehog | 2023.1.1 or later
- Minimum SDK: 26 (Android 8.0)
- Target SDK: 34 (Android 14)
- Kotlin 1.9.10+
- Java 17

## Installation

### 1. Clone the Repository

```bash
cd mobile/android
```

### 2. Open in Android Studio

1. Launch Android Studio
2. Select "Open an Existing Project"
3. Navigate to `mobile/android`
4. Click "OK"

### 3. Configure Backend URL

The API URLs are configured in `app/build.gradle.kts`:

```kotlin
buildConfigField("String", "API_BASE_URL", "\"https://api.learno.app\"")
buildConfigField("String", "WS_BASE_URL", "\"wss://api.learno.app/ws\"")
```

For development, update the debug build variant:

```kotlin
debug {
    buildConfigField("String", "API_BASE_URL", "\"https://dev-api.learno.app\"")
    buildConfigField("String", "WS_BASE_URL", "\"wss://dev-api.learno.app/ws\"")
}
```

### 4. Sync Gradle

Android Studio will automatically prompt you to sync Gradle. Click "Sync Now".

### 5. Build and Run

1. Select your target device or emulator
2. Click the Run button or press `Shift + F10`

## Project Structure

```
android/app/src/main/java/com/learno/app/
├── LearnoApplication.kt          # Application class
├── MainActivity.kt               # Main activity
├── data/
│   ├── model/
│   │   └── Models.kt            # Data models
│   ├── local/
│   │   └── PreferencesManager.kt # Local storage
│   └── remote/
│       ├── ApiClient.kt         # Retrofit client
│       └── api/
│           ├── AuthApi.kt       # Authentication endpoints
│           ├── ShortStoryApi.kt
│           ├── VocabularyApi.kt
│           ├── DialogueApi.kt
│           └── ProgressApi.kt
└── ui/
    ├── LearnoApp.kt             # Main app composable
    ├── viewmodel/
    │   └── AuthViewModel.kt     # Authentication logic
    ├── auth/
    │   ├── LoginScreen.kt
    │   └── RegisterScreen.kt
    ├── main/
    │   └── MainScreen.kt        # Main navigation
    ├── screens/
    │   ├── HomeScreen.kt
    │   ├── StoriesScreen.kt
    │   ├── VocabularyScreen.kt
    │   ├── PracticeScreen.kt
    │   └── ProgressScreen.kt
    └── theme/
        ├── Theme.kt
        └── Type.kt
```

## Architecture

### MVVM Pattern with Jetpack Compose
- **Models**: Data classes matching backend API
- **ViewModels**: Business logic using Kotlin Coroutines and StateFlow
- **Views**: Jetpack Compose declarative UI

### Key Technologies
- **Jetpack Compose**: Modern Android UI toolkit
- **Retrofit**: Type-safe HTTP client
- **Kotlin Coroutines**: Asynchronous programming
- **StateFlow**: Reactive state management
- **Navigation Compose**: Type-safe navigation
- **Material 3**: Latest Material Design components

## API Integration

All API services use Retrofit with Kotlin Coroutines:

```kotlin
// Example API call
val storyApi = ApiClient.createService(ShortStoryApi::class.java)
viewModelScope.launch {
    val response = storyApi.getStories(
        language = "spanish",
        level = "B1"
    )
    if (response.isSuccessful) {
        val stories = response.body()?.data?.items
        // Update UI state
    }
}
```

## State Management

Using Kotlin StateFlow for reactive UI updates:

```kotlin
class AuthViewModel : ViewModel() {
    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated

    // Observe in Composable:
    val isAuth by viewModel.isAuthenticated.collectAsState()
}
```

## Permissions

The app requires the following permissions (declared in `AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Dependency Management

All dependencies are declared in `app/build.gradle.kts`:

### Core Dependencies
- **Jetpack Compose BOM**: 2024.01.00
- **Retrofit**: 2.9.0
- **OkHttp**: 4.12.0
- **Kotlin Coroutines**: 1.7.3
- **Coil**: 2.5.0 (image loading)
- **Material 3**: Latest

### Build Configuration

```kotlin
android {
    compileSdk = 34
    minSdk = 26
    targetSdk = 34

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.3"
    }
}
```

## Building for Release

### 1. Update Version

In `app/build.gradle.kts`:

```kotlin
defaultConfig {
    versionCode = 1
    versionName = "7.1.0"
}
```

### 2. Generate Signed APK

1. Build → Generate Signed Bundle / APK
2. Select "APK" or "Android App Bundle"
3. Create or select your keystore
4. Choose "release" build variant
5. Click "Finish"

### 3. ProGuard Rules

Release builds use ProGuard for code shrinking. Rules are in `proguard-rules.pro`.

## Testing

### Unit Tests

```bash
./gradlew test
```

### Instrumentation Tests

```bash
./gradlew connectedAndroidTest
```

## Configuration

### Supported Languages

```kotlin
listOf(
    "spanish", "french", "german", "italian", "portuguese",
    "russian", "chinese", "japanese", "korean", "arabic"
)
```

### CEFR Levels

A1, A2, B1, B2, C1, C2

## Debugging

### Enable Logging

HTTP logging is automatically enabled in debug builds via OkHttp interceptor:

```kotlin
val loggingInterceptor = HttpLoggingInterceptor().apply {
    level = if (BuildConfig.DEBUG) {
        HttpLoggingInterceptor.Level.BODY
    } else {
        HttpLoggingInterceptor.Level.NONE
    }
}
```

### Logcat Filters

In Android Studio Logcat, filter by:
- `package:com.learno.app` - All app logs
- `tag:Learno` - Custom tagged logs

## Version

Current version: **7.1.0**

Matches backend version for feature parity.

## Troubleshooting

### Gradle Build Failed

1. Clean project: Build → Clean Project
2. Rebuild: Build → Rebuild Project
3. Invalidate caches: File → Invalidate Caches / Restart

### Network Errors

1. Verify `BuildConfig.API_BASE_URL` is correct
2. Check internet permission in manifest
3. Enable cleartext traffic for HTTP (development only)

## License

MIT License

## Support

For issues or questions, please contact the Learno team or file an issue in the repository.
