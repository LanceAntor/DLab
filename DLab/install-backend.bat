@echo off
echo Installing backend dependencies...
cd backend
echo.
echo Removing old node_modules (if exists)...
if exist node_modules rmdir /s /q node_modules
echo.
echo Installing packages...
call npm install
echo.
echo Backend dependencies installed!
echo.
echo Dependencies installed:
echo - express: Web server framework
echo - cors: Cross-origin resource sharing
echo - @distube/ytdl-core: Updated YouTube downloader library
echo - node-fetch: HTTP request library
echo.
echo To run the backend server:
echo   cd backend
echo   npm start
echo.
pause
