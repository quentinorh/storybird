const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const webpush = require('web-push');
const { createClient } = require('@libsql/client');
require('dotenv').config();

// Configuration de l'authentification
const ACCESS_CODE = process.env.ACCESS_CODE;
const AUTH_ENABLED = !!ACCESS_CODE;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Stockage simple des sessions en mémoire (suffisant pour une app personnelle)
const sessions = new Map();

if (AUTH_ENABLED) {
    console.log('🔐 Authentification activée');
} else {
    console.log('⚠️  Authentification désactivée (ACCESS_CODE non défini)');
}

// Configuration Turso
let db = null;
if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
    });
    console.log('✅ Base de données Turso connectée');
} else {
    console.log('⚠️  Turso non configuré - les abonnements push ne seront pas persistants');
}

// Initialiser la table des abonnements push
async function initDatabase() {
    if (!db) return;
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint TEXT UNIQUE NOT NULL,
                subscription_data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (error) {
        console.error('Erreur initialisation DB:', error);
    }
}

// Charger les abonnements depuis Turso
async function loadSubscriptions() {
    if (!db) return [];
    try {
        const result = await db.execute('SELECT subscription_data FROM push_subscriptions');
        return result.rows.map(row => JSON.parse(row.subscription_data));
    } catch (error) {
        console.error('Erreur chargement abonnements:', error);
        return [];
    }
}

// Ajouter un abonnement
async function addSubscription(subscription) {
    if (!db) return;
    try {
        await db.execute({
            sql: 'INSERT OR REPLACE INTO push_subscriptions (endpoint, subscription_data) VALUES (?, ?)',
            args: [subscription.endpoint, JSON.stringify(subscription)]
        });
    } catch (error) {
        console.error('Erreur ajout abonnement:', error);
    }
}

// Supprimer un abonnement
async function removeSubscription(endpoint) {
    if (!db) return;
    try {
        await db.execute({
            sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?',
            args: [endpoint]
        });
    } catch (error) {
        console.error('Erreur suppression abonnement:', error);
    }
}

// Supprimer plusieurs abonnements par endpoints
async function removeSubscriptionsByEndpoints(endpoints) {
    if (!db || endpoints.length === 0) return;
    try {
        const placeholders = endpoints.map(() => '?').join(',');
        await db.execute({
            sql: `DELETE FROM push_subscriptions WHERE endpoint IN (${placeholders})`,
            args: endpoints
        });
    } catch (error) {
        console.error('Erreur suppression abonnements:', error);
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration EJS
app.set('view engine', 'ejs');
app.set('views', './views');

// Configuration CORS (restreint en production)
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGIN || 'http://localhost:3000'
        : true, // En développement, autoriser toutes les origines
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Middleware d'authentification
function requireAuth(req, res, next) {
    // Si l'authentification n'est pas activée, passer
    if (!AUTH_ENABLED) {
        return next();
    }

    // Vérifier le cookie de session
    const sessionId = req.cookies.session_id;
    if (sessionId && sessions.has(sessionId)) {
        return next();
    }

    // Si c'est une requête API, retourner 401
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    // Sinon, rediriger vers la page de login
    const redirect = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login.html?redirect=${redirect}`);
}

// Route de login (toujours accessible)
app.post('/api/auth/login', (req, res) => {
    const { code } = req.body;

    if (!AUTH_ENABLED) {
        return res.json({ success: true });
    }

    if (code === ACCESS_CODE) {
        // Créer une session
        const sessionId = crypto.randomBytes(32).toString('hex');
        sessions.set(sessionId, { createdAt: Date.now() });

        // Cookie sécurisé (30 jours)
        res.cookie('session_id', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
        });

        return res.json({ success: true });
    }

    return res.status(401).json({ error: 'Code incorrect' });
});

// Route de logout
app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.cookies.session_id;
    if (sessionId) {
        sessions.delete(sessionId);
    }
    res.clearCookie('session_id');
    res.json({ success: true });
});

// Pages publiques (login, assets)
app.get('/login.html', (req, res, next) => {
    // Si déjà authentifié, rediriger vers l'accueil
    if (AUTH_ENABLED) {
        const sessionId = req.cookies.session_id;
        if (sessionId && sessions.has(sessionId)) {
            return res.redirect('/');
        }
    }
    next();
});

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

// Protéger les routes API (sauf auth et webhook)
app.use('/api/videos', requireAuth);
app.use('/api/pi-config', requireAuth);
app.use('/api/push/subscribe', requireAuth);
app.use('/api/push/unsubscribe', requireAuth);

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
app.post('/api/push/subscribe', async (req, res) => {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return res.status(503).json({ error: 'Notifications push non configurées' });
    }

    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Abonnement invalide' });
    }

    // Ajouter l'abonnement à la base de données
    await addSubscription(subscription);

    res.json({ success: true });
});

// Route pour se désabonner des notifications push
app.post('/api/push/unsubscribe', async (req, res) => {
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Abonnement invalide' });
    }

    // Supprimer l'abonnement de la base de données
    await removeSubscription(subscription.endpoint);

    res.json({ success: true });
});

// Webhook pour les nouvelles vidéos (appelé par le Raspberry Pi)
app.post('/api/webhook/cloudinary', async (req, res) => {
    try {
        const { notification_type, public_id, secure_url, resource_type } = req.body;

        // Vérifier que c'est bien un upload
        if (notification_type !== 'upload') {
            return res.status(400).json({ error: 'Type de notification non supporté' });
        }

        // Vérifier que c'est une vidéo appartenant à notre préfixe
        if (resource_type === 'video' && validatePublicId(public_id)) {
            // Envoyer une notification push à tous les abonnés
            await sendPushNotifications({
                title: '🐦 Nouvelle vidéo !',
                body: 'Un oiseau a été détecté sur la mangeoire',
                icon: '/images/icon.png',
                badge: '/images/icon.png',
                data: {
                    url: '/',
                    videoUrl: secure_url
                }
            });
        }

        res.json({ success: true, received: public_id });
    } catch (error) {
        console.error('Erreur webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fonction pour envoyer les notifications push
async function sendPushNotifications(payload) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return;
    }

    // Charger les abonnements depuis la base de données
    const subscriptions = await loadSubscriptions();
    if (subscriptions.length === 0) return;

    const payloadString = JSON.stringify(payload);
    const invalidEndpoints = [];

    const sendPromises = subscriptions.map(async (subscription) => {
        try {
            await webpush.sendNotification(subscription, payloadString);
        } catch (error) {
            // Si l'abonnement n'est plus valide, le marquer pour suppression
            if (error.statusCode === 410 || error.statusCode === 404) {
                invalidEndpoints.push(subscription.endpoint);
            }
        }
    });

    await Promise.all(sendPromises);

    // Supprimer les abonnements invalides
    if (invalidEndpoints.length > 0) {
        await removeSubscriptionsByEndpoints(invalidEndpoints);
    }
}

// Route de test pour envoyer une notification (développement uniquement)
if (process.env.NODE_ENV !== 'production') {
    app.post('/api/push/test', async (req, res) => {
        try {
            const subscriptions = await loadSubscriptions();
            await sendPushNotifications({
                title: '🐦 Test notification',
                body: 'Les notifications push fonctionnent !',
                icon: '/images/icon.png',
                data: { url: '/' }
            });
            res.json({ success: true, subscribers: subscriptions.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

// Servir les fichiers statiques
// Assets publics (CSS, JS, images, manifest, sw.js)
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/images', express.static('images'));
app.use('/manifest.json', express.static('manifest.json'));
app.use('/sw.js', express.static('sw.js'));
app.use('/robots.txt', express.static('robots.txt'));

// Page de login accessible sans authentification
app.use('/login.html', express.static('login.html'));

// Routes protégées par authentification (rendu EJS)
app.get('/', requireAuth, (req, res) => {
    res.render('index');
});

app.get('/live', requireAuth, (req, res) => {
    res.render('live');
});

// Redirection des anciennes URLs .html vers les nouvelles
app.get('/index.html', requireAuth, (req, res) => {
    res.redirect('/');
});

app.get('/live.html', requireAuth, (req, res) => {
    res.redirect('/live');
});

// Autres fichiers statiques protégés
app.use(requireAuth);
app.use(express.static('.'));

// Démarrer le serveur
async function startServer() {
    // Initialiser la base de données
    await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
        console.log(`📁 Préfixe Cloudinary: ${PREFIX}`);
    });
}

startServer();

