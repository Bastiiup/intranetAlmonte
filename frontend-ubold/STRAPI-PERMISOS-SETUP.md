# Configuración de Permisos en Strapi para Product · Libro · Edición

## 🔐 Problema: Error "Not Found"

Si ves el error "Not Found" al intentar acceder a `/api/product-libro-edicion`, es porque **los permisos no están configurados** en Strapi.

## ✅ Solución: Configurar Permisos

### Paso 1: Ir a Configuración de Roles

1. Inicia sesión en Strapi Admin: `https://strapi.moraleja.cl/admin`
2. Ve a **Settings** (Configuración) → **Users & Permissions plugin** → **Roles**
3. Haz clic en **Public** (o el rol que estés usando)

### Paso 2: Habilitar Permisos para "Product · Libro · Edición"

1. Busca en la lista: **"Product · Libro · Edición"** o **"product-libro-edicion"**
2. Expande la sección
3. Marca la casilla **"find"** (y opcionalmente "findOne" si quieres ver productos individuales)
4. Haz clic en **"Save"** (Guardar)

### Paso 3: Verificar API Token

1. Ve a **Settings** → **Users & Permissions plugin** → **API Tokens**
2. Verifica que tu token tenga permisos de **"Read"** o **"Full access"**
3. Si no, edita el token y asegúrate de que tenga los permisos necesarios

## 🧪 Probar la Conexión

### Opción 1: Desde el Navegador

Abre esta URL en tu navegador (reemplaza `TU_TOKEN` con tu API token):

```
https://strapi.moraleja.cl/api/product-libro-edicion?populate=*&pagination[pageSize]=1
```

**Con autenticación:**
```
https://strapi.moraleja.cl/api/product-libro-edicion?populate=*&pagination[pageSize]=1
```

Luego agrega el header `Authorization: Bearer TU_TOKEN` usando una herramienta como Postman o curl.

### Opción 2: Usar curl

```bash
curl -X GET "https://strapi.moraleja.cl/api/product-libro-edicion?populate=*&pagination[pageSize]=1" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Opción 3: Desde la Intranet

1. Ve a `/tienda/productos/debug`
2. Revisa qué endpoints funcionan
3. Si todos fallan, el problema es de permisos

## 📋 Checklist de Verificación

- [ ] Permisos de "find" habilitados para "Product · Libro · Edición" en rol Public
- [ ] API Token configurado correctamente
- [ ] API Token tiene permisos de lectura
- [ ] La colección existe en Strapi
- [ ] Hay al menos un producto publicado en la colección

## 🔍 Verificar el Nombre Exacto del Endpoint

Si aún no funciona, verifica el nombre exacto:

1. Ve a Strapi → **Content Manager**
2. Busca la colección "Product · Libro · Edición"
3. Abre cualquier producto
4. Mira la URL del navegador: debería ser algo como:
   ```
   /admin/content-manager/collection-types/product-libro-edicion/...
   ```
5. El nombre después de `collection-types/` es el endpoint de la API

## 🆘 Si Sigue Sin Funcionar

1. Verifica que el API Token esté configurado en las variables de entorno de Railway
2. Verifica que el token no haya expirado
3. Intenta crear un nuevo API Token con permisos completos
4. Revisa los logs de Strapi para ver si hay errores


