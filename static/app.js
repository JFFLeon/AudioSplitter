const wavesurferInstances = {};
const nativeAudioElements = {};

document.addEventListener('DOMContentLoaded', () => {
    initWaveforms();
    initUploadForm();
});

function initWaveforms() {
    document.querySelectorAll('.audacity-studio').forEach(studio => {
        const songId = studio.dataset.songId;
        wavesurferInstances[songId] = {};
        nativeAudioElements[songId] = {};

        const trackElements = studio.querySelectorAll('.waveform-element');
        let masterDuration = 0;

        trackElements.forEach(elem => {
            const stem = elem.id.split('-').pop();
            const audioUrl = elem.dataset.url;
            const loadingElem = document.getElementById(`loading-${songId}-${stem}`);
            const audioFallback = document.getElementById(`audio-fallback-${songId}-${stem}`);

            nativeAudioElements[songId][stem] = audioFallback;

            let waveColor = '#3b82f6';
            let progressColor = '#60a5fa';
            if (stem === 'vocals') { waveColor = '#ec4899'; progressColor = '#f472b6'; }
            else if (stem === 'drums') { waveColor = '#f97316'; progressColor = '#fb923c'; }
            else if (stem === 'other') { waveColor = '#8b5cf6'; progressColor = '#a78bfa'; }

            try {
                // WaveSurfer mit expliziter URL und HTML5-Media-Kopplung
                const ws = WaveSurfer.create({
                    container: elem,
                    url: audioUrl,
                    media: audioFallback,
                    waveColor: waveColor,
                    progressColor: progressColor,
                    cursorColor: '#f43f5e',
                    cursorWidth: 2,
                    height: 70,
                    normalize: true
                });

                wavesurferInstances[songId][stem] = ws;

                // Sobald die Wellenform berechnet ist, Ladeanzeige ausblenden
                ws.on('ready', () => {
                    if (loadingElem) loadingElem.style.display = 'none';
                    masterDuration = ws.getDuration();
                    updateTimeDisplay(songId, 0, masterDuration);
                });

                ws.on('interaction', (newTime) => {
                    syncSeeking(songId, newTime);
                });

                ws.on('timeupdate', (currentTime) => {
                    if (stem === Object.keys(wavesurferInstances[songId])[0]) {
                        updateTimeDisplay(songId, currentTime, masterDuration);
                    }
                });

                ws.on('error', (err) => {
                    console.error('WaveSurfer Rendering-Fehler:', err);
                    if (loadingElem) loadingElem.textContent = 'Spur geladen (Audio bereit)';
                });

            } catch (err) {
                console.error('WaveSurfer Init-Fehler:', err);
                if (loadingElem) loadingElem.textContent = 'Audio bereit';
            }
        });
    });
}

function syncSeeking(songId, targetTime) {
    Object.values(wavesurferInstances[songId]).forEach(ws => {
        ws.setTime(targetTime);
    });
}

function toggleMasterPlay(songId) {
    const instances = Object.values(wavesurferInstances[songId]);
    const nativeAudios = Object.values(nativeAudioElements[songId]);

    if (instances.length === 0 && nativeAudios.length === 0) return;

    let isPlaying = false;
    if (instances.length > 0 && instances[0]) {
        isPlaying = instances[0].isPlaying();
    } else if (nativeAudios.length > 0 && nativeAudios[0]) {
        isPlaying = !nativeAudios[0].paused;
    }

    if (isPlaying) {
        instances.forEach(ws => ws.pause());
        nativeAudios.forEach(a => a && a.pause());
    } else {
        instances.forEach(ws => ws.play().catch(e => console.log('Play-Error:', e)));
        nativeAudios.forEach(a => a && a.play().catch(e => console.log('Audio-Play-Error:', e)));
    }
}

function stopMasterPlay(songId) {
    Object.values(wavesurferInstances[songId]).forEach(ws => {
        ws.pause();
        ws.setTime(0);
    });
    Object.values(nativeAudioElements[songId]).forEach(a => {
        if (a) {
            a.pause();
            a.currentTime = 0;
        }
    });
}

function toggleMute(songId, stem, btn) {
    const ws = wavesurferInstances[songId][stem];
    const audio = nativeAudioElements[songId][stem];

    const isCurrentlyMuted = btn.classList.contains('active');
    const nextMuteState = !isCurrentlyMuted;

    if (ws) ws.setMuted(nextMuteState);
    if (audio) audio.muted = nextMuteState;

    btn.classList.toggle('active', nextMuteState);
}

function toggleSolo(songId, stem, btn) {
    const instances = wavesurferInstances[songId];
    const nativeAudios = nativeAudioElements[songId];
    if (!instances) return;

    const isCurrentlySolo = btn.classList.contains('active');
    btn.classList.toggle('active', !isCurrentlySolo);

    const activeSolos = Array.from(document.querySelectorAll(`.audacity-studio[data-song-id="${songId}"] .btn-solo.active`));
    
    if (activeSolos.length > 0) {
        Object.keys(instances).forEach(s => {
            const isStemSolo = document.querySelector(`.audacity-studio[data-song-id="${songId}"] .track-row[data-stem="${s}"] .btn-solo`).classList.contains('active');
            if (instances[s]) instances[s].setMuted(!isStemSolo);
            if (nativeAudios[s]) nativeAudios[s].muted = !isStemSolo;
        });
    } else {
        Object.keys(instances).forEach(s => {
            const isMutedByBtn = document.querySelector(`.audacity-studio[data-song-id="${songId}"] .track-row[data-stem="${s}"] .btn-mute`).classList.contains('active');
            if (instances[s]) instances[s].setMuted(isMutedByBtn);
            if (nativeAudios[s]) nativeAudios[s].muted = isMutedByBtn;
        });
    }
}

function changeVolume(songId, stem, value) {
    const ws = wavesurferInstances[songId][stem];
    const audio = nativeAudioElements[songId][stem];
    const vol = parseFloat(value);

    if (ws) ws.setVolume(vol);
    if (audio) audio.volume = vol;
}

function updateTimeDisplay(songId, current, total) {
    const elem = document.getElementById(`time-display-${songId}`);
    if (elem) {
        elem.textContent = `${formatTime(current)} / ${formatTime(total)}`;
    }
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

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
