"""
Practical learning features: scenarios, exercises, challenges, and topics
"""
import json
from typing import List, Dict
import uuid
from datetime import datetime, date


class PracticalFeatures:
    """Manages conversation scenarios, exercises, daily challenges, and topics"""

    def __init__(self, database):
        self.database = database
        self.init_scenarios()
        self.init_exercises()
        self.init_topics()

    def init_scenarios(self):
        """Initialize conversation scenarios for practical situations"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        # Create scenarios table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversation_scenarios (
                id TEXT PRIMARY KEY,
                language TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT,
                difficulty_level TEXT,
                description TEXT,
                conversation_starter TEXT,
                context TEXT,
                vocabulary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create user scenario progress table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_scenario_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                scenario_id TEXT NOT NULL,
                completed BOOLEAN DEFAULT 0,
                completed_at TIMESTAMP,
                rating INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (scenario_id) REFERENCES conversation_scenarios(id),
                UNIQUE(user_id, scenario_id)
            )
        """)

        conn.commit()

        # Add default scenarios
        scenarios = [
            {
                "id": "restaurant_ordering",
                "language": "general",
                "title": "Ordering at a Restaurant",
                "category": "dining",
                "difficulty_level": "beginner",
                "description": "Practice ordering food and drinks at a restaurant",
                "conversation_starter": "Hello! I'd like to see the menu, please.",
                "context": "You're at a nice restaurant and want to order a meal. The waiter is friendly and helpful.",
                "vocabulary": json.dumps(["menu", "order", "appetizer", "main course", "dessert", "bill", "tip"])
            },
            {
                "id": "hotel_checkin",
                "language": "general",
                "title": "Hotel Check-in",
                "category": "travel",
                "difficulty_level": "beginner",
                "description": "Check into a hotel and ask about facilities",
                "conversation_starter": "Hello, I have a reservation under the name...",
                "context": "You're checking into a hotel after a long trip. You want to confirm your reservation and learn about hotel amenities.",
                "vocabulary": json.dumps(["reservation", "check-in", "room", "key card", "breakfast", "wifi", "luggage"])
            },
            {
                "id": "asking_directions",
                "language": "general",
                "title": "Asking for Directions",
                "category": "travel",
                "difficulty_level": "beginner",
                "description": "Ask for and understand directions to locations",
                "conversation_starter": "Excuse me, could you help me find...",
                "context": "You're lost in a new city and need to find your way to a specific location.",
                "vocabulary": json.dumps(["left", "right", "straight", "corner", "block", "landmark", "metro"])
            },
            {
                "id": "shopping_clothes",
                "language": "general",
                "title": "Shopping for Clothes",
                "category": "shopping",
                "difficulty_level": "intermediate",
                "description": "Buy clothes and ask about sizes and prices",
                "conversation_starter": "I'm looking for a...",
                "context": "You're in a clothing store looking for something specific. You need to ask about sizes, colors, and prices.",
                "vocabulary": json.dumps(["size", "color", "try on", "fitting room", "price", "discount", "receipt"])
            },
            {
                "id": "job_interview",
                "language": "general",
                "title": "Job Interview",
                "category": "professional",
                "difficulty_level": "advanced",
                "description": "Participate in a professional job interview",
                "conversation_starter": "Thank you for meeting with me today.",
                "context": "You're interviewing for a job you really want. Answer questions professionally and ask about the position.",
                "vocabulary": json.dumps(["experience", "qualifications", "strengths", "weaknesses", "salary", "benefits", "start date"])
            },
            {
                "id": "doctor_appointment",
                "language": "general",
                "title": "Doctor's Appointment",
                "category": "health",
                "difficulty_level": "intermediate",
                "description": "Describe symptoms and understand medical advice",
                "conversation_starter": "Doctor, I haven't been feeling well...",
                "context": "You're at the doctor's office with some health concerns. Describe your symptoms clearly.",
                "vocabulary": json.dumps(["symptoms", "pain", "fever", "prescription", "medicine", "allergies", "insurance"])
            },
            {
                "id": "making_friends",
                "language": "general",
                "title": "Making New Friends",
                "category": "social",
                "difficulty_level": "beginner",
                "description": "Introduce yourself and have casual conversation",
                "conversation_starter": "Hi! I'm new here. My name is...",
                "context": "You're at a social event and want to meet new people. Be friendly and ask questions.",
                "vocabulary": json.dumps(["hobbies", "interests", "work", "family", "hometown", "weekend", "movies"])
            },
            {
                "id": "business_meeting",
                "language": "general",
                "title": "Business Meeting",
                "category": "professional",
                "difficulty_level": "advanced",
                "description": "Participate in a professional business meeting",
                "conversation_starter": "Let's discuss the quarterly results...",
                "context": "You're in a business meeting presenting ideas and discussing strategy with colleagues.",
                "vocabulary": json.dumps(["agenda", "objectives", "strategy", "deadline", "budget", "proposal", "agreement"])
            }
        ]

        for scenario in scenarios:
            cursor.execute("""
                INSERT OR IGNORE INTO conversation_scenarios
                (id, language, title, category, difficulty_level, description, conversation_starter, context, vocabulary)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                scenario["id"],
                scenario["language"],
                scenario["title"],
                scenario["category"],
                scenario["difficulty_level"],
                scenario["description"],
                scenario["conversation_starter"],
                scenario["context"],
                scenario["vocabulary"]
            ))

        conn.commit()
        conn.close()

    def init_exercises(self):
        """Initialize exercise system"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        # Create exercises table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS exercises (
                id TEXT PRIMARY KEY,
                language TEXT NOT NULL,
                type TEXT NOT NULL,
                difficulty_level TEXT,
                question TEXT NOT NULL,
                options TEXT,
                correct_answer TEXT NOT NULL,
                explanation TEXT,
                topic TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create user exercise attempts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_exercise_attempts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                exercise_id TEXT NOT NULL,
                user_answer TEXT,
                is_correct BOOLEAN,
                attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (exercise_id) REFERENCES exercises(id)
            )
        """)

        conn.commit()
        conn.close()

    def init_topics(self):
        """Initialize learning topics"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        # Create topics table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS learning_topics (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                difficulty_level TEXT
            )
        """)

        conn.commit()

        # Add default topics
        topics = [
            {"id": "greetings", "name": "Greetings & Introductions", "icon": "👋", "difficulty_level": "beginner"},
            {"id": "numbers", "name": "Numbers & Counting", "icon": "🔢", "difficulty_level": "beginner"},
            {"id": "food", "name": "Food & Dining", "icon": "🍽️", "difficulty_level": "beginner"},
            {"id": "travel", "name": "Travel & Transportation", "icon": "✈️", "difficulty_level": "intermediate"},
            {"id": "shopping", "name": "Shopping & Money", "icon": "🛍️", "difficulty_level": "intermediate"},
            {"id": "health", "name": "Health & Medical", "icon": "🏥", "difficulty_level": "intermediate"},
            {"id": "business", "name": "Business & Work", "icon": "💼", "difficulty_level": "advanced"},
            {"id": "culture", "name": "Culture & Society", "icon": "🎭", "difficulty_level": "advanced"},
        ]

        for topic in topics:
            cursor.execute("""
                INSERT OR IGNORE INTO learning_topics (id, name, icon, difficulty_level, description)
                VALUES (?, ?, ?, ?, ?)
            """, (topic["id"], topic["name"], topic["icon"], topic["difficulty_level"],
                  f"Learn about {topic['name'].lower()}"))

        conn.commit()
        conn.close()

    def get_scenarios(self, language: str = None, category: str = None, difficulty: str = None) -> List[Dict]:
        """Get conversation scenarios"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM conversation_scenarios WHERE 1=1"
        params = []

        if language and language != "general":
            query += " AND (language = ? OR language = 'general')"
            params.append(language)

        if category:
            query += " AND category = ?"
            params.append(category)

        if difficulty:
            query += " AND difficulty_level = ?"
            params.append(difficulty)

        cursor.execute(query, params)
        scenarios = [dict(row) for row in cursor.fetchall()]

        # Parse vocabulary JSON
        for scenario in scenarios:
            if scenario.get('vocabulary'):
                scenario['vocabulary'] = json.loads(scenario['vocabulary'])

        conn.close()
        return scenarios

    def start_scenario(self, user_id: str, scenario_id: str):
        """Mark a scenario as started"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT OR IGNORE INTO user_scenario_progress (id, user_id, scenario_id)
            VALUES (?, ?, ?)
        """, (str(uuid.uuid4()), user_id, scenario_id))

        conn.commit()
        conn.close()

    def complete_scenario(self, user_id: str, scenario_id: str, rating: int = None):
        """Mark a scenario as completed"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE user_scenario_progress
            SET completed = 1, completed_at = CURRENT_TIMESTAMP, rating = ?
            WHERE user_id = ? AND scenario_id = ?
        """, (rating, user_id, scenario_id))

        # Award XP for completing scenario
        xp_bonus = 20 * (rating or 3)  # 20-100 XP based on rating
        cursor.execute("""
            UPDATE user_progress
            SET experience_points = experience_points + ?
            WHERE user_id = ?
        """, (xp_bonus, user_id))

        conn.commit()
        conn.close()

        return xp_bonus

    def get_daily_challenge(self, user_id: str, language: str) -> Dict:
        """Get or create today's daily challenge"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        # Create daily challenges table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_challenges (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                date DATE NOT NULL,
                challenge_type TEXT NOT NULL,
                challenge_data TEXT,
                completed BOOLEAN DEFAULT 0,
                reward_xp INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, date)
            )
        """)

        today = date.today().isoformat()

        # Check if challenge exists for today
        cursor.execute("""
            SELECT * FROM daily_challenges
            WHERE user_id = ? AND date = ?
        """, (user_id, today))

        challenge = cursor.fetchone()

        if not challenge:
            # Create new daily challenge
            challenge_types = [
                {"type": "message_count", "goal": 10, "xp": 50, "description": "Send 10 messages today"},
                {"type": "perfect_messages", "goal": 5, "xp": 75, "description": "Get 5 perfect messages (no corrections)"},
                {"type": "vocabulary", "goal": 5, "xp": 60, "description": "Learn 5 new words"},
                {"type": "scenario", "goal": 1, "xp": 100, "description": "Complete 1 conversation scenario"},
            ]

            import random
            selected = random.choice(challenge_types)

            challenge_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO daily_challenges (id, user_id, date, challenge_type, challenge_data, reward_xp)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (challenge_id, user_id, today, selected["type"],
                  json.dumps({"goal": selected["goal"], "description": selected["description"]}),
                  selected["xp"]))

            conn.commit()

            cursor.execute("SELECT * FROM daily_challenges WHERE id = ?", (challenge_id,))
            challenge = cursor.fetchone()

        conn.close()

        if challenge:
            result = dict(challenge)
            if result.get('challenge_data'):
                result['challenge_data'] = json.loads(result['challenge_data'])
            return result

        return None

    def check_daily_challenge(self, user_id: str) -> bool:
        """Check if user has completed today's challenge"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        today = date.today().isoformat()

        cursor.execute("""
            SELECT * FROM daily_challenges
            WHERE user_id = ? AND date = ? AND completed = 0
        """, (user_id, today))

        challenge = cursor.fetchone()

        if not challenge:
            return False

        challenge_dict = dict(challenge)
        challenge_type = challenge_dict['challenge_type']
        challenge_data = json.loads(challenge_dict['challenge_data'])
        goal = challenge_data['goal']

        # Check progress based on type
        completed = False

        if challenge_type == "message_count":
            # Check today's messages
            cursor.execute("""
                SELECT messages_sent FROM daily_activity
                WHERE user_id = ? AND date = ?
            """, (user_id, today))
            row = cursor.fetchone()
            if row and row['messages_sent'] >= goal:
                completed = True

        elif challenge_type == "perfect_messages":
            # Count perfect messages today (would need to track this)
            pass

        elif challenge_type == "vocabulary":
            # Count words learned today
            cursor.execute("""
                SELECT COUNT(*) as count FROM vocabulary_items
                WHERE user_id = ? AND DATE(first_seen) = ?
            """, (user_id, today))
            row = cursor.fetchone()
            if row and row['count'] >= goal:
                completed = True

        elif challenge_type == "scenario":
            # Check scenarios completed today
            cursor.execute("""
                SELECT COUNT(*) as count FROM user_scenario_progress
                WHERE user_id = ? AND DATE(completed_at) = ? AND completed = 1
            """, (user_id, today))
            row = cursor.fetchone()
            if row and row['count'] >= goal:
                completed = True

        if completed:
            # Mark as completed and award XP
            cursor.execute("""
                UPDATE daily_challenges
                SET completed = 1
                WHERE id = ?
            """, (challenge_dict['id'],))

            cursor.execute("""
                UPDATE user_progress
                SET experience_points = experience_points + ?
                WHERE user_id = ?
            """, (challenge_dict['reward_xp'], user_id))

            conn.commit()

        conn.close()
        return completed

    def get_topics(self) -> List[Dict]:
        """Get all learning topics"""
        conn = self.database.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM learning_topics ORDER BY difficulty_level, name")
        topics = [dict(row) for row in cursor.fetchall()]

        conn.close()
        return topics
