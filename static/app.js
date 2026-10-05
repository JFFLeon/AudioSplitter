document.addEventListener('DOMContentLoaded', () => {
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
        
        startTimer();

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
            showError(error.message);
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
                    statusTitle.textContent = 'KI trennt Audio-Spuren...';
                    statusMessage.textContent = 'Auf Render Free dauert dies ca. 2–4 Minuten.';
                    progressBar.style.width = '65%';
                } else if (task.status === 'completed') {
                    stopTimer();
                    progressBar.style.width = '100%';
                    progressBar.style.background = 'var(--success)';
                    statusTitle.textContent = 'Fertigstellung erfolgreich!';
                    statusMessage.textContent = 'Lade Ergebnisse...';
                    clearInterval(interval);
                    
                    setTimeout(() => window.location.reload(), 1500);
                } else if (task.status === 'error') {
                    stopTimer();
                    clearInterval(interval);
                    showError(task.message);
                }
            } catch (error) {
                stopTimer();
                clearInterval(interval);
                showError('Verbindung zum Server unterbrochen.');
            }
        }, 3000);
    }

    function startTimer() {
        secondsElapsed = 0;
        timerInterval = setInterval(() => {
            secondsElapsed++;
            const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
            const secs = String(secondsElapsed % 60).padStart(2, '0');
            elapsedTimer.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
    }

    function showError(message) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Erneut versuchen';
        statusTitle.textContent = 'Fehler aufgetreten';
        statusTitle.style.color = 'var(--error)';
        statusMessage.textContent = message;
        progressBar.style.background = 'var(--error)';
        progressBar.style.width = '100%';
    }
});
