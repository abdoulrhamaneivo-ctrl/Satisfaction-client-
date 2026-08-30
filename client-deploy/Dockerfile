FROM nginx:1.27-alpine

# Template nginx : ${PORT} est remplacé par la variable d'environnement
# PORT fournie par Railway au démarrage du conteneur.
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Build statique du client (copié après `wasp build`)
COPY build /usr/share/nginx/html

EXPOSE 80
