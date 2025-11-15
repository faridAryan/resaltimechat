"""
Usability features: learning goals, conversation history, quick phrases, study notes
"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
import json
import uuid
import sqlite3


class UsabilityFeatures:
    """Manages learning goals, conversation history, notes, and quick phrases"""

    def __init__(self, database):
        self.database = database
        self.init_usability_features()

    def init_usability_features(self):
        """Initialize usability feature tables"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        # Learning goals table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS learning_goals (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT NOT NULL,
                goal_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                target_value INTEGER,
                current_value INTEGER DEFAULT 0,
                deadline DATE,
                completed BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Conversation history table (stores full conversations)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversation_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                session_id TEXT,
                language TEXT NOT NULL,
                title TEXT,
                messages TEXT NOT NULL,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP,
                message_count INTEGER DEFAULT 0,
                duration_seconds INTEGER DEFAULT 0,
                tags TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Study notes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS study_notes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT,
                topic TEXT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tags TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Quick phrases table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quick_phrases (
                id TEXT PRIMARY KEY,
                language TEXT NOT NULL,
                category TEXT,
                phrase TEXT NOT NULL,
                translation TEXT,
                usage_count INTEGER DEFAULT 0
            )
        """)

        conn.commit()
        self.init_quick_phrases()
        conn.close()

    def init_quick_phrases(self):
        """Initialize common quick phrases"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        phrases = [
            # Greetings
            {"lang": "general", "category": "greetings", "phrase": "Hello, how are you?", "translation": ""},
            {"lang": "general", "category": "greetings", "phrase": "Good morning!", "translation": ""},
            {"lang": "general", "category": "greetings", "phrase": "Good evening!", "translation": ""},
            {"lang": "general", "category": "greetings", "phrase": "How's your day going?", "translation": ""},

            # Questions
            {"lang": "general", "category": "questions", "phrase": "What does that mean?", "translation": ""},
            {"lang": "general", "category": "questions", "phrase": "Can you explain that?", "translation": ""},
            {"lang": "general", "category": "questions", "phrase": "How do you say...?", "translation": ""},
            {"lang": "general", "category": "questions", "phrase": "Could you repeat that?", "translation": ""},

            # Responses
            {"lang": "general", "category": "responses", "phrase": "I understand", "translation": ""},
            {"lang": "general", "category": "responses", "phrase": "That makes sense", "translation": ""},
            {"lang": "general", "category": "responses", "phrase": "I'm not sure", "translation": ""},
            {"lang": "general", "category": "responses", "phrase": "Let me think about that", "translation": ""},

            # Requests
            {"lang": "general", "category": "requests", "phrase": "Can you help me with...?", "translation": ""},
            {"lang": "general", "category": "requests", "phrase": "I would like to...", "translation": ""},
            {"lang": "general", "category": "requests", "phrase": "Could you please...?", "translation": ""},

            # Practice
            {"lang": "general", "category": "practice", "phrase": "Let's talk about...", "translation": ""},
            {"lang": "general", "category": "practice", "phrase": "Tell me more about...", "translation": ""},
            {"lang": "general", "category": "practice", "phrase": "I want to practice...", "translation": ""},
        ]

        for phrase in phrases:
            phrase_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT OR IGNORE INTO quick_phrases (id, language, category, phrase, translation)
                VALUES (?, ?, ?, ?, ?)
            """, (phrase_id, phrase["lang"], phrase["category"], phrase["phrase"], phrase["translation"]))

        conn.commit()
        conn.close()

    # Learning Goals
    def create_goal(self, user_id: str, language: str, goal_type: str, title: str,
                   target_value: int, deadline: str = None, description: str = None) -> str:
        """Create a new learning goal"""
        goal_id = str(uuid.uuid4())

        conn = self.database.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO learning_goals
            (id, user_id, language, goal_type, title, description, target_value, deadline)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (goal_id, user_id, language, goal_type, title, description, target_value, deadline))

        conn.commit()
        conn.close()

        return goal_id

    def get_user_goals(self, user_id: str, language: str = None, active_only: bool = True) -> List[Dict]:
        """Get user's learning goals"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM learning_goals WHERE user_id = ?"
        params = [user_id]

        if language:
            query += " AND language = ?"
            params.append(language)

        if active_only:
            query += " AND completed = 0"

        query += " ORDER BY created_at DESC"

        cursor.execute(query, params)
        goals = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return goals

    def update_goal_progress(self, goal_id: str, current_value: int):
        """Update goal progress"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT target_value FROM learning_goals WHERE id = ?
        """, (goal_id,))

        row = cursor.fetchone()
        if row:
            target = row['target_value']
            completed = current_value >= target

            cursor.execute("""
                UPDATE learning_goals
                SET current_value = ?,
                    completed = ?,
                    completed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE completed_at END
                WHERE id = ?
            """, (current_value, completed, completed, goal_id))

            conn.commit()

        conn.close()

    def check_and_update_goals(self, user_id: str, language: str):
        """Check and update all goals for a user"""
        goals = self.get_user_goals(user_id, language, active_only=True)

        conn = self.database.get_connection()
        cursor = conn.cursor()

        # Get user progress
        cursor.execute("""
            SELECT * FROM user_progress WHERE user_id = ? AND language = ?
        """, (user_id, language))

        progress = cursor.fetchone()
        if not progress:
            conn.close()
            return

        progress_dict = dict(progress)

        for goal in goals:
            goal_type = goal['goal_type']
            current = 0

            if goal_type == 'messages':
                current = progress_dict.get('total_messages', 0)
            elif goal_type == 'time_minutes':
                current = progress_dict.get('total_time_minutes', 0)
            elif goal_type == 'streak_days':
                current = progress_dict.get('streak_days', 0)
            elif goal_type == 'vocabulary':
                current = progress_dict.get('vocabulary_learned', 0)
            elif goal_type == 'xp':
                current = progress_dict.get('experience_points', 0)

            self.update_goal_progress(goal['id'], current)

        conn.close()

    # Conversation History
    def save_conversation(self, user_id: str, session_id: str, language: str,
                         messages: List[Dict], title: str = None) -> str:
        """Save a conversation to history"""
        conv_id = str(uuid.uuid4())

        # Generate title if not provided
        if not title:
            title = f"{language} Conversation - {datetime.now().strftime('%Y-%m-%d %H:%M')}"

        # Calculate duration
        if messages:
            started = messages[0].get('timestamp', datetime.now())
            ended = messages[-1].get('timestamp', datetime.now())

            if isinstance(started, str):
                started = datetime.fromisoformat(started) if 'T' in started else datetime.now()
            if isinstance(ended, str):
                ended = datetime.fromisoformat(ended) if 'T' in ended else datetime.now()

            duration = int((ended - started).total_seconds())
        else:
            duration = 0

        conn = self.database.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO conversation_history
            (id, user_id, session_id, language, title, messages, message_count, duration_seconds, ended_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (conv_id, user_id, session_id, language, title, json.dumps(messages, default=str),
              len(messages), duration))

        conn.commit()
        conn.close()

        return conv_id

    def get_conversation_history(self, user_id: str, language: str = None, limit: int = 20) -> List[Dict]:
        """Get conversation history"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM conversation_history WHERE user_id = ?"
        params = [user_id]

        if language:
            query += " AND language = ?"
            params.append(language)

        query += " ORDER BY started_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        history = [dict(row) for row in cursor.fetchall()]

        # Parse messages JSON
        for conv in history:
            if conv.get('messages'):
                try:
                    conv['messages'] = json.loads(conv['messages'])
                except:
                    conv['messages'] = []

        conn.close()
        return history

    # Study Notes
    def create_note(self, user_id: str, title: str, content: str,
                   language: str = None, topic: str = None, tags: List[str] = None) -> str:
        """Create a study note"""
        note_id = str(uuid.uuid4())

        conn = self.database.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO study_notes
            (id, user_id, language, topic, title, content, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (note_id, user_id, language, topic, title, content, json.dumps(tags or [])))

        conn.commit()
        conn.close()

        return note_id

    def get_user_notes(self, user_id: str, language: str = None) -> List[Dict]:
        """Get user's study notes"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM study_notes WHERE user_id = ?"
        params = [user_id]

        if language:
            query += " AND language = ?"
            params.append(language)

        query += " ORDER BY updated_at DESC"

        cursor.execute(query, params)
        notes = [dict(row) for row in cursor.fetchall()]

        # Parse tags
        for note in notes:
            if note.get('tags'):
                try:
                    note['tags'] = json.loads(note['tags'])
                except:
                    note['tags'] = []

        conn.close()
        return notes

    def update_note(self, note_id: str, title: str = None, content: str = None,
                   tags: List[str] = None):
        """Update a study note"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        updates = []
        params = []

        if title is not None:
            updates.append("title = ?")
            params.append(title)

        if content is not None:
            updates.append("content = ?")
            params.append(content)

        if tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(tags))

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(note_id)

            cursor.execute(f"""
                UPDATE study_notes SET {', '.join(updates)} WHERE id = ?
            """, params)

            conn.commit()

        conn.close()

    def delete_note(self, note_id: str):
        """Delete a study note"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM study_notes WHERE id = ?", (note_id,))

        conn.commit()
        conn.close()

    # Quick Phrases
    def get_quick_phrases(self, language: str, category: str = None) -> List[Dict]:
        """Get quick phrases"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM quick_phrases WHERE (language = ? OR language = 'general')"
        params = [language]

        if category:
            query += " AND category = ?"
            params.append(category)

        query += " ORDER BY usage_count DESC, category, phrase"

        cursor.execute(query, params)
        phrases = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return phrases

    def use_quick_phrase(self, phrase_id: str):
        """Increment usage count for a quick phrase"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE quick_phrases SET usage_count = usage_count + 1 WHERE id = ?
        """, (phrase_id,))

        conn.commit()
        conn.close()

    # Export functionality
    def export_user_data(self, user_id: str) -> Dict:
        """Export all user data"""
        data = {
            "export_date": datetime.now().isoformat(),
            "user_id": user_id,
            "progress": self.database.get_user_progress(user_id),
            "achievements": self.database.get_user_achievements(user_id),
            "goals": self.get_user_goals(user_id, active_only=False),
            "conversation_history": self.get_conversation_history(user_id, limit=100),
            "study_notes": self.get_user_notes(user_id),
            "vocabulary": [],
            "analytics": self.database.get_analytics(user_id, days=365)
        }

        # Get vocabulary
        conn = self.database.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM vocabulary_items WHERE user_id = ?", (user_id,))
        data["vocabulary"] = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return data
