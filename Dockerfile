# Dockerfile de emergencia en raíz - construye AlmonteIntranet
# Permite que Railway encuentre el Dockerfile aunque Root Directory no esté configurado
# Basado en AlmonteIntranet/Dockerfile

FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_PRIVATE_STANDALONE=true
ENV SKIP_ENV_VALIDATION=1
ENV CI=true
ENV NEXT_PRIVATE_SKIP_LINT=true
ENV SKIP_TYPE_CHECK=true
ENV NEXT_PRIVATE_SKIP_TYPE_CHECK=true
ENV NEXT_PRIVATE_SKIP_VALIDATION=true
ENV TURBOPACK=1
ENV NEXT_PRIVATE_BUILD_CACHE=true

# Copiar desde AlmonteIntranet (contexto = repo root)
COPY AlmonteIntranet/package*.json ./
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps --silent --no-fund || \
    npm install --prefer-offline --no-audit --legacy-peer-deps --silent --no-fund

ENV NODE_ENV=production

COPY AlmonteIntranet/ .

RUN SKIP_TYPE_CHECK=true NEXT_PRIVATE_SKIP_TYPE_CHECK=true npm run build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Standalone output en .next/standalone
WORKDIR /app/.next/standalone
CMD ["node", "server.js"]
