# Usar imagen base de Node.js 20.9.0 o superior
FROM node:20.9.0-alpine

# Instalar solo lo necesario para build
# RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias primero (para mejor cache de Docker)
COPY frontend-ubold/package.json frontend-ubold/package-lock.json* frontend-ubold/bun.lock* ./

# Instalar dependencias
RUN npm ci 

# Copiar el resto de los archivos
COPY frontend-ubold/ .

# Variables de entorno para optimizar build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Construir la aplicación
RUN npm run build

# Exponer el puerto
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
