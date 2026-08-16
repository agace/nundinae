# Build do backend a partir da raiz do repositório (contexto = monorepo), para
# que o package-lock.json dos workspaces seja respeitado:
#   docker build -f backend/Dockerfile -t nundinae-api .
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace backend --include-workspace-root

COPY backend backend
RUN npm -w backend run build

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root \
    && npm cache clean --force

COPY --from=build /app/backend/dist backend/dist

USER node
EXPOSE 4000
CMD ["node", "backend/dist/server.js"]
