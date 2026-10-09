#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [[ -z "${REACT_APP_API_URL:-}" && -n "${WASP_SERVER_URL:-}" ]]; then
  export REACT_APP_API_URL="$WASP_SERVER_URL"
fi

if [[ "${REACT_APP_API_URL:-}" != https://* ]]; then
  echo "REACT_APP_API_URL doit contenir l’URL HTTPS publique du service Render." >&2
  exit 2
fi

wasp install
wasp build
(cd .wasp/out/server && npm run bundle)
npx vite build

test -s .wasp/out/server/bundle/server.js
test -s .wasp/out/web-app/build/200.html
echo "Artefacts Render prêts dans .wasp/out."
