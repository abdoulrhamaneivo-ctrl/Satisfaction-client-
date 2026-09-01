# Déploiement Yeba — Vercel + Render + Neon

> Guide pas-à-pas pour déployer Yeba gratuitement.
> Frontend sur Vercel (0€) · Backend sur Render (0€ ou 7$/mois) · Base de données sur Neon (0€)

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Vercel (Client)   │────▶│  Render (Serveur)     │────▶│  Neon (BDD)     │
│   yeba.vercel.app   │     │  yeba-api.onrender.com│     │  PostgreSQL     │
│   Vite + React      │     │  Node.js + Express    │     │  Géré, gratuit  │
│   Gratuit           │     │  PgBoss (jobs cron)   │     │  0.5 GB Free    │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
```

**Pourquoi séparer ?**
- Vercel compile le frontend lourd (Vite + toutes les libs React/charts/PDF) avec beaucoup de RAM → pas de crash
- Render ne fait que lancer le serveur Node.js léger → pas de build Vite, pas de problème mémoire
- Neon fournit PostgreSQL géré gratuitement, compatible avec Prisma et PgBoss

---

## Prérequis

| Compte | URL | Coût |
|---|---|---|
| GitHub | github.com | Gratuit |
| Neon | console.neon.tech | Gratuit (0.5 GB) |
| Vercel | vercel.com | Gratuit |
| Render | render.com | Gratuit (sleep 15min) ou $7/mois |
| SendGrid | sendgrid.com | Gratuit (100 emails/jour) |

---

## Étape 1 — Préparer les secrets

> **CRITIQUE** : ta clé SendGrid a été exposée dans l'historique Git.

1. **SendGrid** → dashboard.sendgrid.com → API Keys → Révoquer l'ancienne clé → Créer une nouvelle
2. **JWT_SECRET** → générer localement :
   ```bash
   openssl rand -hex 32
   ```
3. **TELEPHONE_HASH_SALT** → générer localement :
   ```bash
   openssl rand -hex 32
   ```
4. Noter ces 3 valeurs — tu en auras besoin pour Render.

---

## Étape 2 — Créer la base Neon

1. Aller sur **[console.neon.tech](https://console.neon.tech)**
2. **Create Project** :
   - Nom : `yeba-prod`
   - Région : `AWS eu-west-1` (Europe, la plus proche d'Abidjan)
   - PostgreSQL version : 16 (défaut)
3. Une fois créé, copier la **Connection String** :
   ```
   postgresql://neondb_owner:XXXXXXX@ep-xxx-yyy.eu-west-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **Appliquer les migrations** depuis ta machine :
   ```bash
   # Exporter temporairement la DATABASE_URL Neon
   export DATABASE_URL="postgresql://neondb_owner:XXXXXXX@ep-xxx.eu-west-1.aws.neon.tech/neondb?sslmode=require"

   # Appliquer toutes les migrations Prisma
   npx prisma migrate deploy

   # Seeder la base (crée l'entreprise, l'agence, le compte CHEF_AGENCE)
   wasp db seed
   ```
5. **NOTER** le mot de passe affiché en console (celui du compte CHEF_AGENCE seedé).

---

## Étape 3 — Build local Wasp

Wasp doit être compilé localement. Le résultat est ensuite poussé vers GitHub.

```bash
# Depuis la racine du projet
bash scripts/deploy-build.sh
```

Ce script :
- Lance `wasp build` → génère `.wasp/build/`
- Crée le `Dockerfile` pour le serveur Render
- Crée le `vercel.json` pour le client Vercel

Résultat :
```
.wasp/build/
├── server/          ← pour Render
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── web-app/         ← pour Vercel
    ├── vercel.json
    ├── package.json
    └── src/
```

---

## Étape 4 — Pousser vers GitHub

### Option A : Deux repos séparés (recommandé)

```bash
# 1. Repo serveur
cd .wasp/build/server
git init && git add -A && git commit -m "Yeba server build"
gh repo create yeba-server --private --push

# 2. Repo client
cd ../web-app
git init && git add -A && git commit -m "Yeba client build"
gh repo create yeba-client --private --push
```

### Option B : Un seul repo (plus simple)

Ajouter `.wasp/build/` au repo existant (retirer la ligne `.wasp/out/` du `.gitignore` ne concerne que `out/`, `build/` n'est pas ignoré par défaut). Ou créer un seul repo dédié :

```bash
mkdir ~/yeba-deploy && cd ~/yeba-deploy
cp -r /chemin/vers/app/.wasp/build/* .
git init && git add -A && git commit -m "Yeba deploy build"
gh repo create yeba-deploy --private --push
```

---

## Étape 5 — Déployer le Backend sur Render

1. Aller sur **[dashboard.render.com](https://dashboard.render.com)**
2. **New → Web Service**
3. Connecter le repo GitHub du serveur (`yeba-server` ou `yeba-deploy`)
4. Configurer :

   | Champ | Valeur |
   |---|---|
   | **Name** | `yeba-server` |
   | **Region** | Frankfurt (EU) |
   | **Root Directory** | `server` (si repo unique) ou `.` (si repo séparé) |
   | **Runtime** | Node |
   | **Build Command** | `npm install && npx prisma generate` |
   | **Start Command** | `npm run start-production` |
   | **Plan** | Free (ou Starter à $7/mois) |

5. **Environment Variables** (onglet Environment) :

   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | `postgresql://...@neon.tech/...?sslmode=require` |
   | `WASP_SERVER_URL` | `https://yeba-server.onrender.com` |
   | `WASP_WEB_CLIENT_URL` | `https://yeba-client.vercel.app` |
   | `PORT` | `10000` |
   | `JWT_SECRET` | *(ta valeur générée à l'étape 1)* |
   | `TELEPHONE_HASH_SALT` | *(ta valeur générée à l'étape 1)* |
   | `SENDGRID_API_KEY` | *(ta nouvelle clé SendGrid)* |
   | `AWS_S3_REGION` | `eu-west-3` |
   | `AWS_S3_IAM_ACCESS_KEY` | `mock` *(ou ta vraie clé AWS si tu utilises S3)* |
   | `AWS_S3_IAM_SECRET_KEY` | `mock` |
   | `AWS_S3_FILES_BUCKET` | `yeba-files` |
   | `NODE_ENV` | `production` |

6. Cliquer **Create Web Service**

> **Note Free tier** : le serveur Render gratuit se met en veille après 15 minutes d'inactivité. Le premier appel après le réveil prend ~30 secondes. Pour un service permanent, passer au Starter ($7/mois).

---

## Étape 6 — Déployer le Frontend sur Vercel

1. Aller sur **[vercel.com](https://vercel.com)**
2. **Add New → Project**
3. Connecter le repo GitHub du client (`yeba-client` ou `yeba-deploy`)
4. Configurer :

   | Champ | Valeur |
   |---|---|
   | **Framework Preset** | Vite |
   | **Root Directory** | `web-app` (si repo unique) ou `.` (si repo séparé) |
   | **Build Command** | `npm install && npm run build` |
   | **Output Directory** | `dist` |

5. **Environment Variables** :

   | Variable | Valeur |
   |---|---|
   | `REACT_APP_API_URL` | `https://yeba-server.onrender.com` |

6. Cliquer **Deploy**

Vercel compile le frontend Vite avec beaucoup de RAM disponible — **aucun crash possible**.

---

## Étape 7 — Vérification post-déploiement

### 1. Tester le serveur
```bash
curl https://yeba-server.onrender.com
```

### 2. Tester le client
Ouvrir `https://yeba-client.vercel.app` dans le navigateur.

### 3. Se connecter
- Email : `abdoulivo5@gmail.com`
- Mot de passe : celui affiché lors du seed (étape 2)

### 4. Tester la collecte QR
Ouvrir `https://yeba-client.vercel.app/q/<code_public>` (le code du guichet seedé).

### 5. Vérifier les jobs cron
Dans les logs Render, tu devrais voir les jobs PgBoss s'exécuter :
- `detecterAlertesSilence` — toutes les 30 minutes
- `analyserAvisIAJob` — toutes les minutes (si OPENROUTER_API_KEY configurée)

---

## Checklist finale

- [ ] Clé SendGrid révoquée et remplacée
- [ ] JWT_SECRET généré (32 octets hex)
- [ ] TELEPHONE_HASH_SALT généré (32 octets hex)
- [ ] Projet Neon créé, DATABASE_URL récupérée
- [ ] `npx prisma migrate deploy` exécuté sur Neon
- [ ] `wasp db seed` exécuté, mot de passe noté
- [ ] `bash scripts/deploy-build.sh` exécuté
- [ ] Code poussé sur GitHub
- [ ] Render Web Service créé et configuré
- [ ] Vercel Static Site créé et configuré
- [ ] Login testé sur le frontend Vercel
- [ ] Collecte QR testée
- [ ] CORS OK (WASP_WEB_CLIENT_URL = URL Vercel exacte)

---

## Troubleshooting

### Le frontend affiche une page blanche
- Vérifier `REACT_APP_API_URL` dans Vercel → doit pointer vers l'URL Render
- Vérifier que `WASP_WEB_CLIENT_URL` sur Render = l'URL Vercel exacte (CORS)

### Erreur 502 sur Render
- Le serveur met ~30s à démarrer après un sleep (Free tier)
- Vérifier les logs Render pour les erreurs de connexion à Neon

### Erreur "Database connection failed"
- Vérifier que `?sslmode=require` est bien dans la DATABASE_URL
- Neon Free tier éteint le compute après 5min d'inactivité — PgBoss le réveille automatiquement

### Jobs PgBoss ne s'exécutent pas
- Free tier Render : le serveur dort après 15min → les jobs ne tournent pas
- Solution : passer au Starter ($7/mois) ou ajouter un cron externe (cron-job.org) qui ping le serveur toutes les 14 minutes
