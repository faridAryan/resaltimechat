import React, { useState, useEffect, useRef } from 'react';
import './LanguagePractice.css';
import AchievementNotification from './AchievementNotification';
import QuickPhrases from './QuickPhrases';

const LanguagePractice = ({ language, username, activeScenario }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentLevel, setCurrentLevel] = useState('beginner');
  const [stats, setStats] = useState({ messages: 0, corrections: 0, perfect_messages: 0 });
  const [achievement, setAchievement] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(null);

  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [language, username]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket('ws://localhost:8000/ws/practice');

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      // Send init message with username
      ws.send(JSON.stringify({
        type: 'init_session',
        username: username,
        language: language,
        difficulty: 'beginner'
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'session_created') {
        setSessionId(data.session_id);
        setCurrentLevel(data.current_level);
        addMessage('system', `Session started! Practicing ${language} at ${data.current_level} level.`);

        // If there's an active scenario, start with it
        if (activeScenario && !currentScenario) {
          setCurrentScenario(activeScenario);
          addMessage('system', `🎭 Scenario: ${activeScenario.title}`);
          addMessage('system', activeScenario.context);
          if (activeScenario.conversation_starter) {
            setInputText(activeScenario.conversation_starter);
          }
        }
      } else if (data.type === 'response') {
        addMessage('assistant', data.text);

        if (data.feedback) {
          setFeedback(data.feedback);
        }

        if (data.corrections && data.corrections.length > 0) {
          showCorrections(data.corrections);
        }

        if (data.stats) {
          setStats(data.stats);
        }

        if (data.difficulty && data.difficulty !== currentLevel) {
          setCurrentLevel(data.difficulty);
          addMessage('system', `Level up! Now practicing at ${data.difficulty} level! 🎉`);
        }

        if (data.new_achievements && data.new_achievements.length > 0) {
          // Show achievement notification
          data.new_achievements.forEach((ach, idx) => {
            setTimeout(() => {
              setAchievement(ach);
            }, idx * 5500); // Stagger notifications
          });
        }

        // Text-to-speech
        speakText(data.text);
      } else if (data.type === 'error') {
        addMessage('system', `Error: ${data.message}`);
      } else if (data.type === 'session_ended') {
        const summary = data.summary;
        addMessage('system', `Session ended! You practiced for ${Math.floor(summary.duration / 60)} minutes, sent ${summary.message_count} messages, and had ${summary.perfect_messages} perfect messages!`);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;
  };

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const showCorrections = (corrections) => {
    const correctionText = corrections.map((corr, idx) =>
      `${idx + 1}. "${corr.original}" → "${corr.corrected}": ${corr.explanation}`
    ).join('\n');

    addMessage('correction', correctionText);
  };

  const sendMessage = () => {
    if (!inputText.trim() || !wsRef.current || !isConnected) return;

    addMessage('user', inputText);

    wsRef.current.send(JSON.stringify({
      type: 'text_message',
      text: inputText,
      language: language
    }));

    setInputText('');
    setFeedback(null);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      const langCodes = {
        'English': 'en-US',
        'Spanish': 'es-ES',
        'French': 'fr-FR',
        'German': 'de-DE',
        'Italian': 'it-IT',
        'Portuguese': 'pt-PT',
        'Chinese': 'zh-CN',
        'Japanese': 'ja-JP',
        'Korean': 'ko-KR',
        'Arabic': 'ar-SA'
      };

      utterance.lang = langCodes[language] || 'en-US';
      utterance.rate = 0.9;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePhraseSelect = (phrase) => {
    setInputText(phrase);
  };

  return (
    <>
      <div className="language-practice">
        <div className="status-bar">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '● Connected' : '○ Disconnected'}
          </div>
          <div className="language-display">
            Practicing: <strong>{language}</strong>
          </div>
          <div className="difficulty-badge">
            Level: <strong>{currentLevel}</strong>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-icon">💬</span>
            <span className="stat-value">{stats.messages}</span>
            <span className="stat-label">Messages</span>
          </div>
          <div className="stat">
            <span className="stat-icon">✅</span>
            <span className="stat-value">{stats.perfect_messages}</span>
            <span className="stat-label">Perfect</span>
          </div>
          <div className="stat">
            <span className="stat-icon">📝</span>
            <span className="stat-value">{stats.corrections}</span>
            <span className="stat-label">Corrections</span>
          </div>
          <div className="stat">
            <span className="stat-icon">🎯</span>
            <span className="stat-value">
              {stats.messages > 0 ? Math.round((stats.perfect_messages / stats.messages) * 100) : 0}%
            </span>
            <span className="stat-label">Accuracy</span>
          </div>
        </div>

        <QuickPhrases language={language} onPhraseSelect={handlePhraseSelect} />

        <div className="messages-container">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message message-${msg.role}`}>
              <div className="message-content">{msg.content}</div>
              <div className="message-time">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {feedback && (
          <div className="feedback-panel">
            <strong>Feedback:</strong>
            <p>{feedback}</p>
          </div>
        )}

        <div className="input-container">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Type or speak in ${language}...`}
            disabled={!isConnected}
            rows="3"
          />

          <div className="input-actions">
            <button
              className={`mic-button ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
              disabled={!isConnected}
              title="Voice input"
            >
              {isListening ? '🎤 Listening...' : '🎤 Speak'}
            </button>

            <button
              className="send-button"
              onClick={sendMessage}
              disabled={!isConnected || !inputText.trim()}
            >
              Send →
            </button>
          </div>
        </div>

        {isSpeaking && (
          <div className="speaking-indicator">
            🔊 Speaking...
          </div>
        )}
      </div>

      {achievement && (
        <AchievementNotification
          achievement={achievement}
          onClose={() => setAchievement(null)}
        />
      )}
    </>
  );
};

export default LanguagePractice;
