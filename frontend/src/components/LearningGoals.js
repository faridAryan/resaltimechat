import React, { useState, useEffect } from 'react';
import './LearningGoals.css';

const LearningGoals = ({ username, language }) => {
  const [goals, setGoals] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState({
    goal_type: 'messages',
    title: '',
    target_value: 100,
    deadline: '',
    description: ''
  });

  useEffect(() => {
    fetchGoals();
  }, [username, language]);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/goals/list?username=${username}&language=${language}`
      );
      const data = await response.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `http://localhost:8000/api/goals/create?username=${username}&language=${language}&goal_type=${newGoal.goal_type}&title=${encodeURIComponent(newGoal.title)}&target_value=${newGoal.target_value}&deadline=${newGoal.deadline}&description=${encodeURIComponent(newGoal.description)}`,
        { method: 'POST' }
      );
      if (response.ok) {
        setShowCreateForm(false);
        setNewGoal({
          goal_type: 'messages',
          title: '',
          target_value: 100,
          deadline: '',
          description: ''
        });
        fetchGoals();
      }
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const getGoalIcon = (type) => {
    const icons = {
      messages: '💬',
      vocabulary: '📚',
      streak: '🔥',
      perfect_messages: '✅',
      practice_time: '⏱️',
      scenarios: '🎭'
    };
    return icons[type] || '🎯';
  };

  const getProgressPercentage = (goal) => {
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  };

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return <div className="loading">Loading goals...</div>;
  }

  return (
    <div className="learning-goals">
      <div className="goals-header">
        <h2>Learning Goals</h2>
        <button className="create-goal-button" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? '✕ Cancel' : '+ New Goal'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-goal-form">
          <h3>Create New Goal</h3>
          <form onSubmit={createGoal}>
            <div className="form-group">
              <label>Goal Type</label>
              <select
                value={newGoal.goal_type}
                onChange={(e) => setNewGoal({ ...newGoal, goal_type: e.target.value })}
                required
              >
                <option value="messages">Message Count</option>
                <option value="vocabulary">Vocabulary Words</option>
                <option value="streak">Daily Streak</option>
                <option value="perfect_messages">Perfect Messages</option>
                <option value="practice_time">Practice Time (minutes)</option>
                <option value="scenarios">Complete Scenarios</option>
              </select>
            </div>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="e.g., Send 100 messages this month"
                required
              />
            </div>

            <div className="form-group">
              <label>Target Value</label>
              <input
                type="number"
                value={newGoal.target_value}
                onChange={(e) => setNewGoal({ ...newGoal, target_value: parseInt(e.target.value) })}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Deadline (optional)</label>
              <input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Description (optional)</label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Why is this goal important to you?"
                rows="3"
              />
            </div>

            <button type="submit" className="submit-goal-button">
              Create Goal
            </button>
          </form>
        </div>
      )}

      <div className="goals-grid">
        {goals.length === 0 ? (
          <div className="empty-goals">
            <div className="empty-icon">🎯</div>
            <h3>No Goals Yet</h3>
            <p>Set your first learning goal to track your progress!</p>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = getProgressPercentage(goal);
            const daysRemaining = getDaysRemaining(goal.deadline);
            const isCompleted = goal.completed === 1 || goal.completed === true;

            return (
              <div key={goal.id} className={`goal-card ${isCompleted ? 'completed' : ''}`}>
                <div className="goal-icon">{getGoalIcon(goal.goal_type)}</div>

                <div className="goal-content">
                  <h4 className="goal-title">{goal.title}</h4>

                  {goal.description && (
                    <p className="goal-description">{goal.description}</p>
                  )}

                  <div className="goal-progress">
                    <div className="progress-info">
                      <span className="progress-text">
                        {goal.current_value} / {goal.target_value}
                      </span>
                      <span className="progress-percentage">{progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="goal-footer">
                    {isCompleted ? (
                      <div className="completed-badge">
                        <span className="badge-icon">🏆</span>
                        <span>Completed!</span>
                      </div>
                    ) : (
                      <>
                        {daysRemaining !== null && (
                          <div className={`deadline ${daysRemaining < 7 ? 'urgent' : ''}`}>
                            {daysRemaining > 0 ? (
                              `${daysRemaining} days remaining`
                            ) : daysRemaining === 0 ? (
                              'Due today!'
                            ) : (
                              `${Math.abs(daysRemaining)} days overdue`
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LearningGoals;
