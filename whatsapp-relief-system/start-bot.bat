@echo off
cd /d "%~dp0"
title WhatsApp Bot
"C:\Program Files\nodejs\node.exe" index.js
echo.
echo Bot process exited. Press any key to close.
pause >nul
