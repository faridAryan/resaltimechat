import React, { useState, useEffect } from 'react';
import './StudyNotes.css';

const StudyNotes = ({ username, language }) => {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState('all');

  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    topic: '',
    tags: ''
  });

  useEffect(() => {
    fetchNotes();
  }, [username, language]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/notes/list?username=${username}&language=${language}`
      );
      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (e) => {
    e.preventDefault();
    try {
      const tagsArray = newNote.tags.split(',').map(t => t.trim()).filter(t => t);
      const tagsParam = tagsArray.length > 0 ? `&tags=${encodeURIComponent(JSON.stringify(tagsArray))}` : '';

      const response = await fetch(
        `http://localhost:8000/api/notes/create?username=${username}&title=${encodeURIComponent(newNote.title)}&content=${encodeURIComponent(newNote.content)}&language=${language}&topic=${encodeURIComponent(newNote.topic)}${tagsParam}`,
        { method: 'POST' }
      );

      if (response.ok) {
        setShowCreateForm(false);
        setNewNote({ title: '', content: '', topic: '', tags: '' });
        fetchNotes();
      }
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const updateNote = async (e) => {
    e.preventDefault();
    try {
      const tagsArray = selectedNote.tags_array || [];
      const tagsParam = tagsArray.length > 0 ? `&tags=${encodeURIComponent(JSON.stringify(tagsArray))}` : '';

      const response = await fetch(
        `http://localhost:8000/api/notes/update?note_id=${selectedNote.id}&title=${encodeURIComponent(selectedNote.title)}&content=${encodeURIComponent(selectedNote.content)}&topic=${encodeURIComponent(selectedNote.topic || '')}${tagsParam}`,
        { method: 'PUT' }
      );

      if (response.ok) {
        setEditMode(false);
        fetchNotes();
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const deleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/notes/delete?note_id=${noteId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setSelectedNote(null);
        fetchNotes();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const topics = [...new Set(notes.map(n => n.topic).filter(t => t))];

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = filterTopic === 'all' || note.topic === filterTopic;
    return matchesSearch && matchesTopic;
  });

  if (loading) {
    return <div className="loading">Loading notes...</div>;
  }

  if (selectedNote && !editMode) {
    const tags = selectedNote.tags_array || [];

    return (
      <div className="note-viewer">
        <div className="note-viewer-header">
          <button className="back-button" onClick={() => setSelectedNote(null)}>
            ← Back to Notes
          </button>
          <div className="note-actions">
            <button className="edit-button" onClick={() => setEditMode(true)}>
              ✏️ Edit
            </button>
            <button className="delete-button" onClick={() => deleteNote(selectedNote.id)}>
              🗑️ Delete
            </button>
          </div>
        </div>

        <div className="note-display">
          <h2 className="note-display-title">{selectedNote.title}</h2>

          <div className="note-meta">
            <span>Created: {formatDate(selectedNote.created_at)}</span>
            {selectedNote.updated_at && selectedNote.updated_at !== selectedNote.created_at && (
              <>
                <span>•</span>
                <span>Updated: {formatDate(selectedNote.updated_at)}</span>
              </>
            )}
            {selectedNote.topic && (
              <>
                <span>•</span>
                <span className="note-topic-badge">{selectedNote.topic}</span>
              </>
            )}
          </div>

          {tags.length > 0 && (
            <div className="note-tags">
              {tags.map((tag, idx) => (
                <span key={idx} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="note-content-display">
            {selectedNote.content}
          </div>
        </div>
      </div>
    );
  }

  if (selectedNote && editMode) {
    return (
      <div className="note-editor">
        <div className="note-viewer-header">
          <button className="back-button" onClick={() => setEditMode(false)}>
            ← Cancel
          </button>
        </div>

        <form onSubmit={updateNote} className="note-form">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={selectedNote.title}
              onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Topic (optional)</label>
            <input
              type="text"
              value={selectedNote.topic || ''}
              onChange={(e) => setSelectedNote({ ...selectedNote, topic: e.target.value })}
              placeholder="e.g., Grammar, Vocabulary, Phrases"
            />
          </div>

          <div className="form-group">
            <label>Tags (comma-separated, optional)</label>
            <input
              type="text"
              value={(selectedNote.tags_array || []).join(', ')}
              onChange={(e) => setSelectedNote({
                ...selectedNote,
                tags_array: e.target.value.split(',').map(t => t.trim()).filter(t => t)
              })}
              placeholder="e.g., verbs, conjugation, important"
            />
          </div>

          <div className="form-group">
            <label>Content</label>
            <textarea
              value={selectedNote.content}
              onChange={(e) => setSelectedNote({ ...selectedNote, content: e.target.value })}
              rows="15"
              required
            />
          </div>

          <button type="submit" className="save-note-button">
            Save Changes
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="study-notes">
      <div className="notes-header">
        <h2>Study Notes</h2>
        <button className="create-note-button" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? '✕ Cancel' : '+ New Note'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-note-form">
          <h3>Create New Note</h3>
          <form onSubmit={createNote} className="note-form">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="e.g., Subjunctive Mood Notes"
                required
              />
            </div>

            <div className="form-group">
              <label>Topic (optional)</label>
              <input
                type="text"
                value={newNote.topic}
                onChange={(e) => setNewNote({ ...newNote, topic: e.target.value })}
                placeholder="e.g., Grammar, Vocabulary, Phrases"
              />
            </div>

            <div className="form-group">
              <label>Tags (comma-separated, optional)</label>
              <input
                type="text"
                value={newNote.tags}
                onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
                placeholder="e.g., verbs, conjugation, important"
              />
            </div>

            <div className="form-group">
              <label>Content</label>
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Write your notes here..."
                rows="10"
                required
              />
            </div>

            <button type="submit" className="save-note-button">
              Create Note
            </button>
          </form>
        </div>
      )}

      <div className="notes-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>

        {topics.length > 0 && (
          <div className="topic-filter">
            <button
              className={`topic-button ${filterTopic === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTopic('all')}
            >
              All Topics
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                className={`topic-button ${filterTopic === topic ? 'active' : ''}`}
                onClick={() => setFilterTopic(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredNotes.length === 0 ? (
        <div className="empty-notes">
          <div className="empty-icon">📝</div>
          <h3>No Notes Yet</h3>
          <p>Create your first study note to keep track of important concepts!</p>
        </div>
      ) : (
        <div className="notes-grid">
          {filteredNotes.map((note) => {
            const tags = note.tags_array || [];
            const preview = note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '');

            return (
              <div
                key={note.id}
                className="note-card"
                onClick={() => setSelectedNote(note)}
              >
                <h4 className="note-card-title">{note.title}</h4>

                {note.topic && (
                  <div className="note-topic-badge">{note.topic}</div>
                )}

                <p className="note-preview">{preview}</p>

                {tags.length > 0 && (
                  <div className="note-tags-preview">
                    {tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="tag-small">
                        {tag}
                      </span>
                    ))}
                    {tags.length > 3 && <span className="tag-more">+{tags.length - 3}</span>}
                  </div>
                )}

                <div className="note-date">
                  {formatDate(note.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudyNotes;
