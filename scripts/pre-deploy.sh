#!/usr/bin/env bash
# =============================================================================
# scripts/pre-deploy.sh — Checklist pré-déploiement Render (mono-service Yéba)
# =============================================================================
# Contexte (17/09/2026) : le Dockerfile.render ne compile RIEN — il embarque
# `.wasp/out` tel que committé. Or `wasp build` régénère `.wasp/out` from
# scratch et NE produit PAS `.wasp/out/server/bundle/` (généré par
# `npm run bundle` dans `.wasp/out/server`). Oublier cette étape = deploy
# crashé avec `Cannot find module 'bundle/server.js'`. Lancer ce script
# AVANT chaque commit destiné à Render.
#
# Usage : ./scripts/pre-deploy.sh
# =============================================================================
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "── 1/4 wasp build ──"
wasp build

echo "── 2/4 build client (Vite) ──"
if [ -z "${REACT_APP_API_URL:-}" ]; then
  echo "!! REACT_APP_API_URL non définie — utilisez l'URL du serveur Render, ex. :"
  echo "   REACT_APP_API_URL=https://yebaproject.onrender.com ./scripts/pre-deploy.sh"
  exit 1
fi
npx vite build

echo "── 3/4 bundle serveur ──"
cd .wasp/out/server
[ -x node_modules/.bin/rollup ] || npm install
npm run bundle
cd "$PROJECT_ROOT"

echo "── 4/4 contrôles ──"
check() { grep -q "$2" "$1" || { echo "!! ÉCHEC : '$2' introuvable dans $1"; exit 1; }; echo "OK : $1 contient $2"; }
check .wasp/out/server/bundle/server.js "definirAgencePilotee"
test -f .wasp/out/server/bundle/dbSeed.js || { echo "!! ÉCHEC : bundle/dbSeed.js manquant"; exit 1; }
test -f .wasp/out/web-app/build/200.html || { echo "!! ÉCHEC : web-app/build/200.html manquant"; exit 1; }
# Tous les assets référencés par 200.html doivent exister.
manquant=0
for f in $(grep -o '/assets/[^"]*' .wasp/out/web-app/build/200.html); do
  [ -f ".wasp/out/web-app/build$f" ] || { echo "!! ÉCHEC : asset manquant $f"; manquant=1; }
done
[ "$manquant" -eq 0 ] || exit 1
echo "OK : tous les assets de 200.html existent"

echo ""
echo "Pré-deploy OK — vous pouvez commiter (.wasp/out inclus) et pusher."
