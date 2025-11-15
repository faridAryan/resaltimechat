import React, { useState, useEffect } from 'react';
import './PracticeModes.css';
import ScenarioBrowser from './ScenarioBrowser';
import FlashcardReviewer from './FlashcardReviewer';
import DailyChallenge from './DailyChallenge';

const PracticeModes = ({ username, language, onClose, onStartScenario }) => {
  const [activeMode, setActiveMode] = useState('scenarios');

  const modes = [
    { id: 'scenarios', name: 'Conversation Scenarios', icon: '🎭', description: 'Practice real-world conversations' },
    { id: 'flashcards', name: 'Vocabulary Flashcards', icon: '📇', description: 'Review your learned words' },
    { id: 'challenge', name: 'Daily Challenge', icon: '🎯', description: "Today's learning task" },
  ];

  return (
    <div className="practice-modes-overlay">
      <div className="practice-modes-container">
        <div className="practice-modes-header">
          <h2>Practice Modes</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modes-selector">
          {modes.map(mode => (
            <button
              key={mode.id}
              className={`mode-button ${activeMode === mode.id ? 'active' : ''}`}
              onClick={() => setActiveMode(mode.id)}
            >
              <span className="mode-icon">{mode.icon}</span>
              <div className="mode-info">
                <div className="mode-name">{mode.name}</div>
                <div className="mode-description">{mode.description}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mode-content">
          {activeMode === 'scenarios' && (
            <ScenarioBrowser
              username={username}
              language={language}
              onStartScenario={(scenario) => {
                onStartScenario(scenario);
                onClose();
              }}
            />
          )}
          {activeMode === 'flashcards' && (
            <FlashcardReviewer username={username} language={language} />
          )}
          {activeMode === 'challenge' && (
            <DailyChallenge username={username} language={language} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeModes;
