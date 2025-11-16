import React, { useState, useEffect } from 'react';
import './MemoryInsights.css';

const MemoryInsights = ({ username, language }) => {
  const [activeTab, setActiveTab] = useState('recommendations');
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState(null);
  const [shortTermMemory, setShortTermMemory] = useState([]);
  const [longTermPatterns, setLongTermPatterns] = useState([]);
  const [memorySummary, setMemorySummary] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, [username, language]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRecommendations(),
        fetchShortTermMemory(),
        fetchLongTermPatterns(),
        fetchMemorySummary()
      ]);
    } catch (error) {
      console.error('Error fetching memory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/rl/recommendations?username=${username}&language=${language}`
      );
      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const fetchShortTermMemory = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/memory/short-term/get?username=${username}&language=${language}&limit=20`
      );
      const data = await response.json();
      setShortTermMemory(data.memories || []);
    } catch (error) {
      console.error('Error fetching short-term memory:', error);
    }
  };

  const fetchLongTermPatterns = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/memory/long-term/get?username=${username}&language=${language}`
      );
      const data = await response.json();
      setLongTermPatterns(data.patterns || []);
    } catch (error) {
      console.error('Error fetching long-term patterns:', error);
    }
  };

  const fetchMemorySummary = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/memory/summary?username=${username}&language=${language}`
      );
      const data = await response.json();
      setMemorySummary(data.summary);
    } catch (error) {
      console.error('Error fetching memory summary:', error);
    }
  };

  const getMemoryTypeIcon = (type) => {
    const icons = {
      conversation: '💬',
      correction: '✏️',
      topic_interest: '🎯',
      difficulty_feedback: '📊'
    };
    return icons[type] || '📝';
  };

  const getPatternTypeLabel = (type) => {
    const labels = {
      topic_preference: 'Topic Preferences',
      learning_style: 'Learning Style',
      skill_progression: 'Skill Progression',
      time_preference: 'Time Preferences',
      difficulty_comfort: 'Difficulty Comfort',
      error_patterns: 'Common Errors'
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="memory-insights loading">Loading insights...</div>;
  }

  return (
    <div className="memory-insights">
      <div className="insights-header">
        <h2>🧠 Memory & Learning Insights</h2>
        {memorySummary && (
          <div className="memory-stats">
            <div className="stat-chip">
              <span className="stat-icon">💾</span>
              <span>{memorySummary.short_term_memories} short-term</span>
            </div>
            <div className="stat-chip">
              <span className="stat-icon">🧬</span>
              <span>{memorySummary.long_term_patterns} patterns</span>
            </div>
            <div className="stat-chip">
              <span className="stat-icon">🤖</span>
              <span>{memorySummary.rl_actions_learned} RL actions</span>
            </div>
          </div>
        )}
      </div>

      <div className="insights-tabs">
        <button
          className={`insights-tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          <span className="tab-icon">✨</span>
          Recommendations
        </button>
        <button
          className={`insights-tab ${activeTab === 'short-term' ? 'active' : ''}`}
          onClick={() => setActiveTab('short-term')}
        >
          <span className="tab-icon">💾</span>
          Short-term Memory
        </button>
        <button
          className={`insights-tab ${activeTab === 'long-term' ? 'active' : ''}`}
          onClick={() => setActiveTab('long-term')}
        >
          <span className="tab-icon">🧬</span>
          Long-term Patterns
        </button>
      </div>

      <div className="insights-content">
        {activeTab === 'recommendations' && recommendations && (
          <div className="recommendations-view">
            <div className="recommendation-card primary">
              <h3>🎯 Recommended for You</h3>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${recommendations.confidence * 100}%` }}></div>
              </div>
              <div className="confidence-label">{Math.round(recommendations.confidence * 100)}% confidence</div>

              {recommendations.topics && recommendations.topics.length > 0 && (
                <div className="recommendation-section">
                  <h4>📚 Suggested Topics</h4>
                  <div className="topic-chips">
                    {recommendations.topics.map((topic, idx) => (
                      <div key={idx} className="topic-chip">
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendations.difficulty && (
                <div className="recommendation-section">
                  <h4>📊 Recommended Difficulty</h4>
                  <div className="difficulty-badge">{recommendations.difficulty}</div>
                </div>
              )}

              {recommendations.content_types && recommendations.content_types.length > 0 && (
                <div className="recommendation-section">
                  <h4>🎨 Best Content Type</h4>
                  <div className="content-type">{recommendations.content_types[0]}</div>
                </div>
              )}

              {recommendations.practice_time && (
                <div className="recommendation-section">
                  <h4>⏰ Optimal Practice Time</h4>
                  <div className="time-display">{recommendations.practice_time}</div>
                </div>
              )}

              {recommendations.focus_areas && recommendations.focus_areas.length > 0 && (
                <div className="recommendation-section">
                  <h4>🎯 Focus Areas</h4>
                  <ul className="focus-list">
                    {recommendations.focus_areas.map((area, idx) => (
                      <li key={idx}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'short-term' && (
          <div className="short-term-view">
            <p className="view-description">
              Recent interactions and session context (expires after 24 hours)
            </p>
            {shortTermMemory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💭</div>
                <p>No recent memories</p>
              </div>
            ) : (
              <div className="memory-list">
                {shortTermMemory.map((memory) => (
                  <div key={memory.id} className="memory-item">
                    <div className="memory-header">
                      <span className="memory-icon">{getMemoryTypeIcon(memory.memory_type)}</span>
                      <span className="memory-type">{memory.memory_type}</span>
                      <span className="memory-importance">
                        {Math.round(memory.importance_score * 100)}% important
                      </span>
                    </div>
                    <div className="memory-content">{memory.content}</div>
                    <div className="memory-footer">
                      <span className="memory-time">
                        {new Date(memory.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'long-term' && (
          <div className="long-term-view">
            <p className="view-description">
              Learned patterns and preferences from your learning journey
            </p>
            {longTermPatterns.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🧬</div>
                <p>Building your learning profile...</p>
              </div>
            ) : (
              <div className="pattern-grid">
                {longTermPatterns.map((pattern) => (
                  <div key={pattern.id} className="pattern-card">
                    <div className="pattern-header">
                      <h4>{getPatternTypeLabel(pattern.pattern_type)}</h4>
                      <div className="confidence-badge">
                        {Math.round(pattern.confidence_score * 100)}%
                      </div>
                    </div>
                    <div className="pattern-data">
                      {Object.entries(pattern.pattern_data).slice(0, 5).map(([key, value]) => (
                        <div key={key} className="pattern-item">
                          <span className="pattern-key">{key}:</span>
                          <span className="pattern-value">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pattern-meta">
                      <span>Accessed {pattern.access_count} times</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryInsights;
