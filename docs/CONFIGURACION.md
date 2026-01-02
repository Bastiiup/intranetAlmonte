# Configuración del Proyecto

Este documento contiene toda la información sobre variables de entorno y configuraciones necesarias para el proyecto.

## 📋 Tabla de Contenidos

- [Variables de Entorno Locales](#variables-de-entorno-locales)
- [Strapi](#strapi)
- [WooCommerce](#woocommerce)
- [Stream Chat](#stream-chat)
- [Shipit](#shipit)
- [Haulmer](#haulmer)
- [Configuración en Railway](#configuración-en-railway)
- [Troubleshooting](#troubleshooting)

---

## Variables de Entorno Locales

Crea un archivo `.env.local` en `AlmonteIntranet/` con las siguientes variables:

```env
# ==========================================
# Next.js Configuration
# ==========================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==========================================
# Strapi Configuration
# ==========================================
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_de_strapi_aqui

# ==========================================
# WooCommerce - Moraleja
# ==========================================
NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA=https://moraleja.cl
WOO_MORALEJA_CONSUMER_KEY=ck_xxxxxxxxxxxxx
WOO_MORALEJA_CONSUMER_SECRET=cs_xxxxxxxxxxxxx

# ==========================================
# WooCommerce - Escolar
# ==========================================
NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR=https://escolar.moraleja.cl
WOO_ESCOLAR_CONSUMER_KEY=ck_xxxxxxxxxxxxx
WOO_ESCOLAR_CONSUMER_SECRET=cs_xxxxxxxxxxxxx

# ==========================================
# Stream Chat
# ==========================================
STREAM_API_KEY=tu_api_key_aqui
STREAM_SECRET_KEY=tu_secret_key_aqui
NEXT_PUBLIC_STREAM_API_KEY=tu_api_key_aqui

# ==========================================
# Shipit (Opcional)
# ==========================================
SHIPIT_API_TOKEN=tu_token_aqui
SHIPIT_API_EMAIL=tu_email@ejemplo.com
SHIPIT_API_URL=https://api.shipit.cl/v4
NEXT_PUBLIC_SHIPIT_ENABLED=true

# ==========================================
# Haulmer / Facturación Electrónica (Opcional)
# ==========================================
HAULMER_API_KEY=tu_api_key_aqui
HAULMER_API_URL=https://dev-api.haulmer.com
HAULMER_EMISOR_RUT=12345678-9
HAULMER_EMISOR_RAZON_SOCIAL=Nombre de tu Empresa
HAULMER_EMISOR_GIRO=Giro Comercial
HAULMER_EMISOR_DIRECCION=Dirección Completa
HAULMER_EMISOR_COMUNA=Comuna
```

---

## Strapi

### Variables de Entorno

```env
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_de_strapi_aqui
```

### Cómo Obtener el Token

1. Accede a Strapi Admin: `https://strapi.moraleja.cl/admin`
2. Ve a **Settings → API Tokens**
3. Crea un nuevo token con permisos **Full access**
4. Copia el token generado

### URLs Importantes

- **Strapi Admin:** https://strapi.moraleja.cl/admin
- **Strapi API:** https://strapi.moraleja.cl/api

### Content Types Principales

- `libros` - Productos/libros
- `wo-pedidos` - Pedidos de WooCommerce
- `wo-clientes` - Clientes de WooCommerce
- `persona` - Personas/Colaboradores

---

## WooCommerce

### Variables de Entorno - Moraleja

```env
NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA=https://moraleja.cl
WOO_MORALEJA_CONSUMER_KEY=ck_xxxxxxxxxxxxx
WOO_MORALEJA_CONSUMER_SECRET=cs_xxxxxxxxxxxxx
```

### Variables de Entorno - Escolar

```env
NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR=https://escolar.moraleja.cl
WOO_ESCOLAR_CONSUMER_KEY=ck_xxxxxxxxxxxxx
WOO_ESCOLAR_CONSUMER_SECRET=cs_xxxxxxxxxxxxx
```

### Cómo Obtener las Credenciales

1. Inicia sesión en el panel de WordPress/WooCommerce
2. Ve a **WooCommerce → Configuración → Avanzado → REST API**
3. O directamente: `https://tu-tienda.com/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`
4. Haz clic en **"Agregar clave"** o **"Add key"**
5. Completa el formulario:
   - **Descripción**: "Intranet - Producción"
   - **Usuario**: Usuario con permisos de administrador
   - **Permisos**: **"Lectura/Escritura"** (Read/Write)
6. Haz clic en **"Generar clave API"**
7. Copia el **Consumer Key** y **Consumer Secret**

⚠️ **IMPORTANTE:** El Consumer Secret solo se muestra UNA VEZ. Guárdalo de forma segura.

### Solución de Problemas

#### Error 401: "La clave secreta de cliente no es válida"

**Causas posibles:**
- Credenciales incorrectas o con espacios extra
- Credenciales expiradas o revocadas
- Permisos insuficientes (debe ser Read/Write)
- URL incorrecta (debe ser la URL base sin `/wp-json/wc/v3/`)

#### Error 403: "No tienes permisos para hacer esto"

- Verifica que la clave tenga permisos de **"Lectura/Escritura"**
- Verifica que el usuario asociado tenga permisos de administrador

---

## Stream Chat

### Variables de Entorno

```env
STREAM_API_KEY=cpfqkqww6947
STREAM_SECRET_KEY=tu_secret_key_aqui
NEXT_PUBLIC_STREAM_API_KEY=cpfqkqww6947
```

### Cómo Obtener las Credenciales

1. Ve a [Stream Dashboard](https://dashboard.getstream.io/)
2. Crea una nueva app o selecciona una existente
3. Ve a **Chat → Overview** o **Settings**
4. Busca **API Key** y **API Secret**
5. Copia ambas credenciales

**Nota:** `NEXT_PUBLIC_STREAM_API_KEY` debe tener el mismo valor que `STREAM_API_KEY`, pero con el prefijo `NEXT_PUBLIC_` para que sea accesible en el cliente del navegador.

### Configuración de Permisos

Para configurar permisos de usuarios en Stream Chat, ver la documentación en `docs/INTEGRACIONES.md`.

---

## Shipit

### Variables de Entorno

```env
SHIPIT_API_TOKEN=tu_token_aqui
SHIPIT_API_EMAIL=tu_email@ejemplo.com
SHIPIT_API_URL=https://api.shipit.cl/v4
SHIPIT_DEFAULT_COURIER=shippify
NEXT_PUBLIC_SHIPIT_ENABLED=true
```

### Cómo Obtener las Credenciales

1. Crea cuenta en [Shipit](https://shipit.cl/)
2. Accede a la sección de configuración de API
3. Genera o copia el Token de Acceso
4. Usa el email con el que te registraste en Shipit

**Importante:** Shipit API v4 requiere **ambos**: `SHIPIT_API_TOKEN` y `SHIPIT_API_EMAIL`. El email es **obligatorio**, no opcional.

### Autenticación

La autenticación se hace mediante headers:
- `X-Shipit-Email`: Tu email de cuenta
- `X-Shipit-Access-Token`: Tu token de acceso

---

## Haulmer

### Variables de Entorno - API

```env
HAULMER_API_KEY=tu_api_key_aqui
HAULMER_SUBSCRIPTION_KEY=tu_subscription_key_aqui  # Opcional, usa HAULMER_API_KEY si no se configura
HAULMER_API_URL=https://dev-api.haulmer.com  # Opcional, default: https://dev-api.haulmer.com
```

### Variables de Entorno - Datos del Emisor

```env
HAULMER_EMISOR_RUT=12345678-9
HAULMER_EMISOR_RAZON_SOCIAL=Nombre de tu Empresa
HAULMER_EMISOR_GIRO=Giro Comercial
HAULMER_EMISOR_DIRECCION=Dirección Completa
HAULMER_EMISOR_COMUNA=Comuna
HAULMER_EMISOR_CIUDAD=Ciudad  # Opcional
```

### Cómo Obtener las Credenciales

1. Accede a [Espacio Haulmer](https://espacio.haulmer.com/)
2. Ve a **Configuración → API**
3. Genera o copia el API Key

### Timbraje de Folios

⚠️ **IMPORTANTE:** Antes de emitir facturas electrónicas, necesitas tener folios timbrados:

1. Accede a https://espacio.haulmer.com/
2. Ve a **Documentos Electrónicos → General → Timbrar Folios**
3. Presiona **"Timbrar folios"**
4. Selecciona el tipo de documento (Factura, Boleta, etc.)
5. Indica la cantidad de folios necesarios
6. Confirma la solicitud
7. Espera la autorización del SII (puede tomar horas o días)

Sin folios timbrados, la emisión de facturas fallará.

### Tipos de Documentos Soportados

- **33**: Factura Electrónica
- **34**: Factura Exenta
- **39**: Boleta Electrónica (por defecto)
- **41**: Boleta Exenta
- **56**: Nota de Débito
- **61**: Nota de Crédito

---

## Configuración en Railway

### Pasos para Configurar Variables

1. Ve a tu proyecto en Railway
2. Selecciona el servicio (AlmonteIntranet)
3. Ve a la pestaña **"Variables"**
4. Haz clic en **"+ New Variable"**
5. Agrega cada variable con su valor correspondiente
6. Guarda los cambios (Railway redeployará automáticamente)

### Variables Críticas para Producción

Asegúrate de tener configuradas al menos estas variables en Railway:

**Obligatorias:**
- `NEXT_PUBLIC_STRAPI_URL`
- `STRAPI_API_TOKEN`
- `NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA` (o Escolar)
- `WOO_MORALEJA_CONSUMER_KEY`
- `WOO_MORALEJA_CONSUMER_SECRET`

**Opcionales pero Recomendadas:**
- `STREAM_API_KEY` y `STREAM_SECRET_KEY` (si usas chat)
- `SHIPIT_API_TOKEN` y `SHIPIT_API_EMAIL` (si usas envíos)
- Variables de Haulmer (si usas facturación electrónica)

### Verificar Configuración

Puedes verificar que las variables estén configuradas usando endpoints de prueba:
- `/api/test-env` - Verifica variables de entorno (sin exponer valores)
- `/api/shipit/test` - Verifica conexión con Shipit

---

## Troubleshooting

### Error: "STRAPI_API_TOKEN no está configurado"

- Verifica que `STRAPI_API_TOKEN` esté en Railway
- Reinicia el servicio después de agregar la variable
- Verifica que el token sea válido en Strapi Admin

### Error: "La clave secreta de cliente no es válida" (WooCommerce)

- Verifica que las credenciales sean correctas
- Asegúrate de que la clave tenga permisos Read/Write
- Verifica que la URL sea correcta (URL base sin `/wp-json/wc/v3/`)
- Verifica que la clave no haya expirado o sido revocada

### Error: "Haulmer API Key no configurada"

- Verifica que `HAULMER_API_KEY` esté configurada
- La API key se obtiene desde Espacio Haulmer → Configuración → API

### Error al emitir documento en Haulmer

- **Verifica que tengas folios timbrados disponibles**
- Verifica que los datos del emisor coincidan exactamente con Haulmer
- Verifica que el formato de RUT sea correcto (con guión, sin puntos)
- Revisa los logs en Railway para más detalles

### Variables no se cargan

- Reinicia el servidor después de agregar variables
- Verifica que no haya espacios alrededor del `=` en las variables
- En Railway, asegúrate de guardar los cambios
- Verifica que estés usando el entorno correcto (Production/Preview/Development)

---

## Seguridad

⚠️ **IMPORTANTE - Reglas de Seguridad:**

1. **NUNCA** commitees archivos `.env.local` al repositorio
2. **NUNCA** expongas credenciales en código público
3. **NUNCA** uses variables `NEXT_PUBLIC_*` para credenciales secretas
4. Las credenciales deben estar:
   - ✅ Solo en variables de entorno del servidor
   - ✅ En archivos `.env.local` (que están en `.gitignore`)
   - ✅ En la configuración de Railway (o tu plataforma de hosting)

5. **Rota tokens expuestos**: Si algún token aparece en documentación, rótalo inmediatamente en producción

---

## Referencias

- [Documentación WooCommerce REST API](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [Documentación Strapi](https://docs.strapi.io/)
- [Stream Chat Documentation](https://getstream.io/chat/docs/)
- [Shipit API Documentation](https://shipit.cl/)
- [Haulmer Documentation](https://help.haulmer.com/)

