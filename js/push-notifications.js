// Gestion des notifications push pour Storybird

const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : `${window.location.origin}/api`;

let swRegistration = null;
let isSubscribed = false;

// Initialisation des notifications push
async function initPushNotifications() {
    // Vérifier le support des notifications
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('📵 Notifications push non supportées');
        return false;
    }

    try {
        // Enregistrer le Service Worker
        swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker enregistré');

        // Vérifier l'état de l'abonnement
        const subscription = await swRegistration.pushManager.getSubscription();
        isSubscribed = subscription !== null;

        updateNotificationButton();
        return true;
    } catch (error) {
        console.error('❌ Erreur Service Worker:', error);
        return false;
    }
}

// Demander la permission et s'abonner
async function subscribeToPush() {
    try {
        // Demander la permission
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
            console.log('❌ Permission notifications refusée');
            showNotificationToast('Permission refusée pour les notifications');
            return false;
        }

        // Récupérer la clé publique VAPID
        const response = await fetch(`${API_BASE_URL}/push/vapid-public-key`);
        
        if (!response.ok) {
            if (response.status === 503) {
                showNotificationToast('Notifications non configurées sur le serveur');
                return false;
            }
            throw new Error('Impossible de récupérer la clé VAPID');
        }

        const { publicKey } = await response.json();

        // Convertir la clé en Uint8Array
        const applicationServerKey = urlBase64ToUint8Array(publicKey);

        // S'abonner aux notifications push
        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });

        // Envoyer l'abonnement au serveur
        const subscribeResponse = await fetch(`${API_BASE_URL}/push/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });

        if (!subscribeResponse.ok) {
            throw new Error('Erreur lors de l\'enregistrement');
        }

        isSubscribed = true;
        updateNotificationButton();
        showNotificationToast('🔔 Notifications activées !');
        console.log('✅ Abonné aux notifications push');
        return true;
    } catch (error) {
        console.error('❌ Erreur abonnement push:', error);
        showNotificationToast('Erreur lors de l\'activation des notifications');
        return false;
    }
}

// Se désabonner
async function unsubscribeFromPush() {
    try {
        const subscription = await swRegistration.pushManager.getSubscription();
        
        if (subscription) {
            // Se désabonner côté navigateur
            await subscription.unsubscribe();

            // Informer le serveur
            await fetch(`${API_BASE_URL}/push/unsubscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
            });
        }

        isSubscribed = false;
        updateNotificationButton();
        showNotificationToast('🔕 Notifications désactivées');
        console.log('✅ Désabonné des notifications push');
        return true;
    } catch (error) {
        console.error('❌ Erreur désabonnement:', error);
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
    // Réutiliser la fonction showToast si elle existe
    if (typeof showToast === 'function') {
        showToast(message);
    } else {
        console.log(message);
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
    if (arePushNotificationsSupported()) {
        initPushNotifications();
    }
});

