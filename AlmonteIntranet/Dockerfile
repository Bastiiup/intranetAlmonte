# Usar imagen base Debian (glibc) para compatibilidad con @napi-rs/canvas y pdf-parse
# Alpine (musl) puede fallar al compilar/ejecutar módulos nativos
FROM node:20-slim

# Dependencias de runtime para @napi-rs/canvas (Cairo, Pango, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

# Establecer directorio de trabajo
WORKDIR /app

# Variables de entorno para optimizar build (antes de copiar archivos)
# NO establecer NODE_ENV=production aquí porque npm ci no instalará devDependencies
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_PRIVATE_STANDALONE=true
ENV SKIP_ENV_VALIDATION=1
# Optimizaciones adicionales para build más rápido
ENV CI=true
ENV NEXT_PRIVATE_SKIP_LINT=true
# Deshabilitar type checking durante build (se hace en desarrollo)
ENV SKIP_TYPE_CHECK=true
ENV NEXT_PRIVATE_SKIP_TYPE_CHECK=true
# Deshabilitar validaciones y checks innecesarios
ENV NEXT_PRIVATE_SKIP_VALIDATION=true
# TURBOPACK eliminado: puede causar fallos en builds de producción en Railway
# Habilitar cache de build
ENV NEXT_PRIVATE_BUILD_CACHE=true

# Copiar archivos de dependencias primero (para mejor cache de Docker)
COPY package*.json ./

# Instalar dependencias incluyendo devDependencies (TypeScript es necesario para next.config.ts)
# No usar NODE_ENV=production aquí para que npm instale devDependencies
# Optimizaciones: --prefer-offline usa cache local, --no-audit salta auditoría de seguridad
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps --silent --no-fund || \
    npm install --prefer-offline --no-audit --legacy-peer-deps --silent --no-fund

# Ahora establecer NODE_ENV=production para el build
ENV NODE_ENV=production

# Copiar solo archivos necesarios para el build (excluyendo docs, tests, etc.)
COPY . .
# Los archivos innecesarios ya están excluidos por .dockerignore

# Construir la aplicación con optimizaciones
# Usar variables de entorno para saltar type checking (ya se hace en CI/local)
# Next.js ya tiene las optimizaciones habilitadas por las variables de entorno
RUN SKIP_TYPE_CHECK=true NEXT_PRIVATE_SKIP_TYPE_CHECK=true npm run build

# Exponer el puerto (Railway usa variable PORT)
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Comando para iniciar la aplicación (standalone está en .next/standalone)
WORKDIR /app/.next/standalone
CMD ["node", "server.js"]

