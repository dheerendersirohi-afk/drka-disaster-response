@echo off
cd /d "%~dp0"
start "Disaster Server" cmd /k ""C:\Program Files\nodejs\node.exe" server.js"
timeout /t 3 /nobreak >nul
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" http://localhost:3000
