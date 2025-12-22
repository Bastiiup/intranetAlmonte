# Usar imagen base de Node.js 20
FROM node:20-alpine

# Establecer directorio de trabajo
WORKDIR /app/frontend-ubold

# Copiar archivos de dependencias primero (para mejor cache de Docker)
COPY frontend-ubold/package*.json ./

# Instalar dependencias
RUN npm ci --prefer-offline --no-audit --no-fund || npm install --prefer-offline --no-audit --no-fund

# Copiar el resto de los archivos
COPY frontend-ubold/ .

# Construir la aplicación
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]

