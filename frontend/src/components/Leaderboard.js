import React, { useState, useEffect } from 'react';

const Leaderboard = ({ language, username }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState('all_time');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [language, period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/leaderboard?language=${language}&period=${period}&limit=50`
      );
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading leaderboard...</div>;
  }

  const currentUserRank = leaderboard.find(entry => entry.username === username);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>🏆 Leaderboard</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setPeriod('all_time')}
            style={{
              padding: '8px 16px',
              background: period === 'all_time' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa',
              color: period === 'all_time' ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            All Time
          </button>
          <button
            onClick={() => setPeriod('week')}
            style={{
              padding: '8px 16px',
              background: period === 'week' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa',
              color: period === 'week' ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            This Week
          </button>
        </div>
      </div>

      {currentUserRank && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Your Ranking</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>#{currentUserRank.rank}</div>
            <div>{currentUserRank.xp} XP</div>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        {leaderboard.map((entry, idx) => {
          const isCurrentUser = entry.username === username;
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
          
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                borderBottom: idx < leaderboard.length - 1 ? '1px solid #e9ecef' : 'none',
                background: isCurrentUser ? '#f0f4ff' : 'transparent',
                fontWeight: isCurrentUser ? '700' : '400'
              }}
            >
              <div style={{ minWidth: '60px', fontSize: '1.2rem', fontWeight: '700', color: '#667eea' }}>
                {medal || `#${entry.rank}`}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>
                  {entry.username} {isCurrentUser && '(You)'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  {entry.messages} messages • {entry.streak} day streak
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#667eea' }}>
                  {entry.xp}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>XP</div>
              </div>
            </div>
          );
        })}
      </div>

      {leaderboard.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          No rankings yet. Start practicing to get on the leaderboard!
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
