# Configuración de WooCommerce API

Este documento explica cómo configurar las credenciales de WooCommerce para que la aplicación pueda conectarse correctamente.

## ⚠️ Error: "La clave secreta de cliente no es válida"

Este error (401) indica que las credenciales de WooCommerce no están configuradas correctamente o han expirado.

## Variables de Entorno Requeridas

Necesitas configurar las siguientes variables de entorno en tu servidor (Railway, Vercel, etc.):

```env
# URL base de WooCommerce (puede ser pública)
NEXT_PUBLIC_WOOCOMMERCE_URL=https://tu-tienda.com

# Credenciales de API (SOLO en servidor, NUNCA en cliente)
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Cómo Obtener las Credenciales

### 1. Acceder al Panel de WooCommerce

1. Inicia sesión en el panel de administración de WordPress/WooCommerce
2. Ve a **WooCommerce → Configuración → Avanzado → REST API**
3. O directamente: `https://tu-tienda.com/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`

### 2. Crear una Nueva Clave de API

1. Haz clic en **"Agregar clave"** o **"Add key"**
2. Completa el formulario:
   - **Descripción**: Un nombre descriptivo (ej: "Intranet - Producción")
   - **Usuario**: Selecciona un usuario con permisos de administrador
   - **Permisos**: Selecciona **"Lectura/Escritura"** (Read/Write)
3. Haz clic en **"Generar clave API"** o **"Generate API key"**

### 3. Copiar las Credenciales

Después de crear la clave, verás:
- **Consumer Key**: `ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Consumer Secret**: `cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

⚠️ **IMPORTANTE**: El Consumer Secret solo se muestra UNA VEZ. Si lo pierdes, tendrás que crear una nueva clave.

## Configurar en Railway (o tu plataforma de hosting)

### Railway

1. Ve a tu proyecto en Railway
2. Selecciona el servicio (frontend-ubold)
3. Ve a la pestaña **"Variables"**
4. Agrega las siguientes variables:

```
NEXT_PUBLIC_WOOCOMMERCE_URL = https://tu-tienda.com
WOOCOMMERCE_CONSUMER_KEY = ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET = cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

5. Haz clic en **"Deploy"** o espera a que se redepliegue automáticamente

### Vercel

1. Ve a tu proyecto en Vercel
2. Ve a **Settings → Environment Variables**
3. Agrega las variables para los entornos correspondientes (Production, Preview, Development)
4. Guarda y redeploya

## Verificar la Configuración

### 1. Verificar Variables de Entorno

Puedes verificar que las variables estén configuradas correctamente usando el endpoint de prueba:

```bash
GET /api/test-env
```

Este endpoint mostrará (sin exponer los valores completos) si las variables están configuradas.

### 2. Probar Conexión con WooCommerce

Intenta crear un producto o hacer una petición GET a:

```bash
GET /api/woocommerce/products?per_page=1
```

Si las credenciales son correctas, deberías recibir una lista de productos.

## Solución de Problemas

### Error 401: "La clave secreta de cliente no es válida"

**Posibles causas:**

1. **Credenciales incorrectas**
   - Verifica que copiaste correctamente el Consumer Key y Consumer Secret
   - Asegúrate de no tener espacios extra al inicio o final

2. **Credenciales expiradas o revocadas**
   - Ve al panel de WooCommerce y verifica que la clave esté activa
   - Si fue revocada, crea una nueva clave

3. **Permisos insuficientes**
   - La clave debe tener permisos de **"Lectura/Escritura"** (Read/Write)
   - Verifica que el usuario asociado tenga permisos de administrador

4. **URL incorrecta**
   - Verifica que `NEXT_PUBLIC_WOOCOMMERCE_URL` apunte a la URL correcta
   - Debe ser la URL base sin `/wp-json/wc/v3/` al final
   - Ejemplo correcto: `https://tu-tienda.com`
   - Ejemplo incorrecto: `https://tu-tienda.com/wp-json/wc/v3`

5. **Variables no cargadas**
   - Asegúrate de que las variables estén configuradas en el entorno correcto (Production/Preview/Development)
   - Reinicia el servidor después de agregar las variables

### Error 403: "No tienes permisos para hacer esto"

- Verifica que la clave tenga permisos de **"Lectura/Escritura"**
- Verifica que el usuario asociado tenga permisos de administrador

### Error 404: "No se encontró la ruta"

- Verifica que la URL de WooCommerce sea correcta
- Verifica que WooCommerce REST API esté habilitada en tu tienda
- Ve a: WooCommerce → Configuración → Avanzado → REST API y verifica que esté habilitada

## Seguridad

⚠️ **NUNCA** expongas las credenciales en:
- Código fuente público (GitHub, GitLab, etc.)
- Variables de entorno del cliente (NEXT_PUBLIC_*)
- Logs o mensajes de error
- URLs o parámetros de consulta

Las credenciales deben estar:
- ✅ Solo en variables de entorno del servidor
- ✅ En archivos `.env.local` (que están en `.gitignore`)
- ✅ En la configuración de tu plataforma de hosting (Railway, Vercel, etc.)

## Referencias

- [Documentación WooCommerce REST API](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [Guía de Autenticación WooCommerce](https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication-over-https)
- Código de configuración: `frontend-ubold/src/lib/woocommerce/config.ts`
- Cliente HTTP: `frontend-ubold/src/lib/woocommerce/client.ts`
