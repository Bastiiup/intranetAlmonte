# 📋 Instrucciones para el Equipo de Intranet - Incorporación del CRM

**Fecha:** 29-12-2025  
**Módulo:** CRM (Gestión de Colegios y Personas)

---

## 🎯 Resumen

Se ha agregado un nuevo módulo CRM a la intranet que permite gestionar colegios y personas. El código ya está en la rama `prueba-mati` y necesita configuración en el servidor de producción.

---

## ✅ Lo que ya está hecho

- ✅ Código implementado y en el repositorio
- ✅ Rutas creadas: `/crm/colegios` y `/crm/personas`
- ✅ APIs creadas: `/api/crm/colegios` y `/api/crm/personas`
- ✅ Componentes básicos funcionando

---

## 🔧 Lo que necesita hacer el equipo de Intranet

### 1. Variables de Entorno (OBLIGATORIO)

Agregar estas variables de entorno en el servidor de producción (Railway/Vercel/etc.):

```env
STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=token_de_api_de_strapi
```

**Pasos:**
1. Ir al panel del servidor (Railway/Vercel)
2. Buscar la sección "Environment Variables" o "Variables"
3. Agregar las dos variables arriba mencionadas
4. Si el servidor no se reinicia automáticamente, hacer "Redeploy"

**Nota:** Si ya tienen `STRAPI_URL` y `STRAPI_API_TOKEN` configuradas para otras partes de la intranet, solo necesitan verificar que existan. El CRM usa las mismas variables.

---

### 2. Obtener Token de API de Strapi (si no tienen uno)

Si no tienen un token de API configurado:

1. Ir a Strapi Admin: `https://strapi.moraleja.cl/admin`
2. Settings → API Tokens
3. Crear nuevo token:
   - Name: "Intranet CRM" (o el nombre que prefieran)
   - Token type: "Full access" (o "Read-only" si solo quieren lectura)
   - Token duration: "Unlimited"
4. Copiar el token generado
5. Agregarlo a `STRAPI_API_TOKEN` en las variables de entorno

---

### 3. Verificar Permisos en Strapi (si es necesario)

Si están usando permisos públicos (no token):

1. Ir a Strapi Admin → Settings → Users & Permissions → Roles
2. Seleccionar el rol "Public" (o el que usen)
3. Verificar que estos content types tengan permisos habilitados:
   - `colegio` → **find** y **findOne**
   - `persona` → **find** y **findOne**
   - `cartera-asignacion` → **find** y **findOne**
   - `colegio-event` → **find** y **findOne**
   - `persona-trayectoria` → **find** y **findOne**
   - `comuna` → **find** y **findOne**

**Nota:** Si usan token de API, no necesitan verificar permisos públicos.

---

### 4. Verificar que Funcione

Una vez configuradas las variables:

1. **Probar la API:**
   ```
   https://intranet.moraleja.cl/api/crm/colegios
   ```
   Debe retornar JSON con datos

2. **Probar las páginas:**
   ```
   https://intranet.moraleja.cl/crm/colegios
   https://intranet.moraleja.cl/crm/personas
   ```
   Deben mostrar tablas con datos

3. **Si hay errores:**
   - Revisar logs del servidor
   - Verificar que las variables estén correctas
   - Verificar que Strapi esté accesible

---

## 📁 Rutas del CRM

Las siguientes rutas estarán disponibles:

- `/crm/colegios` - Listado de colegios
- `/crm/colegios/[id]` - Ficha detalle de colegio
- `/crm/personas` - Listado de personas
- `/crm/personas/[id]` - Ficha detalle de persona

---

## 🚨 Problemas Comunes

### Error: "Error al obtener colegios"

**Solución:**
1. Verificar que `STRAPI_URL` y `STRAPI_API_TOKEN` estén configuradas
2. Verificar que el token sea válido
3. Probar acceso directo a Strapi: `https://strapi.moraleja.cl/api/colegios`

### La página carga pero no muestra datos

**Solución:**
1. Verificar que haya datos en Strapi
2. Verificar que los registros estén publicados (no en Draft)
3. Revisar consola del navegador (F12) para errores

### Error 404 en las rutas

**Solución:**
1. Verificar que el deploy se haya completado
2. Reiniciar el servidor si es necesario

---

## 📝 Notas Técnicas

- **No se crearon content types nuevos en Strapi** - El CRM usa los existentes
- **No se modificó ningún archivo existente** - Solo se agregaron nuevos
- **Las rutas están en** `(admin)/(apps)/crm/` - Probablemente ya protegidas por autenticación
- **Las APIs son proxies** - Llaman directamente a Strapi

---

## 📞 Contacto

Si tienen dudas o problemas, revisar:
- `docs/CRM_VERIFICACION_PASO_A_PASO.md` - Guía detallada de verificación
- `docs/CRM_IMPLEMENTACION_COMPLETA.md` - Documentación técnica completa

---

**Estado:** ✅ Código listo - Solo necesita configuración de variables de entorno

