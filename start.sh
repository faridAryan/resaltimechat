#!/bin/bash

# Real-time Language Practice - Startup Script

echo "Starting Real-time Language Practice Application..."

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "Error: backend/.env file not found!"
    echo "Please copy backend/.env.example to backend/.env and add your API keys"
    exit 1
fi

# Start backend
echo "Starting backend..."
cd backend
source venv/bin/activate 2>/dev/null || {
    echo "Virtual environment not found. Creating one..."
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
}

# Start backend in background
python main.py &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 3

# Start frontend
echo "Starting frontend..."
cd ../frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend
npm start &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "Application is starting!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopping servers...'; exit" INT

wait
