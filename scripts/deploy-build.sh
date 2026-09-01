#!/usr/bin/env bash
# =============================================================================
# scripts/deploy-build.sh — Préparation du dossier de déploiement `deploy/`
# =============================================================================
# Pre-compile le serveur localement pour que Render n'ait aucun gros build à faire
# (optimisé pour la RAM 512 MB de Render Free Tier).
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

# 1. Copier les artefacts de .wasp/out vers deploy/
DEPLOY_DIR="$PROJECT_ROOT/deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

if [ -d ".wasp/out" ]; then
    info "Copie des artefacts pré-compilés vers deploy/..."
    cp -r .wasp/out/* "$DEPLOY_DIR/"
    cp -r .wasp/out/.* "$DEPLOY_DIR/" 2>/dev/null || true
else
    fail "Le dossier .wasp/out n'existe pas."
fi

# 2. Copier schema.prisma directement dans deploy/server pour simplifier Prisma
cp "$PROJECT_ROOT/schema.prisma" "$DEPLOY_DIR/server/schema.prisma" 2>/dev/null || true
cp "$DEPLOY_DIR/db/schema.prisma" "$DEPLOY_DIR/server/schema.prisma" 2>/dev/null || true

ok "Dossier 'deploy/' préparé !"
echo ""
echo "══════════════════════════════════════════════════════════════"
echo -e "${GREEN} OPTIMISÉ POUR RENDER FREE TIER (512 MB RAM) ${NC}"
echo "══════════════════════════════════════════════════════════════"
echo "  Configuration dans Render (Web Service) :"
echo "  • Root Directory : deploy/server"
echo "  • Build Command  : npm install --omit=dev && npx prisma generate --schema=schema.prisma"
echo "  • Start Command  : npm run start-production"
echo ""
