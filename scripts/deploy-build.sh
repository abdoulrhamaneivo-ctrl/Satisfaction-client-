#!/usr/bin/env bash
# =============================================================================
# scripts/deploy-build.sh — Préparation finale du dossier `deploy/` pour Render
# =============================================================================
# Fixe les workspaces NPM et les références TS pour que Wasp se compile proprement.
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

# 1. Corriger les workspaces NPM dans deploy/package.json
info "Mise à jour des workspaces dans deploy/package.json..."
node -e '
const fs = require("fs");
const pkgPath = "'"$DEPLOY_DIR"'/package.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.workspaces = ["server", "sdk/wasp"];
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
'

# 2. Corriger tsconfig.json dans deploy/server/tsconfig.json via sed
info "Mise à jour des références dans deploy/server/tsconfig.json..."
sed -i 's|{ "path": "../../../tsconfig.src.json" }|{ "path": "../sdk/wasp" }, { "path": "../tsconfig.src.json" }|g' "$DEPLOY_DIR/server/tsconfig.json" 2>/dev/null || true

# 3. Injecter prisma et @prisma/client dans deploy/server/package.json
info "Mise à jour des dépendances dans deploy/server/package.json..."
node -e '
const fs = require("fs");
const pkgPath = "'"$DEPLOY_DIR"'/server/package.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies["prisma"] = "5.19.1";
pkg.dependencies["@prisma/client"] = "5.19.1";
pkg.dependencies["@tsconfig/node24"] = "latest";
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
'

ok "Dossier 'deploy/' préparé et corrigé pour Render !"
echo ""
echo "══════════════════════════════════════════════════════════════"
echo -e "${GREEN} CONFIGURATION RENDER PROPRE ET OPTIMISÉE ${NC}"
echo "══════════════════════════════════════════════════════════════"
echo "  • Root Directory : deploy"
echo "  • Build Command  : npm install && npx prisma generate --schema=db/schema.prisma && cd server && npm run bundle"
echo "  • Start Command  : cd server && npm run start-production"
echo ""
