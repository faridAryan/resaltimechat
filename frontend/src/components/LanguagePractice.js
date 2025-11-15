import React, { useState, useEffect, useRef } from 'react';
import './LanguagePractice.css';

const LanguagePractice = ({ language }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [feedback, setFeedback] = useState(null);

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
  }, []);

  // Update language
  useEffect(() => {
    if (wsRef.current && isConnected) {
      fetch('http://localhost:8000/set-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language })
      });
    }
  }, [language, isConnected]);

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
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'session_created') {
        setSessionId(data.session_id);
        addMessage('system', 'Session started! Start practicing your language.');
      } else if (data.type === 'response') {
        addMessage('assistant', data.text);
        if (data.feedback) {
          setFeedback(data.feedback);
        }
        if (data.corrections && data.corrections.length > 0) {
          showCorrections(data.corrections);
        }
        // Text-to-speech
        speakText(data.text);
      } else if (data.type === 'error') {
        addMessage('system', `Error: ${data.message}`);
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
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Set language based on selected language
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

  return (
    <div className="language-practice">
      <div className="status-bar">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '● Connected' : '○ Disconnected'}
        </div>
        <div className="language-display">
          Practicing: <strong>{language}</strong>
        </div>
      </div>

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
  );
};

export default LanguagePractice;
