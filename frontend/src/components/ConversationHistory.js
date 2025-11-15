import React, { useState, useEffect } from 'react';
import './ConversationHistory.css';

const ConversationHistory = ({ username, language }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [username, language]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/conversations/list?username=${username}&language=${language}`
      );
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewConversation = async (conversationId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/conversations/get?conversation_id=${conversationId}`
      );
      const data = await response.json();
      setSelectedConversation(data.conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  };

  const filteredConversations = conversations.filter((conv) =>
    (conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.session_id?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="loading">Loading conversation history...</div>;
  }

  if (selectedConversation) {
    const messages = JSON.parse(selectedConversation.messages || '[]');

    return (
      <div className="conversation-viewer">
        <div className="viewer-header">
          <button className="back-button" onClick={() => setSelectedConversation(null)}>
            ← Back to History
          </button>
          <h3>{selectedConversation.title || 'Conversation'}</h3>
          <div className="conversation-meta">
            <span>{formatDate(selectedConversation.created_at)}</span>
            <span>•</span>
            <span>{messages.length} messages</span>
            {selectedConversation.duration && (
              <>
                <span>•</span>
                <span>{formatDuration(selectedConversation.duration)}</span>
              </>
            )}
          </div>
        </div>

        <div className="conversation-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`history-message message-${msg.role}`}>
              <div className="message-role">
                {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'AI' : 'System'}
              </div>
              <div className="message-content">{msg.content}</div>
              {msg.timestamp && (
                <div className="message-timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-history">
      <div className="history-header">
        <h2>Conversation History</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="empty-history">
          <div className="empty-icon">💬</div>
          <h3>No Conversations Yet</h3>
          <p>Your conversation history will appear here after you practice!</p>
        </div>
      ) : (
        <div className="conversations-list">
          {filteredConversations.map((conv) => {
            const messageCount = JSON.parse(conv.messages || '[]').length;

            return (
              <div
                key={conv.id}
                className="conversation-card"
                onClick={() => viewConversation(conv.id)}
              >
                <div className="conversation-icon">💬</div>

                <div className="conversation-info">
                  <h4 className="conversation-title">
                    {conv.title || `Session ${conv.session_id.substring(0, 8)}`}
                  </h4>
                  <div className="conversation-details">
                    <span className="detail-item">
                      <span className="detail-icon">📅</span>
                      {formatDate(conv.created_at)}
                    </span>
                    <span className="detail-item">
                      <span className="detail-icon">💬</span>
                      {messageCount} messages
                    </span>
                    {conv.duration && (
                      <span className="detail-item">
                        <span className="detail-icon">⏱️</span>
                        {formatDuration(conv.duration)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="conversation-arrow">→</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConversationHistory;
