@echo off
cd /d "%~dp0"
echo Installing dependencies...
call npm install

echo.
echo Starting API server...
start "Rento API" cmd /k npm run dev:api

echo.
echo Starting Web server...
start "Rento Web" cmd /k npm run dev:web

echo.
echo Both servers should open in separate windows.
echo API: http://localhost:3000
echo Web: http://localhost:5173
pause
