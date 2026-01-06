// ==========================================
// Panneau de contrôle - Settings
// ==========================================

// URL de l'API (compatible avec toutes les pages)
const SETTINGS_API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : `${window.location.origin}/api`;

// État global
let settingsPiUrl = null;
let settingsPiConfigCache = null;
let heartbeatInterval = null;
let lastHeartbeatData = null;

// Éléments du DOM (initialisés au chargement)
let piStatusIndicator = null;
let piStatusDot = null;
let piStatusText = null;
let modalSettings = null;
let btnSettings = null;
let btnSettingsCancel = null;
let btnSettingsSave = null;
let btnToggleDetection = null;
let btnLive = null;
let configFields = {};
let statusElements = {};

// Éléments du système (shutdown/reboot)
let btnSystemShutdown = null;
let btnSystemReboot = null;
let modalSystemConfirm = null;
let systemConfirmAction = null; // 'shutdown' ou 'reboot'

// Clé localStorage pour l'état du Pi
const PI_STATUS_STORAGE_KEY = 'storybird_pi_online';

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initSettingsElements();
    applyStoredPiStatus(); // Appliquer l'état sauvegardé immédiatement
    setupSettingsListeners();
    startHeartbeat();
});

// Appliquer l'état sauvegardé du Pi pour éviter le "flash"
function applyStoredPiStatus() {
    const storedStatus = localStorage.getItem(PI_STATUS_STORAGE_KEY);
    // Par défaut, on considère hors ligne si pas d'état sauvegardé
    const isOnline = storedStatus === 'true';
    
    // Appliquer l'état de l'indicateur de connexion immédiatement
    if (piStatusDot) {
        piStatusDot.classList.toggle('online', isOnline);
        piStatusDot.classList.toggle('offline', !isOnline);
    }
    if (piStatusText) {
        piStatusText.textContent = isOnline ? 'en ligne' : 'hors ligne';
    }
    
    // Appliquer l'opacité immédiatement
    if (btnSettings) {
        btnSettings.style.opacity = isOnline ? '1' : '0.3';
        btnSettings.style.pointerEvents = isOnline ? 'auto' : 'none';
    }
    if (btnLive) {
        btnLive.style.opacity = isOnline ? '1' : '0.3';
        btnLive.style.pointerEvents = isOnline ? 'auto' : 'none';
    }
    
    // Rediriger si sur /live et Pi hors ligne
    if (!isOnline && window.location.pathname === '/live') {
        window.location.href = '/';
    }
}

// Initialiser les références aux éléments du DOM
function initSettingsElements() {
    piStatusIndicator = document.getElementById('pi-status-indicator');
    piStatusDot = piStatusIndicator?.querySelector('.pi-status-dot');
    piStatusText = piStatusIndicator?.querySelector('.pi-status-text');
    
    modalSettings = document.getElementById('modal-settings');
    btnSettings = document.getElementById('btn-settings');
    btnSettingsCancel = document.getElementById('modal-settings-cancel');
    btnSettingsSave = document.getElementById('modal-settings-save');
    
    btnToggleDetection = document.getElementById('btn-toggle-detection');
    btnLive = document.getElementById('btn-live');
    
    configFields = {
        recordingDuration: document.getElementById('config-recording-duration'),
        recordingCooldown: document.getElementById('config-recording-cooldown'),
        nightEnabled: document.getElementById('config-night-enabled'),
        nightStart: document.getElementById('config-night-start'),
        nightEnd: document.getElementById('config-night-end'),
        motionThreshold: document.getElementById('config-motion-threshold'),
        motionFrames: document.getElementById('config-motion-frames')
    };
    
    statusElements = {
        connection: document.getElementById('status-connection-value'),
        version: document.getElementById('status-version-value'),
        uptime: document.getElementById('status-uptime-value'),
        temp: document.getElementById('status-temp-value'),
        disk: document.getElementById('status-disk-value'),
        detection: document.getElementById('status-detection-value')
    };
    
    // Éléments système (shutdown/reboot)
    btnSystemShutdown = document.getElementById('btn-system-shutdown');
    btnSystemReboot = document.getElementById('btn-system-reboot');
    modalSystemConfirm = document.getElementById('modal-system-confirm');
}

// Configuration des listeners
function setupSettingsListeners() {
    // Bouton d'ouverture
    if (btnSettings) {
        btnSettings.addEventListener('click', openSettingsModal);
    }
    
    // Boutons de la modale
    if (btnSettingsCancel) {
        btnSettingsCancel.addEventListener('click', closeSettingsModal);
    }
    
    if (btnSettingsSave) {
        btnSettingsSave.addEventListener('click', saveSettings);
    }
    
    // Fermeture via overlay
    if (modalSettings) {
        modalSettings.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeSettingsModal();
            }
        });
    }
    
    // Bouton de contrôle de détection
    if (btnToggleDetection) {
        btnToggleDetection.addEventListener('click', toggleDetection);
    }
    
    // Boutons système (shutdown/reboot)
    if (btnSystemShutdown) {
        btnSystemShutdown.addEventListener('click', () => openSystemConfirmModal('shutdown'));
    }
    
    if (btnSystemReboot) {
        btnSystemReboot.addEventListener('click', () => openSystemConfirmModal('reboot'));
    }
    
    // Modale de confirmation système
    if (modalSystemConfirm) {
        const cancelBtn = document.getElementById('modal-system-cancel');
        const confirmBtn = document.getElementById('modal-system-confirm-btn');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeSystemConfirmModal);
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', executeSystemAction);
        }
        
        // Fermeture via overlay
        modalSystemConfirm.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeSystemConfirmModal();
            }
        });
    }
}

// ==========================================
// Heartbeat et monitoring
// ==========================================

async function startHeartbeat() {
    // Premier appel immédiat
    await checkHeartbeat();
    
    // Polling toutes les 30 secondes
    heartbeatInterval = setInterval(checkHeartbeat, 10000);
}

// Récupérer la configuration du Pi (avec cache)
async function getSettingsPiConfig() {
    // Utiliser le cache si disponible
    if (settingsPiConfigCache) {
        return settingsPiConfigCache;
    }
    
    try {
        const res = await fetch(`${SETTINGS_API_BASE_URL}/pi-config`);
        const data = await res.json();
        
        // Mettre en cache si configuré
        if (data.configured) {
            settingsPiConfigCache = data;
            settingsPiUrl = data.piUrl;
        }
        
        return data;
    } catch (error) {
        console.warn('Failed to get Pi config:', error.message);
        return { configured: false };
    }
}

async function checkHeartbeat() {
    try {
        // Récupérer l'URL du Pi depuis la config
        if (!settingsPiUrl) {
            const config = await getSettingsPiConfig();
            if (config.configured) {
                settingsPiUrl = config.piUrl;
            }
        }
        
        if (!settingsPiUrl) {
            updateConnectionStatus(false);
            return;
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${settingsPiUrl}/api/heartbeat`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            lastHeartbeatData = data;
            updateConnectionStatus(true, data);
        } else {
            updateConnectionStatus(false);
        }
    } catch (error) {
        console.warn('Heartbeat failed:', error.message);
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(online, data = null) {
    // Sauvegarder l'état dans localStorage pour éviter le flash au prochain chargement
    localStorage.setItem(PI_STATUS_STORAGE_KEY, online.toString());
    
    // Mettre à jour l'indicateur dans le header
    if (piStatusDot) {
        piStatusDot.classList.toggle('online', online);
        piStatusDot.classList.toggle('offline', !online);
    }
    
    if (piStatusText) {
        piStatusText.textContent = online ? 'en ligne' : 'hors ligne';
    }
    
    // Ajuster l'opacité du bouton paramètres et de l'onglet "En direct" selon le statut
    if (btnSettings) {
        btnSettings.style.opacity = online ? '1' : '0.3';
        btnSettings.style.pointerEvents = online ? 'auto' : 'none';
    }
    
    if (btnLive) {
        btnLive.style.opacity = online ? '1' : '0.3';
        btnLive.style.pointerEvents = online ? 'auto' : 'none';
    }
    
    // Rediriger vers la page principale si on est sur /live et que le Pi est hors ligne
    if (!online && window.location.pathname === '/live') {
        window.location.href = '/';
    }
    
    // Mettre à jour les cartes de statut dans la modale
    if (statusElements.connection) {
        statusElements.connection.textContent = online ? 'En ligne' : 'Hors ligne';
        statusElements.connection.className = `status-card-value ${online ? 'online' : 'offline'}`;
    }
    
    if (data) {
        // Version
        if (statusElements.version) {
            statusElements.version.textContent = data.version || '--';
        }
        
        // Uptime
        if (statusElements.uptime && data.uptime_seconds !== undefined) {
            statusElements.uptime.textContent = formatUptime(data.uptime_seconds);
        }
        
        // Température CPU
        if (statusElements.temp && data.system?.cpu_temp !== undefined) {
            const temp = data.system.cpu_temp;
            statusElements.temp.textContent = `${temp.toFixed(1)}°C`;
            // Changer la couleur selon la température
            statusElements.temp.className = 'status-card-value';
            if (temp > 70) {
                statusElements.temp.classList.add('offline'); // Rouge
            } else if (temp > 60) {
                statusElements.temp.classList.add('paused'); // Orange
            }
        }
        
        // Mémoire disponible
        if (statusElements.disk && data.system?.disk_free_mb !== undefined) {
            const diskMb = data.system.disk_free_mb;
            if (diskMb >= 1024) {
                statusElements.disk.textContent = `${(diskMb / 1024).toFixed(1)} Go`;
            } else {
                statusElements.disk.textContent = `${diskMb.toFixed(0)} Mo`;
            }
            // Alerte si peu d'espace
            statusElements.disk.className = 'status-card-value';
            if (diskMb < 100) {
                statusElements.disk.classList.add('offline');
            } else if (diskMb < 500) {
                statusElements.disk.classList.add('paused');
            }
        }
        
        // État de la détection
        if (statusElements.detection && data.services) {
            updateDetectionStatus(data.mode, data.services);
        }
    } else if (!online) {
        // Réinitialiser les valeurs si hors ligne
        Object.values(statusElements).forEach(el => {
            if (el && el !== statusElements.connection) {
                el.textContent = '--';
                el.className = 'status-card-value';
            }
        });
        
        // Réinitialiser l'icône de détection
        const statusCard = document.getElementById('status-detection');
        if (statusCard) {
            const iconElement = statusCard.querySelector('.status-card-icon');
            if (iconElement) {
                iconElement.textContent = '🐦';
            }
        }
    }
    
    // Activer/désactiver les boutons de contrôle
    updateControlButtons(online, data);
}

function updateDetectionStatus(mode, services) {
    if (!statusElements.detection) return;
    
    const { detection, streaming } = services || {};
    
    let status = 'Inactif';
    let statusClass = 'idle';
    let statusIcon = '⚪';
    
    // Utiliser le mode fourni par l'API (priorité décroissante)
    switch (mode) {
        case 'streaming':
            status = 'Streaming actif';
            statusClass = 'streaming';
            statusIcon = '📹';
            break;
        case 'night':
            status = 'Mode nuit';
            statusClass = 'night';
            statusIcon = '🌙';
            break;
        case 'paused':
            status = 'Détection en pause';
            statusClass = 'paused';
            statusIcon = '⏸️';
            break;
        case 'recording':
            status = 'Enregistrement...';
            statusClass = 'recording';
            statusIcon = '🔴';
            break;
        case 'cooldown':
            const cooldownRemaining = detection?.cooldown_remaining || 0;
            status = `Attente (${cooldownRemaining}s)`;
            statusClass = 'cooldown';
            statusIcon = '⏳';
            break;
        case 'detection':
            status = 'Détection active';
            statusClass = 'active';
            statusIcon = '🟢';
            break;
        case 'idle':
        default:
            status = 'Inactif';
            statusClass = 'idle';
            statusIcon = '⚪';
            break;
    }
    
    // Mettre à jour l'icône dans la carte de statut si elle existe
    const statusCard = document.getElementById('status-detection');
    if (statusCard) {
        const iconElement = statusCard.querySelector('.status-card-icon');
        if (iconElement) {
            iconElement.textContent = statusIcon;
        }
    }
    
    statusElements.detection.textContent = status;
    statusElements.detection.className = `status-card-value ${statusClass}`;
}

function updateControlButtons(online, data) {
    const detection = data?.services?.detection;
    const isPaused = detection?.paused || false;
    
    if (btnToggleDetection) {
        // Activer le bouton si le Pi est en ligne
        btnToggleDetection.disabled = !online;
        
        // Mettre à jour l'apparence selon l'état
        const icon = btnToggleDetection.querySelector('.control-btn-icon');
        const text = btnToggleDetection.querySelector('.control-btn-text');
        
        if (isPaused) {
            // État : en pause → afficher "Reprendre"
            btnToggleDetection.classList.remove('control-btn-pause');
            btnToggleDetection.classList.add('control-btn-resume');
            if (icon) icon.textContent = '▶️';
            if (text) text.textContent = 'Reprendre';
        } else {
            // État : actif → afficher "Mettre en pause"
            btnToggleDetection.classList.remove('control-btn-resume');
            btnToggleDetection.classList.add('control-btn-pause');
            if (icon) icon.textContent = '⏸️';
            if (text) text.textContent = 'Mettre en pause';
        }
    }
    
    // Activer/désactiver les boutons système selon la connexion
    if (btnSystemShutdown) {
        btnSystemShutdown.disabled = !online;
    }
    
    if (btnSystemReboot) {
        btnSystemReboot.disabled = !online;
    }
}

function formatUptime(seconds) {
    if (seconds < 60) {
        return `${Math.floor(seconds)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
        return `${hours}h ${remainingMinutes}min`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}j ${remainingHours}h`;
}

// ==========================================
// Gestion de la modale
// ==========================================

async function openSettingsModal() {
    if (!modalSettings) return;
    
    modalSettings.classList.add('show');
    document.body.classList.add('modal-open');
    
    // Charger la configuration actuelle
    await loadConfiguration();
    
    // Forcer un heartbeat pour avoir les dernières infos
    await checkHeartbeat();
}

function closeSettingsModal() {
    if (!modalSettings) return;
    modalSettings.classList.remove('show');
    document.body.classList.remove('modal-open');
}

// ==========================================
// Gestion de la configuration
// ==========================================

async function loadConfiguration() {
    if (!settingsPiUrl) {
        console.warn('Pi URL not configured');
        return;
    }
    
    try {
        const response = await fetch(`${settingsPiUrl}/api/config`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (response.ok) {
            const config = await response.json();
            populateConfigForm(config);
        }
    } catch (error) {
        console.warn('Failed to load configuration:', error.message);
        showSettingsToast('Impossible de charger la configuration', 'error');
    }
}

function populateConfigForm(config) {
    // Enregistrement
    if (config.recording) {
        if (configFields.recordingDuration) {
            configFields.recordingDuration.value = config.recording.duration || 15;
        }
        if (configFields.recordingCooldown) {
            // Convertir les secondes en minutes pour l'affichage
            const cooldownSeconds = config.recording.cooldown || 60;
            configFields.recordingCooldown.value = cooldownSeconds / 60;
        }
    }
    
    // Mode nuit
    if (config.night_mode) {
        if (configFields.nightEnabled) {
            configFields.nightEnabled.checked = config.night_mode.enabled || false;
        }
        if (configFields.nightStart) {
            configFields.nightStart.value = config.night_mode.start || 21;
        }
        if (configFields.nightEnd) {
            configFields.nightEnd.value = config.night_mode.end || 7;
        }
    }
    
    // Sensibilité de détection
    if (config.motion) {
        if (configFields.motionThreshold) {
            configFields.motionThreshold.value = config.motion.threshold || 1500;
        }
        if (configFields.motionFrames) {
            configFields.motionFrames.value = config.motion.min_frames || 3;
        }
    }
}

async function saveSettings() {
    if (!settingsPiUrl) {
        showSettingsToast('Pi non connecté', 'error');
        return;
    }
    
    // Afficher le spinner
    const saveText = btnSettingsSave?.querySelector('.btn-save-text');
    const saveSpinner = btnSettingsSave?.querySelector('.btn-save-spinner');
    
    if (saveText) saveText.style.display = 'none';
    if (saveSpinner) saveSpinner.style.display = 'inline-flex';
    if (btnSettingsSave) btnSettingsSave.disabled = true;
    
    try {
        // Construire l'objet de configuration
        const newConfig = {
            recording: {
                duration: parseInt(configFields.recordingDuration?.value) || 15,
                // Convertir les minutes en secondes pour l'API
                cooldown: Math.round((parseFloat(configFields.recordingCooldown?.value) || 1) * 60)
            },
            night_mode: {
                enabled: configFields.nightEnabled?.checked || false,
                start: parseInt(configFields.nightStart?.value) || 21,
                end: parseInt(configFields.nightEnd?.value) || 7
            },
            motion: {
                threshold: parseInt(configFields.motionThreshold?.value) || 1500,
                min_frames: parseInt(configFields.motionFrames?.value) || 3
            }
        };
        
        // Envoyer la configuration
        const response = await fetch(`${settingsPiUrl}/api/config`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newConfig)
        });
        
        if (response.ok) {
            showSettingsToast('Configuration sauvegardée', 'success');
            closeSettingsModal();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Erreur serveur');
        }
    } catch (error) {
        console.error('Failed to save configuration:', error);
        showSettingsToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        // Restaurer le bouton
        if (saveText) saveText.style.display = 'inline';
        if (saveSpinner) saveSpinner.style.display = 'none';
        if (btnSettingsSave) btnSettingsSave.disabled = false;
    }
}

// ==========================================
// Contrôle de la détection
// ==========================================

async function toggleDetection() {
    if (!settingsPiUrl || !btnToggleDetection) return;
    
    // Déterminer l'action selon l'état actuel du bouton
    const isPaused = btnToggleDetection.classList.contains('control-btn-resume');
    const action = isPaused ? 'resume' : 'pause';
    
    btnToggleDetection.disabled = true;
    
    try {
        const response = await fetch(`${settingsPiUrl}/api/detection/${action}`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (response.ok) {
            const message = isPaused ? 'Détection reprise' : 'Détection mise en pause';
            showSettingsToast(message, 'success');
            // Mettre à jour le statut
            await checkHeartbeat();
        } else {
            throw new Error('Erreur serveur');
        }
    } catch (error) {
        console.error(`Failed to ${action} detection:`, error);
        const message = isPaused ? 'Erreur lors de la reprise' : 'Erreur lors de la mise en pause';
        showSettingsToast(message, 'error');
        btnToggleDetection.disabled = false;
    }
}

// ==========================================
// Gestion du système (Shutdown / Reboot)
// ==========================================

function openSystemConfirmModal(action) {
    if (!modalSystemConfirm) return;
    
    systemConfirmAction = action;
    
    // Mettre à jour le contenu de la modale selon l'action
    const icon = document.getElementById('system-confirm-icon');
    const title = document.getElementById('system-confirm-title');
    const message = document.getElementById('system-confirm-message');
    const confirmBtn = document.getElementById('modal-system-confirm-btn');
    const pendingDiv = document.getElementById('system-action-pending');
    const contentDiv = document.getElementById('system-confirm-content');
    const footer = document.getElementById('system-confirm-footer');
    
    // Réinitialiser l'affichage
    if (contentDiv) contentDiv.style.display = 'block';
    if (pendingDiv) pendingDiv.style.display = 'none';
    if (footer) footer.style.display = 'flex';
    
    if (action === 'shutdown') {
        if (icon) {
            icon.textContent = '⏻';
            icon.className = 'system-confirm-icon shutdown';
        }
        if (title) title.textContent = 'Éteindre le système ?';
        if (message) message.textContent = 'Le Raspberry Pi va s\'éteindre. Vous devrez le rallumer manuellement.';
        if (confirmBtn) {
            confirmBtn.textContent = 'Éteindre';
            confirmBtn.className = 'modal-btn modal-btn-shutdown';
        }
    } else if (action === 'reboot') {
        if (icon) {
            icon.textContent = '🔄';
            icon.className = 'system-confirm-icon reboot';
        }
        if (title) title.textContent = 'Redémarrer le système ?';
        if (message) message.textContent = 'Le Raspberry Pi va redémarrer. Il sera à nouveau disponible dans quelques instants.';
        if (confirmBtn) {
            confirmBtn.textContent = 'Redémarrer';
            confirmBtn.className = 'modal-btn modal-btn-reboot';
        }
    }
    
    modalSystemConfirm.classList.add('show');
    document.body.classList.add('modal-open');
}

function closeSystemConfirmModal() {
    if (!modalSystemConfirm) return;
    
    modalSystemConfirm.classList.remove('show');
    document.body.classList.remove('modal-open');
    systemConfirmAction = null;
}

async function executeSystemAction() {
    if (!settingsPiUrl || !systemConfirmAction) return;
    
    const action = systemConfirmAction;
    const endpoint = action === 'shutdown' ? '/api/system/shutdown' : '/api/system/reboot';
    
    // Passer en mode "en cours"
    const contentDiv = document.getElementById('system-confirm-content');
    const pendingDiv = document.getElementById('system-action-pending');
    const pendingMessage = document.getElementById('system-pending-message');
    const footer = document.getElementById('system-confirm-footer');
    
    if (contentDiv) contentDiv.style.display = 'none';
    if (footer) footer.style.display = 'none';
    
    if (pendingDiv) {
        pendingDiv.style.display = 'flex';
        pendingDiv.className = `system-action-pending ${action}`;
    }
    
    if (pendingMessage) {
        pendingMessage.textContent = action === 'shutdown' 
            ? 'Le système va s\'éteindre dans quelques secondes...' 
            : 'Le système redémarre...';
    }
    
    // Désactiver les boutons système
    if (btnSystemShutdown) {
        btnSystemShutdown.disabled = true;
        btnSystemShutdown.classList.add('processing');
    }
    if (btnSystemReboot) {
        btnSystemReboot.disabled = true;
        btnSystemReboot.classList.add('processing');
    }
    
    try {
        const response = await fetch(`${settingsPiUrl}${endpoint}`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ delay: 5 })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`System ${action} initiated:`, data);
            
            // Afficher le message de succès
            const successMessage = action === 'shutdown'
                ? 'Extinction en cours... Le Pi va s\'éteindre.'
                : 'Redémarrage en cours... Le Pi reviendra bientôt.';
            
            showSettingsToast(successMessage, 'success');
            
            // Mettre à jour le statut de connexion
            setTimeout(() => {
                updateConnectionStatus(false);
            }, 3000);
            
            // Fermer les modales après un délai
            setTimeout(() => {
                closeSystemConfirmModal();
                closeSettingsModal();
            }, 5000);
            
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Erreur serveur');
        }
    } catch (error) {
        console.error(`Failed to ${action} system:`, error);
        
        // Restaurer l'affichage normal
        if (contentDiv) contentDiv.style.display = 'block';
        if (pendingDiv) pendingDiv.style.display = 'none';
        if (footer) footer.style.display = 'flex';
        
        // Restaurer les boutons
        if (btnSystemShutdown) {
            btnSystemShutdown.classList.remove('processing');
        }
        if (btnSystemReboot) {
            btnSystemReboot.classList.remove('processing');
        }
        
        const errorMessage = action === 'shutdown'
            ? 'Impossible d\'éteindre le système'
            : 'Impossible de redémarrer le système';
        
        showSettingsToast(errorMessage, 'error');
        
        // Fermer la modale de confirmation
        closeSystemConfirmModal();
        
        // Re-vérifier le heartbeat pour rétablir l'état des boutons
        await checkHeartbeat();
    }
}

// ==========================================
// Notifications Toast
// ==========================================

function showSettingsToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Mettre à jour le contenu
    if (toastMessage) {
        toastMessage.textContent = message;
    }
    
    // Mettre à jour l'icône selon le type
    if (toastIcon) {
        if (type === 'success') {
            toastIcon.textContent = '✓';
            toastIcon.style.background = 'var(--primary-green)';
        } else if (type === 'error') {
            toastIcon.textContent = '✕';
            toastIcon.style.background = 'var(--primary-red)';
        }
    }
    
    // Afficher le toast
    toast.classList.add('show');
    
    // Masquer après 3 secondes
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Nettoyage lors de la fermeture de la page
window.addEventListener('beforeunload', () => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
});

