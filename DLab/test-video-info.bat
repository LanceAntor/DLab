@echo off
echo Testing Video Info API Response...
echo.
cd backend
echo.
echo Make sure the backend server is running first!
echo Press any key to continue or Ctrl+C to cancel...
pause
echo.
echo Running video info test...
call npm run test-video-info
echo.
echo Test completed!
pause
