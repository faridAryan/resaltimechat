import React, { useState, useEffect } from 'react';
import './VocabularyTrainer.css';

const VocabularyTrainer = ({ username, language }) => {
  const [exercises, setExercises] = useState([]);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, correct: 0, accuracy: 0 });

  useEffect(() => {
    fetchExercises();
  }, [username, language]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/vocabulary/list?username=${username}&language=${language}&due_only=true`
      );
      const data = await response.json();
      setExercises(data.exercises || []);
      if (data.exercises && data.exercises.length > 0) {
        setCurrentExercise(data.exercises[0]);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = () => {
    const correct = userAnswer.toLowerCase().trim() === currentExercise.translation.toLowerCase().trim();
    setIsCorrect(correct);
    setShowResult(true);

    // Update stats
    setStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (correct ? 1 : 0),
      accuracy: Math.round(((prev.correct + (correct ? 1 : 0)) / (prev.total + 1)) * 100)
    }));

    // Update backend
    updateProgress(correct);
  };

  const updateProgress = async (correct) => {
    try {
      await fetch(
        `http://localhost:8000/api/vocabulary/update?exercise_id=${currentExercise.id}&correct=${correct}`,
        { method: 'POST' }
      );
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const nextExercise = () => {
    const currentIndex = exercises.findIndex(ex => ex.id === currentExercise.id);
    if (currentIndex < exercises.length - 1) {
      setCurrentExercise(exercises[currentIndex + 1]);
    } else {
      setCurrentExercise(null);
    }
    setUserAnswer('');
    setShowResult(false);
    setIsCorrect(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !showResult) {
      checkAnswer();
    } else if (e.key === 'Enter' && showResult) {
      nextExercise();
    }
  };

  if (loading) {
    return <div className="loading">Loading vocabulary exercises...</div>;
  }

  if (!currentExercise) {
    return (
      <div className="vocabulary-trainer">
        <div className="completion-message">
          <div className="completion-icon">🎉</div>
          <h2>Great Job!</h2>
          <p>You've completed all vocabulary exercises for today!</p>
          <div className="session-stats">
            <div className="stat-item">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Words Practiced</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.correct}</div>
              <div className="stat-label">Correct Answers</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.accuracy}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
          </div>
          <button className="refresh-button" onClick={fetchExercises}>
            Check for More
          </button>
        </div>
      </div>
    );
  }

  const currentIndex = exercises.findIndex(ex => ex.id === currentExercise.id);
  const progress = ((currentIndex + 1) / exercises.length) * 100;

  return (
    <div className="vocabulary-trainer">
      <div className="trainer-header">
        <h2>Vocabulary Practice</h2>
        <div className="progress-indicator">
          <span>{currentIndex + 1} / {exercises.length}</span>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="stats-row">
        <div className="mini-stat">
          <span className="mini-stat-icon">💬</span>
          <span>{stats.total} practiced</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon">✅</span>
          <span>{stats.correct} correct</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon">🎯</span>
          <span>{stats.accuracy}% accuracy</span>
        </div>
      </div>

      <div className="exercise-card">
        <div className="proficiency-badge">
          Level {currentExercise.proficiency_level || 0}
        </div>

        <div className="word-display">
          <div className="word-label">Translate this word:</div>
          <div className="word">{currentExercise.word}</div>
        </div>

        {!showResult ? (
          <div className="answer-section">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer..."
              className="answer-input"
              autoFocus
            />
            <button
              className="check-button"
              onClick={checkAnswer}
              disabled={!userAnswer.trim()}
            >
              Check Answer
            </button>
          </div>
        ) : (
          <div className={`result-section ${isCorrect ? 'correct' : 'incorrect'}`}>
            <div className="result-icon">
              {isCorrect ? '✅' : '❌'}
            </div>
            <div className="result-message">
              {isCorrect ? 'Correct!' : 'Not quite!'}
            </div>
            {!isCorrect && (
              <>
                <div className="your-answer">
                  Your answer: <strong>{userAnswer}</strong>
                </div>
                <div className="correct-answer">
                  Correct answer: <strong>{currentExercise.translation}</strong>
                </div>
              </>
            )}
            <button className="next-button" onClick={nextExercise}>
              Next Word →
            </button>
          </div>
        )}
      </div>

      {currentExercise.attempts > 0 && (
        <div className="exercise-stats">
          <div className="stat-detail">
            <span>Attempts:</span>
            <strong>{currentExercise.attempts}</strong>
          </div>
          <div className="stat-detail">
            <span>Correct:</span>
            <strong>{currentExercise.correct}</strong>
          </div>
          <div className="stat-detail">
            <span>Success Rate:</span>
            <strong>
              {Math.round((currentExercise.correct / currentExercise.attempts) * 100)}%
            </strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabularyTrainer;
