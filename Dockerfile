# Usar imagen base de Node.js 20.9.0 o superior
FROM node:20.9.0-alpine

# Instalar solo lo necesario para build
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias primero (para mejor cache de Docker)
COPY frontend-ubold/package*.json ./

# Instalar dependencias
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps || npm install --prefer-offline --no-audit --legacy-peer-deps

# Copiar el resto de los archivos
COPY frontend-ubold/ .

# Variables de entorno para optimizar build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Aumentar memoria disponible para evitar SIGBUS
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Construir la aplicación
RUN npm run build

# Exponer el puerto (Railway usa variable PORT)
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Comando para iniciar la aplicación
# Ejecutar server.js desde /app (como en rama-Gonza2 que funciona)
WORKDIR /app
CMD ["node", "server.js"]
