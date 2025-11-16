import React, { useState, useEffect } from 'react';

const ReadingMode = ({ username, language }) => {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, [language]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/reading/materials?language=${language}`
      );
      const data = await response.json();
      setMaterials(data.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async () => {
    try {
      await fetch(
        `http://localhost:8000/api/reading/progress?username=${username}&material_id=${selectedMaterial.id}&completed=true`,
        { method: 'POST' }
      );
      setSelectedMaterial(null);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading reading materials...</div>;
  }

  if (selectedMaterial) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => setSelectedMaterial(null)}
          style={{
            padding: '8px 16px',
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          ← Back to Materials
        </button>

        <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h1 style={{ marginBottom: '16px' }}>{selectedMaterial.title}</h1>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', color: '#666', fontSize: '0.9rem' }}>
            <span>📚 {selectedMaterial.difficulty_level}</span>
            <span>📝 {selectedMaterial.word_count} words</span>
            <span>⏱️ {selectedMaterial.estimated_time} min read</span>
          </div>
          <div style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#333' }}>
            {selectedMaterial.content}
          </div>
          <button
            onClick={markComplete}
            style={{
              marginTop: '32px',
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Mark as Complete ✓
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px' }}>📖 Reading Practice</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {materials.map(material => (
          <div
            key={material.id}
            onClick={() => setSelectedMaterial(material)}
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
            <h3 style={{ marginBottom: '12px', color: '#333' }}>{material.title}</h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '0.85rem', color: '#666' }}>
              <span>📚 {material.difficulty_level}</span>
              <span>📝 {material.word_count} words</span>
            </div>
            <div style={{ color: '#999', fontSize: '0.9rem' }}>
              ⏱️ {material.estimated_time} minute read
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReadingMode;
