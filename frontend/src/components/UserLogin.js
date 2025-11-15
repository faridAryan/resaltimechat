import React, { useState } from 'react';
import './UserLogin.css';

const UserLogin = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store username in localStorage
        localStorage.setItem('learno_username', username.trim());
        onLogin(username.trim());
      } else {
        setError(data.detail || 'Failed to create/login user');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="user-login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome to Learno</h1>
          <p className="login-subtitle">Interactive Language Learning Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? 'Loading...' : 'Start Learning'}
          </button>
        </form>

        <div className="login-features">
          <h3>What you'll get:</h3>
          <ul>
            <li>🎯 Adaptive difficulty levels</li>
            <li>🏆 Achievements and rewards</li>
            <li>📊 Progress tracking</li>
            <li>📚 Vocabulary learning</li>
            <li>🔥 Daily streaks</li>
            <li>🌍 10+ languages</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
