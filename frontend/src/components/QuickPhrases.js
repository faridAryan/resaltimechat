import React, { useState, useEffect } from 'react';
import './QuickPhrases.css';

const QuickPhrases = ({ language, onPhraseSelect }) => {
  const [phrases, setPhrases] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchPhrases();
  }, [language]);

  const fetchPhrases = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/quick-phrases?language=${language}`);
      const data = await response.json();
      setPhrases(data.phrases || []);
    } catch (error) {
      console.error('Error fetching quick phrases:', error);
    }
  };

  const handlePhraseClick = async (phrase) => {
    onPhraseSelect(phrase.phrase);

    // Mark as used
    try {
      await fetch(`http://localhost:8000/api/quick-phrases/${phrase.id}/use`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error marking phrase as used:', error);
    }
  };

  const categories = [...new Set(phrases.map(p => p.category))];
  const filteredPhrases = selectedCategory
    ? phrases.filter(p => p.category === selectedCategory)
    : phrases.slice(0, showAll ? phrases.length : 8);

  return (
    <div className="quick-phrases">
      <div className="quick-phrases-header">
        <span className="quick-phrases-icon">⚡</span>
        <span className="quick-phrases-title">Quick Phrases</span>
        <button
          className="toggle-phrases-button"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show Less' : 'Show All'}
        </button>
      </div>

      {showAll && (
        <div className="category-filter">
          <button
            className={`category-button ${!selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-button ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="phrases-container">
        {filteredPhrases.map((phrase) => (
          <button
            key={phrase.id}
            className="phrase-button"
            onClick={() => handlePhraseClick(phrase)}
            title={`Used ${phrase.usage_count || 0} times`}
          >
            {phrase.phrase}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickPhrases;
