@echo off
title DLab - Shutdown
color 0C

echo 🛑 DLab YouTube Downloader - Shutdown
echo.

echo [INFO] Stopping DLab servers...

:: Kill processes on DLab ports
echo [INFO] Stopping backend server (port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    echo Killing process %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo [INFO] Stopping frontend server (port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo Killing process %%a
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill any Node.js processes that might be related
echo [INFO] Cleaning up remaining Node.js processes...
taskkill /IM node.exe /F >nul 2>&1

echo.
echo ✅ DLab servers stopped successfully!
echo ✅ All processes cleaned up
echo.
echo You can now safely close this window.
echo.
pause
