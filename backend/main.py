from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import json
from typing import List, Dict, Optional
import asyncio

from rag_system import RAGSystem
from conversation_manager import ConversationManager
from database import Database
from practical_features import PracticalFeatures
from usability_features import UsabilityFeatures
from advanced_features import AdvancedFeatures

load_dotenv()

app = FastAPI(title="Learno - Interactive Language Learning Platform")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize systems
database = Database()
rag_system = RAGSystem()
conversation_manager = ConversationManager(rag_system, database)
practical_features = PracticalFeatures(database)
usability_features = UsabilityFeatures(database)
advanced_features = AdvancedFeatures(database)


# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None

class LanguageSet(BaseModel):
    language: str

class SessionStart(BaseModel):
    username: str
    language: str
    difficulty: Optional[str] = "beginner"


@app.get("/")
async def root():
    return {
        "message": "Learno - Interactive Language Learning Platform",
        "version": "2.0",
        "features": [
            "User profiles and progress tracking",
            "Adaptive difficulty levels",
            "Gamification with achievements",
            "Vocabulary and mistake tracking",
            "Real-time conversation practice",
            "RAG-powered contextual learning"
        ]
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/upload-documents")
async def upload_documents(files: List[UploadFile] = File(...)):
    """Upload documents to the RAG system for context"""
    try:
        uploaded_files = []
        for file in files:
            content = await file.read()
            text = content.decode('utf-8')

            # Add document to RAG system
            doc_id = await rag_system.add_document(
                text=text,
                metadata={"filename": file.filename}
            )
            uploaded_files.append({
                "filename": file.filename,
                "doc_id": doc_id,
                "size": len(content)
            })

        return {"status": "success", "files": uploaded_files}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )


@app.post("/set-language")
async def set_language(language: str):
    """Set the target language for practice"""
    conversation_manager.set_target_language(language)
    return {"status": "success", "language": language}


# User Management Endpoints
@app.post("/api/users/create")
async def create_user(user: UserCreate):
    """Create a new user or get existing user"""
    try:
        user_id = database.get_or_create_user(user.username)
        user_data = database.get_user(user.username)
        return {"status": "success", "user": user_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/users/{username}")
async def get_user(username: str):
    """Get user information"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/api/users/{username}/progress")
async def get_user_progress(username: str, language: Optional[str] = None):
    """Get user's learning progress"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    progress = database.get_user_progress(user['id'], language)
    return {"status": "success", "progress": progress}


@app.get("/api/users/{username}/achievements")
async def get_user_achievements(username: str):
    """Get user's achievements"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    achievements = database.get_user_achievements(user['id'])
    return {"status": "success", "achievements": achievements}


@app.get("/api/users/{username}/analytics")
async def get_user_analytics(username: str, days: int = 30):
    """Get user analytics"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    analytics = database.get_analytics(user['id'], days)
    return {"status": "success", "analytics": analytics}


@app.get("/api/users/{username}/review")
async def get_review_items(username: str, language: str):
    """Get vocabulary and mistakes for review"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    review_items = await conversation_manager.get_review_items(user['id'], language)
    return {"status": "success", **review_items}


@app.get("/api/leaderboard")
async def get_leaderboard(language: Optional[str] = None, limit: int = 10):
    """Get leaderboard"""
    leaderboard = database.get_leaderboard(language, limit)
    return {"status": "success", "leaderboard": leaderboard}


@app.get("/api/achievements")
async def get_all_achievements():
    """Get all available achievements"""
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM achievements")
    achievements = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"status": "success", "achievements": achievements}


# Practical Features Endpoints
@app.get("/api/scenarios")
async def get_scenarios(language: Optional[str] = None, category: Optional[str] = None, difficulty: Optional[str] = None):
    """Get conversation scenarios"""
    scenarios = practical_features.get_scenarios(language, category, difficulty)
    return {"status": "success", "scenarios": scenarios}


@app.post("/api/scenarios/{scenario_id}/start")
async def start_scenario(scenario_id: str, username: str):
    """Start a conversation scenario"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    practical_features.start_scenario(user['id'], scenario_id)
    return {"status": "success", "message": "Scenario started"}


@app.post("/api/scenarios/{scenario_id}/complete")
async def complete_scenario(scenario_id: str, username: str, rating: Optional[int] = None):
    """Complete a conversation scenario"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    xp_earned = practical_features.complete_scenario(user['id'], scenario_id, rating)
    return {"status": "success", "xp_earned": xp_earned}


@app.get("/api/daily-challenge/{username}")
async def get_daily_challenge(username: str, language: str = "English"):
    """Get today's daily challenge"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    challenge = practical_features.get_daily_challenge(user['id'], language)
    return {"status": "success", "challenge": challenge}


@app.post("/api/daily-challenge/check")
async def check_daily_challenge(username: str):
    """Check if daily challenge is completed"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    completed = practical_features.check_daily_challenge(user['id'])
    return {"status": "success", "completed": completed}


@app.get("/api/topics")
async def get_topics():
    """Get all learning topics"""
    topics = practical_features.get_topics()
    return {"status": "success", "topics": topics}


@app.get("/api/flashcards/{username}")
async def get_flashcards(username: str, language: str, limit: int = 10):
    """Get vocabulary flashcards for review"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    flashcards = database.get_vocabulary_for_review(user['id'], language, limit)
    return {"status": "success", "flashcards": flashcards}


@app.post("/api/flashcards/review")
async def review_flashcard(username: str, vocab_id: str, confidence: int):
    """Update flashcard review with confidence rating"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from datetime import timedelta
    conn = database.get_connection()
    cursor = conn.cursor()

    # Update review count and schedule next review based on confidence
    days_until_next = [1, 3, 7, 14, 30][min(confidence, 4)]  # 0-4 confidence levels
    next_review = (datetime.now() + timedelta(days=days_until_next)).date().isoformat()

    cursor.execute("""
        UPDATE vocabulary_items
        SET last_reviewed = CURRENT_TIMESTAMP,
            review_count = review_count + 1,
            confidence_level = ?,
            next_review_date = ?
        WHERE id = ? AND user_id = ?
    """, (confidence, next_review, vocab_id, user['id']))

    conn.commit()
    conn.close()

    return {"status": "success", "next_review": next_review}


# Usability Features Endpoints
@app.post("/api/goals/create")
async def create_goal(username: str, language: str, goal_type: str, title: str,
                     target_value: int, deadline: Optional[str] = None, description: Optional[str] = None):
    """Create a learning goal"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    goal_id = usability_features.create_goal(
        user['id'], language, goal_type, title, target_value, deadline, description
    )
    return {"status": "success", "goal_id": goal_id}


@app.get("/api/goals/{username}")
async def get_goals(username: str, language: Optional[str] = None):
    """Get user's learning goals"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    goals = usability_features.get_user_goals(user['id'], language)
    return {"status": "success", "goals": goals}


@app.post("/api/goals/{goal_id}/update")
async def update_goal(goal_id: str, current_value: int):
    """Update goal progress"""
    usability_features.update_goal_progress(goal_id, current_value)
    return {"status": "success"}


@app.get("/api/history/{username}")
async def get_history(username: str, language: Optional[str] = None, limit: int = 20):
    """Get conversation history"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    history = usability_features.get_conversation_history(user['id'], language, limit)
    return {"status": "success", "history": history}


@app.post("/api/history/save")
async def save_conversation(username: str, session_id: str, language: str,
                           messages: List[Dict], title: Optional[str] = None):
    """Save conversation to history"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    conv_id = usability_features.save_conversation(
        user['id'], session_id, language, messages, title
    )
    return {"status": "success", "conversation_id": conv_id}


@app.post("/api/notes/create")
async def create_note(username: str, title: str, content: str,
                     language: Optional[str] = None, topic: Optional[str] = None,
                     tags: Optional[List[str]] = None):
    """Create a study note"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    note_id = usability_features.create_note(
        user['id'], title, content, language, topic, tags
    )
    return {"status": "success", "note_id": note_id}


@app.get("/api/notes/{username}")
async def get_notes(username: str, language: Optional[str] = None):
    """Get user's study notes"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    notes = usability_features.get_user_notes(user['id'], language)
    return {"status": "success", "notes": notes}


@app.put("/api/notes/{note_id}")
async def update_note(note_id: str, title: Optional[str] = None,
                     content: Optional[str] = None, tags: Optional[List[str]] = None):
    """Update a study note"""
    usability_features.update_note(note_id, title, content, tags)
    return {"status": "success"}


@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a study note"""
    usability_features.delete_note(note_id)
    return {"status": "success"}


@app.get("/api/quick-phrases")
async def get_quick_phrases(language: str, category: Optional[str] = None):
    """Get quick phrases"""
    phrases = usability_features.get_quick_phrases(language, category)
    return {"status": "success", "phrases": phrases}


@app.post("/api/quick-phrases/{phrase_id}/use")
async def use_phrase(phrase_id: str):
    """Mark a phrase as used"""
    usability_features.use_quick_phrase(phrase_id)
    return {"status": "success"}


@app.get("/api/export/{username}")
async def export_data(username: str):
    """Export all user data"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = usability_features.export_user_data(user['id'])
    return {"status": "success", "data": data}


# ========== Advanced Features Endpoints ==========

# Vocabulary Trainer Endpoints
@app.post("/api/vocabulary/create")
async def create_vocabulary_exercise(username: str, language: str, word: str,
                                    translation: str, exercise_type: str = "translation"):
    """Create a new vocabulary exercise"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    exercise_id = advanced_features.create_vocabulary_exercise(
        user['id'], language, word, translation, exercise_type
    )
    return {"status": "success", "exercise_id": exercise_id}


@app.get("/api/vocabulary/list")
async def get_vocabulary_exercises(username: str, language: str, due_only: bool = False):
    """Get vocabulary exercises for practice"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    exercises = advanced_features.get_vocabulary_exercises(user['id'], language, due_only)
    return {"status": "success", "exercises": exercises}


@app.post("/api/vocabulary/update")
async def update_vocabulary_progress(exercise_id: str, correct: bool):
    """Update vocabulary exercise progress"""
    result = advanced_features.update_vocabulary_progress(exercise_id, correct)
    return {"status": "success", **result}


# Grammar Tips Endpoints
@app.get("/api/grammar/tips")
async def get_grammar_tips(language: str, difficulty_level: Optional[str] = None,
                          category: Optional[str] = None):
    """Get grammar tips"""
    tips = advanced_features.get_grammar_tips(language, difficulty_level, category)
    return {"status": "success", "tips": tips}


@app.get("/api/grammar/random-tip")
async def get_random_grammar_tip(language: str, difficulty_level: str):
    """Get a random grammar tip"""
    tip = advanced_features.get_random_grammar_tip(language, difficulty_level)
    if not tip:
        raise HTTPException(status_code=404, detail="No tips found")
    return {"status": "success", "tip": tip}


# Custom Topics Endpoints
@app.post("/api/topics/create")
async def create_custom_topic(username: str, language: str, title: str, description: str,
                             keywords: List[str], context: str = "", vocabulary: Optional[List[str]] = None):
    """Create a custom learning topic"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    topic_id = advanced_features.create_custom_topic(
        user['id'], language, title, description, keywords, context, vocabulary
    )
    return {"status": "success", "topic_id": topic_id}


@app.get("/api/topics/list")
async def get_custom_topics(username: str, language: str):
    """Get user's custom topics"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    topics = advanced_features.get_custom_topics(user['id'], language)
    return {"status": "success", "topics": topics}


# Reading Materials Endpoints
@app.get("/api/reading/materials")
async def get_reading_materials(language: str, difficulty_level: Optional[str] = None):
    """Get reading materials"""
    materials = advanced_features.get_reading_materials(language, difficulty_level)
    return {"status": "success", "materials": materials}


@app.post("/api/reading/progress")
async def save_reading_progress(username: str, material_id: str, completed: bool,
                               comprehension_score: Optional[int] = None,
                               time_spent: Optional[int] = None, notes: str = ""):
    """Save reading progress"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    progress_id = advanced_features.save_reading_progress(
        user['id'], material_id, completed, comprehension_score, time_spent, notes
    )
    return {"status": "success", "progress_id": progress_id}


# Practice Calendar Endpoints
@app.post("/api/calendar/record")
async def record_practice_activity(username: str, language: str, practice_time: int,
                                  messages_sent: int, activities: List[str]):
    """Record daily practice activity"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    activity_id = advanced_features.record_practice_activity(
        user['id'], language, practice_time, messages_sent, activities
    )
    return {"status": "success", "activity_id": activity_id}


@app.get("/api/calendar/get")
async def get_practice_calendar(username: str, language: str, days: int = 90):
    """Get practice calendar"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    calendar = advanced_features.get_practice_calendar(user['id'], language, days)
    return {"status": "success", "calendar": calendar}


# Progress Reports Endpoint
@app.get("/api/reports/progress")
async def get_progress_report(username: str, language: str, period: str = "week"):
    """Get comprehensive progress report"""
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    report = advanced_features.generate_progress_report(user['id'], language, period)
    return {"status": "success", "report": report}


# Leaderboard Endpoint
@app.get("/api/leaderboard")
async def get_leaderboard(language: str, period: str = "all_time", limit: int = 50):
    """Get leaderboard rankings"""
    leaderboard = advanced_features.get_leaderboard(language, period, limit)
    return {"status": "success", "leaderboard": leaderboard}


@app.websocket("/ws/practice")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time language practice"""
    await websocket.accept()
    session_id = None
    user_id = None

    try:
        # Wait for session initialization with user info
        init_data = await websocket.receive_json()

        if init_data.get("type") != "init_session":
            await websocket.send_json({
                "type": "error",
                "message": "First message must be 'init_session'"
            })
            return

        username = init_data.get("username", "guest")
        language = init_data.get("language", "English")
        difficulty = init_data.get("difficulty", "beginner")

        # Get or create user
        user_id = database.get_or_create_user(username)
        database.update_last_login(user_id)

        # Initialize conversation session
        session_id = await conversation_manager.create_session(user_id, language, difficulty)

        # Get user progress
        progress = database.get_user_progress(user_id, language)
        current_level = progress[0].get('current_level', 'beginner') if progress else 'beginner'

        await websocket.send_json({
            "type": "session_created",
            "session_id": session_id,
            "user_id": user_id,
            "username": username,
            "current_level": current_level
        })

        while True:
            # Receive message from client
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "text_message":
                # Handle text input
                user_text = data.get("text")
                language = data.get("language", "English")

                # Get response from conversation manager
                response = await conversation_manager.process_message(
                    session_id=session_id,
                    user_message=user_text,
                    language=language
                )

                await websocket.send_json({
                    "type": "response",
                    "text": response["text"],
                    "feedback": response.get("feedback"),
                    "corrections": response.get("corrections"),
                    "context": response.get("context"),
                    "new_achievements": response.get("new_achievements", []),
                    "difficulty": response.get("difficulty"),
                    "stats": response.get("stats")
                })

            elif message_type == "audio_chunk":
                # Handle audio streaming (for future implementation)
                audio_data = data.get("audio")
                # Process audio with speech-to-text
                # This would integrate with Whisper or similar
                pass

            elif message_type == "get_stats":
                # Get current user statistics
                stats = await conversation_manager.get_user_stats(user_id, language)
                await websocket.send_json({
                    "type": "stats_update",
                    **stats
                })

            elif message_type == "end_session":
                # End the conversation session
                await conversation_manager.end_session(session_id)
                summary = await conversation_manager.get_session_summary(session_id)
                await websocket.send_json({
                    "type": "session_ended",
                    "summary": summary
                })
                break

    except WebSocketDisconnect:
        if session_id:
            await conversation_manager.end_session(session_id)
    except Exception as e:
        print(f"Error in websocket: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
