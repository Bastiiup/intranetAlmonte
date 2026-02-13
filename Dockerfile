# Dockerfile en la raíz del repo para que Railway lo encuentre.
# La app Next.js está en AlmonteIntranet/; copiamos desde ahí.

FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_PRIVATE_STANDALONE=true
ENV SKIP_ENV_VALIDATION=1
ENV CI=true
ENV NEXT_PRIVATE_SKIP_LINT=true
ENV SKIP_TYPE_CHECK=true
ENV NEXT_PRIVATE_SKIP_TYPE_CHECK=true
ENV NEXT_PRIVATE_SKIP_VALIDATION=true
ENV TURBOPACK=1
ENV NEXT_PRIVATE_BUILD_CACHE=true

# Copiar dependencias desde la carpeta de la app
COPY AlmonteIntranet/package*.json ./

RUN npm ci --prefer-offline --no-audit --legacy-peer-deps --silent --no-fund || \
    npm install --prefer-offline --no-audit --legacy-peer-deps --silent --no-fund

ENV NODE_ENV=production

# Copiar el resto de la app desde AlmonteIntranet/
COPY AlmonteIntranet/ .

RUN SKIP_TYPE_CHECK=true NEXT_PRIVATE_SKIP_TYPE_CHECK=true npm run build

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

CMD ["node", "server.js"]
