# Usar imagen base de Node.js 20 (versión más reciente disponible)
FROM node:20-alpine

# Establecer directorio de trabajo
WORKDIR /app/frontend-ubold

# Copiar SOLO archivos de dependencias primero (para cache de Docker)
# Esto permite que Docker cachee esta capa si no cambian las dependencias
COPY frontend-ubold/package*.json ./
COPY frontend-ubold/bun.lock* ./ 2>/dev/null || true
COPY frontend-ubold/yarn.lock* ./ 2>/dev/null || true

# Instalar dependencias (esta capa se cachea si package.json no cambia)
RUN npm ci --prefer-offline --no-audit --no-fund || npm install --prefer-offline --no-audit --no-fund

# Copiar el resto de los archivos (esto invalida el cache solo cuando cambia el código)
COPY frontend-ubold/ .

# Construir la aplicación (usa cache de node_modules de la capa anterior)
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]

