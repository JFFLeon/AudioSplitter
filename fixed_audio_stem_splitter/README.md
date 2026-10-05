# Audio Stem Splitter

Lokale Web-App zum Trennen von MP3/WAV/M4A/FLAC/OGG in Vocals, Drums, Bass und Other mit Demucs. Danach koennen die Spuren angehoert, geschnitten und heruntergeladen werden.

## Windows – einfachster Start

1. Python 3.10+ installieren.
2. FFmpeg installieren und sicherstellen, dass `ffmpeg` im PATH liegt.
3. `setup.bat` doppelklicken.
4. Danach `start.bat` doppelklicken.
5. Browser oeffnen: `http://127.0.0.1:8000`

Alternativ im Terminal:

```bat
py -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python app.py
```

**Wichtig:** `http://127.0.0.1:8000` ist eine Browser-Adresse und kein CMD-Befehl.

Beim ersten Einsatz laedt Demucs das Modell herunter. Das kann einige Zeit und mehrere GB Speicher benoetigen.
