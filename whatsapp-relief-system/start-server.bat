@echo off
cd /d "%~dp0"
title Disaster Response Server
"C:\Program Files\nodejs\node.exe" server.js
echo.
echo Server process exited. Press any key to close.
pause >nul
