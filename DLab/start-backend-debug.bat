@echo off
echo Starting DLab Backend Server in DEBUG mode...
echo.
cd backend
echo Current directory: %CD%
echo.
echo Checking if node_modules exists...
if exist node_modules (
    echo ✓ node_modules found
) else (
    echo ✗ node_modules NOT found - run install-backend.bat first
    pause
    exit
)
echo.
echo Starting server with detailed logging...
set NODE_ENV=development
call npm start
pause
