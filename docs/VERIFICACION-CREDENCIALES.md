# 🔐 Verificación de Credenciales

Este documento compara las credenciales proporcionadas con las que están documentadas en el proyecto.

## 📋 Credenciales Proporcionadas

### Haulmer
- ✅ `HAULMER_API_KEY="be794bb58cc048548e3483daa42995ef"`
- ✅ `HAULMER_API_URL="https://api.haulmer.com"`
- ✅ `HAULMER_EMISOR_DIRECCION="Apoquindo 4900 lc 144"`
- ✅ `HAULMER_EMISOR_GIRO="VENTA DE LIBROS AL POR MENOR Y POR INTERNET"`
- ✅ `HAULMER_EMISOR_RAZON_SOCIAL="Libreria escolar spa"`
- ✅ `HAULMER_EMISOR_RUT="77.818.529-6"`

### Pusher
- ✅ `NEXT_PUBLIC_PUSHER_APP_KEY="f088bd602bf23a156c37"`
- ✅ `NEXT_PUBLIC_PUSHER_CLUSTER="sa1"`
- ✅ `PUSHER_APP_ID="2095487"`
- ✅ `PUSHER_SECRET="5030e146509aece9e42b"`

### Strapi
- ⚠️ `NEXT_PUBLIC_STRAPI_URL="   https://strapi-pruebas-production.up.railway.app"` (tiene espacios al inicio)
- ✅ `STRAPI_API_TOKEN="3c05b2b7cb4775de9112fe3759de428596e6df43c8270025f7832b08ade0907cad3ab48b343ba2ffa3b8812199378c868d2bae58c5014edfa00b7403b1eedbb750ae5b88de22523c60477a3956a7f6ab8c521ad79af1c1252369e05de03a427327d58d51e8453ac646b8b0de3f9c857368e176a0eb65fe317895909482fb6b9d"`

**Nota:** La URL de Strapi en producción es diferente a la documentada:
- Documentada: `https://strapi.moraleja.cl`
- Proporcionada: `https://strapi-pruebas-production.up.railway.app`

### Stream Chat
- ✅ `NEXT_PUBLIC_STREAM_API_KEY="cpfqkqww6947"`
- ✅ `STREAM_API_KEY="cpfqkqww6947"`
- ✅ `STREAM_SECRET_KEY="9zx42z96w6eexq83kk5mf5dda6gb6s2rrtekgbe5we7rdmq344hpkfuq9b2qgj2n"`

### Shipit
- ✅ `SHIPIT_API_EMAIL="shipit@escolar.cl"`
- ✅ `SHIPIT_API_TOKEN="HhVs2mk9K9UHXVwyrVAv"`
- ✅ `SHIPIT_API_URL="https://api.shipit.cl/v4"`

### WooCommerce - Escolar
- ✅ `WOO_ESCOLAR_CONSUMER_KEY="ck_a70a60d406748d0d3d2a3334191c120c5945de9c"`
- ✅ `WOO_ESCOLAR_CONSUMER_SECRET="cs_08e562ca6e7d78b5ec6430285e37cb7a034718cc"`
- ✅ `WOO_ESCOLAR_URL="https://staging.escolar.cl"`
- ✅ `NEXT_PUBLIC_WOOCOMMERCE_URL="https://staging.escolar.cl"`

### WooCommerce - Moraleja
- ✅ `WOO_MORALEJA_CONSUMER_KEY="ck_0fe9d7146066c43cb6dd07c617cc58097a8a2f1d"`
- ✅ `WOO_MORALEJA_CONSUMER_SECRET="cs_54e171eb79302e2dd319f434cf36b53d54c3a6d2"`
- ✅ `WOO_MORALEJA_URL="https://staging.moraleja.cl"`

### WooCommerce - Genérico (Legacy)
- ⚠️ `WOOCOMMERCE_CONSUMER_KEY="ck_1d061e57ecfe47aa3661816f1b97858de8732014"`
- ⚠️ `WOOCOMMERCE_CONSUMER_SECRET="cs_b9b0ef71cccd554b66ce4545a739b175393d6d38"`

**Nota:** Estas credenciales genéricas pueden ser legacy o para otro entorno.

---

## 🔍 Comparación con Documentación

### Diferencias Encontradas

1. **Strapi URL:**
   - Documentada: `https://strapi.moraleja.cl`
   - Proporcionada: `https://strapi-pruebas-production.up.railway.app`
   - ⚠️ **Acción:** Actualizar documentación o verificar cuál es la correcta

2. **WooCommerce URLs:**
   - Documentada: `https://moraleja.cl` y `https://escolar.moraleja.cl`
   - Proporcionada: `https://staging.moraleja.cl` y `https://staging.escolar.cl`
   - ⚠️ **Nota:** Las URLs proporcionadas son de staging, no producción

3. **Haulmer API URL:**
   - Documentada: `https://dev-api.haulmer.com`
   - Proporcionada: `https://api.haulmer.com`
   - ⚠️ **Nota:** La proporcionada es producción, no desarrollo

4. **Variables adicionales:**
   - Pusher (no estaba en documentación básica)
   - WooCommerce genérico (legacy)

---

## ✅ Recomendaciones

1. **Actualizar documentación** con las URLs correctas de producción/staging
2. **Limpiar espacios** en `NEXT_PUBLIC_STRAPI_URL` (tiene espacios al inicio)
3. **Verificar** si las credenciales de WooCommerce genérico son necesarias
4. **Documentar** las variables de Pusher que no estaban en la guía básica

---

## 📝 Formato Correcto para .env.local

```env
# ==========================================
# Next.js Configuration
# ==========================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==========================================
# Strapi Configuration
# ==========================================
NEXT_PUBLIC_STRAPI_URL=https://strapi-pruebas-production.up.railway.app
STRAPI_API_TOKEN=3c05b2b7cb4775de9112fe3759de428596e6df43c8270025f7832b08ade0907cad3ab48b343ba2ffa3b8812199378c868d2bae58c5014edfa00b7403b1eedbb750ae5b88de22523c60477a3956a7f6ab8c521ad79af1c1252369e05de03a427327d58d51e8453ac646b8b0de3f9c857368e176a0eb65fe317895909482fb6b9d

# ==========================================
# WooCommerce - Moraleja
# ==========================================
WOO_MORALEJA_URL=https://staging.moraleja.cl
WOO_MORALEJA_CONSUMER_KEY=ck_0fe9d7146066c43cb6dd07c617cc58097a8a2f1d
WOO_MORALEJA_CONSUMER_SECRET=cs_54e171eb79302e2dd319f434cf36b53d54c3a6d2

# ==========================================
# WooCommerce - Escolar
# ==========================================
WOO_ESCOLAR_URL=https://staging.escolar.cl
NEXT_PUBLIC_WOOCOMMERCE_URL=https://staging.escolar.cl
WOO_ESCOLAR_CONSUMER_KEY=ck_a70a60d406748d0d3d2a3334191c120c5945de9c
WOO_ESCOLAR_CONSUMER_SECRET=cs_08e562ca6e7d78b5ec6430285e37cb7a034718cc

# ==========================================
# WooCommerce - Genérico (Legacy)
# ==========================================
WOOCOMMERCE_CONSUMER_KEY=ck_1d061e57ecfe47aa3661816f1b97858de8732014
WOOCOMMERCE_CONSUMER_SECRET=cs_b9b0ef71cccd554b66ce4545a739b175393d6d38

# ==========================================
# Stream Chat
# ==========================================
STREAM_API_KEY=cpfqkqww6947
STREAM_SECRET_KEY=9zx42z96w6eexq83kk5mf5dda6gb6s2rrtekgbe5we7rdmq344hpkfuq9b2qgj2n
NEXT_PUBLIC_STREAM_API_KEY=cpfqkqww6947

# ==========================================
# Pusher
# ==========================================
NEXT_PUBLIC_PUSHER_APP_KEY=f088bd602bf23a156c37
NEXT_PUBLIC_PUSHER_CLUSTER=sa1
PUSHER_APP_ID=2095487
PUSHER_SECRET=5030e146509aece9e42b

# ==========================================
# Shipit
# ==========================================
SHIPIT_API_TOKEN=HhVs2mk9K9UHXVwyrVAv
SHIPIT_API_EMAIL=shipit@escolar.cl
SHIPIT_API_URL=https://api.shipit.cl/v4
NEXT_PUBLIC_SHIPIT_ENABLED=true

# ==========================================
# Haulmer / Facturación Electrónica
# ==========================================
HAULMER_API_KEY=be794bb58cc048548e3483daa42995ef
HAULMER_API_URL=https://api.haulmer.com
HAULMER_EMISOR_RUT=77.818.529-6
HAULMER_EMISOR_RAZON_SOCIAL=Libreria escolar spa
HAULMER_EMISOR_GIRO=VENTA DE LIBROS AL POR MENOR Y POR INTERNET
HAULMER_EMISOR_DIRECCION=Apoquindo 4900 lc 144
```

---

**Última actualización:** 2026-01-16
