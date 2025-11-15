import os
from typing import Dict, List, Optional
import uuid
from datetime import datetime
from openai import AsyncOpenAI
from rag_system import RAGSystem
from database import Database


class ConversationManager:
    """Manages language practice conversations with RAG context and user progress tracking"""

    def __init__(self, rag_system: RAGSystem, database: Database):
        self.rag_system = rag_system
        self.database = database
        self.sessions: Dict[str, Dict] = {}
        self.target_language = "English"

        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=api_key) if api_key else None

    def set_target_language(self, language: str):
        """Set the target language for practice"""
        self.target_language = language

    async def create_session(self, user_id: str, language: str, difficulty: str = "beginner") -> str:
        """Create a new conversation session"""
        session_id = str(uuid.uuid4())

        # Get user's current difficulty level if available
        progress = self.database.get_user_progress(user_id, language)
        if progress:
            difficulty = progress[0].get('current_level', 'beginner')

        self.sessions[session_id] = {
            "id": session_id,
            "user_id": user_id,
            "created_at": datetime.now(),
            "messages": [],
            "language": language,
            "difficulty": difficulty,
            "corrections": [],
            "words_practiced": set(),
            "perfect_message_count": 0
        }

        # Record session start in database
        db_session_id = self.database.start_session(user_id, language, difficulty)
        self.sessions[session_id]["db_session_id"] = db_session_id

        return session_id

    async def process_message(
        self,
        session_id: str,
        user_message: str,
        language: Optional[str] = None
    ) -> Dict:
        """Process a user message and generate a response"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")

        session = self.sessions[session_id]
        if language:
            session["language"] = language

        user_id = session["user_id"]

        # Add user message to history
        session["messages"].append({
            "role": "user",
            "content": user_message,
            "timestamp": datetime.now()
        })

        # Query RAG system for relevant context
        context_docs = await self.rag_system.query(user_message, n_results=3)
        context_text = "\n\n".join([doc["text"] for doc in context_docs])

        # Build the prompt for language practice with difficulty level
        system_prompt = self._build_system_prompt(
            session["language"],
            context_text,
            session["difficulty"]
        )

        # Prepare messages for LLM
        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # Add conversation history (last 10 messages)
        for msg in session["messages"][-10:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        # Generate response using OpenAI
        response_text = await self._generate_response(messages)

        # Analyze the user's message for corrections
        corrections = await self._analyze_language(user_message, session["language"])

        # Track vocabulary from the message
        words = set(user_message.lower().split())
        session["words_practiced"].update(words)

        # Track perfect messages (no corrections)
        if not corrections:
            session["perfect_message_count"] += 1

        # Add assistant response to history
        session["messages"].append({
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now()
        })

        # Store corrections in database
        if corrections:
            session["corrections"].append({
                "user_message": user_message,
                "corrections": corrections,
                "timestamp": datetime.now()
            })

            for corr in corrections:
                self.database.add_mistake(
                    user_id,
                    session["language"],
                    "grammar",
                    corr.get("original", ""),
                    corr.get("corrected", ""),
                    corr.get("explanation", "")
                )

        # Extract and store new vocabulary
        vocabulary_items = await self._extract_vocabulary(response_text, session["language"])
        for item in vocabulary_items:
            self.database.add_vocabulary(
                user_id,
                session["language"],
                item["word"],
                item.get("translation", ""),
                user_message
            )

        # Check for achievements
        newly_earned = self.database.check_achievements(user_id)

        # Adapt difficulty if needed
        await self._adapt_difficulty(session_id)

        return {
            "text": response_text,
            "corrections": corrections,
            "feedback": self._generate_feedback(corrections),
            "context": context_docs,
            "new_achievements": newly_earned,
            "difficulty": session["difficulty"],
            "stats": {
                "messages": len([m for m in session["messages"] if m["role"] == "user"]),
                "corrections": len(session["corrections"]),
                "perfect_messages": session["perfect_message_count"]
            }
        }

    def _build_system_prompt(self, language: str, context: str, difficulty: str = "beginner") -> str:
        """Build the system prompt for language practice"""
        difficulty_guides = {
            "beginner": "Use simple vocabulary and basic sentence structures. Speak slowly and clearly. Focus on fundamental concepts.",
            "intermediate": "Use everyday vocabulary with some complex structures. Introduce idiomatic expressions gradually.",
            "advanced": "Use sophisticated vocabulary and complex grammar. Include idioms, cultural references, and nuanced expressions.",
            "expert": "Engage at native-level proficiency with advanced vocabulary, complex grammar, and cultural depth."
        }

        prompt = f"""You are a helpful language practice assistant helping users practice {language}.

User's Proficiency Level: {difficulty.upper()}
{difficulty_guides.get(difficulty, difficulty_guides["beginner"])}

Your role is to:
1. Have natural, engaging conversations in {language}
2. Adapt to the user's {difficulty} proficiency level
3. Provide gentle corrections when needed
4. Ask follow-up questions to encourage conversation
5. Use context from provided materials to make conversations more relevant
6. Introduce new vocabulary appropriate for their level

Context from learning materials:
{context if context else "No specific context provided."}

Guidelines:
- Be encouraging and supportive
- Use natural, conversational {language} appropriate for {difficulty} level
- If the user makes mistakes, gently correct them
- Ask questions to keep the conversation flowing
- Relate topics to the provided context when relevant
- Gradually increase complexity as the user demonstrates proficiency
- Occasionally introduce 1-2 new words per response to expand vocabulary
"""
        return prompt

    async def _generate_response(self, messages: List[Dict]) -> str:
        """Generate a response using OpenAI"""
        if not self.client:
            return "API key not configured. Please set OPENAI_API_KEY in your .env file."

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error generating response: {e}")
            return f"I'm having trouble generating a response. Error: {str(e)}"

    async def _analyze_language(self, user_message: str, language: str) -> List[Dict]:
        """Analyze user's message for grammar/vocabulary corrections"""
        if not self.client:
            return []

        try:
            analysis_prompt = f"""Analyze this {language} text for errors and provide corrections.
Only report actual errors, not style suggestions. Be concise.

Text: {user_message}

Provide corrections in this format:
- Original: [incorrect part]
- Corrected: [correct version]
- Explanation: [brief explanation]

If there are no errors, respond with "No corrections needed."
"""

            response = await self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[{"role": "user", "content": analysis_prompt}],
                temperature=0.3,
                max_tokens=300
            )

            analysis = response.choices[0].message.content

            if "No corrections needed" in analysis:
                return []

            # Parse corrections (simple parsing, could be improved)
            corrections = []
            lines = analysis.split('\n')
            current_correction = {}

            for line in lines:
                line = line.strip()
                if line.startswith('- Original:'):
                    current_correction['original'] = line.replace('- Original:', '').strip()
                elif line.startswith('- Corrected:'):
                    current_correction['corrected'] = line.replace('- Corrected:', '').strip()
                elif line.startswith('- Explanation:'):
                    current_correction['explanation'] = line.replace('- Explanation:', '').strip()
                    if current_correction:
                        corrections.append(current_correction)
                        current_correction = {}

            return corrections
        except Exception as e:
            print(f"Error analyzing language: {e}")
            return []

    def _generate_feedback(self, corrections: List[Dict]) -> Optional[str]:
        """Generate feedback based on corrections"""
        if not corrections:
            return "Great job! Your message looks good."

        feedback = f"I noticed {len(corrections)} area(s) for improvement:\n"
        for i, corr in enumerate(corrections, 1):
            feedback += f"{i}. {corr.get('explanation', 'See correction')}\n"

        return feedback

    async def end_session(self, session_id: str):
        """End a conversation session"""
        if session_id not in self.sessions:
            return

        session = self.sessions[session_id]
        session["ended_at"] = datetime.now()

        # Calculate session statistics
        duration = (session["ended_at"] - session["created_at"]).total_seconds()
        user_messages = [m for m in session["messages"] if m["role"] == "user"]

        stats = {
            "duration_seconds": int(duration),
            "message_count": len(user_messages),
            "corrections_count": len(session["corrections"]),
            "words_practiced": len(session["words_practiced"])
        }

        # Update database
        self.database.end_session(session["db_session_id"], stats)

    async def get_session_summary(self, session_id: str) -> Dict:
        """Get a summary of the conversation session"""
        if session_id not in self.sessions:
            return {}

        session = self.sessions[session_id]
        user_messages = [m for m in session["messages"] if m["role"] == "user"]

        return {
            "session_id": session_id,
            "language": session["language"],
            "difficulty": session["difficulty"],
            "message_count": len(user_messages),
            "corrections_count": len(session["corrections"]),
            "perfect_messages": session["perfect_message_count"],
            "words_practiced": len(session["words_practiced"]),
            "duration": (
                session.get("ended_at", datetime.now()) - session["created_at"]
            ).total_seconds()
        }

    async def _extract_vocabulary(self, text: str, language: str) -> List[Dict]:
        """Extract key vocabulary from AI response"""
        if not self.client:
            return []

        try:
            prompt = f"""Extract 1-2 key vocabulary words from this {language} text that would be useful for a language learner.

Text: {text}

Return ONLY a simple list in this format:
word1 - translation
word2 - translation

If no significant vocabulary, return "None"."""

            response = await self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=100
            )

            result = response.choices[0].message.content.strip()

            if "None" in result or not result:
                return []

            # Parse vocabulary
            vocab_items = []
            for line in result.split('\n'):
                if ' - ' in line:
                    parts = line.split(' - ')
                    if len(parts) == 2:
                        vocab_items.append({
                            "word": parts[0].strip(),
                            "translation": parts[1].strip()
                        })

            return vocab_items[:2]  # Limit to 2 items
        except Exception as e:
            print(f"Error extracting vocabulary: {e}")
            return []

    async def _adapt_difficulty(self, session_id: str):
        """Adapt difficulty level based on user performance"""
        if session_id not in self.sessions:
            return

        session = self.sessions[session_id]
        user_messages = [m for m in session["messages"] if m["role"] == "user"]

        # Need at least 5 messages to assess
        if len(user_messages) < 5:
            return

        correction_rate = len(session["corrections"]) / len(user_messages) if user_messages else 0
        perfect_rate = session["perfect_message_count"] / len(user_messages) if user_messages else 0

        current_difficulty = session["difficulty"]
        new_difficulty = current_difficulty

        # Upgrade if doing very well (80%+ perfect messages)
        if perfect_rate >= 0.8 and len(user_messages) >= 10:
            if current_difficulty == "beginner":
                new_difficulty = "intermediate"
            elif current_difficulty == "intermediate":
                new_difficulty = "advanced"
            elif current_difficulty == "advanced":
                new_difficulty = "expert"

        # Downgrade if struggling (60%+ correction rate)
        elif correction_rate >= 0.6:
            if current_difficulty == "expert":
                new_difficulty = "advanced"
            elif current_difficulty == "advanced":
                new_difficulty = "intermediate"
            elif current_difficulty == "intermediate":
                new_difficulty = "beginner"

        # Update if changed
        if new_difficulty != current_difficulty:
            session["difficulty"] = new_difficulty

            # Update database
            conn = self.database.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE user_progress
                SET current_level = ?
                WHERE user_id = ? AND language = ?
            """, (new_difficulty, session["user_id"], session["language"]))
            conn.commit()
            conn.close()

    async def get_user_stats(self, user_id: str, language: Optional[str] = None) -> Dict:
        """Get comprehensive user statistics"""
        progress = self.database.get_user_progress(user_id, language)
        achievements = self.database.get_user_achievements(user_id)
        analytics = self.database.get_analytics(user_id, days=30)

        return {
            "progress": progress,
            "achievements": achievements,
            "analytics": analytics
        }

    async def get_review_items(self, user_id: str, language: str) -> Dict:
        """Get items for review (vocabulary and mistakes)"""
        vocabulary = self.database.get_vocabulary_for_review(user_id, language, limit=10)
        mistakes = self.database.get_recent_mistakes(user_id, language, limit=5)

        return {
            "vocabulary": vocabulary,
            "mistakes": mistakes
        }
