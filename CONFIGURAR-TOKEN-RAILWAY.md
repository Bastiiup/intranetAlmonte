# 🔐 Configurar STRAPI_API_TOKEN en Railway

## ⚠️ Problema Actual

Estás viendo este error:
```
STRAPI_API_TOKEN no está configurado. Algunas peticiones pueden fallar.
[API /tienda/productos/[id] PUT] ❌ Error al obtener producto por ID numérico: { status: 404, message: 'Not Found' }
```

Esto significa que **Strapi está rechazando las peticiones** porque no hay token de autenticación.

## ✅ Solución: Configurar el Token en Railway

### Paso 1: Obtener el Token de Strapi

1. Ve a tu panel de administración de Strapi:
   ```
   https://strapi.moraleja.cl/admin
   ```

2. Ve a **Settings** → **API Tokens** (o **Configuración** → **Tokens de API**)

3. Si ya tienes un token:
   - Cópialo (es un string largo que empieza con algo como `Bearer ...` o solo el token)
   
4. Si NO tienes un token, créalo:
   - Haz clic en **"Create new API Token"**
   - **Name**: `Intranet Railway` (o el nombre que prefieras)
   - **Token type**: `Full access` (o `Read-only` si solo necesitas leer)
   - **Token duration**: `Unlimited` (o el tiempo que necesites)
   - Haz clic en **"Save"**
   - **Copia el token** inmediatamente (solo se muestra una vez)

### Paso 2: Configurar las Variables en Railway

1. Ve a [Railway Dashboard](https://railway.app)

2. Selecciona tu proyecto **"Intranet prueba mati"**

3. Haz clic en el servicio **"Intranet prueba mati"**

4. Ve a la pestaña **"Variables"** (o **"Environment Variables"**)

5. Agrega las siguientes variables **UNA POR UNA**:

   **Variable 1: STRAPI_API_TOKEN**
   - Haz clic en **"+ New Variable"** o **"Add Variable"**
   - **Name**: `STRAPI_API_TOKEN`
   - **Value**: 
     ```
     d9a0e303af189b9fa1f2c6aecdfef7f28e9f7217977f2429c3106a5be085b814699c2bccb40631dc74748760eb6eb9096dc0055632fcb9b5b0a10c234a16a2cb2563ff9379393a552ed8e9fd1571f9a209a1a198444443d1d1611c5e4169df4f333d4b6af9ead0ebf6ae22ef2033da1f8c0f5b9800af33e6bf7275ca35313b32
     ```
   - **Scope**: `Service` (o el que corresponda)
   - Haz clic en **"Add"** o **"Save"**

   **Variable 2: WOOCOMMERCE_CONSUMER_KEY**
   - Haz clic en **"+ New Variable"** nuevamente
   - **Name**: `WOOCOMMERCE_CONSUMER_KEY`
   - **Value**: 
     ```
     ck_ead4ac3a050feefe4f4507412117571ece3547da
     ```
   - Haz clic en **"Add"** o **"Save"**

   **Variable 3: WOOCOMMERCE_CONSUMER_SECRET**
   - Haz clic en **"+ New Variable"** nuevamente
   - **Name**: `WOOCOMMERCE_CONSUMER_SECRET`
   - **Value**: 
     ```
     cs_302d947602fe2a43bf79ac742805a1b864267748
     ```
   - Haz clic en **"Add"** o **"Save"**

6. **IMPORTANTE**: 
   - **NO incluyas las comillas** (`"`) al pegar los valores
   - Railway necesita hacer un nuevo despliegue para que las variables tomen efecto
   - Esto puede tardar 1-2 minutos

### Paso 3: Verificar que Funciona

1. Espera a que Railway termine el despliegue (ve a "Deployments" para ver el progreso)

2. Intenta editar un producto nuevamente

3. En los logs de Railway, deberías ver:
   ```
   [API PUT] 🔐 CONFIGURACIÓN STRAPI: {
     tieneToken: true,
     tokenLength: [número],
     tokenPreview: '[primeros caracteres]...'
   }
   ```

4. Si sigue fallando, verifica:
   - ¿El token está correctamente copiado? (sin espacios al inicio/final)
   - ¿El nombre de la variable es exactamente `STRAPI_API_TOKEN` (mayúsculas)?
   - ¿El servicio se re-desplegó después de agregar la variable?

## 🔍 Verificar Variables de Entorno en Railway

Para ver todas las variables configuradas:

1. Railway → Tu servicio → Pestaña **"Variables"**
2. Deberías ver:
   - `STRAPI_API_TOKEN` ✅
   - `NEXT_PUBLIC_STRAPI_URL` (opcional, pero recomendado)
   - Otras variables que hayas configurado

## 📝 Variables Configuradas

Para que todo funcione correctamente, asegúrate de tener estas variables:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `STRAPI_API_TOKEN` | `d9a0e303af189b9fa1f2c6aecdfef7f28e9f7217977f2429c3106a5be085b814699c2bccb40631dc74748760eb6eb9096dc0055632fcb9b5b0a10c234a16a2cb2563ff9379393a552ed8e9fd1571f9a209a1a198444443d1d1611c5e4169df4f333d4b6af9ead0ebf6ae22ef2033da1f8c0f5b9800af33e6bf7275ca35313b32` | Token de autenticación de Strapi (OBLIGATORIO) |
| `WOOCOMMERCE_CONSUMER_KEY` | `ck_ead4ac3a050feefe4f4507412117571ece3547da` | Consumer Key de WooCommerce |
| `WOOCOMMERCE_CONSUMER_SECRET` | `cs_302d947602fe2a43bf79ac742805a1b864267748` | Consumer Secret de WooCommerce |
| `NEXT_PUBLIC_STRAPI_URL` | `https://strapi.moraleja.cl` | URL de tu instancia de Strapi (opcional, tiene default) |
| `NODE_ENV` | `production` | Entorno de ejecución (Railway lo configura automáticamente) |

### ⚠️ Importante al Pegar los Valores

- **NO incluyas las comillas** (`"`) que aparecen en el archivo `.env`
- **NO incluyas espacios** al inicio o final del valor
- Copia solo el valor sin las comillas ni el nombre de la variable

## 🚨 Troubleshooting

### Error: "STRAPI_API_TOKEN no está configurado"
- Verifica que la variable esté en Railway → Variables
- Verifica que el nombre sea exactamente `STRAPI_API_TOKEN` (sin espacios, mayúsculas)
- Espera a que Railway termine el despliegue después de agregar la variable

### Error: 401 Unauthorized
- El token puede estar expirado o ser inválido
- Genera un nuevo token en Strapi y actualízalo en Railway

### Error: 404 Not Found
- Verifica que `NEXT_PUBLIC_STRAPI_URL` apunte a la URL correcta de Strapi
- Verifica que el endpoint `/api/libros` exista en Strapi

### Error: 502 Bad Gateway
- Strapi puede estar caído o no accesible
- Verifica que `https://strapi.moraleja.cl` esté funcionando

## 📞 ¿Necesitas Ayuda?

Si después de configurar el token sigue fallando:
1. Comparte los logs de Railway (especialmente los que empiezan con `[API PUT] 🔐`)
2. Verifica que el token sea válido probándolo directamente con curl o Postman
3. Revisa los logs de Strapi para ver qué error está devolviendo

