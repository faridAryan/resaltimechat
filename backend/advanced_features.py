import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import random

class AdvancedFeatures:
    def __init__(self, database):
        self.database = database
        self.init_tables()
        self.init_sample_data()

    def init_tables(self):
        """Initialize tables for advanced features"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        # Vocabulary exercises table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS vocabulary_exercises (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            language TEXT,
            word TEXT,
            translation TEXT,
            exercise_type TEXT,
            correct INTEGER DEFAULT 0,
            attempts INTEGER DEFAULT 0,
            last_practiced TEXT,
            next_review TEXT,
            proficiency_level INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')

        # Grammar tips table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS grammar_tips (
            id TEXT PRIMARY KEY,
            language TEXT,
            topic TEXT,
            title TEXT,
            explanation TEXT,
            examples TEXT,
            difficulty_level TEXT,
            category TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        ''')

        # Custom topics table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS custom_topics (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            language TEXT,
            title TEXT,
            description TEXT,
            keywords TEXT,
            context TEXT,
            vocabulary TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')

        # Reading materials table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS reading_materials (
            id TEXT PRIMARY KEY,
            language TEXT,
            title TEXT,
            content TEXT,
            difficulty_level TEXT,
            category TEXT,
            word_count INTEGER,
            estimated_time INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        ''')

        # Reading progress table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS reading_progress (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            material_id TEXT,
            completed INTEGER DEFAULT 0,
            comprehension_score INTEGER,
            time_spent INTEGER,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (material_id) REFERENCES reading_materials(id)
        )
        ''')

        # Practice streaks calendar table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS practice_calendar (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            date TEXT,
            language TEXT,
            practice_time INTEGER,
            messages_sent INTEGER,
            activities TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')

        conn.commit()
        conn.close()

    def init_sample_data(self):
        """Initialize sample grammar tips and reading materials"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        # Check if grammar tips exist
        cursor.execute('SELECT COUNT(*) FROM grammar_tips')
        if cursor.fetchone()[0] == 0:
            grammar_tips = [
                {
                    'id': 'tip_present_simple',
                    'language': 'general',
                    'topic': 'Present Simple',
                    'title': 'When to Use Present Simple',
                    'explanation': 'Use present simple for habits, routines, facts, and permanent situations.',
                    'examples': json.dumps([
                        'I work every day.',
                        'The sun rises in the east.',
                        'She speaks three languages.'
                    ]),
                    'difficulty_level': 'beginner',
                    'category': 'tenses'
                },
                {
                    'id': 'tip_articles',
                    'language': 'general',
                    'topic': 'Articles',
                    'title': 'Using A, An, and The',
                    'explanation': 'Use "a" before consonant sounds, "an" before vowel sounds, and "the" for specific things.',
                    'examples': json.dumps([
                        'I saw a dog. (any dog)',
                        'I saw an apple. (any apple)',
                        'I saw the dog. (specific dog we know)'
                    ]),
                    'difficulty_level': 'beginner',
                    'category': 'grammar'
                },
                {
                    'id': 'tip_past_continuous',
                    'language': 'general',
                    'topic': 'Past Continuous',
                    'title': 'When to Use Past Continuous',
                    'explanation': 'Use past continuous for actions in progress at a specific time in the past.',
                    'examples': json.dumps([
                        'I was studying at 8pm yesterday.',
                        'They were playing when it started raining.',
                        'What were you doing at that time?'
                    ]),
                    'difficulty_level': 'intermediate',
                    'category': 'tenses'
                },
                {
                    'id': 'tip_prepositions',
                    'language': 'general',
                    'topic': 'Prepositions of Time',
                    'title': 'At, On, In for Time',
                    'explanation': 'Use "at" for specific times, "on" for days/dates, "in" for months/years/longer periods.',
                    'examples': json.dumps([
                        'at 3pm, at noon, at midnight',
                        'on Monday, on July 4th, on my birthday',
                        'in March, in 2024, in the morning'
                    ]),
                    'difficulty_level': 'intermediate',
                    'category': 'prepositions'
                }
            ]

            for tip in grammar_tips:
                cursor.execute('''
                INSERT INTO grammar_tips (id, language, topic, title, explanation, examples, difficulty_level, category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (tip['id'], tip['language'], tip['topic'], tip['title'],
                     tip['explanation'], tip['examples'], tip['difficulty_level'], tip['category']))

        # Check if reading materials exist
        cursor.execute('SELECT COUNT(*) FROM reading_materials')
        if cursor.fetchone()[0] == 0:
            reading_materials = [
                {
                    'id': 'reading_cafe',
                    'language': 'general',
                    'title': 'A Day at the Café',
                    'content': '''Sarah walked into her favorite café on a sunny morning. The smell of fresh coffee filled the air. She ordered a cappuccino and a croissant. While waiting, she looked around and saw many people working on their laptops. Some were having conversations with friends. The barista called her name, and she picked up her order. She found a quiet corner by the window and sat down. Outside, people were walking their dogs and children were playing in the park. Sarah opened her book and started reading. It was a perfect morning.''',
                    'difficulty_level': 'beginner',
                    'category': 'daily_life',
                    'word_count': 105,
                    'estimated_time': 3
                },
                {
                    'id': 'reading_travel',
                    'language': 'general',
                    'title': 'An Unexpected Journey',
                    'content': '''Maria had been planning her trip to Japan for months. She carefully researched the best places to visit, learned basic Japanese phrases, and saved money from her part-time job. When the day finally arrived, she felt both excited and nervous. At the airport, she checked in her luggage and went through security. During the long flight, she watched Japanese films and practiced her pronunciation. When she landed in Tokyo, the bustling city immediately captivated her. The neon lights, the efficient subway system, and the respectful culture were everything she had imagined and more. Her adventure had just begun.''',
                    'difficulty_level': 'intermediate',
                    'category': 'travel',
                    'word_count': 118,
                    'estimated_time': 4
                },
                {
                    'id': 'reading_technology',
                    'language': 'general',
                    'title': 'The Future of Communication',
                    'content': '''The rapid advancement of technology has fundamentally transformed the way we communicate. In the past, sending a message across continents could take weeks or even months. Today, we can instantly connect with anyone, anywhere in the world, through various digital platforms. Video calls enable us to see our loved ones in real-time, regardless of physical distance. Social media allows us to share our experiences and thoughts with a global audience. However, this convenience comes with challenges. Many experts argue that excessive screen time can negatively impact our mental health and face-to-face social skills. As we continue to embrace new technologies, finding a balance between digital and personal interaction remains crucial for maintaining meaningful relationships.''',
                    'difficulty_level': 'advanced',
                    'category': 'technology',
                    'word_count': 135,
                    'estimated_time': 5
                }
            ]

            for material in reading_materials:
                cursor.execute('''
                INSERT INTO reading_materials (id, language, title, content, difficulty_level, category, word_count, estimated_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (material['id'], material['language'], material['title'], material['content'],
                     material['difficulty_level'], material['category'], material['word_count'], material['estimated_time']))

        conn.commit()
        conn.close()

    # Vocabulary Trainer Methods
    def create_vocabulary_exercise(self, user_id: str, language: str, word: str,
                                   translation: str, exercise_type: str = 'translation') -> str:
        """Create a new vocabulary exercise"""
        import uuid
        exercise_id = f"vocab_{uuid.uuid4().hex[:12]}"

        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        next_review = (datetime.now() + timedelta(days=1)).isoformat()

        cursor.execute('''
        INSERT INTO vocabulary_exercises (id, user_id, language, word, translation, exercise_type, next_review)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (exercise_id, user_id, language, word, translation, exercise_type, next_review))

        conn.commit()
        conn.close()

        return exercise_id

    def get_vocabulary_exercises(self, user_id: str, language: str, due_only: bool = False) -> List[Dict]:
        """Get vocabulary exercises for a user"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        if due_only:
            cursor.execute('''
            SELECT * FROM vocabulary_exercises
            WHERE user_id = ? AND language = ? AND (next_review IS NULL OR next_review <= ?)
            ORDER BY next_review ASC
            LIMIT 20
            ''', (user_id, language, datetime.now().isoformat()))
        else:
            cursor.execute('''
            SELECT * FROM vocabulary_exercises
            WHERE user_id = ? AND language = ?
            ORDER BY created_at DESC
            ''', (user_id, language))

        columns = [desc[0] for desc in cursor.description]
        exercises = [dict(zip(columns, row)) for row in cursor.fetchall()]

        conn.close()
        return exercises

    def update_vocabulary_progress(self, exercise_id: str, correct: bool) -> Dict:
        """Update vocabulary exercise progress"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM vocabulary_exercises WHERE id = ?', (exercise_id,))
        exercise = cursor.execute('SELECT * FROM vocabulary_exercises WHERE id = ?', (exercise_id,)).fetchone()

        if not exercise:
            conn.close()
            return {'success': False, 'message': 'Exercise not found'}

        columns = [desc[0] for desc in cursor.description]
        exercise_dict = dict(zip(columns, exercise))

        attempts = exercise_dict['attempts'] + 1
        correct_count = exercise_dict['correct'] + (1 if correct else 0)
        proficiency = exercise_dict['proficiency_level']

        # Update proficiency based on performance
        if correct:
            proficiency = min(5, proficiency + 1)
        else:
            proficiency = max(0, proficiency - 1)

        # Calculate next review date using spaced repetition
        intervals = [1, 3, 7, 14, 30]  # days
        interval = intervals[min(proficiency, len(intervals) - 1)]
        next_review = (datetime.now() + timedelta(days=interval)).isoformat()

        cursor.execute('''
        UPDATE vocabulary_exercises
        SET attempts = ?, correct = ?, proficiency_level = ?,
            last_practiced = ?, next_review = ?
        WHERE id = ?
        ''', (attempts, correct_count, proficiency, datetime.now().isoformat(), next_review, exercise_id))

        conn.commit()
        conn.close()

        return {
            'success': True,
            'proficiency_level': proficiency,
            'next_review': next_review,
            'accuracy': round((correct_count / attempts) * 100, 1) if attempts > 0 else 0
        }

    # Grammar Tips Methods
    def get_grammar_tips(self, language: str, difficulty_level: Optional[str] = None,
                        category: Optional[str] = None) -> List[Dict]:
        """Get grammar tips"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        query = 'SELECT * FROM grammar_tips WHERE (language = ? OR language = ?)'
        params = [language, 'general']

        if difficulty_level:
            query += ' AND difficulty_level = ?'
            params.append(difficulty_level)

        if category:
            query += ' AND category = ?'
            params.append(category)

        query += ' ORDER BY difficulty_level, topic'

        cursor.execute(query, params)
        columns = [desc[0] for desc in cursor.description]
        tips = []
        for row in cursor.fetchall():
            tip = dict(zip(columns, row))
            tip['examples'] = json.loads(tip['examples'])
            tips.append(tip)

        conn.close()
        return tips

    def get_random_grammar_tip(self, language: str, difficulty_level: str) -> Optional[Dict]:
        """Get a random grammar tip based on difficulty"""
        tips = self.get_grammar_tips(language, difficulty_level)
        return random.choice(tips) if tips else None

    # Custom Topics Methods
    def create_custom_topic(self, user_id: str, language: str, title: str,
                          description: str, keywords: List[str], context: str = '',
                          vocabulary: List[str] = None) -> str:
        """Create a custom learning topic"""
        import uuid
        topic_id = f"topic_{uuid.uuid4().hex[:12]}"

        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        cursor.execute('''
        INSERT INTO custom_topics (id, user_id, language, title, description, keywords, context, vocabulary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (topic_id, user_id, language, title, description, json.dumps(keywords),
              context, json.dumps(vocabulary or [])))

        conn.commit()
        conn.close()

        return topic_id

    def get_custom_topics(self, user_id: str, language: str) -> List[Dict]:
        """Get user's custom topics"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        cursor.execute('''
        SELECT * FROM custom_topics WHERE user_id = ? AND language = ?
        ORDER BY created_at DESC
        ''', (user_id, language))

        columns = [desc[0] for desc in cursor.description]
        topics = []
        for row in cursor.fetchall():
            topic = dict(zip(columns, row))
            topic['keywords'] = json.loads(topic['keywords'])
            topic['vocabulary'] = json.loads(topic['vocabulary'])
            topics.append(topic)

        conn.close()
        return topics

    # Reading Materials Methods
    def get_reading_materials(self, language: str, difficulty_level: Optional[str] = None) -> List[Dict]:
        """Get reading materials"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        query = 'SELECT * FROM reading_materials WHERE (language = ? OR language = ?)'
        params = [language, 'general']

        if difficulty_level:
            query += ' AND difficulty_level = ?'
            params.append(difficulty_level)

        query += ' ORDER BY difficulty_level, title'

        cursor.execute(query, params)
        columns = [desc[0] for desc in cursor.description]
        materials = [dict(zip(columns, row)) for row in cursor.fetchall()]

        conn.close()
        return materials

    def save_reading_progress(self, user_id: str, material_id: str,
                             completed: bool, comprehension_score: int = None,
                             time_spent: int = None, notes: str = '') -> str:
        """Save reading progress"""
        import uuid
        progress_id = f"rprog_{uuid.uuid4().hex[:12]}"

        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        cursor.execute('''
        INSERT INTO reading_progress (id, user_id, material_id, completed, comprehension_score, time_spent, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (progress_id, user_id, material_id, 1 if completed else 0,
              comprehension_score, time_spent, notes))

        conn.commit()
        conn.close()

        return progress_id

    # Practice Calendar Methods
    def record_practice_activity(self, user_id: str, language: str,
                                practice_time: int, messages_sent: int,
                                activities: List[str]) -> str:
        """Record daily practice activity"""
        import uuid
        activity_id = f"cal_{uuid.uuid4().hex[:12]}"
        today = datetime.now().date().isoformat()

        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        # Check if entry for today exists
        cursor.execute('''
        SELECT id, practice_time, messages_sent, activities
        FROM practice_calendar
        WHERE user_id = ? AND date = ? AND language = ?
        ''', (user_id, today, language))

        existing = cursor.fetchone()

        if existing:
            # Update existing entry
            existing_activities = json.loads(existing[3])
            combined_activities = list(set(existing_activities + activities))

            cursor.execute('''
            UPDATE practice_calendar
            SET practice_time = ?, messages_sent = ?, activities = ?
            WHERE id = ?
            ''', (existing[1] + practice_time, existing[2] + messages_sent,
                  json.dumps(combined_activities), existing[0]))
            activity_id = existing[0]
        else:
            # Create new entry
            cursor.execute('''
            INSERT INTO practice_calendar (id, user_id, date, language, practice_time, messages_sent, activities)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (activity_id, user_id, today, language, practice_time, messages_sent, json.dumps(activities)))

        conn.commit()
        conn.close()

        return activity_id

    def get_practice_calendar(self, user_id: str, language: str, days: int = 90) -> List[Dict]:
        """Get practice calendar for the last N days"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        start_date = (datetime.now() - timedelta(days=days)).date().isoformat()

        cursor.execute('''
        SELECT * FROM practice_calendar
        WHERE user_id = ? AND language = ? AND date >= ?
        ORDER BY date DESC
        ''', (user_id, language, start_date))

        columns = [desc[0] for desc in cursor.description]
        calendar = []
        for row in cursor.fetchall():
            entry = dict(zip(columns, row))
            entry['activities'] = json.loads(entry['activities'])
            calendar.append(entry)

        conn.close()
        return calendar

    # Progress Reports Methods
    def generate_progress_report(self, user_id: str, language: str, period: str = 'week') -> Dict:
        """Generate a comprehensive progress report"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        # Calculate date range
        if period == 'week':
            start_date = (datetime.now() - timedelta(days=7)).isoformat()
            period_name = 'This Week'
        elif period == 'month':
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
            period_name = 'This Month'
        else:
            start_date = (datetime.now() - timedelta(days=365)).isoformat()
            period_name = 'This Year'

        # Get session statistics
        cursor.execute('''
        SELECT COUNT(*), SUM(duration), SUM(message_count),
               AVG(accuracy_rate), SUM(perfect_messages)
        FROM sessions
        WHERE user_id = ? AND language = ? AND created_at >= ?
        ''', (user_id, language, start_date))

        session_stats = cursor.fetchone()
        total_sessions = session_stats[0] or 0
        total_time = session_stats[1] or 0
        total_messages = session_stats[2] or 0
        avg_accuracy = session_stats[3] or 0
        perfect_messages = session_stats[4] or 0

        # Get vocabulary progress
        cursor.execute('''
        SELECT COUNT(*), AVG(proficiency_level), SUM(correct), SUM(attempts)
        FROM vocabulary_exercises
        WHERE user_id = ? AND language = ? AND last_practiced >= ?
        ''', (user_id, language, start_date))

        vocab_stats = cursor.fetchone()
        vocab_practiced = vocab_stats[0] or 0
        avg_proficiency = vocab_stats[1] or 0
        vocab_correct = vocab_stats[2] or 0
        vocab_attempts = vocab_stats[3] or 0

        # Get achievements earned
        cursor.execute('''
        SELECT COUNT(*) FROM user_achievements
        WHERE user_id = ? AND earned_at >= ?
        ''', (user_id, start_date))

        achievements_earned = cursor.fetchone()[0] or 0

        # Get current streak
        cursor.execute('''
        SELECT current_streak FROM user_progress
        WHERE user_id = ? AND language = ?
        ''', (user_id, language))

        streak = cursor.fetchone()
        current_streak = streak[0] if streak else 0

        # Get XP gained
        cursor.execute('''
        SELECT total_xp FROM user_progress
        WHERE user_id = ? AND language = ?
        ''', (user_id, language))

        xp = cursor.fetchone()
        total_xp = xp[0] if xp else 0

        conn.close()

        report = {
            'period': period_name,
            'start_date': start_date,
            'end_date': datetime.now().isoformat(),
            'sessions': {
                'total': total_sessions,
                'total_time_minutes': round(total_time / 60, 1),
                'avg_time_minutes': round(total_time / 60 / max(total_sessions, 1), 1),
                'total_messages': total_messages,
                'avg_messages_per_session': round(total_messages / max(total_sessions, 1), 1),
                'perfect_messages': perfect_messages,
                'avg_accuracy': round(avg_accuracy, 1)
            },
            'vocabulary': {
                'words_practiced': vocab_practiced,
                'avg_proficiency': round(avg_proficiency, 2),
                'accuracy': round((vocab_correct / max(vocab_attempts, 1)) * 100, 1)
            },
            'achievements': {
                'earned': achievements_earned
            },
            'streak': current_streak,
            'total_xp': total_xp
        }

        return report

    # Leaderboard Methods
    def get_leaderboard(self, language: str, period: str = 'all_time', limit: int = 50) -> List[Dict]:
        """Get leaderboard rankings"""
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()

        if period == 'week':
            # Weekly leaderboard based on recent XP gains
            start_date = (datetime.now() - timedelta(days=7)).isoformat()
            cursor.execute('''
            SELECT u.username, up.total_xp, up.current_streak, up.total_messages, up.total_practice_time
            FROM users u
            JOIN user_progress up ON u.id = up.user_id
            WHERE up.language = ? AND up.updated_at >= ?
            ORDER BY up.total_xp DESC
            LIMIT ?
            ''', (language, start_date, limit))
        else:
            # All-time leaderboard
            cursor.execute('''
            SELECT u.username, up.total_xp, up.current_streak, up.total_messages, up.total_practice_time
            FROM users u
            JOIN user_progress up ON u.id = up.user_id
            WHERE up.language = ?
            ORDER BY up.total_xp DESC
            LIMIT ?
            ''', (language, limit))

        leaderboard = []
        for idx, row in enumerate(cursor.fetchall(), 1):
            leaderboard.append({
                'rank': idx,
                'username': row[0],
                'xp': row[1],
                'streak': row[2],
                'messages': row[3],
                'practice_time_hours': round((row[4] or 0) / 3600, 1)
            })

        conn.close()
        return leaderboard
