@echo off
rem Double-click or run: deploy "commit message"   (needs Git for Windows)
"%ProgramFiles%\Git\bin\bash.exe" "%~dp0scripts\deploy.sh" %*
pause
