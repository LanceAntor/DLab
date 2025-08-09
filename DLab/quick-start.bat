@echo off
title DLab - Quick Start
color 0B

echo 🚀 DLab YouTube Downloader - Quick Start
echo.

:: Start both servers
start "DLab Backend" cmd /k "cd /d "%~dp0backend" && node server.js"
timeout /t 3 /nobreak >nul

start "DLab Frontend" cmd /k "cd /d "%~dp0" && npm run dev"
timeout /t 6 /nobreak >nul

:: Open browser
start "" "http://localhost:5173"

echo ✅ DLab started!
echo ✅ Backend: http://localhost:3001
echo ✅ Frontend: http://localhost:5173
echo.
echo Keep the opened windows running.
echo Close them to stop DLab.

timeout /t 5 >nul
