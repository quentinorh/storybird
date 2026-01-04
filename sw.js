// Service Worker pour Storybird - Notifications Push

const CACHE_NAME = 'storybird-v1';

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('🐦 Service Worker installé');
    self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('🐦 Service Worker activé');
    event.waitUntil(clients.claim());
});

// Réception des notifications push
self.addEventListener('push', (event) => {
    console.log('📬 Notification push reçue');

    let data = {
        title: '🐦 Storybird',
        body: 'Nouvelle activité détectée',
        icon: '/images/logo3.png',
        badge: '/images/logo3.png',
        data: { url: '/' }
    };

    try {
        if (event.data) {
            data = { ...data, ...event.data.json() };
        }
    } catch (e) {
        console.error('Erreur parsing notification:', e);
    }

    const options = {
        body: data.body,
        icon: data.icon || '/images/logo3.png',
        badge: data.badge || '/images/logo3.png',
        vibrate: [200, 100, 200],
        tag: 'storybird-notification',
        renotify: true,
        requireInteraction: false,
        data: data.data || { url: '/' },
        actions: [
            {
                action: 'open',
                title: 'Voir la vidéo'
            },
            {
                action: 'close',
                title: 'Fermer'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Clic sur notification');
    
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Si une fenêtre est déjà ouverte, la focus
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.focus();
                        client.navigate(urlToOpen);
                        return;
                    }
                }
                // Sinon, ouvrir une nouvelle fenêtre
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Fermeture de la notification
self.addEventListener('notificationclose', (event) => {
    console.log('❌ Notification fermée');
});

