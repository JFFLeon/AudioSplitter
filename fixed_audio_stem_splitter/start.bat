@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Virtuelle Python-Umgebung nicht gefunden.
  echo Bitte zuerst setup.bat ausfuehren.
  pause
  exit /b 1
)
.venv\Scripts\python.exe app.py
pause
