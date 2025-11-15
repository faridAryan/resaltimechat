import React, { useState, useEffect } from 'react';
import './DailyChallenge.css';

const DailyChallenge = ({ username, language }) => {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchChallenge();
    const interval = setInterval(checkProgress, 5000); // Check progress every 5 seconds
    return () => clearInterval(interval);
  }, [username, language]);

  const fetchChallenge = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/daily-challenge/${username}?language=${language}`
      );
      const data = await response.json();
      setChallenge(data.challenge);
      calculateProgress(data.challenge);
    } catch (error) {
      console.error('Error fetching challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkProgress = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/daily-challenge/check?username=${username}`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (data.completed) {
        fetchChallenge(); // Refresh to show completed state
      }
    } catch (error) {
      console.error('Error checking challenge:', error);
    }
  };

  const calculateProgress = (challengeData) => {
    if (!challengeData || challengeData.completed) {
      setProgress(100);
      return;
    }

    // This would need real-time data from the server
    // For now, we'll estimate based on typical progress
    setProgress(0);
  };

  if (loading) {
    return <div className="loading">Loading today's challenge...</div>;
  }

  if (!challenge) {
    return (
      <div className="empty-challenge">
        <div className="empty-icon">🎯</div>
        <h3>No Challenge Available</h3>
        <p>Check back tomorrow for a new daily challenge!</p>
      </div>
    );
  }

  const challengeData = challenge.challenge_data || {};
  const isCompleted = challenge.completed === 1 || challenge.completed === true;

  return (
    <div className="daily-challenge">
      <div className="challenge-header">
        <h3>Today's Daily Challenge</h3>
        <div className="challenge-date">
          {new Date(challenge.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      <div className={`challenge-card ${isCompleted ? 'completed' : ''}`}>
        <div className="challenge-icon">
          {isCompleted ? '🏆' : '🎯'}
        </div>

        <div className="challenge-content">
          <h4 className="challenge-title">
            {challengeData.description || 'Complete the challenge'}
          </h4>

          <div className="challenge-goal">
            <div className="goal-label">Goal:</div>
            <div className="goal-value">{challengeData.goal || 'N/A'}</div>
          </div>

          <div className="challenge-reward">
            <span className="reward-icon">⭐</span>
            <span className="reward-text">Reward: {challenge.reward_xp} XP</span>
          </div>

          {!isCompleted && (
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="progress-text">{progress}% Complete</div>
            </div>
          )}

          {isCompleted && (
            <div className="completion-badge">
              <div className="badge-content">
                <span className="badge-icon">✅</span>
                <span className="badge-text">Challenge Completed!</span>
              </div>
              <div className="completion-message">
                Great job! Come back tomorrow for a new challenge.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="challenge-tips">
        <h4>💡 Tips for Today</h4>
        <ul>
          {challenge.challenge_type === 'message_count' && (
            <>
              <li>Start conversations on topics you're interested in</li>
              <li>Ask follow-up questions to keep the conversation going</li>
              <li>Don't worry about making mistakes - practice is key!</li>
            </>
          )}
          {challenge.challenge_type === 'perfect_messages' && (
            <>
              <li>Take your time to construct each message carefully</li>
              <li>Review grammar rules before practicing</li>
              <li>Use simpler sentences if you're unsure</li>
            </>
          )}
          {challenge.challenge_type === 'vocabulary' && (
            <>
              <li>Pay attention to new words in AI responses</li>
              <li>Try to use new words in your own messages</li>
              <li>Ask about word meanings during conversation</li>
            </>
          )}
          {challenge.challenge_type === 'scenario' && (
            <>
              <li>Choose a scenario that matches your current level</li>
              <li>Read the context and vocabulary before starting</li>
              <li>Try to use the suggested vocabulary in your conversation</li>
            </>
          )}
        </ul>
      </div>

      <div className="challenge-motivation">
        <p>🔥 Keep your streak going! Practice every day to maximize your learning.</p>
      </div>
    </div>
  );
};

export default DailyChallenge;
