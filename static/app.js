// Globaler Speicher für WaveSurfer Instanzen pro Song
const wavesurferInstances = {};
const soloStates = {};

document.addEventListener('DOMContentLoaded', () => {
    initWaveforms();
    initUploadForm();
});

// Initialisiert die Audacity-Wellenformen für alle Songs auf der Seite
function initWaveforms() {
    document.querySelectorAll('.audacity-studio').forEach(studio => {
        const songId = studio.dataset.songId;
        wavesurferInstances[songId] = {};
        soloStates[songId] = false;

        const trackElements = studio.querySelectorAll('.waveform-element');
        let masterDuration = 0;

        trackElements.forEach(elem => {
            const stem = elem.id.split('-').pop();
            const audioUrl = elem.dataset.url;

            // Farbgebung je nach Stem-Typ
            let waveColor = '#3b82f6';
            let progressColor = '#60a5fa';
            if (stem === 'vocals') { waveColor = '#ec4899'; progressColor = '#f472b6'; }
            else if (stem === 'drums') { waveColor = '#f97316'; progressColor = '#fb923c'; }
            else if (stem === 'other') { waveColor = '#8b5cf6'; progressColor = '#a78bfa'; }

            // WaveSurfer Instanz erstellen
            const ws = WaveSurfer.create({
                container: `#${elem.id}`,
                waveColor: waveColor,
                progressColor: progressColor,
                cursorColor: '#f43f5e',
                cursorWidth: 2,
                height: 80,
                normalize: true,
                url: audioUrl
            });

            wavesurferInstances[songId][stem] = ws;

            // Sobald die erste Spur geladen ist, Dauer anzeigen
            ws.on('ready', () => {
                masterDuration = ws.getDuration();
                updateTimeDisplay(songId, 0, masterDuration);
            });

            // Synchrones Seeking (Klick irgendwo in die Waveform versetzt ALLE Spuren)
            ws.on('interaction', (newTime) => {
                syncSeeking(songId, newTime);
            });

            // Zeitaktualisierung bei Wiedergabe
            ws.on('timeupdate', (currentTime) => {
                if (stem === Object.keys(wavesurferInstances[songId])[0]) {
                    updateTimeDisplay(songId, currentTime, masterDuration);
                }
            });
        });
    });
}

// Synchronisiert den Klick an eine beliebige Stelle (Audacity-Seeking)
function syncSeeking(songId, targetTime) {
    Object.values(wavesurferInstances[songId]).forEach(ws => {
        ws.setTime(targetTime);
    });
}

// Master Play / Pause Toggle
function toggleMasterPlay(songId) {
    const instances = Object.values(wavesurferInstances[songId]);
    if (instances.length === 0) return;

    const isPlaying = instances[0].isPlaying();
    instances.forEach(ws => {
        if (isPlaying) {
            ws.pause();
        } else {
            ws.play();
        }
    });
}

// Master Stop (Zurück zum Anfang)
function stopMasterPlay(songId) {
    Object.values(wavesurferInstances[songId]).forEach(ws => {
        ws.pause();
        ws.setTime(0);
    });
}

// Mute Toggle (Stummschalten)
function toggleMute(songId, stem, btn) {
    const ws = wavesurferInstances[songId][stem];
    if (!ws) return;

    const isMuted = ws.getMuted();
    ws.setMuted(!isMuted);
    btn.classList.toggle('active', !isMuted);
}

// Solo Toggle (Nur diese Spur anhören)
function toggleSolo(songId, stem, btn) {
    const instances = wavesurferInstances[songId];
    if (!instances) return;

    const isCurrentlySolo = btn.classList.contains('active');
    btn.classList.toggle('active', !isCurrentlySolo);

    // Prüfen, ob noch eine Spur im Solo-Modus ist
    const activeSolos = Array.from(document.querySelectorAll(`.audacity-studio[data-song-id="${songId}"] .btn-solo.active`));
    
    if (activeSolos.length > 0) {
        // Mindestens eine Spur ist Solo -> Alle NICHT-Solo Spuren stummschalten
        Object.keys(instances).forEach(s => {
            const isStemSolo = document.querySelector(`.audacity-studio[data-song-id="${songId}"] .track-row[data-stem="${s}"] .btn-solo`).classList.contains('active');
            instances[s].setMuted(!isStemSolo);
        });
    } else {
        // Kein Solo mehr aktiv -> Mute-Zustände basierend auf den M-Buttons wiederherstellen
        Object.keys(instances).forEach(s => {
            const isMutedByBtn = document.querySelector(`.audacity-studio[data-song-id="${songId}"] .track-row[data-stem="${s}"] .btn-mute`).classList.contains('active');
            instances[s].setMuted(isMutedByBtn);
        });
    }
}

// Lautstärke-Regler für einzelne Spuren
function changeVolume(songId, stem, value) {
    const ws = wavesurferInstances[songId][stem];
    if (ws) {
        ws.setVolume(parseFloat(value));
    }
}

// Zeitanzeige Formatierung (00:00 / 03:45)
function updateTimeDisplay(songId, current, total) {
    const elem = document.getElementById(`time-display-${songId}`);
    if (elem) {
        elem.textContent = `${formatTime(current)} / ${formatTime(total)}`;
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Live-Polling & Upload Handler
function initUploadForm() {
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('file');
    const fileLabel = document.getElementById('fileLabel');
    const uploadBtn = document.getElementById('uploadBtn');
    
    const statusCard = document.getElementById('statusCard');
    const statusTitle = document.getElementById('statusTitle');
    const statusMessage = document.getElementById('statusMessage');
    const progressBar = document.getElementById('progressBar');
    const terminalLogs = document.getElementById('terminalLogs');
    const elapsedTimer = document.getElementById('elapsedTimer');

    let timerInterval = null;
    let secondsElapsed = 0;

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileLabel.textContent = `Ausgewählt: ${e.target.files[0].name}`;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (fileInput.files.length === 0) return;

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Upload läuft...';
        statusCard.classList.remove('hidden');
        
        secondsElapsed = 0;
        timerInterval = setInterval(() => {
            secondsElapsed++;
            elapsedTimer.textContent = formatTime(secondsElapsed);
        }, 1000);

        const formData = new FormData(form);

        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            const data = await response.json();

            if (response.ok && data.task_id) {
                uploadBtn.textContent = 'Verarbeitung gestartet';
                pollStatus(data.task_id);
            } else {
                throw new Error(data.error || 'Upload fehlgeschlagen');
            }
        } catch (error) {
            if (timerInterval) clearInterval(timerInterval);
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Erneut versuchen';
            statusTitle.textContent = 'Fehler aufgetreten';
            statusMessage.textContent = error.message;
        }
    });

    function pollStatus(taskId) {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/status/${taskId}`);
                const task = await response.json();

                if (task.logs && task.logs.length > 0) {
                    terminalLogs.textContent = task.logs.join('\n');
                    terminalLogs.scrollTop = terminalLogs.scrollHeight;
                }

                if (task.status === 'processing') {
                    statusTitle.textContent = 'KI trennt Spuren...';
                    statusMessage.textContent = 'Verarbeitung auf GPU läuft...';
                    progressBar.style.width = '70%';
                } else if (task.status === 'completed') {
                    if (timerInterval) clearInterval(timerInterval);
                    progressBar.style.width = '100%';
                    statusTitle.textContent = 'Fertig!';
                    clearInterval(interval);
                    setTimeout(() => window.location.reload(), 1200);
                } else if (task.status === 'error') {
                    if (timerInterval) clearInterval(timerInterval);
                    clearInterval(interval);
                    statusTitle.textContent = 'Fehler';
                    statusMessage.textContent = task.message;
                }
            } catch (error) {
                if (timerInterval) clearInterval(timerInterval);
                clearInterval(interval);
            }
        }, 3000);
    }
}
