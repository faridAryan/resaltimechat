import React, { useState, useEffect } from 'react';
import './App.css';
import LanguagePractice from './components/LanguagePractice';
import DocumentUpload from './components/DocumentUpload';
import UserLogin from './components/UserLogin';
import ProgressDashboard from './components/ProgressDashboard';
import PracticeModes from './components/PracticeModes';

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showUpload, setShowUpload] = useState(false);
  const [username, setUsername] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showPracticeModes, setShowPracticeModes] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);

  const languages = [
    'English', 'Spanish', 'French', 'German', 'Italian',
    'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic'
  ];

  useEffect(() => {
    // Check for stored username
    const storedUsername = localStorage.getItem('learno_username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleLogin = (user) => {
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('learno_username');
    setUsername(null);
  };

  if (!username) {
    return <UserLogin onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div>
            <h1>Learno</h1>
            <p>Interactive Language Learning Platform</p>
          </div>
          <div className="header-actions">
            <div className="user-info">
              <span className="user-avatar">👤</span>
              <span className="username">{username}</span>
            </div>
            <button
              className="dashboard-button"
              onClick={() => setShowDashboard(true)}
            >
              📊 Progress
            </button>
            <button
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="language-selector">
        <label htmlFor="language">Practice Language:</label>
        <select
          id="language"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          {languages.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>

        <button
          className="upload-button"
          onClick={() => setShowUpload(!showUpload)}
        >
          {showUpload ? 'Hide' : 'Upload'} Learning Materials
        </button>

        <button
          className="practice-modes-button"
          onClick={() => setShowPracticeModes(true)}
        >
          🎯 Practice Modes
        </button>
      </div>

      {showUpload && <DocumentUpload />}

      <LanguagePractice
        language={selectedLanguage}
        username={username}
        activeScenario={activeScenario}
      />

      {showDashboard && (
        <ProgressDashboard
          username={username}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {showPracticeModes && (
        <PracticeModes
          username={username}
          language={selectedLanguage}
          onClose={() => setShowPracticeModes(false)}
          onStartScenario={(scenario) => setActiveScenario(scenario)}
        />
      )}
    </div>
  );
}

export default App;
