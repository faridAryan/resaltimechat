import os
from typing import Dict, List, Optional
import uuid
from datetime import datetime
from openai import AsyncOpenAI
from rag_system import RAGSystem


class ConversationManager:
    """Manages language practice conversations with RAG context"""

    def __init__(self, rag_system: RAGSystem):
        self.rag_system = rag_system
        self.sessions: Dict[str, Dict] = {}
        self.target_language = "English"

        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=api_key) if api_key else None

    def set_target_language(self, language: str):
        """Set the target language for practice"""
        self.target_language = language

    async def create_session(self) -> str:
        """Create a new conversation session"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "id": session_id,
            "created_at": datetime.now(),
            "messages": [],
            "language": self.target_language,
            "corrections": []
        }
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

        # Add user message to history
        session["messages"].append({
            "role": "user",
            "content": user_message,
            "timestamp": datetime.now()
        })

        # Query RAG system for relevant context
        context_docs = await self.rag_system.query(user_message, n_results=3)
        context_text = "\n\n".join([doc["text"] for doc in context_docs])

        # Build the prompt for language practice
        system_prompt = self._build_system_prompt(session["language"], context_text)

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

        # Add assistant response to history
        session["messages"].append({
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now()
        })

        if corrections:
            session["corrections"].append({
                "user_message": user_message,
                "corrections": corrections,
                "timestamp": datetime.now()
            })

        return {
            "text": response_text,
            "corrections": corrections,
            "feedback": self._generate_feedback(corrections),
            "context": context_docs
        }

    def _build_system_prompt(self, language: str, context: str) -> str:
        """Build the system prompt for language practice"""
        prompt = f"""You are a helpful language practice assistant helping users practice {language}.

Your role is to:
1. Have natural, engaging conversations in {language}
2. Adapt to the user's proficiency level
3. Provide gentle corrections when needed
4. Ask follow-up questions to encourage conversation
5. Use context from provided materials to make conversations more relevant

Context from learning materials:
{context if context else "No specific context provided."}

Guidelines:
- Be encouraging and supportive
- Use natural, conversational {language}
- If the user makes mistakes, gently correct them
- Ask questions to keep the conversation flowing
- Relate topics to the provided context when relevant
- Adjust your language complexity based on the user's level
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
        if session_id in self.sessions:
            self.sessions[session_id]["ended_at"] = datetime.now()

    async def get_session_summary(self, session_id: str) -> Dict:
        """Get a summary of the conversation session"""
        if session_id not in self.sessions:
            return {}

        session = self.sessions[session_id]
        return {
            "session_id": session_id,
            "language": session["language"],
            "message_count": len(session["messages"]),
            "corrections_count": len(session["corrections"]),
            "duration": (
                session.get("ended_at", datetime.now()) - session["created_at"]
            ).total_seconds()
        }
