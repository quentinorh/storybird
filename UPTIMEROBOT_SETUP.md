# Configuration UptimeRobot pour maintenir l'app active

## Étapes de configuration

### 1. Créer un compte UptimeRobot

1. Allez sur [https://uptimerobot.com/](https://uptimerobot.com/)
2. Cliquez sur **"Sign Up"** (gratuit)
3. Créez votre compte avec :
   - Email
   - Mot de passe
   - Confirmez votre email si demandé

### 2. Ajouter un nouveau monitor

1. Une fois connecté, vous arrivez sur le **Dashboard**
2. Cliquez sur le bouton **"+ Add New Monitor"** (en haut à droite)

### 3. Configuration du monitor

Remplissez les champs suivants :

#### Type de monitor
- Sélectionnez : **HTTP(s)** (première option)

#### Détails
- **Friendly Name** : `Storybird - Keep Alive` (ou le nom de votre choix)
- **URL (or IP)** : `https://storybird.onrender.com` 
  - ⚠️ Remplacez par l'URL exacte de votre application Render

#### Intervalle de monitoring
- **Monitoring Interval** : Sélectionnez **5 minutes**
  - C'est l'intervalle minimum gratuit
  - Cela enverra une requête toutes les 5 minutes, ce qui empêchera la mise en veille

#### Alertes (optionnel)
- Vous pouvez laisser les alertes par défaut ou les désactiver
- Si vous activez les alertes, vous recevrez un email si l'app ne répond pas

### 4. Créer le monitor

1. Cliquez sur **"Create Monitor"**
2. Le monitor est maintenant actif !

### 5. Vérification

- Dans le Dashboard, vous verrez votre monitor avec un statut **"Up"** (vert)
- UptimeRobot enverra automatiquement une requête HTTP toutes les 5 minutes
- Votre application Render restera active en permanence

## Résultat

✅ Votre application ne se mettra plus en veille  
✅ Pas de délai de réveil pour les utilisateurs  
✅ L'application reste accessible instantanément  

## Limitations du plan gratuit

- **50 monitors maximum** (largement suffisant pour un usage personnel)
- **Intervalle minimum** : 5 minutes (parfait pour éviter la veille)
- **Historique** : 2 mois de logs

## Désactiver temporairement

Si vous voulez arrêter le monitoring temporairement :
1. Allez dans le Dashboard UptimeRobot
2. Cliquez sur votre monitor
3. Cliquez sur **"Pause"** (ou modifiez l'intervalle)

## Modifier l'URL

Si l'URL de votre application Render change :
1. Allez dans le Dashboard UptimeRobot
2. Cliquez sur votre monitor
3. Cliquez sur **"Edit"**
4. Modifiez l'URL
5. Sauvegardez

## Astuce

Vous pouvez créer plusieurs monitors pour :
- L'URL principale de l'application
- L'endpoint API (`/api/videos`) si vous voulez tester la fonctionnalité
- Mais un seul monitor sur l'URL principale suffit pour maintenir l'app active

