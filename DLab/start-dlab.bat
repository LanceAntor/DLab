@echo off
title DLab YouTube Downloader - Full Stack Launcher
color 0A

echo ========================================
echo    DLab YouTube Downloader Launcher
echo ========================================
echo.

echo [INFO] Starting DLab application...
echo [INFO] This will start both frontend and backend servers
echo.

:: Get the current directory (should be the DLab project root)
set PROJECT_DIR=%~dp0

echo [INFO] Project directory: %PROJECT_DIR%
echo.

:: Check if we're in the correct directory
if not exist "%PROJECT_DIR%backend" (
    echo [ERROR] Backend directory not found!
    echo [ERROR] Make sure this script is in the DLab project root directory
    echo [ERROR] Expected structure:
    echo [ERROR]   DLab/
    echo [ERROR]     - backend/
    echo [ERROR]     - src/
    echo [ERROR]     - package.json
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%src" (
    echo [ERROR] Frontend src directory not found!
    echo [ERROR] Make sure this script is in the DLab project root directory
    pause
    exit /b 1
)

echo [INFO] Directory structure validated ✓
echo.

:: Start backend server in a new window
echo [INFO] Starting backend server...
start "DLab Backend Server" cmd /k "cd /d "%PROJECT_DIR%backend" && echo Starting DLab Backend Server... && echo. && node server.js"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend development server in a new window
echo [INFO] Starting frontend development server...
start "DLab Frontend Server" cmd /k "cd /d "%PROJECT_DIR%" && echo Starting DLab Frontend Server... && echo. && npm run dev"

:: Wait a moment for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo    DLab Application Started Successfully!
echo ========================================
echo.
echo ✓ Backend Server: Running on http://localhost:3001
echo ✓ Frontend Server: Running on http://localhost:5173
echo.
echo [INFO] Two new command windows have opened:
echo   1. Backend Server (Node.js + Express)
echo   2. Frontend Server (Vite + React)
echo.
echo [INFO] The application should automatically open in your browser
echo [INFO] If not, navigate to: http://localhost:5173
echo.
echo [TIP] To stop the servers, close both command windows
echo [TIP] Or press Ctrl+C in each window
echo.
echo [INFO] This window will close in 10 seconds...
echo [INFO] Press any key to close immediately

timeout /t 10 >nul
exit
