# Yeba

Outil interne de collecte et de pilotage de la satisfaction client (QR code
sur des guichets physiques). Application mono-agence, réservée à une seule
entreprise, sans inscription publique ni facturation.

Construit avec [Wasp](https://wasp.sh) (React + Node.js + Prisma), à partir
du template [Open SaaS](https://opensaas.sh) — dont ont été retirés tout ce
qui relevait du produit commercial (paiement, landing page marketing,
inscription publique, personnalisation multi-tenant, analytics marketing).

## Développement local

- Copier `.env.client.example` → `.env.client` et `.env.server.example` (si
  présent) → `.env.server`, et renseigner les valeurs nécessaires (SMTP,
  stockage fichiers, etc. — voir `src/env.ts`).
- Démarrer la base de données : `wasp start db` (laisser tourner).
- Démarrer l'application : `wasp start` (laisser tourner).
- Première exécution, ou après une modification de `schema.prisma` :
  `wasp db migrate-dev`.
- Le seed (`wasp db seed`, ou automatique selon la config) crée
  l'Entreprise, l'Agence unique et le premier compte `CHEF_AGENCE` — voir
  `src/server/scripts/dbSeeds.ts` pour les identifiants générés au premier
  lancement (affichés une seule fois en console).

## Déploiement

Déploiement conteneurisé via `Dockerfile` / `railway.json` (Railway) :
`node server/bundle/server.js` comme commande de démarrage.

## Contact technique

Pour toute question de maintenance (accès `isAdmin`, incidents, évolutions),
contacter le responsable technique de la plateforme Yeba au sein de
l'entreprise.
# Satisfaction-client-
