from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import json
from typing import List, Dict
import asyncio

from rag_system import RAGSystem
from conversation_manager import ConversationManager

load_dotenv()

app = FastAPI(title="Real-time Language Practice RAG System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG system and conversation manager
rag_system = RAGSystem()
conversation_manager = ConversationManager(rag_system)


@app.get("/")
async def root():
    return {"message": "Real-time Language Practice RAG System API"}


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


@app.websocket("/ws/practice")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time language practice"""
    await websocket.accept()
    session_id = None

    try:
        # Initialize conversation session
        session_id = await conversation_manager.create_session()
        await websocket.send_json({
            "type": "session_created",
            "session_id": session_id
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
                    "context": response.get("context")
                })

            elif message_type == "audio_chunk":
                # Handle audio streaming (for future implementation)
                audio_data = data.get("audio")
                # Process audio with speech-to-text
                # This would integrate with Whisper or similar
                pass

            elif message_type == "end_session":
                # End the conversation session
                await conversation_manager.end_session(session_id)
                await websocket.send_json({
                    "type": "session_ended",
                    "summary": await conversation_manager.get_session_summary(session_id)
                })
                break

    except WebSocketDisconnect:
        if session_id:
            await conversation_manager.end_session(session_id)
    except Exception as e:
        print(f"Error in websocket: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
