# Guía de Despliegue

Esta guía contiene información sobre cómo desplegar el proyecto en producción, específicamente en Railway.

## 📋 Tabla de Contenidos

- [Railway](#railway)
- [Configuración de Railway](#configuración-de-railway)
- [Docker](#docker)
- [Variables de Entorno en Producción](#variables-de-entorno-en-producción)
- [Verificación Post-Deploy](#verificación-post-deploy)
- [Troubleshooting](#troubleshooting)

---

## Railway

### Configuración del Proyecto

El proyecto está configurado para usar Railway como plataforma de despliegue.

### Archivo railway.json

**Ubicación:** `railway.json` (raíz del repositorio)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "rootDirectory": "AlmonteIntranet"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300
  }
}
```

### Root Directory

El proyecto usa `AlmonteIntranet` como root directory para:
- ✅ Optimizar tiempos de build (solo construye lo necesario)
- ✅ Simplificar rutas en Dockerfile
- ✅ Mejor gestión del contexto de build

### Build Command

Railway usa **DOCKERFILE** como builder, que busca automáticamente el Dockerfile en el `rootDirectory`.

### Start Command

El comando de inicio es `node server.js`, que ejecuta el servidor de producción de Next.js.

---

## Configuración de Railway

### Paso 1: Verificar Settings en Railway

1. Ve a tu proyecto en Railway
2. Selecciona el servicio (AlmonteIntranet)
3. Ve a la pestaña **Settings**
4. Verifica:
   - **Root Directory**: `AlmonteIntranet`
   - **Build Command**: Vacío (usa Dockerfile)
   - **Start Command**: `node server.js`

### Paso 2: Configurar Variables de Entorno

1. Ve a la pestaña **Variables**
2. Agrega todas las variables necesarias (ver [docs/CONFIGURACION.md](CONFIGURACION.md))
3. Guarda los cambios

**Variables críticas:**
- `NEXT_PUBLIC_STRAPI_URL`
- `STRAPI_API_TOKEN`
- Variables de WooCommerce
- Variables de Stream Chat (si usas chat)
- Variables de Shipit (si usas envíos)

### Paso 3: Deploy

Railway detecta automáticamente los pushes a la rama conectada y hace deploy automático.

O puedes hacer deploy manual:
1. Ve a la pestaña **Deployments**
2. Haz clic en **"Deploy Latest"** o **"Redeploy"**

---

## Docker

### Dockerfile

El proyecto tiene dos Dockerfiles:

1. **`Dockerfile`** (raíz) - Actualizado para usar con `rootDirectory`
2. **`AlmonteIntranet/Dockerfile`** - Dockerfile principal (recomendado)

Railway usa automáticamente `AlmonteIntranet/Dockerfile` cuando `rootDirectory: "AlmonteIntranet"`.

### Estructura del Dockerfile

El Dockerfile usa rutas relativas porque el contexto ya está en `AlmonteIntranet/`:

```dockerfile
# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar el resto de los archivos
COPY . .

# Build de Next.js
RUN npm run build

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "server.js"]
```

### Build Local (Opcional)

Para probar el Dockerfile localmente:

```bash
cd AlmonteIntranet
docker build -t intranet-almonte .
docker run -p 3000:3000 intranet-almonte
```

---

## Variables de Entorno en Producción

### Configuración en Railway

Todas las variables de entorno deben configurarse en Railway → Variables.

Ver [docs/CONFIGURACION.md](CONFIGURACION.md) para la lista completa de variables.

### Variables Críticas

**Obligatorias:**
- `NEXT_PUBLIC_STRAPI_URL`
- `STRAPI_API_TOKEN`
- `WOO_MORALEJA_CONSUMER_KEY` (o Escolar)
- `WOO_MORALEJA_CONSUMER_SECRET` (o Escolar)

**Opcionales pero Recomendadas:**
- Variables de Stream Chat (si usas chat)
- Variables de Shipit (si usas envíos)
- Variables de Haulmer (si usas facturación)

### Verificar Variables

Puedes verificar que las variables estén configuradas usando endpoints:
- `/api/test-env` - Verifica variables (sin exponer valores)
- `/api/shipit/test` - Verifica conexión con Shipit

---

## Verificación Post-Deploy

### Checklist de Verificación

Después del deploy, verifica:

- [ ] El build se completa sin errores
- [ ] El servicio se inicia correctamente
- [ ] La aplicación responde en la URL configurada
- [ ] El healthcheck (`/api/health`) responde correctamente
- [ ] Las variables de entorno están configuradas
- [ ] La conexión con Strapi funciona
- [ ] La conexión con WooCommerce funciona
- [ ] (Si aplica) El chat funciona
- [ ] (Si aplica) Los envíos de Shipit funcionan

### Comandos de Verificación

**Healthcheck:**
```bash
curl https://tu-dominio.com/api/health
```

**Verificar variables:**
```bash
curl https://tu-dominio.com/api/test-env
```

**Verificar Shipit:**
```bash
curl https://tu-dominio.com/api/shipit/test
```

---

## Troubleshooting

### Error: Build falla

**Posibles causas:**
- Error en el código
- Dependencias faltantes
- Variables de entorno faltantes

**Solución:**
- Revisa los logs del build en Railway
- Verifica que `npm install` funcione localmente
- Verifica errores de TypeScript: `npm run type-check`

### Error: Servicio no inicia

**Posibles causas:**
- Error en `server.js`
- Variables de entorno faltantes
- Puerto no disponible

**Solución:**
- Revisa los logs del servicio en Railway
- Verifica que todas las variables estén configuradas
- Verifica que `node server.js` funcione localmente

### Error: "/AlmonteIntranet": not found

**Causa:** El Dockerfile está usando rutas incorrectas cuando `rootDirectory` está configurado.

**Solución:**
- Verifica que el Dockerfile use rutas relativas (`COPY package*.json ./` no `COPY AlmonteIntranet/package*.json ./`)
- Verifica que `rootDirectory: "AlmonteIntranet"` esté en `railway.json`

### Error: Healthcheck falla

**Causa:** El endpoint `/api/health` no existe o no responde correctamente.

**Solución:**
- Verifica que el endpoint exista
- Verifica que responda con status 200
- Ajusta `healthcheckTimeout` en `railway.json` si es necesario

### Error: Variables de entorno no se cargan

**Causa:** Variables no configuradas o con nombres incorrectos.

**Solución:**
- Verifica que todas las variables estén en Railway → Variables
- Verifica que los nombres sean exactos (case-sensitive)
- Reinicia el servicio después de agregar variables

### Build muy lento

**Causa:** Railway está construyendo todo el repositorio en lugar de solo `AlmonteIntranet`.

**Solución:**
- Verifica que `rootDirectory: "AlmonteIntranet"` esté configurado
- Verifica en los logs que el contexto de build sea correcto

---

## Rollback

Si necesitas revertir a una versión anterior:

1. Ve a Railway → Deployments
2. Encuentra el deployment anterior que funcionaba
3. Haz clic en **"Redeploy"** en ese deployment

O desde Git:

```bash
# Revertir a un commit anterior
git revert HEAD
git push
```

---

## Monitoreo

### Logs en Railway

- Ve a Railway → Logs para ver logs en tiempo real
- Los logs muestran errores, warnings y información de la aplicación

### Healthcheck

El healthcheck está configurado en `railway.json`:
- **Path:** `/api/health`
- **Timeout:** 300 segundos

Railway verificará automáticamente la salud del servicio usando este endpoint.

---

## Referencias

- [Railway Documentation](https://docs.railway.app/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Docker Documentation](https://docs.docker.com/)

Para configuraciones específicas, ver:
- [docs/CONFIGURACION.md](CONFIGURACION.md) - Variables de entorno
- [docs/INTEGRACIONES.md](INTEGRACIONES.md) - Integraciones

