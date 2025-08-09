@echo off
title DLab YouTube Downloader - Advanced Launcher
color 0A

echo ==========================================
echo    DLab YouTube Downloader - Full Stack
echo ==========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo [ERROR] Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js detected ✓
node --version

:: Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not available
    echo [ERROR] Please reinstall Node.js with npm
    pause
    exit /b 1
)

echo [INFO] npm detected ✓
npm --version
echo.

:: Get the current directory
set PROJECT_DIR=%~dp0

echo [INFO] Project directory: %PROJECT_DIR%

:: Validate project structure
if not exist "%PROJECT_DIR%backend\server.js" (
    echo [ERROR] Backend server.js not found!
    echo [ERROR] Expected: %PROJECT_DIR%backend\server.js
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%package.json" (
    echo [ERROR] Frontend package.json not found!
    echo [ERROR] Expected: %PROJECT_DIR%package.json
    pause
    exit /b 1
)

echo [INFO] Project structure validated ✓
echo.

:: Check if backend dependencies are installed
if not exist "%PROJECT_DIR%backend\node_modules" (
    echo [WARNING] Backend dependencies not found
    echo [INFO] Installing backend dependencies...
    cd /d "%PROJECT_DIR%backend"
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install backend dependencies
        pause
        exit /b 1
    )
    echo [INFO] Backend dependencies installed ✓
)

:: Check if frontend dependencies are installed
if not exist "%PROJECT_DIR%node_modules" (
    echo [WARNING] Frontend dependencies not found
    echo [INFO] Installing frontend dependencies...
    cd /d "%PROJECT_DIR%"
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
    echo [INFO] Frontend dependencies installed ✓
)

echo.
echo [INFO] All dependencies verified ✓
echo.

:: Kill any existing processes on the ports
echo [INFO] Checking for existing servers on ports 3001 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /PID %%a /F >nul 2>&1
echo [INFO] Ports cleared ✓
echo.

:: Start backend server
echo [INFO] Starting backend server on port 3001...
start "DLab Backend - DO NOT CLOSE" cmd /k "cd /d "%PROJECT_DIR%backend" && echo ================================ && echo    DLab Backend Server && echo ================================ && echo. && echo Server running on: http://localhost:3001 && echo API endpoints available && echo Press Ctrl+C to stop && echo. && node server.js"

:: Wait for backend to start
echo [INFO] Waiting for backend to initialize...
timeout /t 4 /nobreak >nul

:: Check if backend is running
echo [INFO] Verifying backend server...
curl -s http://localhost:3001/api/health >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Backend might be still starting...
    timeout /t 3 /nobreak >nul
)

:: Start frontend server
echo [INFO] Starting frontend development server on port 5173...
start "DLab Frontend - DO NOT CLOSE" cmd /k "cd /d "%PROJECT_DIR%" && echo ================================ && echo    DLab Frontend Server && echo ================================ && echo. && echo Server running on: http://localhost:5173 && echo Hot reload enabled && echo Press Ctrl+C to stop && echo. && npm run dev"

:: Wait for frontend to start
echo [INFO] Waiting for frontend to initialize...
timeout /t 6 /nobreak >nul

:: Open browser
echo [INFO] Opening application in browser...
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo ==========================================
echo    🚀 DLab Application Launched Successfully!
echo ==========================================
echo.
echo ✅ Backend API: http://localhost:3001
echo ✅ Frontend App: http://localhost:5173
echo ✅ Browser: Opening automatically
echo.
echo 📋 Application Features:
echo   • YouTube video downloading
echo   • Multiple quality options (360p to 1080p+)
echo   • Audio extraction (MP3)
echo   • Real-time video information
echo.
echo 🖥️  Two server windows are now running:
echo   1. Backend Server (Node.js + Express)
echo   2. Frontend Server (Vite + React + TypeScript)
echo.
echo ⚠️  Important:
echo   • Keep both server windows open while using the app
echo   • Close both windows to stop the application
echo   • Use Ctrl+C in each window for clean shutdown
echo.
echo 🔧 Troubleshooting:
echo   • If browser doesn't open: Navigate to http://localhost:5173
echo   • If downloads fail: Check backend window for errors
echo   • If page won't load: Wait 30 seconds for full startup
echo.
echo Happy downloading! 🎥
echo.
pause
