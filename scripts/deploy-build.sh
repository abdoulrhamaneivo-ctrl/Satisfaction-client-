#!/usr/bin/env bash
# =============================================================================
# scripts/deploy-build.sh — Build Wasp et prépare les artefacts de déploiement
# =============================================================================
# Usage : bash scripts/deploy-build.sh
#
# Architecture cible :
#   Frontend → Vercel (Static Site, .wasp/out/web-app/)
#   Backend  → Render (Node.js Service, .wasp/out/server/ ou .wasp/out/)
#   Database → Neon (PostgreSQL géré, DATABASE_URL)
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

# ─────────────────────────────────────────────
# 0. Vérifications
# ─────────────────────────────────────────────
command -v wasp >/dev/null 2>&1 || fail "Wasp CLI non trouvé."
command -v node >/dev/null 2>&1 || fail "Node.js non trouvé."

WASP_VERSION=$(wasp version 2>/dev/null)
info "Wasp CLI v${WASP_VERSION} détecté"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

BUILD_DIR="$PROJECT_ROOT/.wasp/out"

# ─────────────────────────────────────────────
# 1. Build Wasp
# ─────────────────────────────────────────────
info "Lancement de 'wasp build'..."
wasp build
ok "Build Wasp terminé → $BUILD_DIR"

# ─────────────────────────────────────────────
# 2. Préparer le serveur (Render)
# ─────────────────────────────────────────────
SERVER_DIR="$BUILD_DIR/server"
mkdir -p "$SERVER_DIR"

info "Création du Dockerfile serveur pour Render..."
cat > "$SERVER_DIR/Dockerfile" << 'DOCKERFILE'
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:20-slim
WORKDIR /app
COPY --from=build /app .
RUN npx prisma generate
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "start-production"]
DOCKERFILE
ok "Dockerfile serveur créé → $SERVER_DIR/Dockerfile"

# ─────────────────────────────────────────────
# 3. Préparer le client (Vercel)
# ─────────────────────────────────────────────
WEBAPP_DIR="$BUILD_DIR/web-app"
mkdir -p "$WEBAPP_DIR"

info "Création de vercel.json pour le client..."
cat > "$WEBAPP_DIR/vercel.json" << 'VERCELJSON'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
VERCELJSON
ok "vercel.json créé → $WEBAPP_DIR/vercel.json"

# ─────────────────────────────────────────────
# 4. Résumé
# ─────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════"
echo -e "${GREEN} BUILD TERMINÉ AVEC SUCCÈS — Prêt pour le déploiement${NC}"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}Frontend (Vercel) :${NC}"
echo "  Dossier : $WEBAPP_DIR"
echo "  → Importer dans Vercel, Framework: Vite"
echo "  → Build: npm install && npm run build"
echo "  → Output: dist"
echo "  → Env var: REACT_APP_API_URL=https://yeba-server.onrender.com"
echo ""
echo -e "${BLUE}Backend (Render) :${NC}"
echo "  Dossier : $SERVER_DIR"
echo "  → Créer un Web Service sur Render"
echo "  → Build: npm install && npx prisma generate"
echo "  → Start: npx prisma migrate deploy && npm run start-production"
echo ""
