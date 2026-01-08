#!/bin/bash

################################################################################
# Script de build et push Docker vers DockerHub
# Usage: ./build-and-push.sh <version>
# Exemple: ./build-and-push.sh 1.0
################################################################################

set -e  # Arrêter le script en cas d'erreur

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_USERNAME="kleekr"
IMAGE_NAME="pws-extra-tools"
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"
BUILD_DIR="."

# Fonction pour afficher les logs
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction pour afficher l'usage
usage() {
    echo "Usage: $0 <version>"
    echo ""
    echo "Exemples:"
    echo "  $0 1.0        # Build et push la version 1.0"
    echo "  $0 1.1.2      # Build et push la version 1.1.2"
    echo "  $0 latest     # Build et push comme latest (déconseillé)"
    echo ""
    exit 1
}

# Vérifier les arguments
if [ $# -eq 0 ]; then
    log_error "Aucune version spécifiée"
    usage
fi

VERSION=$1

# Validation du format de version (optionnel mais recommandé)
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]] && [ "$VERSION" != "latest" ]; then
    log_warning "Format de version non standard: $VERSION"
    log_warning "Format recommandé: X.Y ou X.Y.Z (ex: 1.0 ou 1.1.2)"
    read -p "Continuer quand même ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Opération annulée"
        exit 0
    fi
fi

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

# Vérifier que le Dockerfile existe
if [ ! -f "${BUILD_DIR}/Dockerfile" ]; then
    log_error "Dockerfile introuvable dans ${BUILD_DIR}/"
    exit 1
fi

# Afficher les informations
echo ""
log_info "==================================================================="
log_info "  Build et Push Docker Image - PET Dashboard"
log_info "==================================================================="
log_info "Image: ${FULL_IMAGE_NAME}"
log_info "Version: ${VERSION}"
log_info "Répertoire: ${BUILD_DIR}"
log_info "==================================================================="
echo ""

# Demander confirmation
read -p "Voulez-vous continuer ? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Opération annulée"
    exit 0
fi

# Vérifier la connexion Docker Hub
log_info "Vérification de la connexion à Docker Hub..."
if ! docker info &> /dev/null; then
    log_error "Docker n'est pas démarré"
    exit 1
fi

# Vérifier si l'utilisateur est connecté à Docker Hub
if ! docker info 2>&1 | grep -q "Username"; then
    log_warning "Vous n'êtes pas connecté à Docker Hub"
    log_info "Tentative de connexion..."
    docker login
    if [ $? -ne 0 ]; then
        log_error "Échec de connexion à Docker Hub"
        exit 1
    fi
fi

log_success "Connecté à Docker Hub"

# Build de l'image Docker
log_info "Construction de l'image Docker..."
log_info "Cette opération peut prendre quelques minutes..."
echo ""

if docker build -t "${FULL_IMAGE_NAME}:${VERSION}" "${BUILD_DIR}"; then
    log_success "Image construite avec succès"
else
    log_error "Échec de la construction de l'image"
    exit 1
fi

# Tag comme latest si ce n'est pas déjà latest
if [ "$VERSION" != "latest" ]; then
    log_info "Création du tag latest..."
    if docker tag "${FULL_IMAGE_NAME}:${VERSION}" "${FULL_IMAGE_NAME}:latest"; then
        log_success "Tag latest créé"
    else
        log_warning "Échec de création du tag latest (non bloquant)"
    fi
fi

# Push vers Docker Hub
echo ""
log_info "Push de l'image vers Docker Hub..."
log_info "Tag: ${VERSION}"

if docker push "${FULL_IMAGE_NAME}:${VERSION}"; then
    log_success "Image ${VERSION} poussée avec succès"
else
    log_error "Échec du push de l'image ${VERSION}"
    exit 1
fi

# Push du tag latest
if [ "$VERSION" != "latest" ]; then
    log_info "Push du tag latest..."
    if docker push "${FULL_IMAGE_NAME}:latest"; then
        log_success "Tag latest poussé avec succès"
    else
        log_warning "Échec du push du tag latest (non bloquant)"
    fi
fi

# Résumé final
echo ""
log_success "==================================================================="
log_success "  🎉 Opération terminée avec succès !"
log_success "==================================================================="
log_success "Image disponible sur Docker Hub:"
log_success "  - ${FULL_IMAGE_NAME}:${VERSION}"
if [ "$VERSION" != "latest" ]; then
    log_success "  - ${FULL_IMAGE_NAME}:latest"
fi
echo ""
log_info "Commandes pour utiliser l'image:"
echo "  docker pull ${FULL_IMAGE_NAME}:${VERSION}"
echo "  docker run -p 3000:3000 ${FULL_IMAGE_NAME}:${VERSION}"
echo ""
log_info "Ou avec docker-compose:"
echo "  docker-compose pull"
echo "  docker-compose up -d"
echo ""
log_info "Lien Docker Hub:"
echo "  https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
echo ""
