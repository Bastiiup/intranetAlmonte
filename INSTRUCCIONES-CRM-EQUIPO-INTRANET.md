# 📋 Instrucciones para el Equipo de Intranet - Incorporación del CRM

**Fecha:** 29-12-2025  
**Módulo:** CRM (Gestión de Colegios y Personas)

---

## 🎯 Resumen

Se agregó el módulo CRM a la intranet. El código está en la rama `prueba-mati`.

---

## ✅ Lo que necesita hacer

### 1. Verificar Variables de Entorno en Producción

Verificar que existan estas variables en el servidor de producción (Railway/Vercel/etc.):

```env
STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=token_de_api_de_strapi
```

**Si ya las tienen configuradas, está listo.** El CRM usa las mismas variables que el resto de la intranet.

**Si no las tienen:**
1. Ir al panel del servidor (Railway/Vercel)
2. Buscar "Environment Variables" o "Variables"
3. Agregar las dos variables mencionadas
4. Hacer "Redeploy" si es necesario

**Para obtener el token de API de Strapi:**
1. Ir a `https://strapi.moraleja.cl/admin`
2. Settings → API Tokens → Create new API Token
3. Name: "Intranet CRM"
4. Token type: "Full access"
5. Copiar el token y agregarlo a `STRAPI_API_TOKEN`

---

### 2. Probar las Rutas

Una vez configuradas las variables, probar:

- **`/crm/colegios`** - Debe mostrar listado de colegios
- **`/crm/personas`** - Debe mostrar listado de personas

**Si hay errores:**
- Verificar que las variables estén correctas
- Revisar logs del servidor
- Verificar que Strapi esté accesible

---

## 📁 Rutas Disponibles

- `/crm/colegios` - Listado de colegios
- `/crm/colegios/[id]` - Ficha detalle de colegio
- `/crm/personas` - Listado de personas
- `/crm/personas/[id]` - Ficha detalle de persona

---

## 🚨 Troubleshooting

### Error: "Error al obtener colegios"
- Verificar `STRAPI_URL` y `STRAPI_API_TOKEN`
- Probar acceso directo: `https://strapi.moraleja.cl/api/colegios`

### La página carga pero no muestra datos
- Verificar que haya datos en Strapi
- Verificar que los registros estén publicados (no en Draft)

### Error 404 en las rutas
- Verificar que el deploy se haya completado
- Reiniciar el servidor si es necesario

---

## 📝 Notas Técnicas

- ✅ No se crearon content types nuevos en Strapi (usa los existentes)
- ✅ No se modificó ningún archivo existente (solo se agregaron nuevos)
- ✅ Las rutas están en `(admin)/(apps)/crm/` (protegidas por autenticación)
- ✅ Las APIs son proxies que llaman directamente a Strapi

---

**Estado:** ✅ Código listo - Solo necesita verificar variables de entorno
