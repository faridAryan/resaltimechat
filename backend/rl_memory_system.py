import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
from collections import defaultdict, deque

class RLMemorySystem:
    """
    Reinforcement Learning Memory System

    Implements both short-term and long-term memory for personalized learning:
    - Short-term: Recent interactions, session context (decays quickly)
    - Long-term: Learning patterns, preferences, skill progression (persistent)
    - RL: Q-learning based recommendation engine
    """

    def __init__(self, database):
        self.database = database
        self.init_tables()

        # RL Parameters
        self.learning_rate = 0.1  # How quickly we learn
        self.discount_factor = 0.95  # Future reward importance
        self.epsilon = 0.2  # Exploration rate

        # Memory decay rates (in days)
        self.short_term_decay = 1  # 1 day
        self.long_term_decay = 90  # 90 days

    def init_tables(self):
        """Initialize tables for RL and memory systems"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        # Short-term memory: Recent interactions and context
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS short_term_memory (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            session_id TEXT,
            language TEXT,
            memory_type TEXT,
            content TEXT,
            context TEXT,
            importance_score REAL DEFAULT 0.5,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')

        # Long-term memory: Persistent patterns and preferences
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS long_term_memory (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            language TEXT,
            pattern_type TEXT,
            pattern_data TEXT,
            confidence_score REAL DEFAULT 0.0,
            access_count INTEGER DEFAULT 0,
            last_accessed TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')

        # RL State-Action-Reward history
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS rl_history (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            language TEXT,
            state TEXT,
            action TEXT,
            reward REAL,
            next_state TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')

        # Q-Table for RL (State-Action values)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS q_table (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            language TEXT,
            state_key TEXT,
            action_key TEXT,
            q_value REAL DEFAULT 0.0,
            update_count INTEGER DEFAULT 0,
            last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, language, state_key, action_key)
        )
        ''')

        # User interaction patterns
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS interaction_patterns (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            language TEXT,
            pattern_category TEXT,
            pattern_name TEXT,
            pattern_value TEXT,
            strength REAL DEFAULT 0.0,
            sample_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')

        # Personalized recommendations cache
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendations (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            language TEXT,
            recommendation_type TEXT,
            recommendation_data TEXT,
            confidence REAL,
            reason TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')

        conn.commit()
        conn.close()

    # ===================== SHORT-TERM MEMORY =====================

    def add_short_term_memory(self, user_id: str, session_id: str, language: str,
                              memory_type: str, content: str, context: Dict = None,
                              importance: float = 0.5, ttl_hours: int = 24) -> str:
        """
        Add to short-term memory with automatic expiration

        Memory types: 'conversation', 'correction', 'topic_interest', 'difficulty_feedback'
        """
        import uuid
        memory_id = f"stm_{uuid.uuid4().hex[:12]}"

        expires_at = (datetime.now() + timedelta(hours=ttl_hours)).isoformat()

        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        cursor.execute('''
        INSERT INTO short_term_memory
        (id, user_id, session_id, language, memory_type, content, context, importance_score, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (memory_id, user_id, session_id, language, memory_type, content,
              json.dumps(context or {}), importance, expires_at))

        conn.commit()
        conn.close()

        return memory_id

    def get_short_term_memory(self, user_id: str, language: str = None,
                             memory_type: str = None, limit: int = 50) -> List[Dict]:
        """Retrieve recent short-term memories (auto-removes expired)"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        # Remove expired memories
        cursor.execute('DELETE FROM short_term_memory WHERE expires_at < ?',
                      (datetime.now().isoformat(),))

        query = '''
        SELECT * FROM short_term_memory
        WHERE user_id = ? AND expires_at > ?
        '''
        params = [user_id, datetime.now().isoformat()]

        if language:
            query += ' AND language = ?'
            params.append(language)

        if memory_type:
            query += ' AND memory_type = ?'
            params.append(memory_type)

        query += ' ORDER BY importance_score DESC, created_at DESC LIMIT ?'
        params.append(limit)

        cursor.execute(query, params)
        columns = [desc[0] for desc in cursor.description]
        memories = []

        for row in cursor.fetchall():
            memory = dict(zip(columns, row))
            memory['context'] = json.loads(memory['context'])
            memories.append(memory)

        conn.commit()
        conn.close()

        return memories

    def get_session_context(self, user_id: str, session_id: str) -> Dict:
        """Get all short-term context for current session"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        cursor.execute('''
        SELECT memory_type, content, context, importance_score
        FROM short_term_memory
        WHERE user_id = ? AND session_id = ? AND expires_at > ?
        ORDER BY created_at ASC
        ''', (user_id, session_id, datetime.now().isoformat()))

        context = {
            'recent_topics': [],
            'corrections': [],
            'interests': [],
            'difficulty_feedback': []
        }

        for row in cursor.fetchall():
            memory_type, content, ctx, importance = row

            if memory_type == 'topic_interest':
                context['recent_topics'].append(content)
            elif memory_type == 'correction':
                context['corrections'].append({'content': content, 'context': json.loads(ctx)})
            elif memory_type == 'conversation':
                context['interests'].append(content)
            elif memory_type == 'difficulty_feedback':
                context['difficulty_feedback'].append({'content': content, 'importance': importance})

        conn.close()
        return context

    # ===================== LONG-TERM MEMORY =====================

    def update_long_term_pattern(self, user_id: str, language: str,
                                 pattern_type: str, pattern_data: Dict,
                                 confidence: float = None) -> str:
        """
        Update or create long-term memory pattern

        Pattern types: 'topic_preference', 'learning_style', 'skill_progression',
                      'time_preference', 'difficulty_comfort', 'error_patterns'
        """
        import uuid

        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        # Check if pattern exists
        cursor.execute('''
        SELECT id, confidence_score, access_count FROM long_term_memory
        WHERE user_id = ? AND language = ? AND pattern_type = ?
        ''', (user_id, language, pattern_type))

        existing = cursor.fetchone()

        if existing:
            # Update existing pattern
            pattern_id, old_confidence, access_count = existing

            # Blend old and new confidence (running average)
            if confidence is not None:
                new_confidence = (old_confidence * access_count + confidence) / (access_count + 1)
            else:
                new_confidence = old_confidence

            cursor.execute('''
            UPDATE long_term_memory
            SET pattern_data = ?, confidence_score = ?, access_count = ?,
                last_accessed = ?, updated_at = ?
            WHERE id = ?
            ''', (json.dumps(pattern_data), new_confidence, access_count + 1,
                  datetime.now().isoformat(), datetime.now().isoformat(), pattern_id))
        else:
            # Create new pattern
            pattern_id = f"ltm_{uuid.uuid4().hex[:12]}"

            cursor.execute('''
            INSERT INTO long_term_memory
            (id, user_id, language, pattern_type, pattern_data, confidence_score)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (pattern_id, user_id, language, pattern_type, json.dumps(pattern_data),
                  confidence or 0.5))

        conn.commit()
        conn.close()

        return pattern_id

    def get_long_term_patterns(self, user_id: str, language: str = None,
                               pattern_type: str = None) -> List[Dict]:
        """Retrieve long-term memory patterns"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        query = 'SELECT * FROM long_term_memory WHERE user_id = ?'
        params = [user_id]

        if language:
            query += ' AND language = ?'
            params.append(language)

        if pattern_type:
            query += ' AND pattern_type = ?'
            params.append(pattern_type)

        query += ' ORDER BY confidence_score DESC, access_count DESC'

        cursor.execute(query, params)
        columns = [desc[0] for desc in cursor.description]
        patterns = []

        for row in cursor.fetchall():
            pattern = dict(zip(columns, row))
            pattern['pattern_data'] = json.loads(pattern['pattern_data'])
            patterns.append(pattern)

        conn.close()
        return patterns

    def learn_from_interaction(self, user_id: str, language: str, interaction_data: Dict):
        """
        Learn patterns from user interaction

        Analyzes interaction and updates long-term memory patterns
        """
        # Extract patterns from interaction
        if 'topics' in interaction_data:
            # Update topic preferences
            topic_prefs = self.get_long_term_patterns(user_id, language, 'topic_preference')
            current_topics = topic_prefs[0]['pattern_data'] if topic_prefs else {}

            for topic in interaction_data['topics']:
                current_topics[topic] = current_topics.get(topic, 0) + 1

            self.update_long_term_pattern(user_id, language, 'topic_preference',
                                         current_topics, confidence=0.8)

        if 'difficulty_response' in interaction_data:
            # Track difficulty comfort zones
            diff_data = interaction_data['difficulty_response']
            self.update_long_term_pattern(user_id, language, 'difficulty_comfort',
                                         diff_data, confidence=0.7)

        if 'learning_time' in interaction_data:
            # Track preferred practice times
            hour = datetime.now().hour
            time_prefs = self.get_long_term_patterns(user_id, language, 'time_preference')
            current_times = time_prefs[0]['pattern_data'] if time_prefs else {}

            time_slot = f"{hour:02d}:00"
            current_times[time_slot] = current_times.get(time_slot, 0) + 1

            self.update_long_term_pattern(user_id, language, 'time_preference',
                                         current_times, confidence=0.6)

        if 'errors' in interaction_data:
            # Track common error patterns
            error_patterns = self.get_long_term_patterns(user_id, language, 'error_patterns')
            current_errors = error_patterns[0]['pattern_data'] if error_patterns else {}

            for error_type in interaction_data['errors']:
                current_errors[error_type] = current_errors.get(error_type, 0) + 1

            self.update_long_term_pattern(user_id, language, 'error_patterns',
                                         current_errors, confidence=0.85)

    # ===================== REINFORCEMENT LEARNING =====================

    def get_state_representation(self, user_id: str, language: str) -> str:
        """
        Create state representation from user's current situation

        State includes: proficiency level, recent performance, preferences
        """
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        # Get user progress
        cursor.execute('''
        SELECT current_level, total_xp, current_streak
        FROM user_progress WHERE user_id = ? AND language = ?
        ''', (user_id, language))

        progress = cursor.fetchone()
        if not progress:
            state = {'level': 'beginner', 'xp_bracket': '0-100', 'streak_bracket': '0'}
        else:
            level, xp, streak = progress
            xp_bracket = f"{(xp // 100) * 100}-{((xp // 100) + 1) * 100}"
            streak_bracket = f"{(streak // 7) * 7}"
            state = {'level': level, 'xp_bracket': xp_bracket, 'streak_bracket': streak_bracket}

        # Get recent performance
        recent_memories = self.get_short_term_memory(user_id, language, limit=10)
        avg_importance = np.mean([m['importance_score'] for m in recent_memories]) if recent_memories else 0.5

        state['performance'] = 'high' if avg_importance > 0.7 else 'medium' if avg_importance > 0.4 else 'low'

        conn.close()

        # Convert to string key
        state_key = f"{state['level']}_{state['performance']}_{state['streak_bracket'][:1]}"
        return state_key

    def get_q_value(self, user_id: str, language: str, state_key: str, action_key: str) -> float:
        """Get Q-value for state-action pair"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        cursor.execute('''
        SELECT q_value FROM q_table
        WHERE user_id = ? AND language = ? AND state_key = ? AND action_key = ?
        ''', (user_id, language, state_key, action_key))

        result = cursor.fetchone()
        conn.close()

        return result[0] if result else 0.0

    def update_q_value(self, user_id: str, language: str, state_key: str,
                      action_key: str, reward: float, next_state_key: str):
        """Update Q-value using Q-learning algorithm"""
        import uuid

        # Get current Q-value
        current_q = self.get_q_value(user_id, language, state_key, action_key)

        # Get max Q-value for next state
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        cursor.execute('''
        SELECT MAX(q_value) FROM q_table
        WHERE user_id = ? AND language = ? AND state_key = ?
        ''', (user_id, language, next_state_key))

        max_next_q = cursor.fetchone()[0] or 0.0

        # Q-learning update: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
        new_q = current_q + self.learning_rate * (reward + self.discount_factor * max_next_q - current_q)

        # Update or insert
        cursor.execute('''
        INSERT INTO q_table (id, user_id, language, state_key, action_key, q_value, update_count)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(user_id, language, state_key, action_key)
        DO UPDATE SET q_value = ?, update_count = update_count + 1, last_updated = ?
        ''', (f"q_{uuid.uuid4().hex[:12]}", user_id, language, state_key, action_key, new_q,
              new_q, datetime.now().isoformat()))

        # Log to RL history
        cursor.execute('''
        INSERT INTO rl_history (id, user_id, language, state, action, reward, next_state)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (f"rl_{uuid.uuid4().hex[:12]}", user_id, language, state_key, action_key, reward, next_state_key))

        conn.commit()
        conn.close()

    def recommend_action(self, user_id: str, language: str, possible_actions: List[str]) -> Tuple[str, float]:
        """
        Recommend best action using ε-greedy policy

        Returns: (action, confidence)
        """
        state = self.get_state_representation(user_id, language)

        # Exploration vs Exploitation
        if np.random.random() < self.epsilon:
            # Explore: random action
            action = np.random.choice(possible_actions)
            confidence = 0.5
        else:
            # Exploit: best known action
            q_values = {action: self.get_q_value(user_id, language, state, action)
                       for action in possible_actions}

            action = max(q_values, key=q_values.get)
            confidence = min(1.0, (q_values[action] + 5) / 10)  # Normalize to 0-1

        return action, confidence

    def record_feedback(self, user_id: str, language: str, action: str, reward: float):
        """Record user feedback and update RL model"""
        current_state = self.get_state_representation(user_id, language)

        # Simulate next state (would be actual next state in real scenario)
        next_state = current_state

        # Update Q-table
        self.update_q_value(user_id, language, current_state, action, reward, next_state)

    # ===================== PERSONALIZATION ENGINE =====================

    def generate_personalized_recommendations(self, user_id: str, language: str) -> Dict:
        """
        Generate comprehensive personalized recommendations

        Uses both short-term and long-term memory + RL
        """
        recommendations = {
            'topics': [],
            'difficulty': None,
            'practice_time': None,
            'focus_areas': [],
            'content_types': []
        }

        # Get long-term patterns
        topic_prefs = self.get_long_term_patterns(user_id, language, 'topic_preference')
        error_patterns = self.get_long_term_patterns(user_id, language, 'error_patterns')
        time_prefs = self.get_long_term_patterns(user_id, language, 'time_preference')

        # Recommend topics based on preferences
        if topic_prefs:
            topics = topic_prefs[0]['pattern_data']
            sorted_topics = sorted(topics.items(), key=lambda x: x[1], reverse=True)
            recommendations['topics'] = [t[0] for t in sorted_topics[:5]]

        # Recommend practice time
        if time_prefs:
            times = time_prefs[0]['pattern_data']
            best_time = max(times.items(), key=lambda x: x[1])[0]
            recommendations['practice_time'] = best_time

        # Recommend focus areas based on errors
        if error_patterns:
            errors = error_patterns[0]['pattern_data']
            sorted_errors = sorted(errors.items(), key=lambda x: x[1], reverse=True)
            recommendations['focus_areas'] = [e[0] for e in sorted_errors[:3]]

        # Use RL to recommend content types
        content_types = ['conversation', 'reading', 'vocabulary', 'grammar', 'listening']
        recommended_content, confidence = self.recommend_action(user_id, language, content_types)
        recommendations['content_types'] = [recommended_content]
        recommendations['confidence'] = confidence

        # Use RL to recommend difficulty
        difficulties = ['beginner', 'intermediate', 'advanced']
        recommended_diff, diff_confidence = self.recommend_action(user_id, language, difficulties)
        recommendations['difficulty'] = recommended_diff

        return recommendations

    def get_memory_summary(self, user_id: str, language: str) -> Dict:
        """Get comprehensive memory summary for user"""
        short_term = self.get_short_term_memory(user_id, language)
        long_term = self.get_long_term_patterns(user_id, language)

        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        # Count RL updates
        cursor.execute('''
        SELECT COUNT(*), AVG(q_value) FROM q_table
        WHERE user_id = ? AND language = ?
        ''', (user_id, language))

        q_stats = cursor.fetchone()
        conn.close()

        return {
            'short_term_memories': len(short_term),
            'long_term_patterns': len(long_term),
            'rl_actions_learned': q_stats[0] or 0,
            'avg_q_value': round(q_stats[1], 2) if q_stats[1] else 0.0,
            'patterns': {p['pattern_type']: p['confidence_score'] for p in long_term}
        }
