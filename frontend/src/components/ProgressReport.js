import React, { useState, useEffect } from 'react';

const ProgressReport = ({ username, language }) => {
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [username, language, period]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/reports/progress?username=${username}&language=${language}&period=${period}`
      );
      const data = await response.json();
      setReport(data.report);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !report) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading report...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Progress Report - {report.period}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['week', 'month', 'year'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 16px',
                background: period === p ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa',
                color: period === p ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#667eea' }}>Sessions</h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#333' }}>{report.sessions.total}</div>
          <div style={{ color: '#666', marginTop: '8px' }}>{report.sessions.total_time_minutes} minutes total</div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#764ba2' }}>Messages</h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#333' }}>{report.sessions.total_messages}</div>
          <div style={{ color: '#666', marginTop: '8px' }}>{report.sessions.perfect_messages} perfect</div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#28a745' }}>Accuracy</h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#333' }}>{report.sessions.avg_accuracy}%</div>
          <div style={{ color: '#666', marginTop: '8px' }}>Average accuracy</div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#ffc107' }}>Streak</h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#333' }}>{report.streak}</div>
          <div style={{ color: '#666', marginTop: '8px' }}>Days in a row</div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#dc3545' }}>Vocabulary</h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#333' }}>{report.vocabulary.words_practiced}</div>
          <div style={{ color: '#666', marginTop: '8px' }}>{report.vocabulary.accuracy}% accuracy</div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#17a2b8' }}>XP Points</h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#333' }}>{report.total_xp}</div>
          <div style={{ color: '#666', marginTop: '8px' }}>Total experience</div>
        </div>
      </div>
    </div>
  );
};

export default ProgressReport;
