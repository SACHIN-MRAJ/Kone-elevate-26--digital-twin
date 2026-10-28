@echo off
title KONE Elevator Digital Twin - Master Launcher
echo ========================================================
echo  Launching Full Stack (Backend + ML Engine + Frontend UI)
echo ========================================================

echo [1/2] Starting KONE ML Backend (Port 8001)...
start "KONE ML Backend (Port 8001)" cmd /k "cd /d "%~dp0kone_elevator_pinn_backend" && venv\Scripts\activate.bat && venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8001"

echo Waiting 3 seconds for backend initialization...
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend in separate window and opening browser...
start "" "http://127.0.0.1:8000/frontend/index.html"
start "KONE Frontend Server (Port 8000)" cmd /k "cd /d "%~dp0" && python -m http.server 8000"

echo.
echo ========================================================
echo  All services launched successfully!
echo  - Frontend UI: http://127.0.0.1:8000/frontend/index.html
echo  - Backend API: http://127.0.0.1:8001/docs
echo ========================================================
