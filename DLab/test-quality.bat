@echo off
echo Testing YouTube Quality Detection...
echo.
cd backend
echo Running quality detection test...
call npm run test-quality
echo.
echo Test completed!
pause
