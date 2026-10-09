# Déploiement Yéba — Render et Neon

Yéba est actuellement déployé comme un service Docker Render relié à une base PostgreSQL Neon. L’application, le serveur Wasp et le client React sont servis par le même service Render ; il n’y a pas de déploiement Vercel séparé.

## Chemin de déploiement

1. Modifier le code source et `schema.prisma`.
2. Fournir à Vite l’URL publique actuelle du serveur Render, puis lancer `REACT_APP_API_URL="https://<url-render>" npm run build`. Ce script installe les dépendances, régénère le code Wasp, compile le bundle serveur et le client Vite statique dans `.wasp/out`.
3. Relire les changements source **et générés** avant le commit. Le déploiement Render actuel est configuré avec le déploiement automatique du dépôt ; une mise à jour de la branche suivie peut donc déclencher un déploiement.
4. Au démarrage, `scripts-render/start-render.sh` attend le réveil de Neon, exécute les migrations Prisma avec tentatives différées, puis lance le serveur. Ne lancez pas une migration manuelle en même temps que ce démarrage.
5. Contrôler l’état du service et les journaux Render après le déploiement. Le script arrête le démarrage si les migrations échouent après ses tentatives.

`Dockerfile.render`, `render.yaml`, les URLs configurées dans le tableau de bord Render et la région réelle de la base Neon sont les sources de vérité opérationnelles. Ne déduisez pas leur valeur de ce guide ou d’un ancien exemple. Les migrations ne sont pas appliquées par le travail local de préparation.

## Variables Render

Conserver les valeurs existantes du service Render. Vérifier dans son tableau de bord les variables suivantes et les renseigner sans les committer :

| Variable | Usage |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL Neon. Garder le format SSL et utiliser l’URL approuvée pour l’application. |
| `JWT_SECRET` | Signature des sessions, clé forte distincte. |
| `TOTP_ENCRYPTION_KEY` | Chiffrement des secrets 2FA, clé forte distincte. |
| `ANTI_REPLAY_SALT` | HMAC temporaire des téléphones, clé forte distincte. |
| `WASP_SERVER_URL` | URL publique actuelle du service Render. |
| `WASP_WEB_CLIENT_URL` | Origine publique du client servi par Render. |
| Variables SMTP / Brevo | Envoi des invitations et notifications par la configuration déjà en place. |
| `OPENROUTER_API_KEY` | Facultative. À utiliser avec un modèle dont le nom finit par `:free`. |
| `OPENROUTER_MODEL` | Facultative ; défaut `nvidia/nemotron-3.5-lightning:free`. Les modèles payants sont refusés. |
| `CALLBACK_PHONE_ENCRYPTION_KEY` | Clé hexadécimale distincte de 32 octets, générée avec `openssl rand -hex 32`. Sans elle, l’enregistrement d’une demande de rappel est désactivé. |

Après avoir ajouté `CALLBACK_PHONE_ENCRYPTION_KEY` dans Render, vérifier la nouvelle instance avant d’annoncer la fonction de rappel. Cette clé ne peut pas être remplacée sans stratégie de rechiffrement : la perte de la clé rend les contacts encore en base illisibles.

## Analyse IA gratuite

L’IA utilise uniquement OpenRouter. Chaque requête exige un modèle `:free`, un prix maximal nul, le refus de collecte, la demande ZDR et l’absence de bascule fournisseur. Les noms d’agents, d’agences et de guichets sont exclus des prompts ; les coordonnées courantes sont masquées localement. Les conditions du fournisseur restent applicables : la page du modèle gratuit NVIDIA configuré par défaut indique que ses requêtes peuvent être journalisées pour la sécurité et l’amélioration de ses produits, et demande de ne pas transmettre de données personnelles ou confidentielles. Ne saisissez pas ces données dans un commentaire et vérifiez l’avis du modèle sélectionné. Un rejet du fournisseur laisse l’analyse indisponible. Aucun fournisseur payant n’est utilisé comme secours.

Dans Paramètres, la Direction peut lancer une vérification avec un texte synthétique. Une clé configurée ne signifie pas que le modèle est joignable ou qu’il accepte les règles de confidentialité ; seule une vérification réussie confirme son état au moment du test. Les modèles gratuits peuvent être soumis à des quotas et à des périodes d’indisponibilité.

## Vérifications après déploiement

- Ouvrir l’application sur l’URL Render configurée et vérifier connexion, navigation, et collecte sur un QR valide.
- Vérifier les journaux Render pour les migrations et le démarrage des tâches planifiées.
- Si le rappel est activé, soumettre un avis synthétique avec accord, vérifier l’accès depuis le compte Chef de l’agence, puis vérifier que la Direction et un autre périmètre n’y accèdent pas.
- Depuis Paramètres, exécuter la vérification IA gratuite ; une erreur de politique doit laisser l’IA indisponible.
- Avant publication définitive, compléter les coordonnées légales de Yéba, les durées de conservation des avis bruts et les régions/sous-traitants réellement utilisés dans les pages publiques.

## Variables locales

Voir [`.env.example`](.env.example). Ne jamais placer de clé, URL Neon complète ou secret Render dans Git, les journaux, ou une capture d’écran partagée.
