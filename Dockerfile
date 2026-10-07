FROM python:3.11

WORKDIR /code

# Abhängigkeiten installieren
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Modell beim Erstellen des Containers vorab herunterladen
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')"

COPY . .

# Rechte für Ordnererstellung vergeben
RUN chmod -R 777 /code

# Hugging Face Spaces nutzt intern Port 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app"]
