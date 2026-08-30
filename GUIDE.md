# Guide Complet — Yéba

> Outil interne de collecte et de pilotage de la satisfaction client.
> Conformité **FD X50-167** + **ARTCI**.

---

## 1. Qu'est-ce que Yéba ? (et à quoi ça sert)

Yéba permet à une agence de **mesurer la satisfaction de ses clients** au guichet,
de **réagir vite** quand ça se passe mal, et de **piloter la qualité** dans le temps.

Le parcours concret :

1. Un **QR code** est affiché au guichet.
2. Le client le scanne, répond à quelques questions (sourires, note, texte libre…).
3. Les réponses remontent en temps réel sur un **tableau de bord**.
4. Si la note est critique, une **alerte** part (SMS/WhatsApp + écran dédié).
5. L'**IA (DeepSeek)** lit les commentaires, détecte le sentiment, les **thèmes
   récurrents** (temps d'attente, accueil, propreté…), et déclenche une alerte
   automatique si l'urgence est élevée.

### Bénéfices concrets

- **Conformité** : réponse à l'obligation de mesure de la satisfaction (norme FD X50-167) et traçabilité des tâches correctives (ARTCI).
- **Réactivité** : une note de 2/5 prévient immédiatement le chef d'agence par SMS/WhatsApp.
- **Vision claire** : le directeur voit d'un coup d'œil « de quoi se plaignent nos clients ce mois-ci ».
- **Coût IA maîtrisé** : DeepSeek est ~10 à 30× moins cher que les offres classiques pour ce type d'analyse.
- **Anti-fraude** : hachage du téléphone pour éviter les votes multiples.

---

## 2. Cahier des charges (récapitulatif fonctionnel)

### Rôles utilisateurs
| Rôle | Périmètre |
|------|-----------|
| `DIRECTION` | Toute l'entreprise (toutes agences) |
| `QUALITE` | Toute l'entreprise |
| `CHEF_AGENCE` | Sa propre agence |
| `AGENT` | Agent de guichet |

### Collecte des avis
- Canaux : **QR_WEB** (lien web), **USSD**, **IVR_VOCAL**.
- Types de questions (critères) dynamiques : `SMILEY`, `OUI_NON`, `QCM`, `TEXTE`, `CASES` (choix multiples), `ECHELLE` (ex. 1-10).
- Questions obligatoires ou facultatives (bouton « Passer »).

### Alertes
- `NOTE_CRITIQUE` : note ≤ 2/5 → alerte + SMS/WhatsApp au chef d'agence (repli DIRECTION puis QUALITE).
- `SILENCE_EVALUATION` : un guichet n'a reçu aucun avis pendant une période.
- `IA_URGENCE` : l'IA classe un avis en urgence `HIGH`/`CRITICAL` (même derrière une note correcte).

### Tâches correctives
- Chaque alerte peut générer une tâche avec responsable, échéance et **historique horodaté** (audit ARTCI).

### Analyse IA (DeepSeek)
- Pour chaque avis avec un commentaire : **sentiment**, **score de polarité**, **thèmes**, **problème principal**, **urgence**, **résumé**, **action recommandée**.
- Agrégation des **thèmes récurrents** sur le tableau de bord.

---

## 3. Architecture technique

| Couche | Techno |
|--------|--------|
| Framework | **Wasp 0.24** (full-stack, un seul codebase) |
| Frontend | React 19, TypeScript 5.9, Tailwind 4, shadcn/ui, framer-motion |
| Backend | Node (Express), actions/queries côté serveur |
| Base de données | PostgreSQL + **Prisma 5.19** |
| Tâches planifiées | **PgBoss** (cron toutes les minutes pour l'IA, etc.) |
| IA | **DeepSeek** (`deepseek-chat`) via le SDK OpenAI |

Structure clé :
- `main.wasp.ts` — configuration de l'app (routes, actions, queries, jobs).
- `schema.prisma` — modèle de données.
- `src/client/` — interface (pages, composants).
- `src/server/` — actions, queries, jobs cron, IA (`ai/`), seed.

---

## 4. Prérequis (machine locale)

- **Node 24** (Wasp 0.24 exige Node ≥ 24.14.1). Utilisé via **nvm** (`nvm use 24`).
- **PostgreSQL natif** (pas besoin de Docker — la base tourne déjà sur ta machine).
- **Wasp 0.24** lancé via `npx` (le `wasp` global installé est en 0.25, incompatible).

> ⚠️ Node 20 est **trop vieux** pour Wasp 0.24, et Node 26 (système) déclenche un
> blocage npm des scripts d'installation. **Node 24 est LA version à utiliser.**

---

## 5. Lancer le projet en local (première fois)

Toutes les commandes se font dans `~/Bureau/app`.

```bash
# 0. Recharger la config (Node 24 automatique)
source ~/.bashrc
node --version   # doit afficher v24.18.0

# 1. Préparer la base PostgreSQL (une seule fois)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres createdb yeba   # OK si « existe déjà »

# 2. Renseigner les variables d'env dans .env.server (voir section 10)
#    Minimum : DATABASE_URL + DEEPSEEK_API_KEY

# 3. Installer les dépendances
npx -y @wasp.sh/wasp-cli@0.24.0 clean
npx -y @wasp.sh/wasp-cli@0.24.0 install

# 4. Créer/appliquer la migration (schéma)
npx -y @wasp.sh/wasp-cli@0.24.0 db migrate-dev
#   → si un nom est demandé : ajout_commentaire_texte

# 5. Lancer l'app
npx -y @wasp.sh/wasp-cli@0.24.0 start
```

Ouvre ensuite **http://localhost:3000**.

> Au premier `start`, le **seed** crée automatiquement l'entreprise, l'agence,
> les critères/services/canaux de base, et le **premier compte** (voir section 7).

---

## 6. Utiliser l'application (parcours type)

1. **Se connecter** avec le compte créé par le seed (ou un compte invité).
2. **Créer une agence / un guichet** : menu Guichets / Agences.
3. **Affecter des agents** au guichet (Planning).
4. **Générer le QR code** du guichet (bouton « Kit guichet ») et l'afficher.
5. **Scanner le QR** (ou ouvrir le lien `/q/:guichetId`) → remplir un avis de test.
6. **Voir le tableau de bord** : notes, tendances, thèmes récurrents, alertes.
7. **Traiter les alertes** : créer des tâches correctives, les suivre.

Pages principales : `/dashboard`, `/avis`, `/alertes-taches`, `/archives`,
`/criteres` (questionnaire), `/settings`, `/admin/agences`, `/admin/personnel`.

---

## 7. Créer un utilisateur / premiers comptes

**Il n'y a pas d'inscription publique** : les comptes se créent par **invitation**.

### Premier compte (créé par le seed)
Au premier `start`, le seed crée le chef d'agence :
- **E-mail** : `abdoulivo5@gmail.com`
- **Mot de passe** : **généré aléatoirement et affiché UNE SEULE FOIS dans la console** au moment du seed.

Note-le immédiatement. À la première connexion, l'app **force le changement de mot de passe** (`mustChangePassword`).

> Si tu as raté ce mot de passe (affiché une seule fois), voir section 8 (réinitialisation).

### Comptes suivants (invitation)
Depuis l'interface **Admin → Personnel**, inviter un agent avec un rôle :
`CHEF_AGENCE`, `QUALITE`, `AGENT` (ou `DIRECTION`). L'invité reçoit un e-mail
pour définir son mot de passe.

### Compte admin technique (maintenance)
Un compte admin (`isAdmin`) est distinct des rôles métier. Pour en créer un :
1. Inviter normalement la personne (rôle métier réel).
2. L'élever en admin en base :
   ```sql
   UPDATE "User" SET "isAdmin" = true WHERE "email" = '...';
   ```

---

## 8. Réinitialiser un mot de passe / un compte

### Mot de passe oublié
Utiliser le lien **« Mot de passe oublié »** de la page de connexion.
> Nécessite `SENDGRID_API_KEY` configuré dans `.env.server` (envoi d'e-mail).

### Forcer un changement de mot de passe
Le champ `mustChangePassword` force l'utilisateur à changer son mot de passe à la prochaine connexion :
```sql
UPDATE "User" SET "mustChangePassword" = true WHERE "email" = '...';
```

### Désactiver / réactiver un compte
```sql
UPDATE "User" SET "actif" = false WHERE "email" = '...';  -- désactiver
UPDATE "User" SET "actif" = true  WHERE "email" = '...';  -- réactiver
```

> Le mot de passe est stocké **haché** (jamais en clair). Une réinitialisation
> passe donc par le flux « mot de passe oublié », pas par une simple édition SQL.

---

## 9. Modifier les couleurs (thème)

Les couleurs sont définies à **deux endroits** : `src/shared/branding.ts` (palette
partagée injectée par `BrandContext`) et `src/client/Main.css` (bloc `:root`).

```css
:root {
  --brand-green: 149 100% 33%;         /* vert → actions, boutons, chiffres clés */
  --brand-green-deep: 148 100% 26%;     /* vert foncé → titres, éléments secondaires */
  --brand-green-deeper: 148 80% 14%;    /* vert profond → mode sombre */
  --warning: 45 100% 50%;               /* jaune or → accents, alertes */
  --background: 45 28% 97%;             /* fond crème clair */
  ...
}
```

Les valeurs sont en **HSL** (teinte, saturation%, luminosité%). Pour changer la
couleur principale :

1. Trouve la valeur HSL de ta couleur (ex. via un convertisseur hex→HSL en ligne).
2. Remplace `--brand-green` (le vert) et `--warning` (le jaune) dans `:root` ET dans `src/shared/branding.ts`.
3. Redémarre `wasp start`.

Le mode sombre a son propre bloc (`.dark { ... }`) — pense à l'ajuster aussi si nécessaire.

---

## 10. Variables d'environnement (`.env.server`)

| Variable | Rôle | Obligatoire ? |
|----------|------|---------------|
| `DATABASE_URL` | URL PostgreSQL | ✅ oui |
| `DEEPSEEK_API_KEY` | Clé IA DeepSeek | ⚠️ pour l'analyse IA |
| `DEEPSEEK_MODEL` | Modèle (défaut `deepseek-chat`) | non |
| `DEEPSEEK_BASE_URL` | Endpoint (défaut `https://api.deepseek.com/v1`) | non |
| `AI_PROVIDER` | Fournisseur IA (défaut `deepseek`) | non |
| `FRONTEND_URL` | URL publique (liens dans les SMS/alertes) | en prod |
| `SENDGRID_API_KEY` | Envoi d'e-mails (invitations, mdp oublié) | ⚠️ pour l'e-mail |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | SMS/WhatsApp | non (stub sinon) |
| `TWILIO_FROM_NUMBER` / `TWILIO_WHATSAPP_FROM` | Numéros émetteurs | non |
| `TELEPHONE_HASH_SALT` | Sel de hachage anti-rejeu des votes | ✅ conseillé |

Exemple local minimal :
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yeba
DEEPSEEK_API_KEY=sk-...
```

---

## 11. Déploiement sur Railway

Railway fournit PostgreSQL en service géré : **aucun Docker à installer chez toi**.

### Option A — Wasp Deploy (la plus simple)
```bash
npx -y @wasp.sh/wasp-cli@0.24.0 build
npx -y @wasp.sh/wasp-cli@0.24.0 deploy
```
Wasp automatise serveur + client + base.

### Option B — Manuelle (3 services : PostgreSQL + serveur + client)

1. **Build** :
   ```bash
   npx -y @wasp.sh/wasp-cli@0.24.0 build
   ```

2. **Sur railway.com** : nouveau projet → « Deploy PostgreSQL », puis deux services
   vides nommés `server` et `client`.

3. **Déployer le serveur** :
   ```bash
   cd .wasp/out && railway link   # choisir `server`
   railway up --ci
   ```

4. **Variables du serveur** (onglet Variables) :
   - `DATABASE_URL` → référence PostgreSQL (bouton « Variable reference »)
   - `WASP_SERVER_URL` → `https://<domaine-server>.up.railway.app`
   - `WASP_WEB_CLIENT_URL` → `https://<domaine-client>.up.railway.app`
   - `JWT_SECRET` → chaîne aléatoire de 32+ caractères
   - `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `FRONTEND_URL`, `TELEPHONE_HASH_SALT`
   - (`TWILIO_*` / `SENDGRID_*` si tu actives SMS/e-mail)
   - Port : **8080**

5. **Déployer le client** :
   ```bash
   REACT_APP_API_URL=https://<domaine-server>.up.railway.app npx vite build
   cd .wasp/out/web-app/build && railway link   # choisir `client`
   railway up --ci
   ```

Les **migrations s'appliquent automatiquement** au démarrage du serveur en
production (script `start-production`).

---

## 12. Dépannage (erreurs rencontrées + solutions)

| Symptôme | Cause | Solution |
|----------|-------|----------|
| `nvm: commande introuvable` | nvm configuré dans `.zshrc` mais shell bash | chargé dans `.bashrc` (déjà fait) |
| `Node 20 not supported, upgrade to 24.14.1` | Wasp 0.24 exige Node 24 | `nvm use 24` |
| `npm warn ... allowScripts` (Prisma/esbuild bloqués) | npm 11 bloque les scripts d'install par défaut | champ `allowScripts` dans `package.json` (déjà fait) |
| `Error: P1000 Authentication failed` / `Can not connect to database` | `DATABASE_URL` absent de `.env.server` | ajouter `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yeba` |
| `Expected ES2025 but got ES2022` au build | Wasp 0.25 utilisé au lieu de 0.24 | toujours `npx -y @wasp.sh/wasp-cli@0.24.0` |
| Base `yeba` existe déjà | déjà créée auparavant | normal, l'utiliser telle quelle |

---

## 13. Récapitulatif des commandes utiles

```bash
source ~/.bashrc                                                  # Node 24
npx -y @wasp.sh/wasp-cli@0.24.0 start                             # dev
npx -y @wasp.sh/wasp-cli@0.24.0 db migrate-dev                    # migration
npx -y @wasp.sh/wasp-cli@0.24.0 db studio                         # explorer la BDD
npx -y @wasp.sh/wasp-cli@0.24.0 build                             # build prod
npx -y @wasp.sh/wasp-cli@0.24.0 clean                             # reset généré
```
