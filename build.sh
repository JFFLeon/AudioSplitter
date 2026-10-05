#!/usr/bin/env bash
set -o errexit

# Pakete installieren
pip install -r requirements.txt

# KI-Modell bereits beim Build herunterladen (vermeidet Wartezeit bei User-Anfragen)
echo "Lade Demucs KI-Modell vorab herunter..."
python -c "from demucs.pretrained import get_model; get_model('htdemucs')"
