import React, { useState, useEffect } from 'react';
import './ProgressDashboard.css';

const ProgressDashboard = ({ username, onClose }) => {
  const [progress, setProgress] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, [username]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progressRes, achievementsRes, analyticsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/users/${username}/progress`),
        fetch(`http://localhost:8000/api/users/${username}/achievements`),
        fetch(`http://localhost:8000/api/users/${username}/analytics?days=30`)
      ]);

      const progressData = await progressRes.json();
      const achievementsData = await achievementsRes.json();
      const analyticsData = await analyticsRes.json();

      setProgress(progressData.progress || []);
      setAchievements(achievementsData.achievements || []);
      setAnalytics(analyticsData.analytics || {});
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    const totalXP = progress.reduce((sum, p) => sum + (p.experience_points || 0), 0);
    const totalTime = progress.reduce((sum, p) => sum + (p.total_time_minutes || 0), 0);
    const totalMessages = progress.reduce((sum, p) => sum + (p.total_messages || 0), 0);
    const maxStreak = Math.max(...progress.map(p => p.streak_days || 0), 0);

    return (
      <div className="overview-grid">
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{totalXP.toLocaleString()}</div>
          <div className="stat-label">Total XP</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">{Math.floor(totalTime / 60)}h {totalTime % 60}m</div>
          <div className="stat-label">Practice Time</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-value">{totalMessages}</div>
          <div className="stat-label">Messages Sent</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{maxStreak} days</div>
          <div className="stat-label">Best Streak</div>
        </div>

        <div className="languages-practiced">
          <h3>Languages</h3>
          {progress.map((lang, idx) => (
            <div key={idx} className="language-progress">
              <div className="language-header">
                <span className="language-name">{lang.language}</span>
                <span className="language-level">{lang.current_level}</span>
              </div>
              <div className="language-stats">
                <div className="mini-stat">
                  <span>{lang.experience_points} XP</span>
                </div>
                <div className="mini-stat">
                  <span>{lang.total_messages} messages</span>
                </div>
                <div className="mini-stat">
                  <span>{lang.streak_days} day streak</span>
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((lang.experience_points / 1000) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAchievements = () => {
    return (
      <div className="achievements-grid">
        {achievements.length === 0 ? (
          <div className="empty-state">
            <p>No achievements yet. Start practicing to unlock them!</p>
          </div>
        ) : (
          achievements.map((achievement, idx) => (
            <div key={idx} className="achievement-card">
              <div className="achievement-icon">{achievement.icon}</div>
              <div className="achievement-name">{achievement.name}</div>
              <div className="achievement-description">{achievement.description}</div>
              <div className="achievement-points">+{achievement.points} XP</div>
              <div className="achievement-date">
                Earned: {new Date(achievement.earned_at).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderAnalytics = () => {
    if (!analytics || !analytics.daily_activity) {
      return <div className="empty-state">No analytics data available</div>;
    }

    const last7Days = analytics.daily_activity.slice(-7);

    return (
      <div className="analytics-container">
        <div className="chart-container">
          <h3>Last 7 Days Activity</h3>
          <div className="bar-chart">
            {last7Days.map((day, idx) => {
              const maxMinutes = Math.max(...last7Days.map(d => d.minutes_practiced), 1);
              const height = (day.minutes_practiced / maxMinutes) * 100;

              return (
                <div key={idx} className="bar-wrapper">
                  <div className="bar" style={{ height: `${height}%` }}>
                    <span className="bar-value">{day.minutes_practiced}m</span>
                  </div>
                  <div className="bar-label">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="recent-sessions">
          <h3>Recent Sessions</h3>
          {analytics.recent_sessions && analytics.recent_sessions.length > 0 ? (
            <div className="sessions-list">
              {analytics.recent_sessions.slice(0, 5).map((session, idx) => (
                <div key={idx} className="session-item">
                  <div className="session-language">{session.language}</div>
                  <div className="session-stats">
                    <span>{session.message_count} messages</span>
                    <span>{session.corrections_count} corrections</span>
                    <span>{Math.floor(session.duration_seconds / 60)} min</span>
                  </div>
                  <div className="session-date">
                    {new Date(session.started_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No recent sessions</div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="progress-dashboard">
        <div className="dashboard-loading">Loading your progress...</div>
      </div>
    );
  }

  return (
    <div className="progress-dashboard">
      <div className="dashboard-header">
        <h2>Your Progress</h2>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          Achievements ({achievements.length})
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'achievements' && renderAchievements()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
};

export default ProgressDashboard;
