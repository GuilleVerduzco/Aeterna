# Imagen base oficial de Playwright: incluye Chromium y sus dependencias del sistema ya instaladas.
FROM mcr.microsoft.com/playwright:v1.48.2-jammy AS base

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --omit=dev=false

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

RUN npm prune --omit=dev

EXPOSE 3000
CMD ["node", "dist/server.js"]
