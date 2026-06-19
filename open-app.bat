@echo off
cd /d "%~dp0"
echo Starting Trinetr Business Suite...
echo.
echo Keep this window open while using the app.
echo App URL: http://127.0.0.1:4173/
echo.
start "" "http://127.0.0.1:4173/"
node server.mjs
