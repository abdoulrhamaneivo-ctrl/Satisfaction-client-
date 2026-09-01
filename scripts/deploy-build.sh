#!/usr/bin/env bash
# =============================================================================
# scripts/deploy-build.sh — Build Wasp et prépare le dossier `deploy/`
# =============================================================================
# Vercel et Render ne voient pas les dossiers cachés commençant par un point (.wasp).
# Ce script copie les artefacts de build vers `deploy/web-app` et `deploy/server`.
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

# 1. Build Wasp ou réutilisation du build existant
if [ -d ".wasp/out" ]; then
    info "Artefacts .wasp/out existants détectés..."
else
    info "Lancement de 'wasp build'..."
    wasp build || fail "Échec du build Wasp."
fi

# 2. Préparer le dossier visible `deploy/`
DEPLOY_DIR="$PROJECT_ROOT/deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/server"
mkdir -p "$DEPLOY_DIR/web-app"

info "Copie des artefacts vers le dossier visible 'deploy/'..."
cp -r .wasp/out/server/* "$DEPLOY_DIR/server/"
cp -r .wasp/out/web-app/* "$DEPLOY_DIR/web-app/"

# 3. Créer vercel.json dans deploy/web-app
cat > "$DEPLOY_DIR/web-app/vercel.json" << 'VERCELJSON'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
VERCELJSON

ok "Dossiers de déploiement visibles préparés dans deploy/ avec succès !"
echo ""
echo "══════════════════════════════════════════════════════════════"
echo -e "${GREEN} DOSSIERS PRÊTS DANS : deploy/ ${NC}"
echo "══════════════════════════════════════════════════════════════"
echo "  • Frontend (Vercel)  → Root Directory: deploy/web-app"
echo "  • Backend (Render)   → Root Directory: deploy/server"
echo ""
