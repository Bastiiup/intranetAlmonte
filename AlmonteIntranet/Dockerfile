# Usar imagen base de Node.js 20 LTS (más estable y disponible)
FROM node:20-alpine

# Instalar solo lo necesario para build
RUN apk add --no-cache libc6-compat

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
ENV NEXT_PRIVATE_SKIP_TYPE_CHECK=1
# Deshabilitar validaciones y checks innecesarios
ENV NEXT_PRIVATE_SKIP_VALIDATION=1
ENV TURBOPACK=1

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
# Usar --no-lint para saltar linting (ya deshabilitado con NEXT_PRIVATE_SKIP_LINT)
RUN npm run build -- --no-lint || npm run build

# Exponer el puerto (Railway usa variable PORT)
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Comando para iniciar la aplicación
# Ejecutar server.js desde /app
WORKDIR /app
CMD ["node", "server.js"]

