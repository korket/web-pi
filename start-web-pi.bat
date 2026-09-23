@echo off
setlocal
rem Web-Pi one-click launcher: gateway + web dev server + browser.
rem Stop with Ctrl+C in each window (gateway disposes its pi process).

cd /d "%~dp0"

if not exist "node_modules" (
  echo First run: installing dependencies...
  call npm install || goto :fail
)

if not exist ".pi-sessions" mkdir ".pi-sessions"
if exist ".pi-sessions\token.txt" (
  set /p WEBPI_TOKEN=<".pi-sessions\token.txt"
) else (
  for /f %%i in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString('N')"') do set "WEBPI_TOKEN=%%i"
  >".pi-sessions\token.txt" echo %WEBPI_TOKEN%
)

echo Token: %WEBPI_TOKEN%

start "Web-Pi gateway" cmd /k npm run dev:gateway
timeout /t 3 /nobreak >nul
start "Web-Pi web" cmd /k npm run dev:web
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173/?token=%WEBPI_TOKEN%"
exit /b 0

:fail
echo npm install failed.
pause
exit /b 1
