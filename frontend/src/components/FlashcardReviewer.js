import React, { useState, useEffect } from 'react';
import './FlashcardReviewer.css';

const FlashcardReviewer = ({ username, language }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchFlashcards();
  }, [username, language]);

  const fetchFlashcards = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/flashcards/${username}?language=${language}&limit=10`
      );
      const data = await response.json();
      setFlashcards(data.flashcards || []);
      setCurrentIndex(0);
      setShowAnswer(false);
      setCompleted(false);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfidence = async (level) => {
    const currentCard = flashcards[currentIndex];

    try {
      await fetch(`http://localhost:8000/api/flashcards/review?username=${username}&vocab_id=${currentCard.id}&confidence=${level}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error reviewing flashcard:', error);
    }

    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      setCompleted(true);
    }
  };

  if (loading) {
    return <div className="loading">Loading flashcards...</div>;
  }

  if (flashcards.length === 0) {
    return (
      <div className="empty-flashcards">
        <div className="empty-icon">📇</div>
        <h3>No Flashcards Available</h3>
        <p>Start practicing conversations to learn new vocabulary!</p>
        <p className="hint">Words you learn during conversations will appear here for review.</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="review-complete">
        <div className="complete-icon">🎉</div>
        <h3>Review Complete!</h3>
        <p>You've reviewed all {flashcards.length} flashcards</p>
        <button className="review-again-button" onClick={fetchFlashcards}>
          Review Again
        </button>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="flashcard-reviewer">
      <div className="review-header">
        <h3>Vocabulary Review</h3>
        <div className="progress">
          {currentIndex + 1} / {flashcards.length}
        </div>
      </div>

      <div className={`flashcard ${showAnswer ? 'flipped' : ''}`}>
        <div className="flashcard-content">
          {!showAnswer ? (
            <div className="flashcard-front">
              <div className="card-label">Word</div>
              <div className="card-word">{currentCard.word}</div>
              {currentCard.context && (
                <div className="card-context">
                  <strong>Context:</strong>
                  <p>{currentCard.context}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flashcard-back">
              <div className="card-label">Translation</div>
              <div className="card-translation">{currentCard.translation || 'No translation available'}</div>
              <div className="card-stats">
                <div className="stat">
                  <span className="stat-label">Reviewed:</span>
                  <span className="stat-value">{currentCard.review_count || 0} times</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Confidence:</span>
                  <span className="stat-value">
                    {'⭐'.repeat(Math.min(currentCard.confidence_level || 0, 5))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flashcard-actions">
        {!showAnswer ? (
          <button className="show-answer-button" onClick={() => setShowAnswer(true)}>
            Show Answer
          </button>
        ) : (
          <div className="confidence-buttons">
            <p>How well did you know this word?</p>
            <div className="button-group">
              <button className="confidence-btn hard" onClick={() => handleConfidence(0)}>
                😰 Hard
              </button>
              <button className="confidence-btn medium" onClick={() => handleConfidence(2)}>
                😐 Medium
              </button>
              <button className="confidence-btn easy" onClick={() => handleConfidence(4)}>
                😄 Easy
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="review-tips">
        💡 <strong>Tip:</strong> Review regularly for better retention. Harder words will appear more frequently.
      </div>
    </div>
  );
};

export default FlashcardReviewer;
