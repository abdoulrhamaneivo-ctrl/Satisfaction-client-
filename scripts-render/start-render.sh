#!/bin/sh
# start-render.sh — réveil Neon + migration avec retry.
# Contexte (08/09/2026) : Neon gratuit s'endort ; au réveil, la prise du
# verrou advisory par Prisma dépasse ses 10 s (P1002). Et deux migrateurs
# simultanés (auto-deploy + manuel, ou retry qui se chevauchent) se volent
# le verrou. D'où : (1) réveil explicite AVANT, (2) retries allongés,
# (3) UN SEUL deploy à la fois — ne jamais lancer manuel + auto en parallèle.
# 0. Réveil Neon : simple SELECT en boucle (pas de verrou), jusqu'à ~3 min.
echo "[render] réveil de la base Neon..."
woke=0
n=0
while [ $n -lt 18 ]; do
  n=$((n+1))
  if echo "SELECT 1;" | npx prisma db execute --schema=../db/schema.prisma --stdin >/dev/null 2>&1; then
    echo "[render] base joignable (tentative $n)"
    woke=1
    break
  fi
  echo "[render] base endormie, attente 10s... ($n/18)"
  sleep 10
done
if [ $woke -ne 1 ]; then
  echo "[render] base injoignable après ~3 min, on tente quand même la migration"
fi
# 1. Migrations : 6 tentatives espacées de 30 s (lock froid ou concurrent).
attempts=0
max=6
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
  echo "[render] nouvelle tentative dans 30s..."
  sleep 30
done
NODE_ENV=production npm run start
