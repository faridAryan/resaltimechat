import React, { useState } from 'react';
import './AdvancedHub.css';
import VocabularyTrainer from './VocabularyTrainer';
import ProgressReport from './ProgressReport';
import StreakCalendar from './StreakCalendar';
import Leaderboard from './Leaderboard';
import ReadingMode from './ReadingMode';
import GrammarTips from './GrammarTips';
import MemoryInsights from './MemoryInsights';

const AdvancedHub = ({ username, language, onClose }) => {
  const [activeTab, setActiveTab] = useState('vocabulary');

  const tabs = [
    { id: 'memory', label: 'AI Memory', icon: '🧠' },
    { id: 'vocabulary', label: 'Vocabulary Trainer', icon: '📚' },
    { id: 'reading', label: 'Reading', icon: '📖' },
    { id: 'grammar', label: 'Grammar Tips', icon: '📝' },
    { id: 'progress', label: 'Progress Report', icon: '📊' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' }
  ];

  return (
    <div className="advanced-hub-overlay" onClick={onClose}>
      <div className="advanced-hub-content" onClick={(e) => e.stopPropagation()}>
        <div className="hub-header">
          <h2>🚀 Advanced Learning</h2>
          <button className="hub-close" onClick={onClose}>✕</button>
        </div>

        <div className="hub-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`hub-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="hub-content-area">
          {activeTab === 'memory' && (
            <MemoryInsights username={username} language={language} />
          )}
          {activeTab === 'vocabulary' && (
            <VocabularyTrainer username={username} language={language} />
          )}
          {activeTab === 'reading' && (
            <ReadingMode username={username} language={language} />
          )}
          {activeTab === 'grammar' && (
            <GrammarTips language={language} />
          )}
          {activeTab === 'progress' && (
            <ProgressReport username={username} language={language} />
          )}
          {activeTab === 'calendar' && (
            <StreakCalendar username={username} language={language} />
          )}
          {activeTab === 'leaderboard' && (
            <Leaderboard language={language} username={username} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedHub;
