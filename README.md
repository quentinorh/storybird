# Storybird - Gestionnaire de Vidéos Cloudinary

Application simple pour gérer vos vidéos stockées sur Cloudinary.

## Fonctionnalités

- 📹 Affichage de toutes les vidéos stockées sur Cloudinary
- ⭐ Gestion des favoris (ajout/suppression)
- 🗑️ Suppression de vidéos
- 🔍 Filtrage : toutes les vidéos ou uniquement les favoris

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Configurer les variables d'environnement dans le fichier `.env` :
```
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_PREFIX=storybird1/
PORT=3000
```

Ou alternativement, utilisez les variables individuelles :
```
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
CLOUDINARY_PREFIX=storybird1/
PORT=3000
```

## Utilisation

1. Démarrer le serveur :
```bash
npm start
```

2. Ouvrir votre navigateur à l'adresse : `http://localhost:3000`

## Structure

- `index.html` - Interface utilisateur
- `style.css` - Styles
- `script.js` - Logique frontend
- `server.js` - API backend pour Cloudinary
- `.env` - Variables d'environnement (non versionné)

