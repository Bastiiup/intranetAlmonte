# ✅ Checklist: Qué Falta para Desplegar Localmente

Este documento resume lo que necesitas para desplegar el proyecto localmente.

## 📋 Estado Actual

### ✅ Ya Tienes

- [x] **Proyecto Next.js** configurado
- [x] **package.json** con scripts de desarrollo
- [x] **Documentación** (README-LOCAL.md, docs/CONFIGURACION.md)
- [x] **Configuración de Strapi** (src/lib/strapi/config.ts)
- [x] **Código del CRM** implementado
- [x] **Filtros y funcionalidades** completas

### ❌ Lo que FALTA para Desplegar

## 🔴 CRÍTICO (Sin esto NO funciona)

### 1. Variables de Entorno (`.env.local`)

**Ubicación:** `AlmonteIntranet/.env.local`

**Mínimo requerido para CRM:**

```env
# Strapi (REQUERIDO para CRM)
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_de_strapi_aqui

# Next.js
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Cómo obtener el token de Strapi:**
1. Ve a: https://strapi.moraleja.cl/admin
2. Settings → API Tokens
3. Crea un token con permisos "Full access"
4. Copia y pega en `.env.local`

**⚠️ IMPORTANTE:** Sin `STRAPI_API_TOKEN` el CRM **NO funcionará**.

---

## 🟡 OPCIONAL (Para funcionalidades adicionales)

### 2. Variables de WooCommerce (Si usas E-commerce)

```env
NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA=https://moraleja.cl
WOO_MORALEJA_CONSUMER_KEY=ck_xxxxx
WOO_MORALEJA_CONSUMER_SECRET=cs_xxxxx

NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR=https://escolar.moraleja.cl
WOO_ESCOLAR_CONSUMER_KEY=ck_xxxxx
WOO_ESCOLAR_CONSUMER_SECRET=cs_xxxxx
```

### 3. Variables de Stream Chat (Si usas chat)

```env
STREAM_API_KEY=tu_api_key
STREAM_SECRET_KEY=tu_secret_key
NEXT_PUBLIC_STREAM_API_KEY=tu_api_key
```

### 4. Variables de Shipit (Si usas envíos)

```env
SHIPIT_API_TOKEN=tu_token
SHIPIT_API_EMAIL=tu_email@ejemplo.com
SHIPIT_API_URL=https://api.shipit.cl/v4
NEXT_PUBLIC_SHIPIT_ENABLED=true
```

---

## 📝 Pasos para Desplegar

### Paso 1: Verificar Requisitos

```bash
# Verificar Node.js (debe ser >= 20.9.0)
node --version

# Verificar npm (debe ser >= 10.0.0)
npm --version
```

### Paso 2: Navegar al Proyecto

```bash
cd AlmonteIntranet
```

### Paso 3: Instalar Dependencias

```bash
npm install
```

⏱️ **Tiempo estimado:** 3-5 minutos

### Paso 4: Crear `.env.local`

**Opción A: Crear manualmente**

Crea un archivo `.env.local` en `AlmonteIntranet/` con el contenido mínimo (ver arriba).

**Opción B: Usar documentación**

Ver `docs/CONFIGURACION.md` para todas las variables disponibles.

### Paso 5: Obtener Token de Strapi

1. Accede a https://strapi.moraleja.cl/admin
2. Settings → API Tokens → Create new API Token
3. Nombre: "Desarrollo Local"
4. Token type: "Full access"
5. Copy token y pega en `.env.local`

### Paso 6: Ejecutar

```bash
npm run dev
```

⏱️ **Tiempo estimado:** 30-60 segundos

### Paso 7: Acceder

Abre: http://localhost:3000

CRM: http://localhost:3000/crm/colegios

---

## ✅ Checklist Final

Antes de ejecutar, verifica:

- [ ] Node.js >= 20.9.0 instalado
- [ ] npm >= 10.0.0 instalado
- [ ] Estás en el directorio `AlmonteIntranet/`
- [ ] Dependencias instaladas (`npm install` ejecutado)
- [ ] Archivo `.env.local` creado
- [ ] `STRAPI_API_TOKEN` configurado y válido
- [ ] `NEXT_PUBLIC_STRAPI_URL` configurado
- [ ] Puerto 3000 disponible

---

## 🔧 Solución de Problemas

### Error: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 3000 is already in use"
```bash
# Windows PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# O usar otro puerto
npm run dev -- -p 3001
```

### Error: "STRAPI_API_TOKEN no está configurado"
- Verifica que `.env.local` existe en `AlmonteIntranet/`
- Verifica que `STRAPI_API_TOKEN` tiene un valor
- Reinicia el servidor: `Ctrl+C` y luego `npm run dev`

### Error: "Error al cargar colegios/contactos"
- Verifica que el token de Strapi es válido
- Verifica que Strapi está accesible: https://strapi.moraleja.cl
- Revisa la consola del navegador (F12) para más detalles

---

## 📚 Documentación Adicional

- **Guía completa:** `docs/CONFIGURACION.md`
- **README local:** `AlmonteIntranet/README-LOCAL.md`
- **Guía de desarrollo:** `docs/GUIA-DESARROLLO.md`
- **Deployment:** `docs/DEPLOYMENT.md`

---

## 🎯 Resumen

**Para desplegar localmente necesitas:**

1. ✅ Node.js y npm instalados
2. ✅ Dependencias instaladas (`npm install`)
3. ⚠️ **Archivo `.env.local` con `STRAPI_API_TOKEN`** (CRÍTICO)
4. ✅ Ejecutar `npm run dev`

**El único paso crítico que falta es crear el archivo `.env.local` con el token de Strapi.**
