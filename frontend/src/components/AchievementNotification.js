import React, { useEffect } from 'react';
import './AchievementNotification.css';

const AchievementNotification = ({ achievement, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!achievement) return null;

  return (
    <div className="achievement-notification">
      <div className="achievement-notification-content">
        <div className="achievement-badge">
          <span className="achievement-icon-large">{achievement.icon}</span>
        </div>
        <div className="achievement-info">
          <div className="achievement-title">Achievement Unlocked!</div>
          <div className="achievement-name">{achievement.name}</div>
          <div className="achievement-desc">{achievement.description}</div>
          <div className="achievement-xp">+{achievement.points} XP</div>
        </div>
        <button className="notification-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
};

export default AchievementNotification;
