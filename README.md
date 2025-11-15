# Real-time Language Practice with RAG System

A powerful real-time language learning application that combines RAG (Retrieval-Augmented Generation) technology with speech-to-text and text-to-speech capabilities to help users practice languages through interactive conversations.

## Features

- **Real-time Conversations**: Practice languages through live conversations with an AI assistant
- **Speech-to-Text**: Speak naturally and have your speech converted to text
- **Text-to-Speech**: Hear responses in the target language with natural pronunciation
- **RAG System**: Upload learning materials to provide context for more relevant conversations
- **Language Corrections**: Get instant feedback on grammar and vocabulary
- **Multiple Languages**: Support for English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, and Arabic
- **WebSocket Communication**: Real-time, low-latency communication
- **Modern UI**: Clean, responsive React interface

## Architecture

### Backend
- **FastAPI**: High-performance Python web framework
- **ChromaDB**: Vector database for RAG functionality
- **OpenAI API**: Language model for conversations and analysis
- **WebSockets**: Real-time communication
- **Sentence Transformers**: Document embeddings

### Frontend
- **React**: Modern UI framework
- **Web Speech API**: Speech-to-text and text-to-speech
- **WebSocket Client**: Real-time connection to backend

## Prerequisites

- Python 3.8+
- Node.js 16+
- OpenAI API key

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd resaltimechat
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=your_api_key_here
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

## Running the Application

### Start the Backend

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
```

The backend will start on `http://localhost:8000`

### Start the Frontend

In a new terminal:

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

## Usage

### Basic Conversation

1. Open your browser to `http://localhost:3000`
2. Select your target language from the dropdown
3. Start typing or click the microphone button to speak
4. The AI will respond in your target language
5. Listen to the pronunciation using text-to-speech
6. Receive feedback on any language errors

### Uploading Learning Materials

1. Click "Upload Learning Materials"
2. Select text files containing vocabulary, grammar rules, or conversation examples
3. Upload the files
4. The system will use these materials to provide contextual conversations

Sample learning materials are provided in the `sample_materials/` directory:
- `spanish_basics.txt` - Spanish vocabulary and phrases
- `french_basics.txt` - French vocabulary and phrases

### Voice Input

1. Click the microphone button
2. Speak in your target language
3. Your speech will be converted to text
4. Send the message to get a response

### Getting Feedback

- The system automatically analyzes your messages
- Corrections are displayed below the conversation
- Feedback includes explanations of errors
- Visual indicators show your progress

## API Endpoints

### REST Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `POST /upload-documents` - Upload learning materials
- `POST /set-language` - Set target practice language

### WebSocket Endpoint

- `WS /ws/practice` - Real-time conversation endpoint

## Configuration

### Backend Configuration

Edit `backend/.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here  # Optional
```

### Frontend Configuration

Default backend URL is `http://localhost:8000`. To change it, update the URLs in:
- `frontend/src/components/LanguagePractice.js`
- `frontend/src/components/DocumentUpload.js`

## Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile browsers**: Partial support (speech features may vary)

## Troubleshooting

### WebSocket Connection Failed

- Ensure the backend is running on port 8000
- Check CORS settings in `backend/main.py`
- Verify firewall settings

### Speech Recognition Not Working

- Ensure you're using HTTPS or localhost
- Grant microphone permissions in your browser
- Check browser compatibility

### No AI Responses

- Verify your OpenAI API key is set correctly
- Check API key has sufficient credits
- Review backend logs for errors

### Upload Fails

- Ensure files are text-based (.txt, .md)
- Check file size (large files may timeout)
- Verify backend is running

## Project Structure

```
resaltimechat/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── rag_system.py          # RAG implementation
│   ├── conversation_manager.py # Conversation logic
│   ├── requirements.txt        # Python dependencies
│   └── .env.example           # Environment template
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── LanguagePractice.js
│   │   │   ├── LanguagePractice.css
│   │   │   ├── DocumentUpload.js
│   │   │   └── DocumentUpload.css
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── sample_materials/
│   ├── spanish_basics.txt
│   └── french_basics.txt
├── .gitignore
└── README.md
```

## Technology Stack

### Backend Technologies
- **FastAPI**: Modern, fast web framework
- **ChromaDB**: Vector database for semantic search
- **LangChain**: LLM application framework
- **OpenAI GPT-4**: Language model
- **Sentence Transformers**: Text embeddings
- **Uvicorn**: ASGI server

### Frontend Technologies
- **React 18**: UI framework
- **Web Speech API**: Speech recognition and synthesis
- **WebSocket API**: Real-time communication
- **Axios**: HTTP client
- **CSS3**: Modern styling with gradients and animations

## Features in Detail

### RAG System

The RAG system allows you to upload documents that provide context for conversations:

1. Documents are split into chunks
2. Each chunk is embedded using Sentence Transformers
3. Embeddings are stored in ChromaDB
4. When you send a message, relevant chunks are retrieved
5. Retrieved context is included in the AI's prompt
6. Responses are more relevant and personalized

### Language Analysis

Every message you send is analyzed for:
- Grammar errors
- Vocabulary mistakes
- Syntax issues
- Better alternatives

Feedback is provided in real-time to help you improve.

### Conversation Management

- Sessions are managed per WebSocket connection
- Conversation history is maintained
- Context from previous messages is preserved
- Sessions can be ended to get a summary

## Development

### Running in Development Mode

Backend with auto-reload:
```bash
cd backend
uvicorn main:app --reload
```

Frontend with hot-reload:
```bash
cd frontend
npm start
```

### Adding New Languages

1. Add language to the list in `frontend/src/App.js`
2. Add language code mapping in `frontend/src/components/LanguagePractice.js`
3. Create sample materials in `sample_materials/`

### Customizing AI Behavior

Edit the system prompt in `backend/conversation_manager.py`:
- Adjust language complexity
- Change conversation style
- Modify correction strictness

## Future Enhancements

- [ ] Audio streaming for better real-time experience
- [ ] Voice activity detection
- [ ] Pronunciation scoring
- [ ] Progress tracking and analytics
- [ ] Conversation themes and scenarios
- [ ] Multi-user support
- [ ] Export conversation history
- [ ] Mobile app versions
- [ ] Offline mode with local models
- [ ] Custom voice selection

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for learning and development.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

## Acknowledgments

- OpenAI for GPT-4 API
- ChromaDB for vector database
- FastAPI community
- React community
- All contributors

## Security Notes

- Never commit `.env` files
- Keep API keys secure
- Use environment variables for sensitive data
- Implement rate limiting in production
- Add authentication for production use

## Performance Tips

- Upload smaller, focused learning materials
- Clear ChromaDB periodically if it grows too large
- Use WebSocket for all real-time communication
- Optimize chunk sizes in RAG system
- Monitor API usage and costs

---

**Happy Language Learning!** 🌍🗣️
