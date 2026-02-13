# ── Etapa 1: Dependencias ─────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar solo archivos de dependencias (mejor cache de Docker)
COPY package*.json ./
# Instalar TODO (dev + prod) porque TypeScript es necesario para el build
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps --silent --no-fund || \
    npm install --prefer-offline --no-audit --legacy-peer-deps --silent --no-fund

# ── Etapa 2: Build ───────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Variables de entorno para optimizar build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_PRIVATE_STANDALONE=true
ENV SKIP_ENV_VALIDATION=1
ENV CI=true
ENV NEXT_PRIVATE_SKIP_LINT=true
ENV SKIP_TYPE_CHECK=true
ENV NEXT_PRIVATE_SKIP_TYPE_CHECK=true
ENV NEXT_PRIVATE_SKIP_VALIDATION=true
ENV NEXT_PRIVATE_BUILD_CACHE=true
ENV TURBOPACK=1
ENV NODE_ENV=production

# Copiar node_modules desde la etapa de deps (cache de Docker)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build
RUN npm run build

# ── Etapa 3: Runtime (imagen mínima) ─────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiar solo lo necesario para ejecutar
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/.next/standalone ./.
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
