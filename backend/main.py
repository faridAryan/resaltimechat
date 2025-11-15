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
