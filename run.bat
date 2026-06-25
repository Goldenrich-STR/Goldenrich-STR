@echo off
echo Starting Goldenrich STR application...

echo Launching FastAPI Backend on http://localhost:8001...
start powershell -NoExit -Command "cd backend; .\venv\Scripts\uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

echo Launching React Frontend on http://localhost:3000...
start powershell -NoExit -Command "cd frontend; npm start"

echo Backend and Frontend are starting in separate windows!
