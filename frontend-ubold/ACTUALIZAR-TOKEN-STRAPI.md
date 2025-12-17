# Cómo Actualizar el API Token de Strapi

## 🎯 Opción 1: Actualizar en Railway (Producción)

1. Ve a [Railway Dashboard](https://railway.app)
2. Selecciona tu proyecto de la intranet
3. Ve a la pestaña **"Variables"** o **"Environment Variables"**
4. Busca la variable `STRAPI_API_TOKEN`
5. Haz clic en el valor actual para editarlo
6. Pega el nuevo token de Strapi
7. Guarda los cambios
8. Railway reiniciará automáticamente el servicio con el nuevo token

## 🔑 Crear un Nuevo API Token en Strapi

1. Ve a Strapi Admin: `https://strapi.moraleja.cl/admin`
2. Ve a **Settings** → **Users & Permissions plugin** → **API Tokens**
3. Haz clic en **"Create new API Token"**
4. Configura el token:
   - **Name**: `Intranet API Token` (o el nombre que prefieras)
   - **Token duration**: `Unlimited` (o el tiempo que necesites)
   - **Token type**: `Full access` (recomendado) o `Read-only` si solo necesitas leer
5. Haz clic en **"Save"**
6. **IMPORTANTE**: Copia el token inmediatamente (solo se muestra una vez)
7. Pega el token en Railway como se indica arriba

## 🧪 Opción 2: Probar Localmente (Desarrollo)

Si quieres probar el token localmente antes de desplegar:

1. Crea o edita el archivo `.env.local` en `frontend-ubold/`:
   ```env
   STRAPI_API_TOKEN=tu_nuevo_token_aqui
   NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
   ```

2. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Prueba en `/tienda/productos/debug` para verificar que funciona

## ✅ Verificar que el Token Funciona

Después de actualizar el token:

1. Ve a `/tienda/productos/debug` en tu aplicación
2. Deberías ver que algunos endpoints ahora funcionan
3. Si ves errores 403 (Forbidden), el token existe pero necesita permisos:
   - Ve a Strapi → Settings → Users & Permissions → Roles → **API Token**
   - Habilita los permisos necesarios para las colecciones que necesitas

## 🔍 Verificar Permisos del Token

1. En Strapi Admin, ve a **Settings** → **Users & Permissions plugin** → **Roles**
2. Haz clic en **"API Token"** (no "Public")
3. Busca las colecciones que necesitas (ej: productos, pedidos)
4. Marca los permisos necesarios:
   - **Find** - Para leer/listar
   - **FindOne** - Para leer un solo registro
   - **Create** - Para crear (si lo necesitas)
   - **Update** - Para actualizar (si lo necesitas)
   - **Delete** - Para eliminar (si lo necesitas)
5. Haz clic en **"Save"**

## ⚠️ Notas Importantes

- El token debe tener **"Full access"** o los permisos específicos que necesitas
- Si el token es de tipo "Read-only", solo podrás leer datos, no crear/actualizar
- Los cambios en Railway pueden tardar 1-2 minutos en aplicarse
- Siempre verifica que el token esté correctamente configurado después de actualizarlo


