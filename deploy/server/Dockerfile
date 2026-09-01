FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:20-slim
WORKDIR /app
COPY --from=build /app .
RUN npx prisma generate
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "start-production"]
