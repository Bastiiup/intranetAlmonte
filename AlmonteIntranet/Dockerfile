# Usar imagen base de Node.js 20 LTS (más estable y disponible)
FROM node:20-alpine

# Instalar solo lo necesario para build
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias primero (para mejor cache de Docker)
COPY package*.json ./

# Instalar dependencias
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps || npm install --prefer-offline --no-audit --legacy-peer-deps

# Copiar solo archivos necesarios para el build (excluyendo docs, tests, etc.)
COPY . .
# Los archivos innecesarios ya están excluidos por .dockerignore

# Variables de entorno para optimizar build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Aumentar memoria disponible para evitar SIGBUS
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Deshabilitar Turbopack si causa problemas de memoria (Next.js 16 usa Turbopack por defecto)
ENV NEXT_PRIVATE_STANDALONE=true
# Optimizaciones de build
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_PRIVATE_SKIP_TYPE_CHECK=1

# Construir la aplicación (con cache de Next.js)
RUN npm run build

# Exponer el puerto (Railway usa variable PORT)
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Comando para iniciar la aplicación
# Ejecutar server.js desde /app
WORKDIR /app
CMD ["node", "server.js"]

