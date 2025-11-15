import sqlite3
from datetime import datetime, timedelta
import json
from typing import Optional, Dict, List
import hashlib
import uuid


class Database:
    """Database manager for user profiles, progress, and analytics"""

    def __init__(self, db_path: str = "learno.db"):
        self.db_path = db_path
        self.init_database()

    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_database(self):
        """Initialize database tables"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                preferences TEXT,
                profile_data TEXT
            )
        """)

        # Learning sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS learning_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT NOT NULL,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP,
                duration_seconds INTEGER,
                message_count INTEGER DEFAULT 0,
                words_practiced INTEGER DEFAULT 0,
                corrections_count INTEGER DEFAULT 0,
                difficulty_level TEXT DEFAULT 'beginner',
                session_data TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # User progress table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT NOT NULL,
                current_level TEXT DEFAULT 'beginner',
                total_time_minutes INTEGER DEFAULT 0,
                total_messages INTEGER DEFAULT 0,
                total_corrections INTEGER DEFAULT 0,
                vocabulary_learned INTEGER DEFAULT 0,
                streak_days INTEGER DEFAULT 0,
                last_practice_date DATE,
                experience_points INTEGER DEFAULT 0,
                achievements TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, language)
            )
        """)

        # Vocabulary tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vocabulary_items (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT NOT NULL,
                word TEXT NOT NULL,
                translation TEXT,
                context TEXT,
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_reviewed TIMESTAMP,
                review_count INTEGER DEFAULT 0,
                confidence_level INTEGER DEFAULT 0,
                next_review_date DATE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Mistakes tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mistakes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT NOT NULL,
                mistake_type TEXT,
                original_text TEXT,
                corrected_text TEXT,
                explanation TEXT,
                occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed BOOLEAN DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Achievements table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS achievements (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                category TEXT,
                requirement_type TEXT,
                requirement_value INTEGER,
                icon TEXT,
                points INTEGER DEFAULT 0
            )
        """)

        # User achievements
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_achievements (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                achievement_id TEXT NOT NULL,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (achievement_id) REFERENCES achievements(id),
                UNIQUE(user_id, achievement_id)
            )
        """)

        # Learning goals
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS learning_goals (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT NOT NULL,
                goal_type TEXT,
                target_value INTEGER,
                current_value INTEGER DEFAULT 0,
                deadline DATE,
                completed BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Daily streaks
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_activity (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                date DATE NOT NULL,
                minutes_practiced INTEGER DEFAULT 0,
                messages_sent INTEGER DEFAULT 0,
                languages_practiced TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, date)
            )
        """)

        conn.commit()
        conn.close()

        # Initialize default achievements
        self.init_achievements()

    def init_achievements(self):
        """Initialize default achievements"""
        achievements = [
            {
                "id": "first_conversation",
                "name": "First Steps",
                "description": "Complete your first conversation",
                "category": "milestone",
                "requirement_type": "messages",
                "requirement_value": 1,
                "icon": "🎯",
                "points": 10
            },
            {
                "id": "chat_master",
                "name": "Chat Master",
                "description": "Send 100 messages",
                "category": "milestone",
                "requirement_type": "messages",
                "requirement_value": 100,
                "icon": "💬",
                "points": 50
            },
            {
                "id": "week_warrior",
                "name": "Week Warrior",
                "description": "Practice for 7 days in a row",
                "category": "streak",
                "requirement_type": "streak_days",
                "requirement_value": 7,
                "icon": "🔥",
                "points": 100
            },
            {
                "id": "polyglot",
                "name": "Polyglot",
                "description": "Practice 3 different languages",
                "category": "diversity",
                "requirement_type": "languages",
                "requirement_value": 3,
                "icon": "🌍",
                "points": 75
            },
            {
                "id": "perfectionist",
                "name": "Perfectionist",
                "description": "Get 10 messages with no corrections",
                "category": "accuracy",
                "requirement_type": "perfect_messages",
                "requirement_value": 10,
                "icon": "⭐",
                "points": 60
            },
            {
                "id": "vocabulary_builder",
                "name": "Vocabulary Builder",
                "description": "Learn 50 new words",
                "category": "learning",
                "requirement_type": "vocabulary",
                "requirement_value": 50,
                "icon": "📚",
                "points": 80
            },
            {
                "id": "dedicated_learner",
                "name": "Dedicated Learner",
                "description": "Practice for 10 hours total",
                "category": "time",
                "requirement_type": "total_minutes",
                "requirement_value": 600,
                "icon": "⏰",
                "points": 120
            }
        ]

        conn = self.get_connection()
        cursor = conn.cursor()

        for achievement in achievements:
            cursor.execute("""
                INSERT OR IGNORE INTO achievements
                (id, name, description, category, requirement_type, requirement_value, icon, points)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                achievement["id"],
                achievement["name"],
                achievement["description"],
                achievement["category"],
                achievement["requirement_type"],
                achievement["requirement_value"],
                achievement["icon"],
                achievement["points"]
            ))

        conn.commit()
        conn.close()

    def create_user(self, username: str, email: Optional[str] = None, password: Optional[str] = None) -> str:
        """Create a new user"""
        user_id = str(uuid.uuid4())
        password_hash = hashlib.sha256(password.encode()).hexdigest() if password else None

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO users (id, username, email, password_hash, preferences, profile_data)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            username,
            email,
            password_hash,
            json.dumps({"theme": "default", "notifications": True}),
            json.dumps({"avatar": "👤", "bio": ""})
        ))

        conn.commit()
        conn.close()

        return user_id

    def get_user(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return dict(row)
        return None

    def get_or_create_user(self, username: str) -> str:
        """Get existing user or create new one"""
        user = self.get_user(username)
        if user:
            return user['id']
        return self.create_user(username)

    def update_last_login(self, user_id: str):
        """Update user's last login time"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
        """, (user_id,))

        conn.commit()
        conn.close()

    def start_session(self, user_id: str, language: str, difficulty: str = "beginner") -> str:
        """Start a new learning session"""
        session_id = str(uuid.uuid4())

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO learning_sessions
            (id, user_id, language, difficulty_level, session_data)
            VALUES (?, ?, ?, ?, ?)
        """, (session_id, user_id, language, difficulty, json.dumps({})))

        conn.commit()
        conn.close()

        # Update daily activity
        self.record_daily_activity(user_id, language)

        return session_id

    def end_session(self, session_id: str, stats: Dict):
        """End a learning session and update stats"""
        conn = self.get_connection()
        cursor = conn.cursor()

        duration = stats.get('duration_seconds', 0)
        message_count = stats.get('message_count', 0)
        corrections = stats.get('corrections_count', 0)

        cursor.execute("""
            UPDATE learning_sessions
            SET ended_at = CURRENT_TIMESTAMP,
                duration_seconds = ?,
                message_count = ?,
                corrections_count = ?,
                words_practiced = ?
            WHERE id = ?
        """, (duration, message_count, corrections, stats.get('words_practiced', 0), session_id))

        # Get session info
        cursor.execute("SELECT user_id, language FROM learning_sessions WHERE id = ?", (session_id,))
        session = cursor.fetchone()

        if session:
            user_id = session['user_id']
            language = session['language']

            # Update user progress
            self.update_progress(user_id, language, {
                'time_minutes': duration // 60,
                'messages': message_count,
                'corrections': corrections
            })

            # Update daily activity
            self.update_daily_activity(user_id, duration // 60, message_count)

        conn.commit()
        conn.close()

    def update_progress(self, user_id: str, language: str, stats: Dict):
        """Update user progress for a language"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Get or create progress record
        cursor.execute("""
            INSERT OR IGNORE INTO user_progress (id, user_id, language)
            VALUES (?, ?, ?)
        """, (str(uuid.uuid4()), user_id, language))

        # Update progress
        cursor.execute("""
            UPDATE user_progress
            SET total_time_minutes = total_time_minutes + ?,
                total_messages = total_messages + ?,
                total_corrections = total_corrections + ?,
                experience_points = experience_points + ?,
                last_practice_date = DATE('now')
            WHERE user_id = ? AND language = ?
        """, (
            stats.get('time_minutes', 0),
            stats.get('messages', 0),
            stats.get('corrections', 0),
            stats.get('messages', 0) * 5,  # 5 XP per message
            user_id,
            language
        ))

        # Update streak
        self.update_streak(user_id)

        # Check for achievements
        self.check_achievements(user_id)

        conn.commit()
        conn.close()

    def update_streak(self, user_id: str):
        """Update user's streak days"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Get last practice date
        cursor.execute("""
            SELECT last_practice_date FROM user_progress
            WHERE user_id = ? ORDER BY last_practice_date DESC LIMIT 1
        """, (user_id,))

        row = cursor.fetchone()
        if not row:
            return

        last_date = row['last_practice_date']
        today = datetime.now().date()

        # Check if practiced today
        if last_date:
            last_date = datetime.strptime(last_date, '%Y-%m-%d').date()
            days_diff = (today - last_date).days

            if days_diff == 0:
                # Already practiced today
                pass
            elif days_diff == 1:
                # Increment streak
                cursor.execute("""
                    UPDATE user_progress
                    SET streak_days = streak_days + 1
                    WHERE user_id = ?
                """, (user_id,))
            else:
                # Streak broken, reset to 1
                cursor.execute("""
                    UPDATE user_progress
                    SET streak_days = 1
                    WHERE user_id = ?
                """, (user_id,))

        conn.commit()
        conn.close()

    def record_daily_activity(self, user_id: str, language: str):
        """Record daily activity for a user"""
        today = datetime.now().date().isoformat()
        activity_id = str(uuid.uuid4())

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT OR IGNORE INTO daily_activity (id, user_id, date, languages_practiced)
            VALUES (?, ?, ?, ?)
        """, (activity_id, user_id, today, json.dumps([language])))

        # Update languages if exists
        cursor.execute("""
            SELECT languages_practiced FROM daily_activity
            WHERE user_id = ? AND date = ?
        """, (user_id, today))

        row = cursor.fetchone()
        if row:
            languages = json.loads(row['languages_practiced'])
            if language not in languages:
                languages.append(language)
                cursor.execute("""
                    UPDATE daily_activity
                    SET languages_practiced = ?
                    WHERE user_id = ? AND date = ?
                """, (json.dumps(languages), user_id, today))

        conn.commit()
        conn.close()

    def update_daily_activity(self, user_id: str, minutes: int, messages: int):
        """Update daily activity stats"""
        today = datetime.now().date().isoformat()

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE daily_activity
            SET minutes_practiced = minutes_practiced + ?,
                messages_sent = messages_sent + ?
            WHERE user_id = ? AND date = ?
        """, (minutes, messages, user_id, today))

        conn.commit()
        conn.close()

    def add_vocabulary(self, user_id: str, language: str, word: str, translation: str, context: str):
        """Add a vocabulary item"""
        vocab_id = str(uuid.uuid4())
        next_review = (datetime.now() + timedelta(days=1)).date().isoformat()

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT OR IGNORE INTO vocabulary_items
            (id, user_id, language, word, translation, context, next_review_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (vocab_id, user_id, language, word, translation, context, next_review))

        conn.commit()
        conn.close()

    def add_mistake(self, user_id: str, language: str, mistake_type: str,
                    original: str, corrected: str, explanation: str):
        """Record a mistake for learning"""
        mistake_id = str(uuid.uuid4())

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO mistakes
            (id, user_id, language, mistake_type, original_text, corrected_text, explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (mistake_id, user_id, language, mistake_type, original, corrected, explanation))

        conn.commit()
        conn.close()

    def get_user_progress(self, user_id: str, language: Optional[str] = None) -> List[Dict]:
        """Get user progress"""
        conn = self.get_connection()
        cursor = conn.cursor()

        if language:
            cursor.execute("""
                SELECT * FROM user_progress WHERE user_id = ? AND language = ?
            """, (user_id, language))
        else:
            cursor.execute("SELECT * FROM user_progress WHERE user_id = ?", (user_id,))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def get_vocabulary_for_review(self, user_id: str, language: str, limit: int = 10) -> List[Dict]:
        """Get vocabulary items due for review"""
        today = datetime.now().date().isoformat()

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM vocabulary_items
            WHERE user_id = ? AND language = ? AND next_review_date <= ?
            ORDER BY next_review_date ASC
            LIMIT ?
        """, (user_id, language, today, limit))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def get_recent_mistakes(self, user_id: str, language: str, limit: int = 10) -> List[Dict]:
        """Get recent mistakes for review"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM mistakes
            WHERE user_id = ? AND language = ? AND reviewed = 0
            ORDER BY occurred_at DESC
            LIMIT ?
        """, (user_id, language, limit))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def check_achievements(self, user_id: str) -> List[Dict]:
        """Check and award achievements"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Get user stats
        cursor.execute("""
            SELECT
                SUM(total_messages) as total_messages,
                SUM(total_time_minutes) as total_minutes,
                MAX(streak_days) as max_streak,
                SUM(vocabulary_learned) as total_vocab,
                COUNT(DISTINCT language) as languages_count
            FROM user_progress
            WHERE user_id = ?
        """, (user_id,))

        stats = dict(cursor.fetchone())

        # Get all achievements
        cursor.execute("SELECT * FROM achievements")
        achievements = [dict(row) for row in cursor.fetchall()]

        newly_earned = []

        for achievement in achievements:
            # Check if already earned
            cursor.execute("""
                SELECT id FROM user_achievements
                WHERE user_id = ? AND achievement_id = ?
            """, (user_id, achievement['id']))

            if cursor.fetchone():
                continue

            # Check if requirements met
            req_type = achievement['requirement_type']
            req_value = achievement['requirement_value']
            earned = False

            if req_type == 'messages' and stats['total_messages'] and stats['total_messages'] >= req_value:
                earned = True
            elif req_type == 'total_minutes' and stats['total_minutes'] and stats['total_minutes'] >= req_value:
                earned = True
            elif req_type == 'streak_days' and stats['max_streak'] and stats['max_streak'] >= req_value:
                earned = True
            elif req_type == 'vocabulary' and stats['total_vocab'] and stats['total_vocab'] >= req_value:
                earned = True
            elif req_type == 'languages' and stats['languages_count'] and stats['languages_count'] >= req_value:
                earned = True

            if earned:
                # Award achievement
                cursor.execute("""
                    INSERT INTO user_achievements (id, user_id, achievement_id)
                    VALUES (?, ?, ?)
                """, (str(uuid.uuid4()), user_id, achievement['id']))

                newly_earned.append(achievement)

                # Add XP
                cursor.execute("""
                    UPDATE user_progress
                    SET experience_points = experience_points + ?
                    WHERE user_id = ?
                """, (achievement['points'], user_id))

        conn.commit()
        conn.close()

        return newly_earned

    def get_user_achievements(self, user_id: str) -> List[Dict]:
        """Get all user achievements"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT a.*, ua.earned_at
            FROM achievements a
            JOIN user_achievements ua ON a.id = ua.achievement_id
            WHERE ua.user_id = ?
            ORDER BY ua.earned_at DESC
        """, (user_id,))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def get_leaderboard(self, language: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Get leaderboard"""
        conn = self.get_connection()
        cursor = conn.cursor()

        if language:
            cursor.execute("""
                SELECT u.username, up.language, up.experience_points, up.streak_days, up.total_messages
                FROM user_progress up
                JOIN users u ON up.user_id = u.id
                WHERE up.language = ?
                ORDER BY up.experience_points DESC
                LIMIT ?
            """, (language, limit))
        else:
            cursor.execute("""
                SELECT u.username, SUM(up.experience_points) as total_xp,
                       MAX(up.streak_days) as max_streak, SUM(up.total_messages) as total_messages
                FROM user_progress up
                JOIN users u ON up.user_id = u.id
                GROUP BY u.id
                ORDER BY total_xp DESC
                LIMIT ?
            """, (limit,))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def get_analytics(self, user_id: str, days: int = 30) -> Dict:
        """Get user analytics for the past N days"""
        conn = self.get_connection()
        cursor = conn.cursor()

        start_date = (datetime.now() - timedelta(days=days)).date().isoformat()

        # Daily activity
        cursor.execute("""
            SELECT date, minutes_practiced, messages_sent, languages_practiced
            FROM daily_activity
            WHERE user_id = ? AND date >= ?
            ORDER BY date ASC
        """, (user_id, start_date))

        daily_activity = [dict(row) for row in cursor.fetchall()]

        # Overall progress
        cursor.execute("""
            SELECT * FROM user_progress WHERE user_id = ?
        """, (user_id,))

        progress = [dict(row) for row in cursor.fetchall()]

        # Recent sessions
        cursor.execute("""
            SELECT * FROM learning_sessions
            WHERE user_id = ? AND started_at >= datetime('now', '-{} days')
            ORDER BY started_at DESC
        """.format(days), (user_id,))

        sessions = [dict(row) for row in cursor.fetchall()]

        conn.close()

        return {
            'daily_activity': daily_activity,
            'progress': progress,
            'recent_sessions': sessions
        }
