# Usar imagen base de Node.js 20.9.0 o superior (Alpine es más ligera)
FROM node:20.9.0-alpine AS base

# Instalar solo lo necesario para build
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# ==========================================
# Dependencies stage - Mejor caching
# ==========================================
FROM base AS deps
# Copiar solo archivos de dependencias para mejor cache
COPY package*.json ./
COPY bun.lock* ./
COPY yarn.lock* ./
# Instalar dependencias con cache optimizado
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps || \
    npm install --prefer-offline --no-audit --legacy-peer-deps

# ==========================================
# Builder stage - Construir la app
# ==========================================
FROM base AS builder

# Copiar dependencias instaladas
COPY --from=deps /app/node_modules ./node_modules

# Copiar archivos necesarios para el build
COPY . .

# Variables de entorno para optimizar build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Construir la aplicación con optimizaciones
RUN npm run build

# ==========================================
# Runner stage - Imagen final ligera
# ==========================================
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar solo archivos necesarios para producción
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Cambiar ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Exponer el puerto
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
