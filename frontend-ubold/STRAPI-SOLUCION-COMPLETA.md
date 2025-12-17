# Solución Completa: Configurar Strapi para Product · Libro · Edición

## 🔴 Problema Actual
- Error: "Not Found" al acceder a `/api/product-libro-edicion`
- No hay roles configurados en Strapi

## ✅ Solución Paso a Paso

### Paso 1: Crear el Rol "Public"

1. Ve a Strapi Admin: `https://strapi.moraleja.cl/admin`
2. Ve a **Settings** → **Users & Permissions plugin** → **Roles**
3. Haz clic en el botón **"Add new role"** (azul, arriba a la derecha)
4. Nombre: `Public`
5. Descripción: `Rol público para acceso a la API`
6. Haz clic en **"Save"**

### Paso 2: Configurar Permisos para "Product · Libro · Edición"

1. Con el rol "Public" creado, haz clic en él para editarlo
2. Busca en la lista de Content Types: **"Product · Libro · Edición"**
   - Si no aparece, busca: `product-libro-edicion`
   - O busca por: `libro-edicion`
3. Expande la sección de ese Content Type
4. Marca estas casillas:
   - ✅ **find** (para listar productos)
   - ✅ **findOne** (para ver un producto individual)
5. Haz clic en **"Save"** (arriba a la derecha)

### Paso 3: Verificar/Crear API Token

1. Ve a **Settings** → **Users & Permissions plugin** → **API Tokens**
2. Si ya tienes un token:
   - Verifica que tenga permisos de **"Read"** o **"Full access"**
   - Copia el token (Consumer Secret)
3. Si no tienes token:
   - Haz clic en **"Create new API Token"**
   - Nombre: `Intranet API`
   - Token type: **Read-only** o **Full access**
   - Token duration: **Unlimited**
   - Haz clic en **"Save"**
   - **IMPORTANTE**: Copia el token inmediatamente (solo se muestra una vez)

### Paso 4: Verificar en Railway

1. Ve a tu proyecto en Railway
2. Abre la pestaña **"Variables"**
3. Verifica que exista:
   - `STRAPI_API_TOKEN` = (tu token copiado en el paso 3)
4. Si no existe o está incorrecto, agrégalo/actualízalo
5. Railway hará un nuevo deploy automáticamente

## 🧪 Probar la Conexión

### Opción 1: Desde el Navegador (sin autenticación)

Abre esta URL directamente:
```
https://strapi.moraleja.cl/api/product-libro-edicion?populate=*
```

Si ves datos JSON → Los permisos están bien configurados ✅
Si ves "Forbidden" o "Not Found" → Revisa los permisos ❌

### Opción 2: Con curl (con autenticación)

```bash
curl -X GET "https://strapi.moraleja.cl/api/product-libro-edicion?populate=*&pagination[pageSize]=1" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Opción 3: Desde la Intranet

1. Ve a `/tienda/productos/debug`
2. Revisa qué endpoints funcionan
3. Si `/api/product-libro-edicion` aparece con ✅, está funcionando

## 🔍 Verificar el Nombre Exacto del Content Type

Si aún no funciona, verifica el nombre exacto:

1. Ve a **Content Manager** en Strapi
2. Busca la colección de libros/ediciones
3. Abre cualquier producto
4. Mira la URL del navegador:
   ```
   /admin/content-manager/collection-types/[NOMBRE-AQUI]/...
   ```
5. El nombre entre `collection-types/` y el ID es el endpoint de la API

## 📋 Checklist Final

- [ ] Rol "Public" creado en Strapi
- [ ] Permisos "find" y "findOne" habilitados para "Product · Libro · Edición" en rol Public
- [ ] API Token creado/verificado con permisos de lectura
- [ ] API Token configurado en Railway (variable `STRAPI_API_TOKEN`)
- [ ] Prueba manual funciona (ver Opción 1 arriba)
- [ ] La colección tiene al menos un producto publicado

## 🆘 Si Sigue Sin Funcionar

1. **Verifica que la colección exista:**
   - Ve a Content Manager
   - Debe aparecer "Product · Libro · Edición"

2. **Verifica que haya productos:**
   - Abre la colección
   - Debe haber al menos un producto

3. **Verifica el nombre del endpoint:**
   - La URL en Content Manager te dirá el nombre exacto
   - Ejemplo: Si la URL es `/collection-types/mi-coleccion/123`
   - El endpoint es `/api/mi-coleccion`

4. **Revisa los logs de Railway:**
   - Ve a Railway → Deployments → Logs
   - Busca errores relacionados con Strapi

5. **Prueba con otro Content Type:**
   - Si tienes otra colección que funcione, compara sus permisos
   - Aplica los mismos permisos a "Product · Libro · Edición"


