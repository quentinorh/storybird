// URL de l'API : utilise l'URL actuelle en production, localhost en développement
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : `${window.location.origin}/api`;

let currentFilter = 'all';
let allVideos = [];

// Lazy loading configuration
const VIDEOS_PER_PAGE = 10;
let displayedCount = 0;
let isLoadingMore = false;
let loadMoreObserver = null;

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

    document.getElementById('btn-info').addEventListener('click', () => {
        showInfoModal();
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

function getFilteredVideos() {
    return currentFilter === 'favorites' 
        ? allVideos.filter(v => v.is_favorite)
        : allVideos;
}

function displayVideos() {
    const container = document.getElementById('videos-container');
    const emptyState = document.getElementById('empty-state');

    // Réinitialiser le compteur
    displayedCount = 0;
    
    // Nettoyer l'observer précédent
    if (loadMoreObserver) {
        loadMoreObserver.disconnect();
    }

    const videosToShow = getFilteredVideos();

    if (videosToShow.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        removeLoadMoreSentinel();
        return;
    }

    emptyState.style.display = 'none';
    
    // Afficher seulement les premières vidéos
    const initialVideos = videosToShow.slice(0, VIDEOS_PER_PAGE);
    container.innerHTML = initialVideos.map(video => createVideoCard(video)).join('');
    displayedCount = initialVideos.length;
    
    // Attacher les événements pour les boutons play
    attachVideoPlayHandlers();
    
    // Configurer l'infinite scroll si nécessaire
    if (videosToShow.length > VIDEOS_PER_PAGE) {
        setupLoadMoreObserver();
    } else {
        removeLoadMoreSentinel();
    }
}

function setupLoadMoreObserver() {
    // Créer ou récupérer la sentinelle
    let sentinel = document.getElementById('load-more-sentinel');
    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'load-more-sentinel';
        sentinel.className = 'load-more-sentinel';
        sentinel.innerHTML = `
            <div class="load-more-spinner">
                <div class="spinner"></div>
            </div>
        `;
    }
    
    // Ajouter la sentinelle après le container
    const container = document.getElementById('videos-container');
    container.after(sentinel);
    
    // Créer l'observer
    loadMoreObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoadingMore) {
                loadMoreVideos();
            }
        });
    }, {
        rootMargin: '200px' // Charger un peu avant d'atteindre la fin
    });
    
    loadMoreObserver.observe(sentinel);
}

function removeLoadMoreSentinel() {
    const sentinel = document.getElementById('load-more-sentinel');
    if (sentinel) {
        sentinel.remove();
    }
    if (loadMoreObserver) {
        loadMoreObserver.disconnect();
        loadMoreObserver = null;
    }
}

function loadMoreVideos() {
    if (isLoadingMore) return;
    
    const videosToShow = getFilteredVideos();
    
    // Vérifier s'il reste des vidéos à charger
    if (displayedCount >= videosToShow.length) {
        removeLoadMoreSentinel();
        return;
    }
    
    isLoadingMore = true;
    
    // Simuler un petit délai pour une meilleure UX
    setTimeout(() => {
        const container = document.getElementById('videos-container');
        const nextVideos = videosToShow.slice(displayedCount, displayedCount + VIDEOS_PER_PAGE);
        
        // Ajouter les nouvelles cartes
        nextVideos.forEach(video => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = createVideoCard(video);
            const card = tempDiv.firstElementChild;
            container.appendChild(card);
        });
        
        displayedCount += nextVideos.length;
        
        // Réattacher les handlers pour les nouvelles vidéos
        attachVideoPlayHandlers();
        
        isLoadingMore = false;
        
        // Retirer la sentinelle si toutes les vidéos sont affichées
        if (displayedCount >= videosToShow.length) {
            removeLoadMoreSentinel();
        }
    }, 300);
}

function attachVideoPlayHandlers() {
    // Gérer les clics sur les boutons play
    document.querySelectorAll('.video-play-overlay').forEach(playBtn => {
        playBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const videoId = this.getAttribute('data-play-id');
            const video = document.querySelector(`video[data-video-id="${videoId}"]`);
            const wrapper = this.closest('.video-wrapper');
            
            if (video && wrapper) {
                video.play();
                video.setAttribute('controls', 'true');
                wrapper.classList.add('playing');
            }
        });
    });
    
    // Gérer les clics sur les vidéos pour afficher les contrôles
    document.querySelectorAll('video[data-video-id]').forEach(video => {
        video.addEventListener('click', function(e) {
            // Éviter de déclencher si on clique sur les contrôles
            if (e.target === this || e.target.tagName === 'VIDEO') {
                // Si la vidéo est en pause, la lancer et afficher les contrôles
                if (this.paused) {
                    this.play();
                    this.setAttribute('controls', 'true');
                } else {
                    // Si la vidéo est en lecture, afficher/masquer les contrôles
                    if (this.hasAttribute('controls')) {
                        this.removeAttribute('controls');
                    } else {
                        this.setAttribute('controls', 'true');
                    }
                }
            }
        });
        
        video.addEventListener('play', function() {
            const wrapper = this.closest('.video-wrapper');
            if (wrapper) {
                wrapper.classList.add('playing');
            }
            // Afficher les contrôles quand la vidéo démarre
            this.setAttribute('controls', 'true');
        });
        
        video.addEventListener('pause', function() {
            const wrapper = this.closest('.video-wrapper');
            if (wrapper) {
                wrapper.classList.remove('playing');
            }
        });
        
        video.addEventListener('ended', function() {
            const wrapper = this.closest('.video-wrapper');
            if (wrapper) {
                wrapper.classList.remove('playing');
            }
            // Masquer les contrôles quand la vidéo se termine
            this.removeAttribute('controls');
        });
        
        // Masquer les contrôles après un délai d'inactivité
        let controlsTimeout;
        const hideControls = () => {
            if (!video.paused && video.hasAttribute('controls')) {
                clearTimeout(controlsTimeout);
                controlsTimeout = setTimeout(() => {
                    if (!video.paused) {
                        video.removeAttribute('controls');
                    }
                }, 3000);
            }
        };
        
        video.addEventListener('mousemove', function() {
            if (!video.paused && !video.hasAttribute('controls')) {
                video.setAttribute('controls', 'true');
            }
            hideControls();
        });
        
        video.addEventListener('mouseleave', function() {
            hideControls();
        });
    });
}

// Fonction pour échapper les caractères HTML (protection XSS)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function createVideoCard(video) {
    const dateObj = new Date(video.created_at);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const date = `${day}/${month}/${year}`;
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
        <div class="video-card ${video.is_favorite ? 'favorite' : ''}" data-public-id="${safePublicId}">
            <div class="video-wrapper">
                ${safeDescription ? `
                <div class="video-description-overlay">
                    <div class="video-description-badge">
                        <div class="video-description-text">${safeDescription}</div>
                    </div>
                </div>
                ` : ''}
                <video preload="metadata" data-video-id="${safePublicId}">
                    <source src="${safeUrl}" type="video/mp4">
                    Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
                <div class="video-play-overlay" data-play-id="${safePublicId}"></div>
                <div class="video-edit-container" data-edit-id="${safePublicId}" style="display: none;">
                    <textarea class="video-edit-textarea" 
                              data-edit-id="${safePublicId}"
                              placeholder="Ajouter un commentaire..."></textarea>
                </div>
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
                            <img src="images/fav.svg" alt="Favoris" class="btn-icon">
                        </button>
                        <button class="btn btn-edit" 
                                onclick="editVideo('${safePublicId.replace(/'/g, "\\'")}')"
                                title="Ajouter ou modifier le commentaire">
                            <img src="images/edit.svg" alt="Ajouter ou modifier le commentaire" class="btn-icon">
                        </button>
                        <button class="btn btn-share" 
                                onclick="shareVideo('${safeUrl.replace(/'/g, "\\'")}')"
                                title="Partager la vidéo">
                            <img src="images/share.svg" alt="Partager" class="btn-icon">
                        </button>
                        <button class="btn btn-delete" 
                                onclick="deleteVideo('${safePublicId.replace(/'/g, "\\'")}')"
                                title="Supprimer la vidéo">
                            <img src="images/del.svg" alt="Supprimer" class="btn-icon">
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function toggleFavorite(publicId) {
    // Trouver le bouton favoris correspondant
    const videoCard = document.querySelector(`[data-public-id="${publicId}"]`);
    if (!videoCard) return;

    const favoriteBtn = videoCard.querySelector('.btn-favorite');
    if (!favoriteBtn) return;

    const iconImg = favoriteBtn.querySelector('.btn-icon');
    if (!iconImg) return;

    // Remplacer l'icône par un spinner
    const spinner = document.createElement('div');
    spinner.className = 'btn-spinner';
    iconImg.style.display = 'none';
    favoriteBtn.appendChild(spinner);
    favoriteBtn.disabled = true;
    favoriteBtn.style.opacity = '0.7';

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
        
        // Mettre à jour le DOM directement
        if (isFavorite) {
            videoCard.classList.remove('favorite');
            favoriteBtn.classList.remove('active');
            favoriteBtn.title = 'Ajouter aux favoris';
        } else {
            videoCard.classList.add('favorite');
            favoriteBtn.classList.add('active');
            favoriteBtn.title = 'Retirer des favoris';
        }
        
        // Restaurer l'icône
        spinner.remove();
        iconImg.style.display = 'block';
        favoriteBtn.disabled = false;
        favoriteBtn.style.cursor = 'pointer';
        favoriteBtn.style.opacity = '';
        
        // Si on est dans le filtre favoris et qu'on retire un favori, retirer la carte
        if (currentFilter === 'favorites' && isFavorite) {
            videoCard.remove();
            displayedCount = Math.max(0, displayedCount - 1);
            
            const container = document.getElementById('videos-container');
            const emptyState = document.getElementById('empty-state');
            const remainingVideos = container.querySelectorAll('.video-card');
            
            if (remainingVideos.length === 0) {
                emptyState.style.display = 'block';
                removeLoadMoreSentinel();
            } else {
                // Charger plus de vidéos si nécessaire
                const videosToShow = getFilteredVideos();
                if (displayedCount < videosToShow.length && !document.getElementById('load-more-sentinel')) {
                    setupLoadMoreObserver();
                }
            }
        }
    } catch (err) {
        // Restaurer l'icône en cas d'erreur
        spinner.remove();
        iconImg.style.display = 'block';
        favoriteBtn.disabled = false;
        favoriteBtn.style.cursor = 'pointer';
        favoriteBtn.style.opacity = '';
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

function editVideo(publicId) {
    const video = allVideos.find(v => v.public_id === publicId);
    if (!video) return;

    // Trouver la carte vidéo correspondante
    const videoCard = document.querySelector(`[data-public-id="${publicId}"]`);
    if (!videoCard) return;

    // Trouver les éléments d'édition
    const editContainer = videoCard.querySelector(`[data-edit-id="${publicId}"]`);
    const textarea = editContainer ? editContainer.querySelector('.video-edit-textarea') : null;
    const videoActions = videoCard.querySelector('.video-actions');

    if (!editContainer || !textarea || !videoActions) return;

    // Remplir le textarea avec la description actuelle
    textarea.value = video.description || '';

    // Sauvegarder les boutons d'action originaux
    const originalButtons = Array.from(videoActions.children);
    videoActions.dataset.originalButtons = JSON.stringify(originalButtons.map(btn => btn.outerHTML));

    // Remplacer les boutons d'action par les boutons enregistrer/annuler
    videoActions.innerHTML = `
        <button class="btn btn-save" 
                onclick="saveVideoDescription('${publicId.replace(/'/g, "\\'")}')"
                title="Enregistrer le commentaire">
            <img src="images/ok.svg" alt="Enregistrer" class="btn-icon">
        </button>
        <button class="btn btn-cancel" 
                onclick="cancelEditVideo('${publicId.replace(/'/g, "\\'")}')"
                title="Annuler">
            <img src="images/cancel.svg" alt="Annuler" class="btn-icon">
        </button>
    `;

    // Afficher la zone d'édition
    editContainer.style.display = 'block';
    
    // Petit délai pour permettre l'animation
    setTimeout(() => {
        textarea.focus();
        textarea.select();
    }, 100);

    // Gérer la touche Escape pour annuler
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            cancelEditVideo(publicId);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function cancelEditVideo(publicId) {
    const videoCard = document.querySelector(`[data-public-id="${publicId}"]`);
    if (!videoCard) return;

    const editContainer = videoCard.querySelector(`[data-edit-id="${publicId}"]`);
    const textarea = editContainer ? editContainer.querySelector('.video-edit-textarea') : null;
    const videoActions = videoCard.querySelector('.video-actions');

    if (editContainer) {
        editContainer.style.display = 'none';
    }
    if (textarea) {
        textarea.value = '';
    }

    // Restaurer les boutons d'action originaux
    if (videoActions && videoActions.dataset.originalButtons) {
        try {
            const originalButtons = JSON.parse(videoActions.dataset.originalButtons);
            videoActions.innerHTML = originalButtons.join('');
            delete videoActions.dataset.originalButtons;
            
            // Réattacher les handlers pour les vidéos
            attachVideoPlayHandlers();
        } catch (e) {
            console.error('Erreur lors de la restauration des boutons:', e);
        }
    }
}

async function saveVideoDescription(publicId) {
    const video = allVideos.find(v => v.public_id === publicId);
    if (!video) return;

    const videoCard = document.querySelector(`[data-public-id="${publicId}"]`);
    if (!videoCard) return;

    const editContainer = videoCard.querySelector(`[data-edit-id="${publicId}"]`);
    const textarea = editContainer ? editContainer.querySelector('.video-edit-textarea') : null;
    if (!textarea) return;

    const description = textarea.value.trim();
    const videoActions = videoCard.querySelector('.video-actions');
    const saveBtn = videoCard.querySelector('.btn-save');
    const cancelBtn = videoCard.querySelector('.btn-cancel');
    const saveIcon = saveBtn ? saveBtn.querySelector('.btn-icon') : null;

    // Désactiver les boutons et le textarea pendant la sauvegarde
    if (saveBtn) saveBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (textarea) textarea.disabled = true;
    
    // Afficher un spinner sur le bouton enregistrer
    if (saveBtn && saveIcon) {
        const spinner = document.createElement('div');
        spinner.className = 'btn-spinner';
        saveIcon.style.display = 'none';
        saveBtn.appendChild(spinner);
        saveBtn.style.opacity = '0.7';
    }

    try {
        const encodedPublicId = encodeURIComponent(publicId);
        const response = await fetch(`${API_BASE_URL}/videos/${encodedPublicId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: video.title || null,
                description: description || null
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
            throw new Error(errorData.error || 'Erreur lors de la modification');
        }

        // Mettre à jour l'état local
        video.description = description || null;
        
        // Mettre à jour le DOM directement
        const videoWrapper = videoCard.querySelector('.video-wrapper');
        const existingOverlay = videoWrapper.querySelector('.video-description-overlay');
        
        if (description) {
            // Ajouter ou mettre à jour le badge de description
            if (existingOverlay) {
                const descriptionText = existingOverlay.querySelector('.video-description-text');
                if (descriptionText) {
                    descriptionText.textContent = description;
                }
            } else {
                const overlay = document.createElement('div');
                overlay.className = 'video-description-overlay';
                overlay.innerHTML = `
                    <div class="video-description-badge">
                        <div class="video-description-text">${escapeHtml(description)}</div>
                    </div>
                `;
                videoWrapper.insertBefore(overlay, videoWrapper.firstChild);
            }
        } else {
            // Retirer le badge de description s'il existe
            if (existingOverlay) {
                existingOverlay.remove();
            }
        }
        
        // Masquer la zone d'édition et restaurer les boutons d'action
        cancelEditVideo(publicId);
    } catch (err) {
        // Réactiver les boutons en cas d'erreur
        if (saveBtn) {
            const spinner = saveBtn.querySelector('.btn-spinner');
            if (spinner && saveIcon) {
                spinner.remove();
                saveIcon.style.display = 'block';
            }
            saveBtn.disabled = false;
            saveBtn.style.opacity = '';
        }
        if (cancelBtn) cancelBtn.disabled = false;
        if (textarea) textarea.disabled = false;
        
        await showAlert(`Erreur: ${err.message}`);
    }
}

async function deleteVideo(publicId) {
    // Trouver le bouton de suppression correspondant
    const videoCard = document.querySelector(`[data-public-id="${publicId}"]`);
    if (!videoCard) return;

    const deleteBtn = videoCard.querySelector('.btn-delete');
    if (!deleteBtn) return;

    const iconImg = deleteBtn.querySelector('.btn-icon');
    if (!iconImg) return;

    // Sauvegarder l'icône originale
    const originalIconSrc = iconImg.src;
    const originalIconAlt = iconImg.alt;

    // Remplacer l'icône par un spinner
    const spinner = document.createElement('div');
    spinner.className = 'btn-spinner';
    iconImg.style.display = 'none';
    deleteBtn.appendChild(spinner);
    deleteBtn.disabled = true;
    deleteBtn.style.opacity = '0.7';

    try {
        const encodedPublicId = encodeURIComponent(publicId);
        const response = await fetch(`${API_BASE_URL}/videos/${encodedPublicId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
            throw new Error(errorData.error || 'Erreur lors de la suppression');
        }

        // Retirer la vidéo de la liste
        allVideos = allVideos.filter(v => v.public_id !== publicId);
        
        // Retirer la carte du DOM directement
        videoCard.remove();
        
        // Mettre à jour le compteur
        displayedCount = Math.max(0, displayedCount - 1);
        
        // Vérifier si l'état vide doit être affiché
        const container = document.getElementById('videos-container');
        const emptyState = document.getElementById('empty-state');
        const remainingVideos = container.querySelectorAll('.video-card');
        
        if (remainingVideos.length === 0) {
            emptyState.style.display = 'block';
            removeLoadMoreSentinel();
        } else {
            // Charger plus de vidéos si nécessaire
            const videosToShow = getFilteredVideos();
            if (displayedCount < videosToShow.length && !document.getElementById('load-more-sentinel')) {
                setupLoadMoreObserver();
            }
        }
    } catch (err) {
        // Restaurer l'icône en cas d'erreur
        spinner.remove();
        iconImg.style.display = 'block';
        deleteBtn.disabled = false;
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.opacity = '1';
        await showAlert(`Erreur: ${err.message}`);
    }
}

