# Learno - Interactive Language Learning Platform

An advanced, interactive language learning application that combines RAG (Retrieval-Augmented Generation) technology with gamification, adaptive difficulty, real-time conversations, and comprehensive progress tracking to create an engaging and personalized learning experience.

## 🎯 Practical Learning Features (NEW!)

### Conversation Scenarios
- **8 Pre-built Scenarios**: Restaurant, Hotel, Directions, Shopping, Job Interview, Doctor, Social, Business
- **Real-world Practice**: Simulate authentic situations you'll encounter
- **Guided Conversations**: Context and vocabulary provided for each scenario
- **Difficulty Levels**: Scenarios range from beginner to advanced
- **Category Filters**: Travel, Dining, Shopping, Professional, Social, Health

### Daily Challenges
- **New Challenge Every Day**: Fresh tasks to keep you motivated
- **Challenge Types**: Message goals, perfect accuracy, vocabulary learning, scenario completion
- **XP Rewards**: Earn 50-100 XP for completing challenges
- **Progress Tracking**: Real-time progress updates
- **Streak Building**: Daily practice for maximum retention

### Vocabulary Flashcards
- **Spaced Repetition**: Smart review scheduling based on confidence
- **Interactive Review**: Flip cards to test your knowledge
- **Confidence Ratings**: Rate Easy, Medium, or Hard
- **Auto-generated**: Words automatically extracted from conversations
- **Progress Stats**: Track review count and confidence levels

### Learning Topics
- 8 organized topics: Greetings, Numbers, Food, Travel, Shopping, Health, Business, Culture
- Difficulty-based organization
- Focused practice on specific areas

## ✨ Core Features (Version 2.0)


### 👤 User-Centric Learning
- **User Profiles**: Personalized accounts with progress tracking across multiple languages
- **Adaptive Difficulty**: System automatically adjusts difficulty (beginner → intermediate → advanced → expert) based on your performance
- **Progress Analytics**: Detailed insights into your learning journey with charts and statistics
- **Daily Streaks**: Track consecutive days of practice to build consistency

### 🏆 Gamification
- **Achievement System**: Unlock 7+ achievements as you progress
- **Experience Points (XP)**: Earn points for every message and achievement
- **Leaderboards**: Compare your progress with other learners
- **Real-time Notifications**: Celebrate achievements as you unlock them

### 🧠 Intelligent Learning
- **Vocabulary Tracking**: Automatically tracks new words you learn
- **Mistake Analysis**: Records and analyzes your errors for targeted practice
- **Contextual Learning**: RAG system provides relevant examples from your uploaded materials
- **Performance-Based Adaptation**: Difficulty adjusts based on your accuracy

### 🎤 Real-Time Features
- **Live Conversation Practice**: WebSocket-based instant messaging
- **Speech-to-Text**: Speak naturally in your target language
- **Text-to-Speech**: Hear responses with natural pronunciation
- **Instant Feedback**: Grammar and vocabulary corrections in real-time
- **Session Statistics**: Track messages, corrections, and accuracy live

## 🚀 Quick Start

### Installation

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add OPENAI_API_KEY

# Frontend
cd frontend
npm install
```

### Run

**Easy way:**
```bash
./start.sh  # Linux/Mac
start.bat   # Windows
```

**Manual:**
```bash
# Terminal 1 - Backend
cd backend && python main.py

# Terminal 2 - Frontend
cd frontend && npm start
```

Visit `http://localhost:3000`

## 📖 How to Use

1. **Create Account**: Enter username on login screen
2. **Select Language**: Choose from 10 languages
3. **Upload Materials** (Optional): Add learning resources for context
4. **Start Practicing**: Type or speak to practice
5. **Track Progress**: Click "📊 Progress" to view analytics
6. **Earn Achievements**: Unlock rewards as you learn

## 🎯 Key Features

### Adaptive Difficulty System
- Starts at beginner level
- Auto-upgrades with 80%+ accuracy (10+ messages)
- Auto-downgrades if struggling (60%+ corrections)
- Four levels: Beginner, Intermediate, Advanced, Expert

### Achievement System
- 🎯 **First Steps** - Complete first conversation (10 XP)
- 💬 **Chat Master** - Send 100 messages (50 XP)
- 🔥 **Week Warrior** - 7-day streak (100 XP)
- 🌍 **Polyglot** - Practice 3 languages (75 XP)
- ⭐ **Perfectionist** - 10 perfect messages (60 XP)
- 📚 **Vocabulary Builder** - Learn 50 words (80 XP)
- ⏰ **Dedicated Learner** - 10 hours practice (120 XP)

### Progress Dashboard
- **Overview**: Total XP, time, messages, streaks
- **Achievements**: All unlocked achievements
- **Analytics**: 7-day activity visualization
- **Language Progress**: Per-language statistics

## 🛠️ Technology Stack

**Backend:**
- FastAPI - Modern async web framework
- SQLite - User data and analytics
- ChromaDB - Vector database for RAG
- OpenAI GPT-4 - Language model
- WebSockets - Real-time communication

**Frontend:**
- React 18 - UI framework
- Web Speech API - Voice features
- CSS3 - Animations and styling

## 📂 Project Structure

```
resaltimechat/
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── database.py              # User & analytics DB
│   ├── rag_system.py            # RAG implementation
│   ├── conversation_manager.py  # Conversation logic
│   └── requirements.txt
├── frontend/
│   ├── src/components/
│   │   ├── UserLogin.js         # Login screen
│   │   ├── ProgressDashboard.js # Analytics
│   │   ├── AchievementNotification.js
│   │   ├── LanguagePractice.js  # Main chat
│   │   └── DocumentUpload.js
│   └── package.json
└── sample_materials/            # Sample learning content
```

## 🔌 API Endpoints

### REST API
- `POST /api/users/create` - Create user
- `GET /api/users/{username}/progress` - Get progress
- `GET /api/users/{username}/achievements` - Get achievements
- `GET /api/users/{username}/analytics` - Get analytics
- `GET /api/leaderboard` - Global leaderboard
- `POST /upload-documents` - Upload learning materials

### WebSocket
- `WS /ws/practice` - Real-time conversation

## 🗄️ Database Schema

Key tables:
- `users` - User profiles
- `user_progress` - Progress per language
- `learning_sessions` - Practice sessions
- `vocabulary_items` - Learned words
- `mistakes` - Error tracking
- `achievements` - Available achievements
- `user_achievements` - Unlocked achievements
- `daily_activity` - Daily practice log

## 🔧 Configuration

**Backend** (`.env`):
```
OPENAI_API_KEY=your_key_here
```

**Frontend** URLs:
- Defaults to `localhost:8000` for backend
- Update in component files if needed

## 📱 Browser Support

✅ Chrome/Edge (recommended)
✅ Firefox
✅ Safari
✅ Opera
⚠️ Mobile (partial speech support)

## 🐛 Troubleshooting

**WebSocket won't connect:**
- Ensure backend is running on port 8000
- Check firewall settings

**No AI responses:**
- Verify OpenAI API key in `.env`
- Check API key has credits

**Speech not working:**
- Use HTTPS or localhost
- Grant microphone permissions
- Check browser compatibility

**Database errors:**
```bash
rm backend/learno.db  # Delete database
# Restart backend - auto-recreates
```

## 🎨 Customization

### Add New Achievement

Edit `backend/database.py`:
```python
{
    "id": "my_achievement",
    "name": "Achievement Name",
    "description": "What to do",
    "requirement_type": "messages",
    "requirement_value": 50,
    "icon": "🎯",
    "points": 25
}
```

### Add New Language

1. Add to `frontend/src/App.js` languages array
2. Add language code in `LanguagePractice.js`
3. Create sample materials (optional)

## 🚦 Development

```bash
# Backend with auto-reload
cd backend && uvicorn main:app --reload

# Frontend with hot-reload
cd frontend && npm start
```

## 🔐 Security Notes

- Never commit `.env` files
- Use environment variables for secrets
- Implement authentication for production
- Enable rate limiting
- Use HTTPS in production

## 📊 Performance Tips

- Upload focused learning materials
- Clear ChromaDB periodically
- Monitor API usage
- Cache frequently used prompts

## 🎯 Future Enhancements

- [ ] Interactive quizzes
- [ ] Spaced repetition flashcards
- [ ] Learning goals
- [ ] Voice-only mode
- [ ] Mobile apps
- [ ] Pronunciation scoring
- [ ] Study groups
- [ ] Progress export

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Make changes
4. Submit pull request

## 📄 License

MIT License

## 🙏 Acknowledgments

- OpenAI for GPT-4
- ChromaDB team
- FastAPI community
- React community

## 📝 Version History

**v2.0** - Interactive Learning Update
- User profiles and authentication
- Adaptive difficulty system
- Gamification (achievements, XP, streaks)
- Progress analytics dashboard
- Vocabulary and mistake tracking
- Real-time statistics

**v1.0** - Initial Release
- Basic conversation practice
- RAG system
- Speech features
- Real-time corrections

---

**Start Learning Today!** 🌍

Create an account and begin your language learning journey with AI-powered, personalized conversations!
