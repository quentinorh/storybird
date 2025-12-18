const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

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
            tags: true
        });

        // Filtrer les vidéos dans la corbeille
        const videos = result.resources
            .filter(video => !video.public_id.startsWith(trashPrefix))
            .map(video => ({
                url: video.url,
                created_at: video.created_at,
                public_id: video.public_id,
                is_favorite: video.tags && video.tags.includes(FAVORITE_TAG)
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

// Servir les fichiers statiques
app.use(express.static('.'));

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📁 Préfixe Cloudinary: ${PREFIX}`);
});

