#!/usr/bin/env bash
# Beende das Skript bei Fehlern
set -o errexit

# Installiere alle Python-Abhängigkeiten
pip install -r requirements.txt

# HIER KANNST DU MODELLE HERUNTERLADEN, falls das vorher deine setup.bat gemacht hat
# z.B.: wget https://example.com/modell.pt -O models/modell.pt