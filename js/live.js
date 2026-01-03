// URL de l'API
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : `${window.location.origin}/api`;

// État
let piUrl = null;
let isStreaming = false;

// Éléments du DOM
const loadingEl = document.getElementById('loading');
const errorStateEl = document.getElementById('error-state');
const errorMessageEl = document.getElementById('error-message');
const btnRetryEl = document.getElementById('btn-retry');
const videoContainerEl = document.getElementById('video-container');
const liveIframeEl = document.getElementById('live-iframe');

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    startLive();
});

// Arrêter le stream quand on quitte la page
window.addEventListener('beforeunload', stopStream);
window.addEventListener('pagehide', stopStream);
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isStreaming) {
        stopStream();
    }
});

function setupEventListeners() {
    btnRetryEl.addEventListener('click', startLive);

    // Gestion de la modale d'info
    const btnInfo = document.getElementById('btn-info');
    if (btnInfo) {
        btnInfo.addEventListener('click', showInfoModal);
    }
}

async function startLive() {
    showLoading();

    try {
        // Charger la config
        const res = await fetch(`${API_BASE_URL}/pi-config`);
        const data = await res.json();

        if (!data.configured) {
            showError('Streaming non configuré');
            return;
        }

        piUrl = data.piUrl;

        // Démarrer le stream
        const streamRes = await fetch(`${piUrl}/api/streaming/start`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit'
        });
        const streamData = await streamRes.json();

        if (streamData.success) {
            isStreaming = true;
            // Attendre que le flux soit prêt
            await new Promise(r => setTimeout(r, 3000));
            showVideo();
        } else {
            throw new Error(streamData.error || 'Erreur de démarrage');
        }
    } catch (err) {
        console.error('Erreur:', err);
        showError('Connexion impossible');
    }
}

async function stopStream() {
    if (!piUrl || !isStreaming) return;
    
    isStreaming = false;
    
    try {
        await fetch(`${piUrl}/api/streaming/stop`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit'
        });
    } catch (err) {
        console.error('Erreur arrêt:', err);
    }
}

function showLoading() {
    loadingEl.style.display = 'block';
    videoContainerEl.style.display = 'none';
    errorStateEl.style.display = 'none';
}

function showVideo() {
    loadingEl.style.display = 'none';
    errorStateEl.style.display = 'none';
    liveIframeEl.src = `${piUrl}/birdcam/?controls=true&muted=true&autoplay=true`;
    videoContainerEl.style.display = 'block';
}

function showError(message) {
    loadingEl.style.display = 'none';
    videoContainerEl.style.display = 'none';
    errorMessageEl.textContent = message;
    errorStateEl.style.display = 'flex';
}

function showInfoModal() {
    const modal = document.getElementById('modal-info');
    const okBtn = document.getElementById('modal-info-ok');

    modal.classList.add('show');

    const cleanup = () => {
        modal.classList.remove('show');
        okBtn.removeEventListener('click', handleOk);
        modal.removeEventListener('click', handleOverlayClick);
    };

    const handleOk = () => {
        cleanup();
    };

    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            handleOk();
        }
    };

    okBtn.addEventListener('click', handleOk);
    modal.addEventListener('click', handleOverlayClick);
}
