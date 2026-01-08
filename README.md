# 🎯 PET Dashboard

Dashboard d'analytics PowerSpace avec Node.js et Express.

## 🚀 Démarrage rapide

### Avec Docker (recommandé)

```bash
# Depuis DockerHub
docker-compose -f docker-compose.prod.yml up -d

# Ou builder localement
docker-compose up -d
```

### Sans Docker

```bash
# Installation
npm install

# Mode développement (avec auto-reload)
npm run dev

# Mode production
npm start
```

L'application sera accessible sur **http://localhost:3000**

## 🔐 Authentification

Les utilisateurs doivent s'authentifier avec leurs identifiants PowerSpace via la page de login. Aucune configuration serveur n'est nécessaire.

## 📁 Structure

### Pages
- `views/login.html` - Page de connexion
- `views/dashboard.html` - Page d'accueil avec statistiques
- `views/insights.html` - Page analytics avec détails par annonceur
- `views/report.html` - Page de rapport détaillé par ad copy

### Styles & Scripts
- `styles.css` - Styles personnalisés
- `script.js` - JavaScript commun (sidebar, dark mode)
- `auth.js` - Gestion de l'authentification
- `auth-check.js` - Protection des pages
- `home.js` - Logique de la page d'accueil
- `insights.js` - Logique de la page analytics
- `report.js` - Logique de la page rapport
- `user-profile.js` - Affichage du profil utilisateur

### Backend
- `server.js` - Serveur Express avec routes API

## 🛠️ Technologies

- **Backend**: Node.js + Express
- **Frontend**: HTML5, JavaScript vanilla, Tailwind CSS
- **Charts**: Chart.js
- **API**: GraphQL (PowerSpace)
- **Authentification**: JWT avec HTTP-only cookies
- **Conteneurisation**: Docker & Docker Compose

## 🐳 Docker

Pour plus d'informations sur l'utilisation de Docker, consultez [DOCKER.md](./DOCKER.md)

### Build et Push

```bash
# Build et push vers DockerHub
./build-and-push.sh 1.0
```

## 📊 Fonctionnalités

- ✅ Authentification PowerSpace
- ✅ Dashboard avec statistiques temps réel
- ✅ Analytics par annonceur/campagne/ad group
- ✅ Rapport détaillé par ad copy
- ✅ Export CSV et copie clipboard
- ✅ Colonnes personnalisables (drag & drop)
- ✅ Dark mode
- ✅ Cache client (6h)
- ✅ Timeline des activités

## 📝 Développement

```bash
# Démarrer en mode dev
npm run dev

# Avec Docker (hot-reload)
docker-compose -f docker-compose.dev.yml up
```
