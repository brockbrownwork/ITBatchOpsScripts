@echo off
SETLOCAL

SET "BRANCH_NAME=main"

REM Check for Git
where git >nul 2>nul
if errorlevel 1 (
    echo Error: Git not found.
    goto :EOF
)

echo.
echo Checking for remote changes on branch: **%BRANCH_NAME%**...
echo.

REM Fetch updates
git fetch origin
if errorlevel 1 (
    echo Error during git fetch. Check connection/repo status.
    goto :EOF
)

REM Compare local main with remote main
set "IS_BEHIND="
for /f "delims=" %%i in ('git rev-list --count ^
    %BRANCH_NAME%..origin/%BRANCH_NAME% 2^>nul') do (
    if %%i GTR 0 set "IS_BEHIND=true"
)

if defined IS_BEHIND (
    echo **Remote changes detected!**
    echo.
    set /p "CHOICE=Would you like to pull the latest changes now? (Y/N): "
    
    if /i "%CHOICE%"=="Y" (
        echo.
        echo Performing git pull...
        git pull origin %BRANCH_NAME%
        if errorlevel 0 (
            echo.
            echo **Pull successful!**
        ) else (
            echo.
            echo Error: Pull failed. You may have local conflicts.
        )
    ) else (
        echo.
        echo Pull operation skipped by user.
    )
) else (
    echo Your local branch is **up to date** with origin/%BRANCH_NAME%.
)

echo.
echo Script finished.
ENDLOCAL
PAUSE