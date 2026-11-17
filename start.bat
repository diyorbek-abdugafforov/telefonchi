@echo off
title Telefon Savdosi va Ombor Tizimi
echo =======================================================
echo   Telefon Savdosi va Ombor Hisobi Tizimi Ishga Tushmoqda...
echo =======================================================
echo.
cd /d "%~dp0"
start http://localhost:5000
npm start
pause
