import React, { useState, useEffect } from 'react';
import './ScenarioBrowser.css';

const ScenarioBrowser = ({ username, language, onStartScenario }) => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  useEffect(() => {
    fetchScenarios();
  }, [language, selectedCategory, selectedDifficulty]);

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (language !== 'English') params.append('language', language);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedDifficulty !== 'all') params.append('difficulty', selectedDifficulty);

      const response = await fetch(`http://localhost:8000/api/scenarios?${params}`);
      const data = await response.json();
      setScenarios(data.scenarios || []);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScenario = async (scenario) => {
    try {
      await fetch(`http://localhost:8000/api/scenarios/${scenario.id}/start?username=${username}`, {
        method: 'POST',
      });
      onStartScenario(scenario);
    } catch (error) {
      console.error('Error starting scenario:', error);
    }
  };

  const categories = [
    { id: 'all', name: 'All Categories', icon: '📚' },
    { id: 'travel', name: 'Travel', icon: '✈️' },
    { id: 'dining', name: 'Dining', icon: '🍽️' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️' },
    { id: 'professional', name: 'Professional', icon: '💼' },
    { id: 'social', name: 'Social', icon: '🎭' },
    { id: 'health', name: 'Health', icon: '🏥' },
  ];

  const difficulties = [
    { id: 'all', name: 'All Levels' },
    { id: 'beginner', name: 'Beginner' },
    { id: 'intermediate', name: 'Intermediate' },
    { id: 'advanced', name: 'Advanced' },
  ];

  if (loading) {
    return <div className="loading">Loading scenarios...</div>;
  }

  return (
    <div className="scenario-browser">
      <div className="browser-header">
        <h3>Choose a Conversation Scenario</h3>
        <p>Practice real-world conversations to improve your skills</p>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Category:</label>
          <div className="category-pills">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Difficulty:</label>
          <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)}>
            {difficulties.map(diff => (
              <option key={diff.id} value={diff.id}>{diff.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="scenarios-grid">
        {scenarios.length === 0 ? (
          <div className="empty-state">No scenarios found for this selection</div>
        ) : (
          scenarios.map(scenario => (
            <div key={scenario.id} className="scenario-card">
              <div className="scenario-header">
                <h4>{scenario.title}</h4>
                <span className={`difficulty-badge ${scenario.difficulty_level}`}>
                  {scenario.difficulty_level}
                </span>
              </div>
              <div className="scenario-category">{scenario.category}</div>
              <p className="scenario-description">{scenario.description}</p>
              <div className="scenario-context">
                <strong>Context:</strong> {scenario.context}
              </div>
              {scenario.vocabulary && scenario.vocabulary.length > 0 && (
                <div className="scenario-vocabulary">
                  <strong>Key vocabulary:</strong>
                  <div className="vocab-tags">
                    {scenario.vocabulary.slice(0, 5).map((word, idx) => (
                      <span key={idx} className="vocab-tag">{word}</span>
                    ))}
                  </div>
                </div>
              )}
              <button
                className="start-scenario-button"
                onClick={() => handleStartScenario(scenario)}
              >
                Start Conversation →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ScenarioBrowser;
