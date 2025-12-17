# 🐦 Storybird

> Application web moderne pour visualiser et gérer les vidéos d'une mangeoire à oiseaux connectée, hébergées sur Cloudinary.

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![Express](https://img.shields.io/badge/Express-4.18-blue.svg)
![Cloudinary](https://img.shields.io/badge/Cloudinary-2.8-blue.svg)
![License](https://img.shields.io/badge/License-ISC-yellow.svg)

## 📖 Description

Storybird est une application web minimaliste et ludique permettant de visualiser, organiser et partager les vidéos capturées par une mangeoire à oiseaux connectée. Les vidéos sont stockées sur Cloudinary et accessibles via une interface moderne et intuitive.

## ✨ Fonctionnalités

- 📹 **Visualisation des vidéos** - Affichage de toutes les vidéos stockées sur Cloudinary
- ⭐ **Gestion des favoris** - Marquer vos vidéos préférées pour un accès rapide
- 🔗 **Partage** - Copier l'URL des vidéos pour les partager facilement
- 🗑️ **Suppression** - Supprimer les vidéos directement depuis l'interface
- 🔍 **Filtrage** - Afficher toutes les vidéos ou uniquement les favoris
- 📱 **Responsive** - Interface adaptée à tous les écrans (desktop, tablette, mobile)
- 🎨 **Design moderne** - Interface minimaliste avec des couleurs primaires

## 🛠️ Technologies utilisées

- **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
- **Backend** : Node.js, Express.js
- **Storage** : Cloudinary (vidéos)
- **Déploiement** : Render (ou autre plateforme)

## 📋 Prérequis

- Node.js (version 18 ou supérieure)
- npm (Node Package Manager)
- Un compte Cloudinary avec des vidéos stockées
- Variables d'environnement Cloudinary (API Key, API Secret, Cloud Name)

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/quentinorh/storybird.git
cd storybird
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# Configuration Cloudinary (format URL)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Ou utilisez les variables individuelles :
# CLOUDINARY_CLOUD_NAME=votre_cloud_name
# CLOUDINARY_API_KEY=votre_api_key
# CLOUDINARY_API_SECRET=votre_api_secret

# Préfixe des vidéos dans Cloudinary (optionnel)
CLOUDINARY_PREFIX=storybird1/

# Port du serveur (optionnel, défaut: 3000)
PORT=3000
```

> ⚠️ **Important** : Le fichier `.env` est déjà dans `.gitignore` pour protéger vos informations sensibles. Ne le commitez jamais !

### 4. Démarrer l'application

#### Mode développement

```bash
npm start
```

L'application sera accessible sur `http://localhost:3000`

## 📁 Structure du projet

```
storybird/
├── index.html          # Interface utilisateur
├── style.css           # Styles CSS
├── script.js           # Logique frontend
├── server.js           # API backend (Express)
├── package.json        # Dépendances Node.js
├── render.yaml         # Configuration Render (optionnel)
├── .env               # Variables d'environnement (non versionné)
├── .gitignore         # Fichiers à ignorer par Git
└── README.md          # Documentation
```

## 🎯 Utilisation

### Interface utilisateur

1. **Visualiser les vidéos** : Toutes les vidéos sont affichées automatiquement au chargement
2. **Filtrer** : Utilisez les boutons "Toutes les vidéos" ou "Favoris" pour filtrer
3. **Ajouter aux favoris** : Cliquez sur le bouton ⭐ pour marquer une vidéo comme favorite
4. **Partager** : Cliquez sur 🔗 pour copier l'URL de la vidéo
5. **Supprimer** : Cliquez sur 🗑️ pour supprimer une vidéo (avec confirmation)

### API Endpoints

L'application expose une API REST pour interagir avec Cloudinary :

- `GET /api/videos` - Récupérer toutes les vidéos
- `POST /api/videos/:publicId/favorite` - Ajouter un favori
- `DELETE /api/videos/:publicId/favorite` - Retirer un favori
- `DELETE /api/videos/:publicId` - Supprimer une vidéo

## 🌐 Déploiement

### Déploiement sur Render

1. Connectez votre dépôt GitHub à [Render](https://render.com)
2. Créez un nouveau **Web Service**
3. Configurez les variables d'environnement dans le dashboard Render
4. Définissez :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
5. Déployez !

> 💡 **Astuce** : Pour éviter la mise en veille sur le plan gratuit, utilisez [UptimeRobot](https://uptimerobot.com) pour envoyer un ping toutes les 5 minutes.

### Variables d'environnement en production

N'oubliez pas de configurer ces variables dans votre plateforme de déploiement :

- `CLOUDINARY_URL` (ou les variables individuelles)
- `CLOUDINARY_PREFIX` (optionnel)
- `NODE_ENV=production`
- `ALLOWED_ORIGIN` (URL de votre application déployée)

## 🔒 Sécurité

- ✅ Validation des `public_id` pour éviter l'accès non autorisé
- ✅ Protection XSS avec échappement HTML
- ✅ Configuration CORS pour la production
- ✅ Variables d'environnement sécurisées
- ✅ Clés API jamais exposées côté client

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 License

Ce projet est sous licence ISC.

## 👤 Auteur

**Quentin**

- GitHub: [@quentinorh](https://github.com/quentinorh)

## 🙏 Remerciements

- [Cloudinary](https://cloudinary.com) pour l'hébergement des vidéos
- [Express.js](https://expressjs.com) pour le framework backend
- Tous les contributeurs open source

---

⭐ Si ce projet vous a été utile, n'hésitez pas à lui donner une étoile !
