# 🚀 Guide de déploiement rapide

## 📦 Prérequis

- Docker et Docker Compose installés
- Compte DockerHub (pour push les images)

## 🏗️ Build et Push vers DockerHub

### 1. Connexion à DockerHub

```bash
docker login
# Username: kleekr
# Password: [votre token/mot de passe]
```

### 2. Build et Push

```bash
# Utiliser le script automatisé
./build-and-push.sh 1.0

# Ou manuellement
docker build -t kleekr/pws-extra-tools:1.0 .
docker tag kleekr/pws-extra-tools:1.0 kleekr/pws-extra-tools:latest
docker push kleekr/pws-extra-tools:1.0
docker push kleekr/pws-extra-tools:latest
```

## 🎯 Déploiement

### Sur un serveur de production

```bash
# 1. Cloner ou copier juste docker-compose.prod.yml
wget https://raw.githubusercontent.com/votre-repo/pws-extra-tools/main/docker-compose.prod.yml

# 2. Télécharger l'image
docker-compose -f docker-compose.prod.yml pull

# 3. Démarrer
docker-compose -f docker-compose.prod.yml up -d

# 4. Vérifier les logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Sur votre machine locale

```bash
# Avec l'image DockerHub
docker-compose -f docker-compose.prod.yml up -d

# Ou builder localement
docker-compose up -d
```

## 🔍 Commandes utiles

```bash
# Voir les conteneurs actifs
docker ps

# Voir les logs
docker-compose logs -f pet-dashboard

# Redémarrer
docker-compose restart

# Arrêter
docker-compose down

# Mettre à jour vers la dernière version
docker-compose pull
docker-compose up -d
```

## 🌐 Accès

Une fois démarré, l'application est accessible sur :

- **Local**: http://localhost:3000
- **Production**: http://votre-domaine.com:3000

## 🔐 Reverse Proxy (Nginx)

Pour exposer l'application avec un nom de domaine :

```nginx
server {
    listen 80;
    server_name pet.votredomaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoring

```bash
# Stats des ressources
docker stats pet-dashboard

# Healthcheck
docker inspect --format='{{json .State.Health}}' pet-dashboard

# Vérifier que l'app répond
curl http://localhost:3000/login
```

## 🔄 Mise à jour

```bash
# 1. Build nouvelle version
./build-and-push.sh 1.1

# 2. Sur le serveur, pull la nouvelle version
docker-compose -f docker-compose.prod.yml pull

# 3. Redémarrer avec la nouvelle image
docker-compose -f docker-compose.prod.yml up -d

# 4. Vérifier
docker-compose -f docker-compose.prod.yml logs -f
```

## 🛑 Rollback

En cas de problème avec une nouvelle version :

```bash
# Spécifier l'ancienne version dans docker-compose.prod.yml
# Changer: image: kleekr/pws-extra-tools:latest
# En:      image: kleekr/pws-extra-tools:1.0

# Puis redémarrer
docker-compose -f docker-compose.prod.yml up -d
```

## 🧹 Nettoyage

```bash
# Supprimer les conteneurs arrêtés
docker container prune

# Supprimer les images inutilisées
docker image prune

# Nettoyage complet
docker system prune -a
```

## 📝 Checklist de déploiement

- [ ] Code testé localement
- [ ] Version incrémentée
- [ ] Image buildée et pushée sur DockerHub
- [ ] docker-compose.prod.yml configuré
- [ ] Serveur de production accessible
- [ ] Docker installé sur le serveur
- [ ] Image pullée sur le serveur
- [ ] Application démarrée
- [ ] Logs vérifiés (pas d'erreurs)
- [ ] Application accessible via navigateur
- [ ] Authentification testée
- [ ] (Optionnel) Reverse proxy configuré
- [ ] (Optionnel) SSL/HTTPS configuré
