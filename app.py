from flask import Flask, render_template, request, session, send_from_directory
import os
import uuid

app = Flask(__name__)
# WICHTIG: Ein Secret Key ist für Sessions zwingend erforderlich
app.secret_key = os.environ.get('SECRET_KEY', 'ein-sehr-geheimer-schluessel-123')

BASE_UPLOAD_FOLDER = 'uploads'
BASE_OUTPUT_FOLDER = 'outputs'


# Hilfsfunktion, um benutzerspezifische Ordner zu erstellen/abzurufen
def get_user_directories():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())

    user_id = session['user_id']
    user_upload = os.path.join(BASE_UPLOAD_FOLDER, user_id)
    user_output = os.path.join(BASE_OUTPUT_FOLDER, user_id)

    os.makedirs(user_upload, exist_ok=True)
    os.makedirs(user_output, exist_ok=True)

    return user_upload, user_output


@app.route('/')
def index():
    user_upload, user_output = get_user_directories()

    # Lese nur die Dateien dieses spezifischen Users aus
    user_projects = os.listdir(user_output) if os.path.exists(user_output) else []

    return render_template('index.html', projects=user_projects)


@app.route('/upload', methods=['POST'])
def upload_file():
    user_upload, user_output = get_user_directories()

    if 'file' not in request.files:
        return "Keine Datei gefunden", 400

    file = request.files['file']
    if file.filename != '':
        filepath = os.path.join(user_upload, file.filename)
        file.save(filepath)

        # HIER DEINE SPLITTER-LOGIK EINFÜGEN
        # output_path = user_output
        # split_audio(filepath, output_path)

        return "Erfolgreich verarbeitet", 200


# Route zum Herunterladen/Anhören der fertigen Dateien
@app.route('/download/<filename>')
def download_file(filename):
    _, user_output = get_user_directories()
    return send_from_directory(user_output, filename)


if __name__ == '__main__':
    # Nur für lokales Testen. Auf Render übernimmt Gunicorn.
    app.run(debug=True, host='0.0.0.0', port=5000)