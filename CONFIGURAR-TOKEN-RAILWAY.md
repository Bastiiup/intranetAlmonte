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

### Paso 2: Configurar el Token en Railway

1. Ve a [Railway Dashboard](https://railway.app)

2. Selecciona tu proyecto **"Intranet prueba mati"**

3. Haz clic en el servicio **"Intranet prueba mati"**

4. Ve a la pestaña **"Variables"** (o **"Environment Variables"**)

5. Haz clic en **"+ New Variable"** o **"Add Variable"**

6. Configura la variable:
   - **Name**: `STRAPI_API_TOKEN`
   - **Value**: Pega el token que copiaste de Strapi
   - **Scope**: `Service` (o el que corresponda)

7. Haz clic en **"Add"** o **"Save"**

8. **IMPORTANTE**: Railway necesita hacer un nuevo despliegue para que la variable tome efecto. Esto puede tardar 1-2 minutos.

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

## 📝 Variables Recomendadas

Para que todo funcione correctamente, asegúrate de tener estas variables:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `STRAPI_API_TOKEN` | `tu_token_aqui` | Token de autenticación de Strapi (OBLIGATORIO) |
| `NEXT_PUBLIC_STRAPI_URL` | `https://strapi.moraleja.cl` | URL de tu instancia de Strapi (opcional, tiene default) |
| `NODE_ENV` | `production` | Entorno de ejecución (Railway lo configura automáticamente) |

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

