#!/bin/sh
# start-render.sh — migration avec retry (le cold-start Neon et les
# redéploiements rapprochés peuvent prendre le verrou advisory >10s →
# P1002. On réessaie 4 fois avec 20s d'écart avant d'abandonner.)
attempts=0
max=4
while [ $attempts -lt $max ]; do
  attempts=$((attempts+1))
  echo "[render] tentative migration $attempts/$max..."
  if npm run db-migrate-prod; then
    echo "[render] migration OK"
    break
  fi
  if [ $attempts -eq $max ]; then
    echo "[render] migration échouée après $max tentatives"
    exit 1
  fi
  echo "[render] nouvelle tentative dans 20s..."
  sleep 20
done
NODE_ENV=production npm run start
