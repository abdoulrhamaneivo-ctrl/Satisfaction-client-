# Dockerfile.render — déploiement Render mono-service Yéba
# TOUT est précompilé et committé (.wasp/out complet) : le conteneur ne
# compile RIEN → plus aucun OOM possible sur le free tier (512MB).
FROM node:24.14.1-alpine3.23

# Dépendances système runtime uniquement (openssl pour Prisma)
RUN apk --no-cache -U upgrade && apk add --no-cache openssl

WORKDIR /app

# Manifestes npm (workspace racine) — INDISPENSABLES pour npm install
COPY package.json package-lock.json /app/
# Artefacts précompilés (commités) : serveur bundle, SDK, client, migrations
COPY .wasp/out /app/.wasp/out/
# npm install depuis la racine : le package.json déclare les workspaces
# .wasp/out/* — tout s'installe d'un coup, omit=dev (pas de compilation).
WORKDIR /app
RUN npm install --omit=dev
# Génère le client Prisma (npm --omit=dev n'exécute pas les postinstall utiles)
RUN npx prisma generate --schema=.wasp/out/db/schema.prisma

# start-render.sh : migration Prisma avec retry (cold start Neon)
COPY scripts-render/start-render.sh /app/scripts-render/
RUN chmod +x /app/scripts-render/start-render.sh

EXPOSE 10000
WORKDIR /app/.wasp/out/server
ENTRYPOINT ["sh", "/app/scripts-render/start-render.sh"]
