# Guide de déploiement sur Render

## Étapes de déploiement

### 1. Préparer le dépôt Git

Assurez-vous que votre code est commité et poussé sur GitHub :

```bash
git add .
git commit -m "Préparation pour déploiement Render"
git push origin main
```

### 2. Créer un nouveau service sur Render

1. Connectez-vous à [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **"New +"** puis **"Web Service"**
3. Connectez votre compte GitHub si ce n'est pas déjà fait
4. Sélectionnez le dépôt `storybird`

### 3. Configuration du service

Remplissez les champs suivants :

- **Name** : `storybird` (ou le nom de votre choix)
- **Region** : Choisissez la région la plus proche (ex: Frankfurt)
- **Branch** : `main` (ou votre branche principale)
- **Root Directory** : Laisser vide (racine du projet)
- **Runtime** : `Node`
- **Build Command** : `npm install`
- **Start Command** : `npm start`

### 4. Variables d'environnement

Dans la section **"Environment Variables"**, ajoutez :

| Key | Value |
|-----|-------|
| `CLOUDINARY_URL` | `cloudinary://397169216373279:hHqTkyOgaU7V0aH6YiOhIqPgQUU@dkv3sh4oq` |
| `CLOUDINARY_PREFIX` | `storybird1/` (optionnel, valeur par défaut) |
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGIN` | L'URL de votre app Render (ex: `https://storybird.onrender.com`) |

⚠️ **Important** : Ne cochez pas "Sync from .env" pour `CLOUDINARY_URL` car c'est une information sensible.

### 5. Plan de service

- Sélectionnez le plan **"Free"** (gratuit avec limitations)

### 6. Déploiement

1. Cliquez sur **"Create Web Service"**
2. Render va automatiquement :
   - Cloner votre dépôt
   - Installer les dépendances (`npm install`)
   - Démarrer l'application (`npm start`)
3. Attendez la fin du déploiement (2-5 minutes)

### 7. Vérification

Une fois le déploiement terminé :
- Votre application sera accessible à l'URL : `https://storybird.onrender.com` (ou l'URL fournie par Render)
- La première requête peut être lente (mise en veille après inactivité sur le plan gratuit)

## Notes importantes

### Limitations du plan gratuit Render

- **Mise en veille** : L'application se met en veille après 15 minutes d'inactivité
- **Temps de réveil** : La première requête après la mise en veille peut prendre 30-60 secondes
- **Limite de temps** : 750 heures/mois (suffisant pour un usage personnel)

### Éviter la mise en veille (optionnel)

Pour maintenir votre application active et éviter le délai de réveil, vous pouvez utiliser un service de ping automatique :

**Services gratuits recommandés :**
- **[UptimeRobot](https://uptimerobot.com/)** : Ping toutes les 5 minutes (gratuit jusqu'à 50 monitors)
- **[Cron-job.org](https://cron-job.org/)** : Planification de tâches HTTP (gratuit)
- **[Pingdom](https://www.pingdom.com/)** : Monitoring gratuit (limité)

**Configuration avec UptimeRobot (exemple) :**
1. Créez un compte gratuit sur UptimeRobot
2. Ajoutez un nouveau monitor
3. Type : HTTP(s)
4. URL : `https://storybird.onrender.com`
5. Intervalle : 5 minutes
6. L'application restera active en permanence

### Mise à jour de l'application

**Déploiement automatique (par défaut) :**

✅ **Oui, Render redéploie automatiquement** à chaque push sur la branche configurée (généralement `main`).

Pour mettre à jour l'application :
1. Faites vos modifications en local
2. Commitez et poussez sur GitHub :
   ```bash
   git add .
   git commit -m "Description des changements"
   git push origin main
   ```
3. Render détectera automatiquement le push et lancera un nouveau déploiement
4. Vous pouvez suivre le déploiement dans le Dashboard Render (section "Events" ou "Logs")

**Vérifier que l'auto-deploy est activé :**
- Dans le Dashboard Render, allez dans votre service
- Section **"Settings"** → **"Auto-Deploy"**
- Assurez-vous que **"Auto-Deploy"** est activé (c'est généralement le cas par défaut)

**Déploiement manuel (si nécessaire) :**
1. Allez dans le Dashboard Render
2. Cliquez sur **"Manual Deploy"** → **"Deploy latest commit"**

### Variables d'environnement

Pour modifier les variables d'environnement :
1. Allez dans **"Environment"** dans le Dashboard
2. Modifiez les valeurs
3. Render redéploiera automatiquement

## Dépannage

### L'application ne démarre pas

- Vérifiez les logs dans le Dashboard Render
- Assurez-vous que toutes les variables d'environnement sont définies
- Vérifiez que `CLOUDINARY_URL` est correcte

### Erreur CORS

- Vérifiez que `ALLOWED_ORIGIN` correspond à l'URL de votre application Render
- Le format doit être : `https://votre-app.onrender.com` (sans slash final)

### L'application est lente au démarrage

- C'est normal sur le plan gratuit (mise en veille)
- La première requête après inactivité prend du temps

