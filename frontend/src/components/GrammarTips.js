import React, { useState, useEffect } from 'react';

const GrammarTips = ({ language }) => {
  const [tips, setTips] = useState([]);
  const [selectedTip, setSelectedTip] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTips();
  }, [language, difficulty, category]);

  const fetchTips = async () => {
    setLoading(true);
    try {
      let url = `http://localhost:8000/api/grammar/tips?language=${language}`;
      if (difficulty) url += `&difficulty_level=${difficulty}`;
      if (category) url += `&category=${category}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setTips(data.tips || []);
    } catch (error) {
      console.error('Error fetching tips:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading grammar tips...</div>;
  }

  if (selectedTip) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => setSelectedTip(null)}
          style={{
            padding: '8px 16px',
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          ← Back to Tips
        </button>

        <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 12px',
            background: '#667eea',
            color: 'white',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            {selectedTip.difficulty_level}
          </div>
          
          <h1 style={{ marginBottom: '8px' }}>{selectedTip.title}</h1>
          <h3 style={{ color: '#666', marginBottom: '24px' }}>{selectedTip.topic}</h3>
          
          <div style={{ marginBottom: '32px' }}>
            <h4 style={{ marginBottom: '12px' }}>Explanation</h4>
            <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#333' }}>
              {selectedTip.explanation}
            </p>
          </div>

          <div>
            <h4 style={{ marginBottom: '12px' }}>Examples</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedTip.examples.map((example, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    background: '#f8f9fa',
                    borderLeft: '4px solid #667eea',
                    borderRadius: '6px',
                    fontStyle: 'italic',
                    color: '#333'
                  }}
                >
                  {example}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px' }}>📝 Grammar Tips</h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#666' }}>
            Difficulty
          </label>
          <select
            value={difficulty || ''}
            onChange={(e) => setDifficulty(e.target.value || null)}
            style={{
              padding: '8px 16px',
              border: '2px solid #e9ecef',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#666' }}>
            Category
          </label>
          <select
            value={category || ''}
            onChange={(e) => setCategory(e.target.value || null)}
            style={{
              padding: '8px 16px',
              border: '2px solid #e9ecef',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <option value="">All Categories</option>
            <option value="tenses">Tenses</option>
            <option value="grammar">Grammar</option>
            <option value="prepositions">Prepositions</option>
          </select>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {tips.map(tip => (
          <div
            key={tip.id}
            onClick={() => setSelectedTip(tip)}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
            }}
          >
            <div style={{
              display: 'inline-block',
              padding: '4px 8px',
              background: '#667eea',
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              {tip.difficulty_level}
            </div>
            <h3 style={{ marginBottom: '8px', color: '#333' }}>{tip.title}</h3>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '8px' }}>
              {tip.topic}
            </p>
            <p style={{ color: '#999', fontSize: '0.85rem' }}>
              {tip.explanation.substring(0, 100)}...
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GrammarTips;
