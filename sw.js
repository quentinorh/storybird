// Service Worker pour Storybird - Notifications Push

const CACHE_NAME = 'storybird-v1';

// Installation du Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Réception des notifications push
self.addEventListener('push', (event) => {
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
        // Erreur silencieuse
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
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.focus();
                        client.navigate(urlToOpen);
                        return;
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Fermeture de la notification
self.addEventListener('notificationclose', (event) => {
    // Notification fermée
});
