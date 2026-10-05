document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('file');
    const fileLabel = document.getElementById('fileLabel');
    const uploadBtn = document.getElementById('uploadBtn');
    
    const statusCard = document.getElementById('statusCard');
    const statusTitle = document.getElementById('statusTitle');
    const statusMessage = document.getElementById('statusMessage');
    const progressBar = document.getElementById('progressBar');

    // Zeige den ausgewählten Dateinamen an
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileLabel.textContent = e.target.files[0].name;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (fileInput.files.length === 0) return;

        // UI anpassen
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Lädt hoch...';
        statusCard.classList.remove('hidden');
        progressBar.style.width = '10%';
        progressBar.style.background = 'var(--primary)';
        statusTitle.textContent = 'Upload erfolgreich!';
        statusMessage.textContent = 'Warte auf Verarbeitung...';

        const formData = new FormData(form);

        try {
            // Sende Datei an Server
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.task_id) {
                // Starte die regelmäßige Status-Abfrage (Polling)
                pollStatus(data.task_id);
            } else {
                throw new Error(data.error || 'Upload fehlgeschlagen');
            }
        } catch (error) {
            showError(error.message);
        }
    });

    function pollStatus(taskId) {
        // Frage alle 3 Sekunden beim Server nach dem Status
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/status/${taskId}`);
                const task = await response.json();

                statusMessage.textContent = task.message;

                if (task.status === 'processing') {
                    progressBar.style.width = '60%';
                } else if (task.status === 'completed') {
                    progressBar.style.width = '100%';
                    progressBar.style.background = 'var(--success)';
                    statusTitle.textContent = 'Fertig!';
                    clearInterval(interval);
                    
                    // Lade Seite nach 2 Sekunden neu, um die Ergebnisse zu zeigen
                    setTimeout(() => window.location.reload(), 2000);
                } else if (task.status === 'error') {
                    clearInterval(interval);
                    showError(task.message);
                }

            } catch (error) {
                clearInterval(interval);
                showError('Verbindung zum Server verloren.');
            }
        }, 3000); // 3000 Millisekunden = 3 Sekunden
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
