#!/bin/bash

# Script de déploiement pour kleekr/pws-extra-tools
# Usage: 
#   ./deploy.sh <version>  - Déployer une version
#   ./deploy.sh list       - Lister les tags existants
# Example: ./deploy.sh 1.0

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="kleekr"
IMAGE_NAME="pws-extra-tools"

# Fonction pour lister les tags
function list_tags() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🏷️  Tags Docker Hub pour ${DOCKER_REGISTRY}/${IMAGE_NAME}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${YELLOW}📡 Récupération des tags depuis Docker Hub...${NC}"
    echo ""
    
    RESPONSE=$(curl -s "https://hub.docker.com/v2/repositories/${DOCKER_REGISTRY}/${IMAGE_NAME}/tags/?page_size=100")
    
    if echo "$RESPONSE" | grep -q "\"count\":0"; then
        echo -e "${YELLOW}⚠️  Aucun tag trouvé ou le repository n'existe pas encore${NC}"
        echo ""
        exit 0
    fi
    
    echo -e "${GREEN}📦 Tags disponibles (du plus récent au plus ancien):${NC}"
    echo ""
    
    echo "$RESPONSE" | jq -r '.results[] | "\(.last_updated)|\(.name)"' 2>/dev/null | sort -r | while IFS='|' read -r date tag; do
        formatted_date=$(date -d "$date" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "$date")
        printf "   ${CYAN}%-20s${NC} ${GREEN}%s${NC}\n" "$tag" "$formatted_date"
    done
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq n'est pas installé. Affichage basique des tags:${NC}"
        echo "$RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sort -r | while read -r tag; do
            echo -e "   ${GREEN}$tag${NC}"
        done
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}🚀 Pour déployer:${NC}"
    echo -e "   ./deploy.sh <version>"
    echo ""
    
    exit 0
}

# Si le premier argument est "list", afficher les tags
if [ "$1" = "list" ]; then
    list_tags
fi

# Vérifier si une version est fournie
if [ -z "$1" ]; then
    echo -e "${RED}❌ Erreur: Version manquante${NC}"
    echo ""
    echo "Usage: ./deploy.sh <version>  - Déployer une version"
    echo "       ./deploy.sh list       - Lister les tags existants"
    echo ""
    echo "Example: ./deploy.sh 1.0"
    echo ""
    exit 1
fi

VERSION=$1
FULL_IMAGE_NAME="${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}"
LATEST_IMAGE_NAME="${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Déploiement de ${IMAGE_NAME} vers Docker Hub${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Lister les tags existants sur Docker Hub
echo -e "${YELLOW}📡 Vérification des tags existants sur Docker Hub...${NC}"
RESPONSE=$(curl -s "https://hub.docker.com/v2/repositories/${DOCKER_REGISTRY}/${IMAGE_NAME}/tags/?page_size=100")

if echo "$RESPONSE" | grep -q "\"count\":0"; then
    echo -e "${GREEN}✅ Aucun tag existant - Premier déploiement${NC}"
else
    echo -e "${GREEN}📦 Tags existants (5 derniers):${NC}"
    echo "$RESPONSE" | jq -r '.results[] | "\(.last_updated)|\(.name)"' 2>/dev/null | sort -r | head -5 | while IFS='|' read -r date tag; do
        formatted_date=$(date -d "$date" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "$date")
        printf "   ${BLUE}%-20s${NC} %s\n" "$tag" "$formatted_date"
    done
    
    # Vérifier si le tag existe déjà (sauf latest)
    if [ "$VERSION" != "latest" ]; then
        TAG_EXISTS=$(echo "$RESPONSE" | jq -r '.results[].name' 2>/dev/null | grep -x "$VERSION" || echo "")
        
        if [ -n "$TAG_EXISTS" ]; then
            echo ""
            echo -e "${RED}⚠️  ATTENTION: Le tag ${VERSION} existe déjà !${NC}"
            echo ""
            read -p "$(echo -e ${YELLOW}Voulez-vous vraiment écraser ce tag? [y/N]: ${NC})" -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo -e "${RED}❌ Déploiement annulé${NC}"
                echo ""
                exit 1
            fi
            echo -e "${YELLOW}⚠️  Écrasement du tag confirmé${NC}"
        fi
    fi
fi
echo ""

echo -e "📦 Image: ${GREEN}${FULL_IMAGE_NAME}${NC}"
echo -e "🏷️  Tag:   ${GREEN}${VERSION}${NC}"
echo ""

# Vérifier si on est connecté à Docker Hub
echo -e "${YELLOW}🔐 Vérification de la connexion Docker Hub...${NC}"
if ! docker info | grep -q "Username"; then
    echo -e "${RED}❌ Non connecté à Docker Hub${NC}"
    echo -e "${YELLOW}Connexion en cours...${NC}"
    docker login
fi
echo -e "${GREEN}✅ Connecté à Docker Hub${NC}"
echo ""

# Build de l'image
echo -e "${YELLOW}🔨 Build de l'image Docker...${NC}"
docker build -t ${FULL_IMAGE_NAME} -t ${LATEST_IMAGE_NAME} .
echo -e "${GREEN}✅ Build terminé${NC}"
echo ""

# Push de l'image avec version
echo -e "${YELLOW}📤 Push de ${FULL_IMAGE_NAME}...${NC}"
docker push ${FULL_IMAGE_NAME}
echo -e "${GREEN}✅ Image ${VERSION} pushée avec succès${NC}"
echo ""

# Push de l'image latest
echo -e "${YELLOW}📤 Push de ${LATEST_IMAGE_NAME}...${NC}"
docker push ${LATEST_IMAGE_NAME}
echo -e "${GREEN}✅ Image latest pushée avec succès${NC}"
echo ""

# Récapitulatif
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Déploiement terminé avec succès !${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📦 Images disponibles:${NC}"
echo -e "   • ${FULL_IMAGE_NAME}"
echo -e "   • ${LATEST_IMAGE_NAME}"
echo ""
echo -e "${BLUE}🚀 Pour utiliser cette image:${NC}"
echo -e "   docker pull ${FULL_IMAGE_NAME}"
echo -e "   docker run -p 3000:3000 -v ./data:/app/data ${FULL_IMAGE_NAME}"
echo ""
echo -e "${BLUE}🔗 Docker Hub:${NC}"
echo -e "   https://hub.docker.com/r/${DOCKER_REGISTRY}/${IMAGE_NAME}"
echo ""

