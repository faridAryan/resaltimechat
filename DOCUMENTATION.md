# Learno - Complete AI Language Learning Platform

**Version 7.1.0**

A comprehensive, enterprise-grade AI-powered language learning platform featuring the complete 4 language skills (Speaking, Listening, Reading, Writing), spaced repetition vocabulary, progress analytics, peer learning, and adaptive curriculum powered by Gemini AI and LangChain.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Services Documentation](#services-documentation)
5. [Database Schema](#database-schema)
6. [Technology Stack](#technology-stack)
7. [Setup & Installation](#setup--installation)
8. [API Usage Examples](#api-usage-examples)
9. [Best Practices](#best-practices)
10. [Performance & Scaling](#performance--scaling)

---

## Overview

Learno is a complete language learning platform that provides:

- **4 Language Skills**: Speaking, Listening, Reading, Writing
- **AI-Powered Content**: Stories, lessons, flashcards, conversation scenarios
- **Adaptive Learning**: RL-based curriculum that adapts to user progress
- **Scientific Methods**: Spaced repetition (SM-2 algorithm), comprehension testing
- **Social Learning**: Peer matching, language exchange, collaborative features
- **Comprehensive Analytics**: Progress tracking, predictions, insights
- **Multi-Modal Learning**: Text, audio, images, interactive exercises

### Key Statistics

- **10+ Services**: Specialized microservices for different learning aspects
- **30 Conversation Scenarios**: Real-world dialogue practice
- **6 CEFR Levels**: A1 to C2 support
- **12 Story Genres**: Diverse reading material
- **8 Writing Types**: Comprehensive writing practice
- **50+ Database Tables**: Complete data model
- **8,000+ Lines of Code**: Production-ready TypeScript backend

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│    (React/Next.js - Web & Mobile Progressive Web App)      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway Layer                          │
│        (AWS API Gateway / Lambda Functions)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Services Layer (TypeScript)                 │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Real-Time      │  │ Story Practice │  │ Vocabulary    │ │
│  │ Dialogue       │  │ Service        │  │ SRS Service   │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Conversation   │  │ Writing        │  │ Progress      │ │
│  │ Simulator      │  │ Practice       │  │ Analytics     │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ AI Content     │  │ Peer Matching  │  │ RL Curriculum │ │
│  │ Generator      │  │ Service        │  │ Service       │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│  ┌────────────────┐                                         │
│  │ Gemini Voice   │                                         │
│  │ Service        │                                         │
│  └────────────────┘                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI/ML Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │ Gemini 2.5  │  │ Gemini 2.0  │  │ LangChain          │  │
│  │ Flash       │  │ Flash       │  │ (Prompt Templates) │  │
│  │ (Voice)     │  │ (Content)   │  │                    │  │
│  └─────────────┘  └─────────────┘  └────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │ PostgreSQL  │  │ Milvus      │  │ Redis              │  │
│  │ (Aurora     │  │ (Vector DB) │  │ (Cache/Sessions)   │  │
│  │ Serverless) │  │             │  │                    │  │
│  └─────────────┘  └─────────────┘  └────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │ S3          │  │ DynamoDB    │                          │
│  │ (Media)     │  │ (NoSQL)     │                          │
│  └─────────────┘  └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Service Architecture Patterns

- **Microservices**: Each major feature is an independent service
- **Event-Driven**: Asynchronous processing for heavy operations
- **Serverless**: AWS Lambda for auto-scaling
- **API-First**: RESTful APIs with clear contracts
- **Type-Safe**: Full TypeScript with strict typing
- **LangChain Integration**: Structured AI outputs with Zod validation

---

## Core Features

### 1. 🗣️ Speaking & Listening

#### Real-Time Dialogue Practice
- **5 Practice Modes**: Free conversation, guided topic, pronunciation drill, debate, storytelling
- **Bidirectional Streaming**: Continuous audio with Gemini Live API
- **Natural Interruptions**: Like real conversations
- **Live Transcription**: Real-time speech-to-text
- **Pronunciation Feedback**: Detailed analysis (0-100 scores)
- **Grammar Analysis**: Real-time corrections
- **Conversation Memory**: LangChain BufferMemory maintains context

#### Conversation Simulator
- **30 Real-World Scenarios**: Restaurant, airport, job interview, shopping, doctor, hotel, directions, small talk, pharmacy, bank, gym, car rental, real estate, hair salon, post office, library, emergency room, mechanic, parent-teacher, customer service, business meeting, cafe, movie theater, veterinarian, university, neighbor conversation, courtroom, sports event, tech support, grocery store
- **AI Role-Play**: Stays in character throughout
- **Real-Time Correction**: Optional immediate feedback
- **Hints System**: Contextual help when stuck
- **Voice Presets**: Different voices for different roles

#### Gemini Voice Service
- **30+ HD Voices**: Multiple voice options per language
- **24+ Languages**: Global language support
- **Affective Dialog**: Emotional understanding
- **<500ms Latency**: Near real-time responses
- **Pronunciation Scoring**: Word-level accuracy analysis

### 2. 📖 Reading

#### Interactive Short Story Practice
- **Level-Adaptive**: A1 to C2 CEFR-appropriate content
- **AI-Generated Stories**: Custom stories tailored to user level
- **12 Genres**: Adventure, mystery, fantasy, sci-fi, fairy-tale, comedy, drama, fable, legend, myth, slice-of-life, historical
- **13 Themes**: Friendship, courage, honesty, perseverance, kindness, family, discovery, transformation, justice, love, wisdom, adventure, growth
- **AI Illustrations**: Cartoon, black & white, watercolor, minimalist styles
- **Interactive Reading**: Click words for instant definitions
- **Comprehension Testing**: 5 multiple choice questions per story
- **Reading Analytics**: Speed (WPM), comprehension scores, improvement tracking

**Level Configuration:**
- **A1**: 100-200 words, present simple, basic vocabulary
- **A2**: 200-350 words, simple past/present continuous, common phrases
- **B1**: 350-500 words, multiple tenses, some idioms
- **B2**: 500-750 words, complex structures, sophisticated vocabulary
- **C1**: 750-1000 words, advanced grammar, figurative language
- **C2**: 1000+ words, native-level complexity

### 3. ✍️ Writing

#### Writing Practice & AI Correction
- **8 Writing Types**: Essay, email, story, description, opinion, letter, review, report
- **AI-Generated Prompts**: Themed writing prompts with tips
- **Comprehensive Correction**: Grammar, vocabulary, style, spelling, punctuation
- **5 Scores**: Overall, grammar, vocabulary, coherence, style (0-100 each)
- **Corrected Version**: Fully revised text with explanations
- **Progress Tracking**: Improvement rate, strengths, weaknesses
- **Revision Comparison**: Track improvements between drafts

**Correction Types:**
- Grammar: Sentence structure, verb conjugation, article usage
- Vocabulary: Word choice, variety, appropriateness
- Style: Tone, register, clarity, engagement
- Coherence: Logical flow, transitions, paragraph structure
- Spelling & Punctuation: Basic correctness

### 4. 📚 Vocabulary

#### Spaced Repetition System (SRS)
- **SM-2 Algorithm**: Scientific retention optimization
- **AI-Generated Flashcards**: Complete with IPA, mnemonics, examples
- **Adaptive Scheduling**: Interval-based review timing
- **Public Deck Marketplace**: Browse and clone shared decks
- **Streak Tracking**: Daily review motivation
- **Comprehensive Stats**: Mastered, learning, new cards tracking

**SM-2 Parameters:**
- **Easiness Factor (EF)**: 1.3 - 2.5
- **Interval**: Days until next review
- **Repetitions**: Consecutive correct recalls
- **Quality**: 0-5 recall rating

**Card States:**
- **New**: Never reviewed (interval = 0)
- **Learning**: 0-5 repetitions (interval = 1-21 days)
- **Mastered**: 5+ repetitions, 21+ day interval

### 5. 📊 Progress Analytics

#### Comprehensive Dashboard
- **Overview Statistics**: Study time, streaks, words learned, conversations completed
- **Skill Breakdown**: 7 skills scored 0-100 (speaking, listening, reading, writing, vocabulary, grammar, pronunciation)
- **Activity Timeline**: 30-day view with daily metrics
- **AI-Powered Insights**: Strengths, patterns, recommendations
- **Goal Predictions**: Estimated time to reach target level
- **Peer Benchmarking**: Anonymized comparison with others
- **Learning Velocity**: Words/week, minutes/day, sessions/week
- **Trend Analysis**: Increasing, stable, or decreasing progress

### 6. 🎓 AI Content Generation

#### Personalized Lesson Generator
- **Unlimited Lessons**: AI-generated content on demand
- **Weak Area Targeting**: Based on RL curriculum analysis
- **Multiple Content Types**: Vocabulary, grammar, conversation, reading, listening
- **4-Week Curriculum**: Progressive lesson series
- **RAG Integration**: Content stored in Milvus for retrieval
- **Spaced Repetition**: Auto-indexed vocabulary

### 7. 👥 Social Learning

#### Peer Matching & Language Exchange
- **Compatibility Algorithm**: Scores potential partners
- **Complementary Matching**: Native/learning language pairs
- **Session Management**: WebRTC rooms with time splits
- **AI Assistance**: Optional real-time help during sessions
- **Bilateral Feedback**: Both users receive performance insights

**Compatibility Factors:**
- Language complementarity: +30 points
- Common interests: +15 points
- Similar proficiency: +10 points
- Timezone compatibility: +5 points

### 8. 🧠 Reinforcement Learning Curriculum

#### Adaptive Learning Path
- **AdaCuRL Inspired**: Adaptive curriculum learning
- **AVAR-RL Elements**: Automatic variance reduction
- **State Tracking**: Comprehensive user skill state
- **Dynamic Difficulty**: Adjusts based on performance
- **Weak Area Identification**: Continuous assessment
- **Progress Predictions**: ML-based achievement estimation

---

## Services Documentation

### 1. RealTimeDialogueService

**File**: `backend-ts/src/services/real-time-dialogue-service.ts`

**Purpose**: Provides bidirectional streaming dialogue practice with comprehensive feedback.

**Key Methods:**

```typescript
// Start a dialogue session
async startDialogueSession(
  userId: string,
  language: string,
  mode: 'free_conversation' | 'guided_topic' | 'pronunciation_drill' | 'debate' | 'storytelling',
  options: {
    topic?: string;
    difficulty?: string;
    duration?: number;
    focusAreas?: string[];
    enableInterruptions?: boolean;
    realTimeTranscription?: boolean;
  }
): Promise<{
  sessionId: string;
  mode: string;
  streamUrl: string;
  initialMessage: string;
  configuration: any;
}>

// Process streaming audio
async processStreamingAudio(
  sessionId: string,
  audioChunk: Buffer,
  options: { isFinal?: boolean; interruptAI?: boolean; }
): Promise<{
  transcript?: string;
  aiResponse?: string;
  aiAudio?: Buffer;
  pronunciationFeedback?: any;
  grammarSuggestions?: any[];
  shouldContinue: boolean;
}>

// End session with feedback
async endDialogueSession(sessionId: string): Promise<{
  summary: SessionAnalytics;
  feedback: any;
  achievements: string[];
  rlUpdate: any;
}>
```

**LangChain Components:**
- `ChatGoogleGenerativeAI`: LLM integration
- `ChatPromptTemplate`: Dynamic prompt management
- `BufferMemory`: Conversation history
- `ConversationChain`: Dialogue flow management
- `StructuredOutputParser`: Type-safe feedback with Zod

**Database Tables:**
- `real_time_dialogue_sessions`
- `dialogue_turns`
- `dialogue_analytics`
- `dialogue_preferences`
- `dialogue_achievements`

### 2. ConversationSimulatorService

**File**: `backend-ts/src/services/conversation-simulator.ts`

**Purpose**: Role-play scenarios with AI staying in character.

**Key Methods:**

```typescript
// Start simulation
async startSimulation(
  userId: string,
  language: string,
  scenarioType: string, // 30 scenarios available
  options: {
    difficulty?: string;
    situation?: string;
    userRole?: string;
    duration?: number;
    enableHints?: boolean;
    realTimeCorrection?: boolean;
  }
): Promise<{
  sessionId: string;
  scenario: any;
  initialPrompt: string;
  audioGreeting: Buffer;
}>

// Process conversation turn
async processConversation(
  sessionId: string,
  audioBuffer: Buffer,
  options: { requestHint?: boolean; skipCorrection?: boolean; }
): Promise<{
  transcript: string;
  aiResponse: string;
  audioResponse: Buffer;
  pronunciationFeedback?: any;
  hint?: string;
  conversationState: any;
}>

// End simulation
async endSimulation(sessionId: string): Promise<{
  summary: any;
  feedback: any;
  achievements: string[];
  rlUpdate: any;
}>
```

**30 Scenarios:**
1. Restaurant, 2. Airport, 3. Job Interview, 4. Shopping, 5. Doctor, 6. Hotel, 7. Directions, 8. Small Talk, 9. Pharmacy, 10. Bank, 11. Gym, 12. Car Rental, 13. Real Estate, 14. Hair Salon, 15. Post Office, 16. Library, 17. Emergency Room, 18. Mechanic, 19. Parent-Teacher, 20. Customer Service, 21. Business Meeting, 22. Cafe, 23. Movie Theater, 24. Veterinarian, 25. University, 26. Neighbor Conversation, 27. Courtroom, 28. Sports Event, 29. Tech Support, 30. Grocery Store

### 3. ShortStoryPracticeService

**File**: `backend-ts/src/services/short-story-practice-service.ts`

**Purpose**: Level-appropriate reading practice with AI-generated stories and images.

**Key Methods:**

```typescript
// Generate story
async generateStory(
  userId: string,
  language: string,
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
  options: {
    genre?: string;
    theme?: string;
    customPrompt?: string;
    imageStyle?: 'cartoon' | 'black-white' | 'watercolor' | 'minimalist';
  }
): Promise<{
  storyId: string;
  story: any;
  images: string[];
}>

// Start reading
async startReading(userId: string, storyId: string): Promise<{
  sessionId: string;
  story: any;
  images: string[];
  interactiveElements: any;
}>

// Complete reading
async completeReading(
  userId: string,
  sessionId: string,
  answers: number[],
  readingTimeSeconds: number
): Promise<{
  score: number;
  correctAnswers: number;
  feedback: any[];
  readingSpeed: number;
  comprehensionLevel: string;
  achievements: string[];
}>

// Get statistics
async getStatistics(userId: string, language: string): Promise<{
  totalStoriesRead: number;
  averageComprehension: number;
  averageReadingSpeed: number;
  favoriteGenre: string;
  improvementRate: number;
}>
```

**Story Components:**
- Title, genre, theme
- Paragraphs with key vocabulary and grammar
- Complete vocabulary list
- Grammar concepts with examples
- 5 comprehension questions
- Moral lesson
- AI-generated illustrations (3-5 images)

### 4. SpacedRepetitionVocabularyService

**File**: `backend-ts/src/services/spaced-repetition-vocabulary-service.ts`

**Purpose**: Scientific vocabulary retention using SM-2 algorithm.

**Key Methods:**

```typescript
// Create deck
async createDeck(
  userId: string,
  language: string,
  options: { name: string; theme?: string; difficulty?: string; }
): Promise<{ deckId: string; deck: any; }>

// Generate AI flashcards
async generateFlashcards(
  deckId: string,
  language: string,
  theme: string,
  count: number = 20
): Promise<any[]>

// Get due cards
async getDueCards(
  userId: string,
  deckId?: string,
  limit: number = 20
): Promise<any[]>

// Record review (SM-2 algorithm)
async recordReview(
  userId: string,
  cardId: string,
  quality: number // 0-5
): Promise<{
  nextReview: Date;
  interval: number;
  easinessFactor: number;
  repetitions: number;
}>

// Get statistics
async getStatistics(userId: string, deckId?: string): Promise<{
  totalCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
  dueToday: number;
  reviewsToday: number;
  streak: number;
  averageEasiness: number;
}>
```

**SM-2 Algorithm:**
```
EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

If quality < 3: repetitions = 0, interval = 1
Else:
  - If repetitions = 0: interval = 1
  - If repetitions = 1: interval = 6
  - Else: interval = interval * EF
```

### 5. WritingPracticeService

**File**: `backend-ts/src/services/writing-practice-service.ts`

**Purpose**: Comprehensive writing practice with AI correction.

**Key Methods:**

```typescript
// Generate prompt
async generatePrompt(
  language: string,
  writingType: string, // 8 types
  difficulty: string,
  theme?: string
): Promise<{
  title: string;
  prompt: string;
  keywords: string[];
  estimatedLength: string;
  tips: string[];
}>

// Submit writing
async submitWriting(
  userId: string,
  language: string,
  options: {
    writingType: string;
    difficulty: string;
    content: string;
    title?: string;
  }
): Promise<{
  submissionId: string;
  analysis: any;
  corrections: any;
}>

// Get statistics
async getStatistics(userId: string, language: string): Promise<{
  totalSubmissions: number;
  averageScore: number;
  improvementRate: number;
  strongestArea: string;
  weakestArea: string;
}>
```

**Writing Types:**
1. Essay, 2. Email, 3. Story, 4. Description, 5. Opinion, 6. Letter, 7. Review, 8. Report

### 6. ProgressAnalyticsService

**File**: `backend-ts/src/services/progress-analytics-service.ts`

**Purpose**: Comprehensive learning analytics with AI insights.

**Key Methods:**

```typescript
// Get dashboard
async getDashboard(userId: string, language: string): Promise<{
  overview: any;
  skillBreakdown: any;
  activityTimeline: any[];
  achievements: any[];
  insights: any;
  predictions: any;
}>

// Get overview
async getOverview(userId: string, language: string): Promise<{
  totalStudyTime: number;
  currentStreak: number;
  wordsLearned: number;
  pronunciationScore: number;
  currentLevel: string;
}>

// Get skill breakdown
async getSkillBreakdown(userId: string, language: string): Promise<{
  speaking: number;
  listening: number;
  reading: number;
  writing: number;
  vocabulary: number;
  grammar: number;
  pronunciation: number;
}>

// Generate AI insights
async generateInsights(userId: string, language: string): Promise<{
  keyStrengths: string[];
  areasForImprovement: string[];
  learningPatterns: string[];
  recommendations: any[];
  motivationalMessage: string;
}>

// Predict goal achievement
async predictGoalAchievement(
  userId: string,
  language: string,
  targetLevel: string
): Promise<{
  estimatedTimeToGoal: number;
  confidence: number;
  factors: string[];
  milestones: any[];
}>
```

### 7. AIContentGeneratorService

**File**: `backend-ts/src/services/ai-content-generator.ts`

**Purpose**: Generate unlimited personalized lessons.

**Key Methods:**

```typescript
// Generate personalized lesson
async generatePersonalizedLesson(
  userId: string,
  language: string,
  options: {
    topic?: string;
    difficulty?: string;
    contentType?: string;
    duration?: number;
  }
): Promise<{
  lessonId: string;
  title: string;
  content: any;
  exercises: any[];
}>

// Generate vocabulary lesson
async generateVocabularyLesson(
  userId: string,
  language: string,
  theme: string,
  wordCount: number = 20
)

// Generate grammar exercises
async generateGrammarExercises(
  language: string,
  grammarConcept: string,
  difficulty: string,
  exerciseCount: number = 10
)

// Generate lesson series
async generateLessonSeries(
  userId: string,
  language: string,
  goal: string,
  weeks: number = 4
): Promise<any[]>
```

### 8. PeerMatchingService

**File**: `backend-ts/src/services/peer-matching-service.ts`

**Purpose**: Connect learners for language exchange.

**Key Methods:**

```typescript
// Find conversation partner
async findConversationPartner(
  userId: string,
  preferences: {
    targetLanguage: string;
    nativeLanguage: string;
    proficiencyLevel: string;
    interests?: string[];
  }
): Promise<{ matches: any[]; }>

// Create peer session
async createPeerSession(
  user1Id: string,
  user2Id: string,
  options: {
    language1: string;
    language2: string;
    duration: number;
    splitType: '50/50' | '30/70' | 'flexible';
    withAIAssistant?: boolean;
  }
): Promise<{
  sessionId: string;
  roomId: string;
  schedule: any[];
}>

// Get AI assistance during session
async getAIAssistance(
  sessionId: string,
  request: {
    type: 'translation' | 'grammar' | 'vocabulary' | 'pronunciation';
    context?: string;
  }
)
```

### 9. GeminiVoiceService

**File**: `backend-ts/src/services/gemini-voice-service.ts`

**Purpose**: Native audio interaction with Gemini 2.5 Flash.

**Key Methods:**

```typescript
// Start live audio session
async startLiveAudioSession(config: {
  language: string;
  learningContext: string;
  userLevel: string;
  expectedResponse?: string;
  voicePreset?: string;
})

// Process audio with feedback
async processAudioWithFeedback(
  audioBuffer: Buffer,
  language: string,
  expectedText?: string,
  userLevel: string = 'intermediate'
): Promise<{
  transcript: string;
  audioResponse: Buffer;
  pronunciationScore: number;
  pronunciationFeedback: any;
  emotionalTone: string;
  conversationQuality: number;
}>

// Generate speech
async generateSpeech(
  text: string,
  language: string,
  options: {
    voicePreset?: string;
    speakingRate?: number;
    emotionalTone?: string;
  }
)
```

### 10. RLCurriculumService

**File**: `backend-ts/src/services/rl-curriculum-service.ts`

**Purpose**: Adaptive curriculum using reinforcement learning.

**Key Methods:**

```typescript
// Get curriculum state
async getCurriculumState(userId: string, language: string): Promise<{
  overallProgress: number;
  currentLevel: string;
  weakAreas: any[];
  strengths: any[];
  recommendedActivities: any[];
}>

// Update from activity
async updateFromActivity(
  userId: string,
  language: string,
  activityData: any
): Promise<any>

// Get recommended lesson
async getRecommendedLesson(userId: string, language: string): Promise<any>
```

---

## Database Schema

### Core Tables

#### Users & Profiles
- `users`: User accounts
- `user_profiles`: Extended user information

#### Learning Content
- `lessons`: Generated lessons
- `generated_lessons`: AI-created content
- `short_stories`: Reading material
- `vocabulary_decks`: Flashcard decks
- `vocabulary_cards`: Individual flashcards
- `conversation_scenarios`: Pre-defined scenarios

#### Practice & Progress
- `real_time_dialogue_sessions`: Live dialogue sessions
- `dialogue_turns`: Individual conversation exchanges
- `story_reading_sessions`: Reading sessions
- `writing_submissions`: Writing practice submissions
- `vocabulary_reviews`: SM-2 algorithm data
- `vocabulary_review_history`: Complete review log

#### Social Features
- `peer_preferences`: Language exchange preferences
- `peer_sessions`: Language exchange sessions
- `peer_interactions`: Session messages

#### Analytics
- `study_sessions`: Unified activity tracking
- `progress_snapshots`: Daily/weekly aggregates
- `dialogue_analytics`: Detailed dialogue metrics
- `achievement_progress`: Gamification tracking

### Total Tables: 50+

### Key Indexes

```sql
-- High-traffic queries
CREATE INDEX idx_dialogue_sessions_user_language
  ON real_time_dialogue_sessions(user_id, language, started_at);

CREATE INDEX idx_vocabulary_reviews_due
  ON vocabulary_reviews(user_id, next_review);

CREATE INDEX idx_stories_language_level
  ON short_stories(language, level, is_public);

CREATE INDEX idx_writing_submissions_user_language
  ON writing_submissions(user_id, language, submitted_at);
```

---

## Technology Stack

### Backend
- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 20+
- **Framework**: Serverless (AWS Lambda)
- **ORM**: Knex.js 3.1+
- **Validation**: Zod 3.22+

### AI/ML
- **LLM**: Google Gemini 2.5 Flash (voice), Gemini 2.0 Flash (content)
- **Framework**: LangChain 0.1.5+
- **Prompt Management**: LangChain ChatPromptTemplate
- **Memory**: LangChain BufferMemory
- **Output Parsing**: LangChain StructuredOutputParser + Zod

### Databases
- **SQL**: PostgreSQL (AWS Aurora Serverless v2)
- **Vector DB**: Milvus 2.3+ (RAG/semantic search)
- **Cache**: Redis (ioredis 5.3+)
- **NoSQL**: DynamoDB (optional)

### AWS Services
- **Compute**: Lambda Functions
- **API**: API Gateway
- **Database**: Aurora Serverless, RDS
- **Storage**: S3 (audio/images)
- **Auth**: Cognito
- **Queue**: SQS, EventBridge
- **CDN**: CloudFront

### DevOps
- **IaC**: AWS CDK 2.117+
- **Build**: esbuild 0.19+
- **Testing**: Jest 29.7+
- **Linting**: ESLint 8.56+
- **Formatting**: Prettier 3.1+

---

## Setup & Installation

### Prerequisites

```bash
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Milvus 2.3+ (optional, for RAG features)
- AWS Account (for deployment)
- Google AI API Key (for Gemini)
```

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd resaltimechat/backend-ts
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/learno
REDIS_URL=redis://localhost:6379

# AI Services
GOOGLE_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_key (optional)

# AWS (for deployment)
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your_account_id

# Milvus (optional)
MILVUS_HOST=localhost
MILVUS_PORT=19530

# Application
NODE_ENV=development
PORT=3000
```

4. **Database Migration**
```bash
npm run db:migrate
```

5. **Build**
```bash
npm run build
```

6. **Development**
```bash
npm run watch
```

7. **Testing**
```bash
npm test
```

8. **Deploy**
```bash
npm run deploy
```

### Database Migrations

```bash
# Run all migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Create new migration
npx knex migrate:make migration_name
```

---

## API Usage Examples

### 1. Real-Time Dialogue Practice

```typescript
import { RealTimeDialogueService } from './services/real-time-dialogue-service';

const dialogueService = new RealTimeDialogueService();

// Start free conversation
const session = await dialogueService.startDialogueSession(
  'user-123',
  'spanish',
  'free_conversation',
  {
    difficulty: 'intermediate',
    duration: 15,
    enableInterruptions: true,
    realTimeTranscription: true,
    focusAreas: ['pronunciation', 'vocabulary']
  }
);

console.log(session.sessionId);
console.log(session.initialMessage);

// Process user audio
const result = await dialogueService.processStreamingAudio(
  session.sessionId,
  audioBuffer,
  { isFinal: true }
);

console.log('User:', result.transcript);
console.log('AI:', result.aiResponse);
console.log('Pronunciation Score:', result.pronunciationFeedback.overallScore);

// End session
const summary = await dialogueService.endDialogueSession(session.sessionId);
console.log('Final Score:', summary.summary.naturalness);
console.log('Achievements:', summary.achievements);
```

### 2. Generate & Read Short Story

```typescript
import { ShortStoryPracticeService } from './services/short-story-practice-service';

const storyService = new ShortStoryPracticeService();

// Generate story
const { storyId, story, images } = await storyService.generateStory(
  'user-123',
  'french',
  'B1',
  {
    genre: 'mystery',
    theme: 'discovery',
    imageStyle: 'cartoon'
  }
);

console.log('Story Title:', story.title);
console.log('Images:', images);

// Start reading
const reading = await storyService.startReading('user-123', storyId);

// User reads and answers questions...
const userAnswers = [0, 2, 1, 3, 0]; // Indices of selected answers

// Complete reading
const results = await storyService.completeReading(
  'user-123',
  reading.sessionId,
  userAnswers,
  420 // 7 minutes
);

console.log('Score:', results.score, '%');
console.log('Reading Speed:', results.readingSpeed, 'WPM');
console.log('Comprehension:', results.comprehensionLevel);
```

### 3. Spaced Repetition Vocabulary

```typescript
import { SpacedRepetitionVocabularyService } from './services/spaced-repetition-vocabulary-service';

const vocabService = new SpacedRepetitionVocabularyService();

// Create deck
const { deckId } = await vocabService.createDeck('user-123', 'german', {
  name: 'Business German',
  theme: 'business',
  difficulty: 'advanced'
});

// Generate AI flashcards
await vocabService.generateFlashcards(deckId, 'german', 'business', 20);

// Get cards due for review
const dueCards = await vocabService.getDueCards('user-123', deckId, 10);

for (const card of dueCards) {
  console.log('Word:', card.word);
  console.log('Definition:', card.translation);

  // User reviews card...
  const quality = 4; // Good recall (0-5)

  const result = await vocabService.recordReview('user-123', card.cardId, quality);
  console.log('Next review in', result.interval, 'days');
}

// Get statistics
const stats = await vocabService.getStatistics('user-123', deckId);
console.log('Mastered cards:', stats.masteredCards);
console.log('Current streak:', stats.streak, 'days');
```

### 4. Writing Practice

```typescript
import { WritingPracticeService } from './services/writing-practice-service';

const writingService = new WritingPracticeService();

// Generate prompt
const prompt = await writingService.generatePrompt(
  'italian',
  'essay',
  'intermediate',
  'environmental sustainability'
);

console.log('Prompt:', prompt.prompt);
console.log('Keywords:', prompt.keywords);

// Submit essay
const userEssay = `
  L'energia rinnovabile è molto importante per il futuro...
`;

const submission = await writingService.submitWriting('user-123', 'italian', {
  writingType: 'essay',
  difficulty: 'intermediate',
  content: userEssay
});

console.log('Overall Score:', submission.analysis.overallScore);
console.log('Grammar Score:', submission.analysis.grammarScore);
console.log('Corrections:', submission.analysis.corrections.length);
console.log('Corrected Version:', submission.analysis.correctedVersion);
```

### 5. Progress Analytics

```typescript
import { ProgressAnalyticsService } from './services/progress-analytics-service';

const analyticsService = new ProgressAnalyticsService();

// Get complete dashboard
const dashboard = await analyticsService.getDashboard('user-123', 'spanish');

console.log('Study Time:', dashboard.overview.totalStudyTime, 'minutes');
console.log('Current Streak:', dashboard.overview.currentStreak, 'days');
console.log('Pronunciation:', dashboard.skillBreakdown.pronunciation);
console.log('AI Insights:', dashboard.insights.recommendations);

// Predict goal achievement
const prediction = await analyticsService.predictGoalAchievement(
  'user-123',
  'spanish',
  'B2'
);

console.log('Estimated days to B2:', prediction.estimatedTimeToGoal);
console.log('Confidence:', prediction.confidence, '%');
```

---

## Best Practices

### 1. Error Handling

```typescript
try {
  const result = await service.someMethod();
} catch (error) {
  if (error instanceof ServiceError) {
    // Handle service-specific errors
    logger.error('Service error:', error.message);
  } else if (error instanceof ValidationError) {
    // Handle validation errors
    logger.error('Validation failed:', error.details);
  } else {
    // Handle unexpected errors
    logger.error('Unexpected error:', error);
  }
}
```

### 2. LangChain Usage

```typescript
// Always use structured outputs with Zod
const parser = StructuredOutputParser.fromZodSchema(mySchema);

const prompt = ChatPromptTemplate.fromTemplate(`...`);
const chain = prompt.pipe(llm).pipe(parser);

try {
  const result = await chain.invoke(variables);
  // Result is type-safe and validated
} catch (e) {
  // Provide fallback for parsing errors
  return fallbackValue;
}
```

### 3. Database Queries

```typescript
// Use indexes for common queries
const sessions = await knex('dialogue_sessions')
  .where({ user_id: userId, language })
  .orderBy('started_at', 'desc')
  .limit(20)
  .select('*');

// Use transactions for multi-table operations
await knex.transaction(async (trx) => {
  await trx('table1').insert(data1);
  await trx('table2').insert(data2);
});
```

### 4. Caching

```typescript
// Cache expensive computations
const cacheKey = `analytics:${userId}:${language}`;
let result = await redis.get(cacheKey);

if (!result) {
  result = await computeExpensiveAnalytics(userId, language);
  await redis.setex(cacheKey, 3600, JSON.stringify(result));
}
```

### 5. Rate Limiting

```typescript
// Implement rate limiting for AI calls
const rateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000 // 1 minute
});

await rateLimiter.check(userId);
const result = await llm.invoke(prompt);
```

---

## Performance & Scaling

### Optimization Strategies

1. **Database Optimization**
   - Proper indexing on high-traffic queries
   - Connection pooling
   - Query result caching
   - Pagination for large result sets

2. **AI Call Optimization**
   - Batch similar requests
   - Cache common responses
   - Use streaming for long responses
   - Implement retry logic with exponential backoff

3. **Caching Strategy**
   - Redis for session data
   - CloudFront for static assets
   - Application-level caching for expensive computations

4. **Serverless Scaling**
   - Lambda concurrent execution limits
   - Warm-up strategies for cold starts
   - Function splitting for optimal performance

### Monitoring

```typescript
// CloudWatch metrics
const metrics = {
  latency: responseTime,
  errors: errorCount,
  aiCalls: aiCallCount,
  cacheHits: cacheHitRate
};

await cloudwatch.putMetricData(metrics);
```

---

## License

MIT License - See LICENSE file for details

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: [docs-url]
- Email: support@learno.app

---

**Learno v7.1.0** - Complete AI Language Learning Platform

Built with ❤️ using TypeScript, LangChain, and Gemini AI
