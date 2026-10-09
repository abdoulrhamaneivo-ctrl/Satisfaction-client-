# Yéba

Yéba est un outil interne de collecte et de pilotage de la satisfaction client par QR code sur des guichets physiques. Le déploiement actuel concerne une entreprise cliente avec une ou plusieurs agences. Il n’y a ni facturation, ni inscription publique, ni personnalisation multi-entreprise.

L’application utilise [Wasp](https://wasp.sh), React, Node.js et Prisma. Elle est déployée en un service Docker sur Render avec PostgreSQL sur Neon.

## Développement local

1. Copier `.env.example` vers `.env.server` et renseigner les secrets locaux nécessaires.
2. Lancer la base locale avec `wasp start db`.
3. Lancer l’application avec `wasp start`.
4. Après un changement du schéma, créer et appliquer la migration locale avec `wasp db migrate-dev`.

Le seed unique initialise l’entreprise, la première agence et un compte Chef d’agence. Les comptes du personnel sont ensuite créés par invitation.

## Avant une mise à jour Render

- Compiler les artefacts Render avec `REACT_APP_API_URL="https://<url-render>" npm run build`, puis relire les changements générés sous `.wasp/out`.
- Ne pas committer de clé, d’URL Neon complète ni de secret.
- Les mises à jour de la branche suivie peuvent déclencher le déploiement automatique Render. Le conteneur lance les migrations Prisma au démarrage ; ne pas lancer une migration manuelle en parallèle.
- Le rappel QR requiert `CALLBACK_PHONE_ENCRYPTION_KEY` dans l’environnement Render. L’IA n’utilise que les modèles gratuits compatibles avec les règles de confidentialité ; sa disponibilité doit être vérifiée dans Paramètres.
- Les pages Conditions et Confidentialité sont accessibles publiquement. Leurs champs juridiques signalés « à renseigner » ainsi que les durées/régions manquantes doivent être complétés avant publication définitive.

Voir [`DEPLOIEMENT.md`](DEPLOIEMENT.md) pour le fonctionnement Render + Neon et [`docs/branding-white-label.md`](docs/branding-white-label.md) pour la charte visuelle fixe.
