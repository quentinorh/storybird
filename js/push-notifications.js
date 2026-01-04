// Gestion des notifications push pour Storybird

// Utiliser API_BASE_URL existante ou la définir si elle n'existe pas
const PUSH_API_URL = (typeof API_BASE_URL !== 'undefined') 
    ? API_BASE_URL 
    : (window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : `${window.location.origin}/api`);

let swRegistration = null;
let isSubscribed = false;

// Initialisation des notifications push
async function initPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
    }

    try {
        swRegistration = await navigator.serviceWorker.register('/sw.js');
        const subscription = await swRegistration.pushManager.getSubscription();
        isSubscribed = subscription !== null;
        updateNotificationButton();
        return true;
    } catch (error) {
        return false;
    }
}

// Demander la permission et s'abonner
async function subscribeToPush() {
    try {
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
            showNotificationToast('Permission refusée pour les notifications');
            return false;
        }

        const response = await fetch(`${PUSH_API_URL}/push/vapid-public-key`);
        
        if (!response.ok) {
            if (response.status === 503) {
                showNotificationToast('Notifications non configurées sur le serveur');
                return false;
            }
            throw new Error('Impossible de récupérer la clé VAPID');
        }

        const { publicKey } = await response.json();
        const applicationServerKey = urlBase64ToUint8Array(publicKey);

        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });

        const subscribeResponse = await fetch(`${PUSH_API_URL}/push/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });

        if (!subscribeResponse.ok) {
            throw new Error('Erreur lors de l\'enregistrement');
        }

        isSubscribed = true;
        updateNotificationButton();
        showNotificationToast('Notifications activées !');
        return true;
    } catch (error) {
        showNotificationToast('Erreur lors de l\'activation des notifications');
        return false;
    }
}

// Se désabonner
async function unsubscribeFromPush() {
    try {
        const subscription = await swRegistration.pushManager.getSubscription();
        
        if (subscription) {
            await subscription.unsubscribe();
            await fetch(`${PUSH_API_URL}/push/unsubscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
            });
        }

        isSubscribed = false;
        updateNotificationButton();
        showNotificationToast('Notifications désactivées');
        return true;
    } catch (error) {
        return false;
    }
}

// Toggle notifications
async function togglePushNotifications() {
    if (isSubscribed) {
        await unsubscribeFromPush();
    } else {
        await subscribeToPush();
    }
}

// Mettre à jour le bouton de notification
function updateNotificationButton() {
    const btn = document.getElementById('btn-notifications');
    if (!btn) return;

    if (isSubscribed) {
        btn.classList.add('active');
        btn.title = 'Désactiver les notifications';
    } else {
        btn.classList.remove('active');
        btn.title = 'Activer les notifications';
    }
}

// Afficher un toast pour les notifications
function showNotificationToast(message) {
    if (typeof showToast === 'function') {
        showToast(message);
    }
}

// Utilitaire pour convertir la clé VAPID
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Vérifier si les notifications sont supportées
function arePushNotificationsSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const notifBtn = document.getElementById('btn-notifications');
    if (notifBtn) {
        notifBtn.addEventListener('click', async () => {
            await togglePushNotifications();
        });
    }

    if (arePushNotificationsSupported()) {
        initPushNotifications();
    } else {
        if (notifBtn) {
            notifBtn.style.display = 'none';
        }
    }
});
