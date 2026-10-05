from flask import Flask, render_template, request, session, send_from_directory, jsonify
import os
import uuid
import threading
import subprocess

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'ein-sehr-geheimer-schluessel-123')

BASE_UPLOAD_FOLDER = 'uploads'
BASE_OUTPUT_FOLDER = 'outputs'

# In-Memory Speicher für den Aufgaben-Status
tasks = {}

def get_user_directories():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    user_id = session['user_id']
    user_upload = os.path.join(BASE_UPLOAD_FOLDER, user_id)
    user_output = os.path.join(BASE_OUTPUT_FOLDER, user_id)
    os.makedirs(user_upload, exist_ok=True)
    os.makedirs(user_output, exist_ok=True)
    return user_upload, user_output

def split_audio_task(task_id, filepath, output_dir):
    tasks[task_id]['status'] = 'processing'
    tasks[task_id]['message'] = 'KI lädt Modell und analysiert Audio (Dies kann einige Minuten dauern)...'
    
    try:
        # Führt Demucs als Subprozess aus, damit Gunicorn nicht blockiert wird.
        # Demucs speichert die Dateien automatisch im output_dir
        command = ["python", "-m", "demucs", "--out", output_dir, filepath]
        
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        
        # Warten bis der Prozess fertig ist
        process.wait()
        
        if process.returncode == 0:
            tasks[task_id]['status'] = 'completed'
            tasks[task_id]['message'] = 'Audio erfolgreich getrennt!'
        else:
            tasks[task_id]['status'] = 'error'
            tasks[task_id]['message'] = 'Fehler: Server hat nicht genug Arbeitsspeicher (Out of Memory) oder ungültige Datei.'
    except Exception as e:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['message'] = f'Interner Fehler: {str(e)}'

@app.route('/')
def index():
    _, user_output = get_user_directories()
    
    user_projects = []
    if os.path.exists(user_output):
        # Durchsuche alle Unterordner, da Demucs oft Ordner wie "htdemucs/songname" anlegt
        for root, dirs, files in os.walk(user_output):
            for file in files:
                if file.endswith(('.wav', '.mp3', '.flac')):
                    # Relativen Pfad für den Download erstellen
                    rel_path = os.path.relpath(os.path.join(root, file), user_output)
                    # Für Windows-Kompatibilität bei lokaler Entwicklung Backslash zu Slash ändern
                    rel_path = rel_path.replace('\\', '/')
                    user_projects.append(rel_path)
                    
    return render_template('index.html', projects=user_projects)

@app.route('/upload', methods=['POST'])
def upload_file():
    user_upload, user_output = get_user_directories()
    
    if 'file' not in request.files:
        return jsonify({"error": "Keine Datei gefunden"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Keine Datei ausgewählt"}), 400
        
    filepath = os.path.join(user_upload, file.filename)
    file.save(filepath)
    
    # Eindeutige ID für diesen Verarbeitungsjob erstellen
    task_id = str(uuid.uuid4())
    tasks[task_id] = {'status': 'queued', 'message': 'Datei hochgeladen. In Warteschlange...'}
    
    # Hintergrund-Thread starten
    thread = threading.Thread(target=split_audio_task, args=(task_id, filepath, user_output))
    thread.start()
    
    return jsonify({"task_id": task_id}), 200

@app.route('/status/<task_id>')
def get_status(task_id):
    task = tasks.get(task_id, {"status": "not_found", "message": "Aufgabe nicht gefunden"})
    return jsonify(task)

# Wichtig: <path:filename> erlaubt es, auch Dateien in Unterordnern herunterzuladen
@app.route('/download/<path:filename>')
def download_file(filename):
    _, user_output = get_user_directories()
    return send_from_directory(user_output, filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
