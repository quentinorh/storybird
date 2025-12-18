// URL de l'API : utilise l'URL actuelle en production, localhost en développement
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : `${window.location.origin}/api`;

let currentFilter = 'all';
let allVideos = [];

// Fonctions pour les modales personnalisées
function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-confirm');
        const messageEl = document.getElementById('modal-confirm-message');
        const loadingEl = document.getElementById('modal-confirm-loading');
        const okBtn = document.getElementById('modal-confirm-ok');
        const cancelBtn = document.getElementById('modal-confirm-cancel');

        messageEl.textContent = message;
        loadingEl.style.display = 'none';
        okBtn.disabled = false;
        cancelBtn.disabled = false;
        modal.classList.add('show');

        const cleanup = () => {
            modal.classList.remove('show');
            loadingEl.style.display = 'none';
            okBtn.disabled = false;
            cancelBtn.disabled = false;
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleOverlayClick);
        };

        const handleOk = () => {
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        const handleOverlayClick = (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                handleCancel();
            }
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        modal.addEventListener('click', handleOverlayClick);
    });
}

function showConfirmLoading(show) {
    const modal = document.getElementById('modal-confirm');
    const loadingEl = document.getElementById('modal-confirm-loading');
    const messageEl = document.getElementById('modal-confirm-message');
    const okBtn = document.getElementById('modal-confirm-ok');
    const cancelBtn = document.getElementById('modal-confirm-cancel');

    if (show) {
        loadingEl.style.display = 'flex';
        messageEl.style.display = 'none';
        okBtn.disabled = true;
        cancelBtn.disabled = true;
    } else {
        loadingEl.style.display = 'none';
        messageEl.style.display = 'block';
        okBtn.disabled = false;
        cancelBtn.disabled = false;
    }
}

function closeConfirm() {
    const modal = document.getElementById('modal-confirm');
    const loadingEl = document.getElementById('modal-confirm-loading');
    const messageEl = document.getElementById('modal-confirm-message');
    const okBtn = document.getElementById('modal-confirm-ok');
    const cancelBtn = document.getElementById('modal-confirm-cancel');
    
    modal.classList.remove('show');
    loadingEl.style.display = 'none';
    messageEl.style.display = 'block';
    okBtn.disabled = false;
    cancelBtn.disabled = false;
}

function showAlert(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-alert');
        const messageEl = document.getElementById('modal-alert-message');
        const okBtn = document.getElementById('modal-alert-ok');

        messageEl.textContent = message;
        modal.classList.add('show');

        const cleanup = () => {
            modal.classList.remove('show');
            okBtn.removeEventListener('click', handleOk);
            modal.removeEventListener('click', handleOverlayClick);
        };

        const handleOk = () => {
            cleanup();
            resolve();
        };

        const handleOverlayClick = (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                handleOk();
            }
        };

        okBtn.addEventListener('click', handleOk);
        modal.addEventListener('click', handleOverlayClick);
    });
}

function showPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-prompt');
        const messageEl = document.getElementById('modal-prompt-message');
        const inputEl = document.getElementById('modal-prompt-input');
        const okBtn = document.getElementById('modal-prompt-ok');
        const cancelBtn = document.getElementById('modal-prompt-cancel');

        messageEl.textContent = message;
        inputEl.value = defaultValue;
        modal.classList.add('show');
        inputEl.focus();
        inputEl.select();

        const cleanup = () => {
            modal.classList.remove('show');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleOverlayClick);
            inputEl.removeEventListener('keypress', handleKeyPress);
        };

        const handleOk = () => {
            cleanup();
            resolve(inputEl.value);
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                handleOk();
            }
        };

        const handleOverlayClick = (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                handleCancel();
            }
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        inputEl.addEventListener('keypress', handleKeyPress);
        modal.addEventListener('click', handleOverlayClick);
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadVideos();
});

function setupEventListeners() {
    document.getElementById('btn-all').addEventListener('click', () => {
        currentFilter = 'all';
        updateFilterButtons();
        displayVideos();
    });

    document.getElementById('btn-favorites').addEventListener('click', () => {
        currentFilter = 'favorites';
        updateFilterButtons();
        displayVideos();
    });
}

function updateFilterButtons() {
    document.getElementById('btn-all').classList.toggle('active', currentFilter === 'all');
    document.getElementById('btn-favorites').classList.toggle('active', currentFilter === 'favorites');
}

async function loadVideos() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const emptyState = document.getElementById('empty-state');
    const container = document.getElementById('videos-container');

    loading.style.display = 'block';
    error.style.display = 'none';
    emptyState.style.display = 'none';
    container.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/videos`);
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des vidéos');
        }
        allVideos = await response.json();
        displayVideos();
    } catch (err) {
        error.textContent = `Erreur: ${err.message}`;
        error.style.display = 'block';
    } finally {
        loading.style.display = 'none';
    }
}

function displayVideos() {
    const container = document.getElementById('videos-container');
    const emptyState = document.getElementById('empty-state');

    let videosToShow = currentFilter === 'favorites' 
        ? allVideos.filter(v => v.is_favorite)
        : allVideos;

    if (videosToShow.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = videosToShow.map(video => createVideoCard(video)).join('');
}

// Fonction pour échapper les caractères HTML (protection XSS)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function createVideoCard(video) {
    const dateObj = new Date(video.created_at);
    const date = dateObj.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const time = dateObj.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Échapper le public_id pour éviter les injections XSS
    const safePublicId = escapeHtml(video.public_id);
    const safeDate = escapeHtml(date);
    const safeTime = escapeHtml(time);
    const safeUrl = escapeHtml(video.url);
    const safeTitle = video.title ? escapeHtml(video.title) : '';
    const safeDescription = video.description ? escapeHtml(video.description) : '';

    return `
        <div class="video-card" data-public-id="${safePublicId}">
            <div class="video-wrapper">
                <video controls preload="metadata">
                    <source src="${safeUrl}" type="video/mp4">
                    Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
            </div>
            <div class="video-info">
                <div class="video-date-container">
                    <div class="video-date-wrapper">
                        <div class="video-date">${safeDate}</div>
                        <div class="video-time">${safeTime}</div>
                    </div>
                    <div class="video-actions">
                        <button class="btn btn-favorite ${video.is_favorite ? 'active' : ''}" 
                                onclick="toggleFavorite('${safePublicId.replace(/'/g, "\\'")}')"
                                title="${video.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                            <img src="fav.svg" alt="Favoris" class="btn-icon">
                        </button>
                        <button class="btn btn-edit" 
                                onclick="editVideo('${safePublicId.replace(/'/g, "\\'")}')"
                                title="Modifier le titre et la description">
                            <img src="edit.svg" alt="Modifier" class="btn-icon">
                        </button>
                        <button class="btn btn-share" 
                                onclick="shareVideo('${safeUrl.replace(/'/g, "\\'")}')"
                                title="Partager la vidéo">
                            <img src="share.svg" alt="Partager" class="btn-icon">
                        </button>
                        <button class="btn btn-delete" 
                                onclick="deleteVideo('${safePublicId.replace(/'/g, "\\'")}')"
                                title="Supprimer la vidéo">
                            <img src="del.svg" alt="Supprimer" class="btn-icon">
                        </button>
                    </div>
                </div>
                ${safeTitle || safeDescription ? `
                <div class="video-metadata">
                    ${safeTitle ? `<div class="video-title">${safeTitle}</div>` : ''}
                    ${safeDescription ? `<div class="video-description">${safeDescription}</div>` : ''}
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

async function toggleFavorite(publicId) {
    try {
        const video = allVideos.find(v => v.public_id === publicId);
        const isFavorite = video.is_favorite;

        const encodedPublicId = encodeURIComponent(publicId);
        const response = await fetch(`${API_BASE_URL}/videos/${encodedPublicId}/favorite`, {
            method: isFavorite ? 'DELETE' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
            throw new Error(errorData.error || 'Erreur lors de la modification du favori');
        }

        // Mettre à jour l'état local
        video.is_favorite = !isFavorite;
        displayVideos();
        showToast(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris');
    } catch (err) {
        await showAlert(`Erreur: ${err.message}`);
    }
}

async function shareVideo(videoUrl) {
    try {
        // Essayer d'utiliser l'API Web Share si disponible (mobile)
        if (navigator.share) {
            await navigator.share({
                title: 'Vidéo Storybird',
                text: 'Regardez cette vidéo !',
                url: videoUrl
            });
            return;
        }

        // Sinon, copier l'URL dans le presse-papier
        await navigator.clipboard.writeText(videoUrl);
        showToast('URL copiée dans le presse-papier !');
    } catch (err) {
        // Si l'utilisateur annule le partage, ne rien faire
        if (err.name === 'AbortError') {
            return;
        }
        
        // Fallback : copier dans le presse-papier
        try {
            await navigator.clipboard.writeText(videoUrl);
            showToast('URL copiée dans le presse-papier !');
        } catch (clipboardErr) {
            // Fallback final : afficher l'URL dans une modale
            await showPrompt('Copiez cette URL :', videoUrl);
        }
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = toast.querySelector('.toast-message');
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showEditLoading(show) {
    const modal = document.getElementById('modal-edit');
    const loadingEl = document.getElementById('modal-edit-loading');
    const titleInput = document.getElementById('modal-edit-title');
    const descriptionInput = document.getElementById('modal-edit-description');
    const titleLabel = titleInput.previousElementSibling;
    const descriptionLabel = descriptionInput.previousElementSibling;
    const okBtn = document.getElementById('modal-edit-ok');
    const cancelBtn = document.getElementById('modal-edit-cancel');

    if (show) {
        loadingEl.style.display = 'flex';
        titleInput.style.display = 'none';
        descriptionInput.style.display = 'none';
        titleLabel.style.display = 'none';
        descriptionLabel.style.display = 'none';
        okBtn.disabled = true;
        cancelBtn.disabled = true;
    } else {
        loadingEl.style.display = 'none';
        titleInput.style.display = 'block';
        descriptionInput.style.display = 'block';
        titleLabel.style.display = 'block';
        descriptionLabel.style.display = 'block';
        okBtn.disabled = false;
        cancelBtn.disabled = false;
    }
}

function closeEdit() {
    const modal = document.getElementById('modal-edit');
    const loadingEl = document.getElementById('modal-edit-loading');
    const titleInput = document.getElementById('modal-edit-title');
    const descriptionInput = document.getElementById('modal-edit-description');
    const titleLabel = titleInput.previousElementSibling;
    const descriptionLabel = descriptionInput.previousElementSibling;
    const okBtn = document.getElementById('modal-edit-ok');
    const cancelBtn = document.getElementById('modal-edit-cancel');
    
    modal.classList.remove('show');
    loadingEl.style.display = 'none';
    titleInput.style.display = 'block';
    descriptionInput.style.display = 'block';
    titleLabel.style.display = 'block';
    descriptionLabel.style.display = 'block';
    okBtn.disabled = false;
    cancelBtn.disabled = false;
}

async function editVideo(publicId) {
    const video = allVideos.find(v => v.public_id === publicId);
    if (!video) return;

    const modal = document.getElementById('modal-edit');
    const titleInput = document.getElementById('modal-edit-title');
    const descriptionInput = document.getElementById('modal-edit-description');
    const okBtn = document.getElementById('modal-edit-ok');
    const cancelBtn = document.getElementById('modal-edit-cancel');

    // Remplir les champs avec les valeurs actuelles
    titleInput.value = video.title || '';
    descriptionInput.value = video.description || '';
    showEditLoading(false);
    modal.classList.add('show');
    titleInput.focus();

    return new Promise((resolve) => {
        const cleanup = () => {
            closeEdit();
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleOverlayClick);
        };

        const handleOk = async () => {
            const title = titleInput.value.trim();
            const description = descriptionInput.value.trim();

            // Afficher le chargement
            showEditLoading(true);

            try {
                const encodedPublicId = encodeURIComponent(publicId);
                const response = await fetch(`${API_BASE_URL}/videos/${encodedPublicId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: title || null,
                        description: description || null
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
                    throw new Error(errorData.error || 'Erreur lors de la modification');
                }

                // Fermer la modale
                cleanup();

                // Mettre à jour l'état local
                video.title = title || null;
                video.description = description || null;
                displayVideos();
                showToast('Vidéo éditée avec succès');
                resolve(true);
            } catch (err) {
                // Masquer le chargement et fermer la modale
                cleanup();
                await showAlert(`Erreur: ${err.message}`);
                resolve(false);
            }
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        const handleOverlayClick = (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                handleCancel();
            }
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        modal.addEventListener('click', handleOverlayClick);
    });
}

async function deleteVideo(publicId) {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?');
    if (!confirmed) {
        return;
    }

    // Afficher le chargement
    showConfirmLoading(true);

    try {
        const encodedPublicId = encodeURIComponent(publicId);
        const response = await fetch(`${API_BASE_URL}/videos/${encodedPublicId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
            throw new Error(errorData.error || 'Erreur lors de la suppression');
        }

        // Fermer la modale
        closeConfirm();

        // Retirer la vidéo de la liste
        allVideos = allVideos.filter(v => v.public_id !== publicId);
        displayVideos();
        showToast('La vidéo a bien été supprimée');
    } catch (err) {
        // Masquer le chargement et fermer la modale de confirmation
        closeConfirm();
        await showAlert(`Erreur: ${err.message}`);
    }
}

