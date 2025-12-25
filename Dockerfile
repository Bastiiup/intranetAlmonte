# Usar imagen base de Node.js 20.9.0 o superior
FROM node:20.9.0-alpine AS base

# Instalar solo lo necesario para build
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Variables de entorno base
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV CI=true

# Etapa de dependencias (mejor cache)
FROM base AS deps
# Copiar solo archivos de dependencias
COPY frontend-ubold/package*.json ./
# Instalar TODAS las dependencias (incluyendo devDependencies para el build)
# No usar NODE_ENV=production aquí para que se instalen devDependencies
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps || \
    npm install --prefer-offline --no-audit --legacy-peer-deps

# Etapa de build
FROM base AS builder
# Copiar dependencias instaladas
COPY --from=deps /app/node_modules ./node_modules
# Copiar archivos necesarios para el build (evitar copiar todo)
COPY frontend-ubold/package*.json ./
COPY frontend-ubold/next.config.ts ./
COPY frontend-ubold/tsconfig.json ./
COPY frontend-ubold/middleware.ts ./
COPY frontend-ubold/src ./src
COPY frontend-ubold/public ./public
COPY frontend-ubold/fix-server.js ./
COPY frontend-ubold/server.js ./
# Construir la aplicación con optimizaciones (NODE_ENV se establece solo para el build)
RUN NODE_ENV=production npm run build
# Ejecutar postbuild para copiar archivos estáticos
RUN npm run postbuild || echo "Postbuild skipped"

# Etapa de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar solo archivos necesarios para producción
# El postbuild ya copió static y public dentro de standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/server.js ./server.js

# Cambiar ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
