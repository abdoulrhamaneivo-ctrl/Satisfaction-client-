# ============================================================================
# Dockerfile CXSAT — Build multi-étapes pour Railway
# ============================================================================
# Ce Dockerfile est utilisé par Railway (via railway.json) pour déployer
# l'application CXSAT construite avec Wasp.
#
# PRÉREQUIS : vous devez d'abord exécuter `wasp build` localement, puis
# committer le contenu de .wasp/build/server/ dans le repo, OU utiliser
# `wasp deploy railway launch` (recommandé).
#
# MÉTHODE RECOMMANDÉE (Wasp CLI) :
#   1. Installez Wasp : curl -sSL https://get.wasp.sh/installer.sh | sh
#   2. Lancez : wasp deploy railway launch cxsat-abidjan
#
# Si vous déployez manuellement via Railway Dashboard :
#   1. Exécutez `wasp build` dans votre terminal local
#   2. Commitez le contenu généré de .wasp/build/server/
#   3. Configurez ce Dockerfile comme builder dans Railway
# ============================================================================

FROM node:20-alpine AS base
WORKDIR /app

# Dépendances de production uniquement
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build final
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables d'environnement par défaut (overridées par Railway)
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Commande de démarrage — Railway injectera les variables d'env
CMD ["node", "server/bundle/server.js"]
