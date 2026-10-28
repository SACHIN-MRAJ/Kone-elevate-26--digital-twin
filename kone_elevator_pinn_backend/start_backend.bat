@echo off
title KONE Elevator Digital Twin - PINN ML Backend
echo ========================================================
echo  Starting KONE Elevator PINN ML Backend (Port 8001)
echo ========================================================
cd /d "%~dp0"

if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found in venv\Scripts\python.exe!
    pause
    exit /b 1
)

echo [1/2] Activating Python Virtual Environment...
call venv\Scripts\activate.bat

echo [2/2] Launching FastAPI Uvicorn Server on port 8001...
echo Host: http://127.0.0.1:8001
echo API Docs: http://127.0.0.1:8001/docs
venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8001
pause
