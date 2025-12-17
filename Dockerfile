# Usar imagen base de Node.js 20.9.0 o superior
FROM node:20.9.0-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias de frontend-ubold
COPY frontend-ubold/package*.json ./frontend-ubold/

# Cambiar al directorio frontend-ubold e instalar dependencias
WORKDIR /app/frontend-ubold
RUN npm ci --prefer-offline --no-audit || npm install

# Copiar el resto de los archivos de frontend-ubold
COPY frontend-ubold/ .

# Construir la aplicación
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]

