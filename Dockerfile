# Utiliser Node.js 20 LTS
FROM node:20-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production
RUN npm ci --only=production

# Copier le reste de l'application
COPY . .

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Passer à l'utilisateur non-root
USER nodejs

# Exposer le port 3000
EXPOSE 3000

# Définir les variables d'environnement par défaut
ENV NODE_ENV=production \
    PORT=3000

# Commande de démarrage
CMD ["node", "server.js"]
