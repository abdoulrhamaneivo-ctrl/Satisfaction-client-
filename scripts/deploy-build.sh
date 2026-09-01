#!/usr/bin/env bash
# =============================================================================
# scripts/deploy-build.sh — Préparation du dossier `deploy/` pour Render
# =============================================================================
# Injeste prisma & @prisma/client dans deploy/server/package.json pour Render
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

# 1. Copier les artefacts .wasp/out vers deploy/
DEPLOY_DIR="$PROJECT_ROOT/deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

if [ -d ".wasp/out" ]; then
    info "Copie des artefacts vers deploy/..."
    cp -r .wasp/out/* "$DEPLOY_DIR/"
    cp -r .wasp/out/.* "$DEPLOY_DIR/" 2>/dev/null || true
else
    fail "Le dossier .wasp/out n'existe pas."
fi

# 2. Copier schema.prisma directement dans deploy/server
cp "$DEPLOY_DIR/db/schema.prisma" "$DEPLOY_DIR/server/schema.prisma" 2>/dev/null || true

# 3. Injecter prisma et @prisma/client dans deploy/server/package.json
info "Mise à jour de deploy/server/package.json avec prisma..."
node -e '
const fs = require("fs");
const pkgPath = "'"$DEPLOY_DIR"'/server/package.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies["prisma"] = "5.19.1";
pkg.dependencies["@prisma/client"] = "5.19.1";
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
'

ok "Dossier 'deploy/' préparé et optimisé !"
echo ""
echo "══════════════════════════════════════════════════════════════"
echo -e "${GREEN} CONFIGURATION RENDER PROPRE ET OPTIMISÉE ${NC}"
echo "══════════════════════════════════════════════════════════════"
echo "  Dans Render (Web Service) :"
echo "  • Root Directory : deploy/server"
echo "  • Build Command  : npm install --omit=dev && npx prisma generate --schema=schema.prisma"
echo "  • Start Command  : npm run start-production"
echo ""
