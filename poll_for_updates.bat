@echo off
:loop
git pull
timeout /t 10 /nobreak >nul
goto loop
