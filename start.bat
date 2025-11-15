@echo off
REM Real-time Language Practice - Startup Script for Windows

echo Starting Real-time Language Practice Application...

REM Check if .env exists
if not exist backend\.env (
    echo Error: backend\.env file not found!
    echo Please copy backend\.env.example to backend\.env and add your API keys
    exit /b 1
)

REM Start backend
echo Starting backend...
cd backend

REM Check if virtual environment exists
if not exist venv (
    echo Virtual environment not found. Creating one...
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)

REM Start backend in new window
start "Backend Server" cmd /c "python main.py"
echo Backend started in new window

REM Wait for backend to be ready
echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend...
cd ..\frontend

REM Install dependencies if needed
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

REM Start frontend in new window
start "Frontend Server" cmd /c "npm start"
echo Frontend started in new window

echo.
echo Application is starting!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Close the command windows to stop the servers

pause
