// URL de l'API : utilise l'URL actuelle en production, localhost en développement
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : `${window.location.origin}/api`;

let currentFilter = 'all';
let allVideos = [];

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
    const date = new Date(video.created_at).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Échapper le public_id pour éviter les injections XSS
    const safePublicId = escapeHtml(video.public_id);
    const safeDate = escapeHtml(date);
    const safeUrl = escapeHtml(video.url);

    return `
        <div class="video-card" data-public-id="${safePublicId}">
            <div class="video-wrapper">
                <video controls preload="metadata">
                    <source src="${safeUrl}" type="video/mp4">
                    Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
            </div>
            <div class="video-info">
                <div class="video-date">${safeDate}</div>
                <div class="video-actions">
                    <button class="btn btn-favorite ${video.is_favorite ? 'active' : ''}" 
                            onclick="toggleFavorite('${safePublicId.replace(/'/g, "\\'")}')"
                            title="${video.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                        <span>${video.is_favorite ? '⭐' : '☆'}</span>
                        <span>Favori</span>
                    </button>
                    <button class="btn btn-share" 
                            onclick="shareVideo('${safeUrl.replace(/'/g, "\\'")}')"
                            title="Partager la vidéo">
                        <span>🔗</span>
                        <span>Partager</span>
                    </button>
                    <button class="btn btn-delete" 
                            onclick="deleteVideo('${safePublicId.replace(/'/g, "\\'")}')"
                            title="Supprimer la vidéo">
                        <span>🗑️</span>
                        <span>Supprimer</span>
                    </button>
                </div>
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
        alert(`Erreur: ${err.message}`);
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
            // Fallback final : afficher l'URL dans une alerte
            prompt('Copiez cette URL :', videoUrl);
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

async function deleteVideo(publicId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) {
        return;
    }

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
        displayVideos();
        showToast('Vidéo supprimée avec succès');
    } catch (err) {
        alert(`Erreur: ${err.message}`);
    }
}

