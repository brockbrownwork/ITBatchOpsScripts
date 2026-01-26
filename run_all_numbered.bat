@echo off
REM Runs all numbered batch and python files in separate cmd windows

start "0 - Check for Updates" cmd /c "0_check_for_updates.bat"
start "1 - Caffeine" cmd /c "python 1_caffeine.py"
start "2 - Critical Job Reminders" cmd /c "python 2_critical_job_reminders.py"
start "3 - Susejboot" cmd /c "3_Susejboot.bat"
start "4 - Watch for Blue" cmd /c "python 4_watch_for_blue.py"

echo All numbered scripts launched in separate windows.
