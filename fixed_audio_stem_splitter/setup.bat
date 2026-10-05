@echo off
cd /d "%~dp0"
echo === Audio Stem Splitter Setup ===
where py >nul 2>nul
if errorlevel 1 (
  echo Python Launcher 'py' wurde nicht gefunden.
  echo Installiere Python 3.10+ von python.org und aktiviere den Python Launcher.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Erstelle virtuelle Umgebung...
  py -m venv .venv
)
call .venv\Scripts\activate.bat
echo Installiere Abhaengigkeiten...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
echo.
echo Setup abgeschlossen.
echo Jetzt start.bat ausfuehren.
pause
