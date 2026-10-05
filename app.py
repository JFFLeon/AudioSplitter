from flask import Flask, render_template, request, session, send_from_directory, jsonify
import os
import uuid
import threading
import subprocess

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'geheimer-audio-splitter-key-9988')

BASE_UPLOAD_FOLDER = 'uploads'
BASE_OUTPUT_FOLDER = 'outputs'

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
    tasks[task_id]['logs'] = ['Starte KI-Audio-Trennung (Demucs)...']
    
    try:
        command = [
            "python", "-m", "demucs",
            "-n", "htdemucs",
            "--out", output_dir,
            filepath
        ]
        
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Liest Ausgaben zeilenweise für das Live-Terminal im Frontend
        for line in iter(process.stdout.readline, ''):
            clean_line = line.strip()
            if clean_line:
                tasks[task_id]['logs'].append(clean_line)
                if len(tasks[task_id]['logs']) > 15:
                    tasks[task_id]['logs'].pop(0)

        process.stdout.close()
        return_code = process.wait()

        if return_code == 0:
            tasks[task_id]['status'] = 'completed'
            tasks[task_id]['message'] = 'Audio erfolgreich getrennt!'
        else:
            tasks[task_id]['status'] = 'error'
            tasks[task_id]['message'] = 'Fehler: Server hat eventuell nicht genug RAM (Out of Memory auf Render Free).'

    except Exception as e:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['message'] = f'Interner Fehler: {str(e)}'

@app.route('/')
def index():
    _, user_output = get_user_directories()
    
    grouped_projects = {}
    if os.path.exists(user_output):
        for root, dirs, files in os.walk(user_output):
            for file in files:
                if file.endswith(('.wav', '.mp3', '.flac', '.ogg')):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, user_output).replace('\\', '/')
                    
                    parts = rel_path.split('/')
                    song_name = parts[-2] if len(parts) >= 2 else "Unbenannt"
                    stem_name = os.path.splitext(parts[-1])[0]
                    
                    if song_name not in grouped_projects:
                        grouped_projects[song_name] = []
                    
                    grouped_projects[song_name].append({
                        'stem': stem_name,
                        'filename': rel_path
                    })
                    
    return render_template('index.html', grouped_projects=grouped_projects)

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
    
    task_id = str(uuid.uuid4())
    tasks[task_id] = {
        'status': 'queued',
        'message': 'Datei empfangen. Vorbereitung...',
        'logs': ['Upload abgeschlossen. Job gestartet...']
    }
    
    thread = threading.Thread(target=split_audio_task, args=(task_id, filepath, user_output))
    thread.daemon = True
    thread.start()
    
    return jsonify({"task_id": task_id}), 200

@app.route('/status/<task_id>')
def get_status(task_id):
    task = tasks.get(task_id, {"status": "not_found", "message": "Unbekannter Job"})
    return jsonify(task)

@app.route('/download/<path:filename>')
def download_file(filename):
    _, user_output = get_user_directories()
    return send_from_directory(user_output, filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
