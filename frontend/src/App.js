import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import LanguagePractice from './components/LanguagePractice';
import DocumentUpload from './components/DocumentUpload';

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showUpload, setShowUpload] = useState(false);

  const languages = [
    'English', 'Spanish', 'French', 'German', 'Italian',
    'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic'
  ];

  return (
    <div className="App">
      <header className="App-header">
        <h1>Real-time Language Practice</h1>
        <p>Practice languages with AI-powered conversations</p>
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
      </div>

      {showUpload && <DocumentUpload />}

      <LanguagePractice language={selectedLanguage} />
    </div>
  );
}

export default App;
