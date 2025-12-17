# Usar imagen base de Node.js
FROM node:20-alpine AS base

# Instalar dependencias del sistema si son necesarias
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Verificar que npm está disponible
RUN npm --version

# Copiar archivos de dependencias
COPY package*.json ./
COPY bun.lock* ./
COPY yarn.lock* ./

# Instalar dependencias
RUN npm ci --prefer-offline --no-audit || npm install

# Copiar el resto de los archivos
COPY . .

# Construir la aplicación
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]

