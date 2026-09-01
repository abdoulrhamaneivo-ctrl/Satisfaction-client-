#!/usr/bin/env bash
# =============================================================================
# scripts/deploy-build.sh — Préparation du dossier de déploiement `deploy/`
# =============================================================================
# Dans Wasp 0.24+, le serveur Express intègre directement le Frontend (Vite SSR).
# Render fait tourner l'intégralité du site (UI + API) depuis `deploy/`.
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# 1. Copier tout le contenu compilé de .wasp/out vers deploy/
DEPLOY_DIR="$PROJECT_ROOT/deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

if [ -d ".wasp/out" ]; then
    info "Artefacts Wasp trouvés dans .wasp/out"
    cp -r .wasp/out/* "$DEPLOY_DIR/"
    cp -r .wasp/out/.* "$DEPLOY_DIR/" 2>/dev/null || true
else
    fail "Le dossier .wasp/out n'existe pas. Exécute 'wasp build' d'abord."
fi

ok "Dossier 'deploy/' préparé avec succès !"
echo ""
echo "══════════════════════════════════════════════════════════════"
echo -e "${GREEN} DÉPLOIEMENT UNIQUE SUR RENDER PRÊT ! ${NC}"
echo "══════════════════════════════════════════════════════════════"
echo "  Dans Render (Web Service) :"
echo "  • Root Directory : deploy/server"
echo "  • Build Command  : npm install && npx prisma generate"
echo "  • Start Command  : npm run start-production"
echo ""
