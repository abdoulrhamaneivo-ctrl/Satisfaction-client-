# Yeba — outil interne

Yeba est un outil interne de collecte et de pilotage de la satisfaction
client (formulaires accessibles via QR code sur des guichets physiques).
Déploiement **mono-entreprise et multi-agences** : une seule entreprise
cliente pour l'instant, avec une à N agences — créées par le rôle DIRECTION
via la page Gestion des agences (le seed initialise la première) — sans
facturation ni inscription publique.

Construit avec [Wasp](https://wasp.sh) (React + Node.js + Prisma), à partir
du template Open SaaS — dont toute la partie produit commercial (paiement,
landing page marketing, inscription publique, analytics marketing,
personnalisation multi-tenant) a été retirée. Ne pas réintroduire ces
éléments sans une décision produit explicite.

## Repères du projet

- `main.wasp.ts` : point d'entrée Wasp (routes, actions, queries, jobs).
- `schema.prisma` : modèle de données. Hiérarchie `Entreprise → Agence →
  Guichet/User` (le multi-agences est supporté : sélecteurs d'agence,
  RLS par agence, consolidation Direction).
- `src/server/permissions.ts` a été supprimé : le seul module de
  permissions/RLS canonique est `src/server/middleware/rowLevelSecurity.ts`.
- `src/server/scripts/dbSeeds.ts` : seed unique (Entreprise, Agence, compte
  `CHEF_AGENCE`) — remplace l'ancien onboarding multi-tenant.
- `src/shared/branding.ts` : charte graphique figée en dur (plus de
  `BrandConfig` en base ni d'écran de configuration).
- Comptes créés uniquement par invitation (action `inviteAgent`), jamais par
  inscription publique.

## Documentation Wasp

Si les docs internes ne suffisent pas pour une question de framework,
consulter l'index [LLMs.txt de Wasp](https://wasp.sh/llms.txt).
