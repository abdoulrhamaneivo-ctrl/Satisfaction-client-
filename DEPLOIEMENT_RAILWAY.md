# Yéba — Déploiement complet sur Railway

> Dernière mise à jour : 23 août 2026 — déploiement terminé et vérifié.

## 1. Architecture en production

| Service | Rôle | URL |
|---------|------|-----|
| `client` | Site web React (statique, servi par Caddy) | https://client-production-08b9.up.railway.app |
| `server` | API Wasp (auth, queries/actions, jobs) | https://server-production-4608.up.railway.app |
| `Postgres` | Base de données PostgreSQL 18 | interne (`${{Postgres.DATABASE_URL}}`) |

Le client appelle le serveur directement (variables `WASP_SERVER_URL` compilées
dans le bundle au build). Le serveur accepte les requêtes du client grâce à
`WASP_WEB_CLIENT_URL`.

## 2. Ce qu'il faut sur ta machine

- **Node 24** via nvm : `nvm use 24` (déjà dans ton `.bashrc`).
- **Wasp 0.24** : toujours via `npx -y @wasp.sh/wasp-cli@0.24.0` (le global est en 0.25, incompatible).
- **CLI Railway v5** : déjà installée.
- **Pas de Docker** : tous les builds se font dans le cloud Railway.

## 3. Comptes

- Railway : compte « Nabin Yvo » (yvonabine@gmail.com).
- Projet : **YebaProject**, ID `b78bde1c-2c33-4b90-b5d3-4ffa714484df`.

## 4. Procédure de déploiement (à refaire après chaque modification)

### Étape A — construire

```bash
cd ~/Bureau/app
npx -y @wasp.sh/wasp-cli@0.24.0 build
```

### Étape B — déployer le serveur

```bash
cd ~/Bureau/app/.wasp/out
railway up . --service server --no-gitignore --path-as-root --ci --detach
```

Les migrations Prisma s'appliquent automatiquement au démarrage.

### Étape C — déployer le client

```bash
cd ~/Bureau/app/.wasp/out/web-app/build
touch Staticfile   # marqueur pour le builder statique Railpack
railway up . --service client --no-gitignore --path-as-root --ci --detach
```

### Étape D — vérifier

```bash
railway status          # les 3 services doivent être ● Online
```

Puis ouvre https://client-production-08b9.up.railway.app dans le navigateur.

## 5. Variables du service `server`

Configurées une fois pour toutes (voir avec `railway variables --service server`) :

- `DATABASE_URL=${{Postgres.DATABASE_URL}}` — référence vers la base.
- `JWT_SECRET=<généré>` — secret des sessions.
- `PORT=8080`, `NODE_ENV=production`.
- `WASP_SERVER_URL=https://server-production-4608.up.railway.app`.
- `WASP_WEB_CLIENT_URL=https://client-production-08b9.up.railway.app` — CORS.
- `TELEPHONE_HASH_SALT=<généré>`.
- `FRONTEND_URL=https://client-production-08b9.up.railway.app`.

Variables optionnelles (placeholders `not-configured` tant que non fournies) :

- `DEEPSEEK_API_KEY` → analyse IA des avis. L'app fonctionne sans ; l'IA
  affiche « non configuré ».
- `AWS_S3_BUCKET` / `AWS_S3_ACCESS_KEY_ID` / `AWS_S3_SECRET_ACCESS_KEY` /
  `AWS_ENDPOINT` / `AWS_REGION` → upload de fichiers.
- `SENDGRID_API_KEY` / `SENDGRID_EMAIL_FROM` → envoi d'e-mails (invitations,
  reset mot de passe).

Pour changer une variable :

```bash
cd ~/Bureau/app/.wasp/out
railway variable set MA_VARIABLE=valeur --service server --skip-deploys
railway redeploy --service server --yes
```

## 6. Variables du service `client`

- `PORT=8080`
- `RAILPACK_STATIC_FILE_ROOT=.` (ou racine par défaut avec le fichier `Staticfile`)

## 7. Base de données

- PostgreSQL 18 managée par Railway (volume 500 MB, ~84 MB utilisés).
- Les migrations s'appliquent au démarrage du serveur (20 migrations trouvées).
- Sauvegarde : `railway db dump` depuis un shell lié au projet, ou backups
  Railway (plan Pro).

## 8. Pièges rencontrés (et leurs solutions)

| Erreur | Cause | Solution |
|--------|-------|----------|
| `couldn't locate the dockerfile at path Dockerfile` | `railway up` lancé depuis la racine | Toujours déployer depuis `.wasp/out/` |
| `unexpected argument '--plugin'` | CLI v5 | `railway add --database postgres` |
| Postgres « Crashed » après un `up` | `railway up` sans `--service` a ciblé la base | Toujours préciser `--service server` ou `--service client` |
| Client « Service not found » | service pas encore créé | `railway add --service client` d'abord |
| Build client railpack échoue | manque le marqueur statique | `touch Staticfile` dans `web-app/build/` |
| Crash serveur au démarrage | variables requises absentes | voir section 5 |
| `Cannot prompt for confirmation in non-interactive mode` | commande non interactive | ajouter `--yes` |

## 9. Dépannage rapide

```bash
# Voir l'état de tout le projet
railway status

# Logs du serveur (build puis runtime)
railway logs --service server --build --lines 50
railway logs --service server --deployment --lines 50

# Logs du client
railway logs --service client --build --lines 50

# Redémarrer un service
railway redeploy --service server --yes
```

## 10. Après le déploiement — checklist

1. Ouvrir https://client-production-08b9.up.railway.app
2. Se connecter avec le compte seed (`abdoulivo5@gmail.com`) — changer le mot
   de passe temporaire à la première connexion.
3. Créer un guichet, générer son QR code, scanner avec un téléphone : le
   formulaire de collecte doit s'afficher.
4. Quand tu auras les clés DeepSeek / AWS / SendGrid, les poser avec
   `railway variable set ... --service server` puis `railway redeploy`.
