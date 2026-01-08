# 🐳 Guide Docker - PET Dashboard

Ce guide explique comment utiliser Docker pour déployer l'application PET Dashboard.

## 📋 Prérequis

- Docker installé (version 20.10+)
- Docker Compose installé (version 2.0+)

## 🚀 Production

### Option 1 : Utiliser l'image depuis DockerHub (recommandé)

```bash
# Télécharger et démarrer l'image depuis DockerHub
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f

# Arrêter
docker-compose -f docker-compose.prod.yml down
```

### Option 2 : Builder localement

```bash
# Construire et démarrer
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

L'application sera accessible sur **http://localhost:3000**

### Commandes utiles

```bash
# Reconstruire l'image
docker-compose up -d --build

# Voir les conteneurs en cours
docker-compose ps

# Redémarrer
docker-compose restart

# Voir les logs en temps réel
docker-compose logs -f pet-dashboard

# Entrer dans le conteneur
docker-compose exec pet-dashboard sh

# Arrêter et supprimer les volumes
docker-compose down -v
```

## 🔧 Développement

Pour le développement avec hot-reload (nodemon) :

```bash
# Lancer en mode développement
docker-compose -f docker-compose.dev.yml up

# En arrière-plan
docker-compose -f docker-compose.dev.yml up -d

# Arrêter
docker-compose -f docker-compose.dev.yml down
```

Le code source est monté en volume, donc les modifications sont détectées automatiquement.

## 🏗️ Build de l'image seule

```bash
# Construire l'image
docker build -t pet-dashboard:latest .

# Lancer manuellement
docker run -d \
  --name pet-dashboard \
  -p 3000:3000 \
  pet-dashboard:latest
```

## 🔍 Healthcheck

Le conteneur inclut un healthcheck qui vérifie toutes les 30 secondes que l'application répond.

```bash
# Vérifier le statut
docker inspect --format='{{json .State.Health}}' pet-dashboard
```

## 📦 Structure des fichiers Docker

- **`Dockerfile`** : Image de production optimisée
- **`Dockerfile.dev`** : Image de développement avec nodemon
- **`docker-compose.yml`** : Configuration de production
- **`docker-compose.dev.yml`** : Configuration de développement
- **`.dockerignore`** : Fichiers à exclure du build

## 🔐 Sécurité

- L'image utilise `node:20-alpine` (légère et sécurisée)
- Le processus Node.js s'exécute en tant qu'utilisateur non-root
- Seules les dépendances de production sont installées

## 🌐 Variables d'environnement

Vous pouvez personnaliser via le `docker-compose.yml` :

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
```

## 📊 Volumes

Un volume pour les logs est configuré (optionnel) :

```yaml
volumes:
  - ./logs:/app/logs
```

## 🚢 Déploiement

### Build et Push vers DockerHub (Script automatisé)

Le script `build-and-push.sh` automatise le build et le push vers DockerHub :

```bash
# Rendre le script exécutable (première fois seulement)
chmod +x build-and-push.sh

# Build et push version 1.0
./build-and-push.sh 1.0

# Build et push version 1.2.5
./build-and-push.sh 1.2.5
```

Le script va :
- ✅ Vérifier les prérequis (Docker, Dockerfile)
- 🔐 Vérifier la connexion DockerHub
- 🏗️ Builder l'image avec le tag de version
- 🏷️ Créer automatiquement le tag `latest`
- 📤 Pusher les deux tags vers DockerHub

### Connexion DockerHub

Si vous n'êtes pas encore connecté :

```bash
docker login
# Entrez votre username: kleekr
# Entrez votre mot de passe/token
```

### Build et Push manuel

Si vous préférez sans le script :

```bash
# Build
docker build -t kleekr/pws-extra-tools:1.0 .

# Tag latest
docker tag kleekr/pws-extra-tools:1.0 kleekr/pws-extra-tools:latest

# Push
docker push kleekr/pws-extra-tools:1.0
docker push kleekr/pws-extra-tools:latest
```

### Docker Hub

L'image est disponible sur : **https://hub.docker.com/r/kleekr/pws-extra-tools**

## 🆘 Dépannage

### Le port 3000 est déjà utilisé

Modifiez le port dans `docker-compose.yml` :

```yaml
ports:
  - "8080:3000"  # Expose sur le port 8080
```

### Reconstruire complètement

```bash
# Supprimer tout et reconstruire
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Logs détaillés

```bash
# Tous les logs depuis le début
docker-compose logs

# Dernières 100 lignes
docker-compose logs --tail=100

# Suivre en temps réel
docker-compose logs -f
```
