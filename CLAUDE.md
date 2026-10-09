# Yeba — outil interne

Yeba est un outil interne de collecte et de pilotage de la satisfaction client par QR code. Le déploiement concerne une entreprise cliente avec une à N agences, gérées par le rôle `DIRECTION`. Il n’y a ni facturation, ni inscription publique, ni personnalisation multi-entreprise.

Construit avec Wasp (React, Node.js, Prisma) à partir du template Open SaaS, dont les fonctionnalités de produit commercial ont été retirées. Ne pas les réintroduire sans décision produit explicite.

## Repères

- `main.wasp.ts` : routes, actions, queries et jobs Wasp.
- `schema.prisma` : hiérarchie `Entreprise → Agence → Guichet/User`, avec plusieurs agences prises en charge.
- `src/server/middleware/rowLevelSecurity.ts` : module unique canonique de permissions et RLS.
- `src/server/scripts/dbSeeds.ts` : seed initial de l’entreprise, de la première agence et du compte `CHEF_AGENCE`.
- `src/shared/branding.ts` : charte Yéba fixe ; aucune configuration de marque en base ni écran de personnalisation.
- Les comptes du personnel sont créés par invitation (`inviteAgent`), jamais par inscription publique.
- Le numéro QR n’est conservé pour rappel qu’avec accord explicite, chiffré et visible au chef de l’agence concernée.
- L’IA est gratuite uniquement : OpenRouter, modèle `:free`, contraintes de coût et confidentialité obligatoires, aucun fallback payant.

Le déploiement actuel est un service Docker Render avec PostgreSQL Neon. Voir `DEPLOIEMENT.md`. Pour les questions Wasp, consulter l’index [LLMs.txt](https://wasp.sh/llms.txt) si les docs locales ne suffisent pas.
