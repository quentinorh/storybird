const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const webpush = require('web-push');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Fichier pour stocker les abonnements push
const SUBSCRIPTIONS_FILE = path.join(__dirname, 'push-subscriptions.json');

// Charger les abonnements existants
function loadSubscriptions() {
    try {
        if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
            return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Erreur lors du chargement des abonnements:', error);
    }
    return [];
}

// Sauvegarder les abonnements
function saveSubscriptions(subscriptions) {
    try {
        fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des abonnements:', error);
    }
}

let pushSubscriptions = loadSubscriptions();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration CORS (restreint en production)
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGIN || 'http://localhost:3000'
        : true, // En développement, autoriser toutes les origines
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Fonction pour parser CLOUDINARY_URL
// Format: cloudinary://api_key:api_secret@cloud_name
function parseCloudinaryUrl(url) {
    if (!url) {
        throw new Error('CLOUDINARY_URL est vide');
    }
    
    url = url.trim();
    
    if (url.startsWith('cloudinary://')) {
        const withoutProtocol = url.replace('cloudinary://', '');
        const parts = withoutProtocol.split('@');
        if (parts.length === 2) {
            const credentials = parts[0].split(':');
            if (credentials.length === 2) {
                return {
                    api_key: credentials[0],
                    api_secret: credentials[1],
                    cloud_name: parts[1]
                };
            }
        }
    }
    
    throw new Error(`Format CLOUDINARY_URL invalide: "${url}". Format attendu: cloudinary://api_key:api_secret@cloud_name`);
}

// Configuration Cloudinary depuis les variables d'environnement
let cloudinaryConfig;
if (process.env.CLOUDINARY_URL) {
    try {
        const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
        cloudinaryConfig = {
            cloud_name: parsed.cloud_name,
            api_key: parsed.api_key,
            api_secret: parsed.api_secret
        };
    } catch (error) {
        console.error('Erreur lors du parsing de CLOUDINARY_URL:', error.message);
        process.exit(1);
    }
} else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinaryConfig = {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    };
} else {
    console.error('Erreur: Variables Cloudinary non configurées dans .env');
    console.error('Utilisez CLOUDINARY_URL ou CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET');
    process.exit(1);
}

cloudinary.config(cloudinaryConfig);

const PREFIX = process.env.CLOUDINARY_PREFIX || 'storybird1/';
const FAVORITE_TAG = 'favoris';
const TRASH_FOLDER = 'corbeille';

// Configuration Web Push (VAPID)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:contact@storybird.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('✅ Notifications push configurées');
} else {
    console.log('⚠️  Notifications push non configurées (clés VAPID manquantes)');
    console.log('   Pour générer des clés: npx web-push generate-vapid-keys');
}

// Fonction de validation pour s'assurer que le public_id appartient au préfixe
function validatePublicId(publicId) {
    if (!publicId || typeof publicId !== 'string') {
        return false;
    }
    // Normaliser le préfixe (enlever le slash final s'il existe)
    const normalizedPrefix = PREFIX.endsWith('/') ? PREFIX.slice(0, -1) : PREFIX;
    // Vérifier que le public_id commence par le préfixe
    return publicId.startsWith(normalizedPrefix + '/') || publicId === normalizedPrefix;
}

// Route pour récupérer toutes les vidéos
app.get('/api/videos', async (req, res) => {
    try {
        const normalizedPrefix = PREFIX.endsWith('/') ? PREFIX.slice(0, -1) : PREFIX;
        const trashPrefix = `${normalizedPrefix}/${TRASH_FOLDER}/`;
        
        const result = await cloudinary.api.resources({
            resource_type: 'video',
            type: 'upload',
            prefix: PREFIX,
            tags: true,
            context: true,
            max_results: 500
        });

        // Filtrer les vidéos dans la corbeille
        const videos = result.resources
            .filter(video => !video.public_id.startsWith(trashPrefix))
            .map(video => ({
            url: video.url,
            created_at: video.created_at,
            public_id: video.public_id,
                is_favorite: video.tags && video.tags.includes(FAVORITE_TAG),
                title: video.context && video.context.custom && video.context.custom.title ? video.context.custom.title : null,
                description: video.context && video.context.custom && video.context.custom.description ? video.context.custom.description : null
        })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(videos);
    } catch (error) {
        console.error('Erreur lors de la récupération des vidéos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route pour ajouter/enlever un favori
app.post('/api/videos/:publicId/favorite', async (req, res) => {
    try {
        const publicId = decodeURIComponent(req.params.publicId);
        
        // Validation de sécurité
        if (!validatePublicId(publicId)) {
            return res.status(403).json({ error: 'Accès non autorisé à cette ressource' });
        }
        
        await cloudinary.uploader.add_tag(FAVORITE_TAG, [publicId], {
            resource_type: 'video'
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du favori:', error.message);
        res.status(500).json({ error: error.message || 'Erreur lors de l\'ajout du favori' });
    }
});

app.delete('/api/videos/:publicId/favorite', async (req, res) => {
    try {
        const publicId = decodeURIComponent(req.params.publicId);
        
        // Validation de sécurité
        if (!validatePublicId(publicId)) {
            return res.status(403).json({ error: 'Accès non autorisé à cette ressource' });
        }
        
        await cloudinary.uploader.remove_tag(FAVORITE_TAG, [publicId], {
            resource_type: 'video'
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la suppression du favori:', error.message);
        res.status(500).json({ error: error.message || 'Erreur lors de la suppression du favori' });
    }
});

// Route pour mettre à jour les métadonnées d'une vidéo (titre et description)
app.put('/api/videos/:publicId', async (req, res) => {
    try {
        const publicId = decodeURIComponent(req.params.publicId);
        
        // Validation de sécurité
        if (!validatePublicId(publicId)) {
            return res.status(403).json({ error: 'Accès non autorisé à cette ressource' });
        }

        const { title, description } = req.body;

        // Construire le contexte pour Cloudinary
        // On doit toujours inclure les clés, même si elles sont vides, pour pouvoir les supprimer
        const context = {
            title: title !== undefined && title !== null ? title : '',
            description: description !== undefined && description !== null ? description : ''
        };

        // Mettre à jour le contexte de la vidéo
        await cloudinary.uploader.add_context(context, [publicId], {
            resource_type: 'video'
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la vidéo:', error.message);
        res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour de la vidéo' });
    }
});

// Route pour déplacer une vidéo dans la corbeille
app.delete('/api/videos/:publicId', async (req, res) => {
    try {
        const publicId = decodeURIComponent(req.params.publicId);
        
        // Validation de sécurité
        if (!validatePublicId(publicId)) {
            return res.status(403).json({ error: 'Accès non autorisé à cette ressource' });
        }
        
        // Vérifier que la vidéo n'est pas déjà dans la corbeille
        const normalizedPrefix = PREFIX.endsWith('/') ? PREFIX.slice(0, -1) : PREFIX;
        const trashPrefix = `${normalizedPrefix}/${TRASH_FOLDER}/`;
        if (publicId.startsWith(trashPrefix)) {
            return res.status(400).json({ error: 'La vidéo est déjà dans la corbeille' });
        }
        
        // Construire le nouveau public_id dans la corbeille
        // Exemple: storybird1/video123 -> storybird1/corbeille/video123
        const pathParts = publicId.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const newPublicId = `${normalizedPrefix}/${TRASH_FOLDER}/${fileName}`;
        
        // Déplacer la vidéo dans la corbeille
        await cloudinary.uploader.rename(publicId, newPublicId, {
            resource_type: 'video'
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors du déplacement de la vidéo:', error.message);
        res.status(500).json({ error: error.message || 'Erreur lors du déplacement de la vidéo' });
    }
});

// Route pour exposer la config du Pi au frontend
app.get('/api/pi-config', (req, res) => {
    res.json({
        piUrl: process.env.PI_URL || null,
        configured: !!process.env.PI_URL,
        streamPath: '/birdcam/'
    });
});

// === NOTIFICATIONS PUSH ===

// Route pour récupérer la clé publique VAPID
app.get('/api/push/vapid-public-key', (req, res) => {
    if (!VAPID_PUBLIC_KEY) {
        return res.status(503).json({ error: 'Notifications push non configurées' });
    }
    res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Route pour s'abonner aux notifications push
app.post('/api/push/subscribe', (req, res) => {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return res.status(503).json({ error: 'Notifications push non configurées' });
    }

    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Abonnement invalide' });
    }

    // Vérifier si l'abonnement existe déjà
    const existingIndex = pushSubscriptions.findIndex(
        sub => sub.endpoint === subscription.endpoint
    );

    if (existingIndex === -1) {
        pushSubscriptions.push(subscription);
        saveSubscriptions(pushSubscriptions);
    }

    res.json({ success: true });
});

// Route pour se désabonner des notifications push
app.post('/api/push/unsubscribe', (req, res) => {
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Abonnement invalide' });
    }

    pushSubscriptions = pushSubscriptions.filter(
        sub => sub.endpoint !== subscription.endpoint
    );
    saveSubscriptions(pushSubscriptions);

    res.json({ success: true });
});

// Fonction pour vérifier la signature du webhook Cloudinary
function verifyCloudinarySignature(body, timestamp, signature) {
    if (!cloudinaryConfig.api_secret) {
        return false;
    }
    
    // Cloudinary signe avec : SHA256(body + timestamp + api_secret)
    const payload = JSON.stringify(body) + timestamp + cloudinaryConfig.api_secret;
    const expectedSignature = crypto
        .createHash('sha256')
        .update(payload)
        .digest('hex');
    
    return signature === expectedSignature;
}

// Webhook Cloudinary pour les nouvelles vidéos
app.post('/api/webhook/cloudinary', async (req, res) => {
    try {
        // Vérifier la signature du webhook
        const signature = req.headers['x-cld-signature'];
        const timestamp = req.headers['x-cld-timestamp'];
        
        if (signature && timestamp) {
            if (!verifyCloudinarySignature(req.body, timestamp, signature)) {
                return res.status(401).json({ error: 'Signature invalide' });
            }
        }

        const { notification_type, public_id, resource_type, secure_url } = req.body;

        // Vérifier que c'est bien un upload de vidéo
        if (notification_type === 'upload' && resource_type === 'video') {
            // Vérifier que la vidéo appartient à notre préfixe
            if (validatePublicId(public_id)) {
                // Envoyer une notification push à tous les abonnés
                await sendPushNotifications({
                    title: '🐦 Nouvelle vidéo !',
                    body: 'Un oiseau a été détecté sur la mangeoire',
                    icon: '/images/logo3.png',
                    badge: '/images/logo3.png',
                    data: {
                        url: '/',
                        videoUrl: secure_url
                    }
                });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur webhook Cloudinary:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fonction pour envoyer les notifications push
async function sendPushNotifications(payload) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return;
    }

    const payloadString = JSON.stringify(payload);
    const invalidSubscriptions = [];

    const sendPromises = pushSubscriptions.map(async (subscription, index) => {
        try {
            await webpush.sendNotification(subscription, payloadString);
        } catch (error) {
            // Si l'abonnement n'est plus valide, le marquer pour suppression
            if (error.statusCode === 410 || error.statusCode === 404) {
                invalidSubscriptions.push(index);
            }
        }
    });

    await Promise.all(sendPromises);

    // Supprimer les abonnements invalides
    if (invalidSubscriptions.length > 0) {
        pushSubscriptions = pushSubscriptions.filter(
            (_, index) => !invalidSubscriptions.includes(index)
        );
        saveSubscriptions(pushSubscriptions);
    }
}

// Route de test pour envoyer une notification (développement uniquement)
if (process.env.NODE_ENV !== 'production') {
    app.post('/api/push/test', async (req, res) => {
        try {
            await sendPushNotifications({
                title: '🐦 Test notification',
                body: 'Les notifications push fonctionnent !',
                icon: '/images/logo3.png',
                data: { url: '/' }
            });
            res.json({ success: true, subscribers: pushSubscriptions.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

// Servir les fichiers statiques
app.use(express.static('.'));

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📁 Préfixe Cloudinary: ${PREFIX}`);
});

