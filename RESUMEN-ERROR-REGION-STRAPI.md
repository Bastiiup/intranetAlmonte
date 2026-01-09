# 🚨 Resumen Ejecutivo: Error "Invalid key region" en persona-trayectorias

**Fecha:** Enero 2026  
**Prioridad:** 🔴 ALTA  
**Estado:** Bloqueando creación de trayectorias

---

## 📋 Problema

Al crear una `persona-trayectorias` vía POST, Strapi rechaza la petición con:

```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Invalid key region",
    "details": {
      "key": "region",
      "path": "region"
    }
  }
}
```

**⚠️ IMPORTANTE:** El campo `region` NO se está enviando en el payload.

---

## 🔍 Payload que Enviamos

```json
{
  "data": {
    "persona": { "connect": [12345] },
    "colegio": { "connect": [67890] },
    "cargo": "Profesor de Matemáticas",
    "is_current": true,
    "activo": true
  }
}
```

**No incluye `region`, `comuna`, ni `dependencia`.**

---

## 🎯 Acción Requerida

**Revisar en Strapi:**

1. ✅ **Lifecycle hook `syncColegioLocation`** en `persona-trayectorias`
   - ¿Está intentando procesar o validar el campo `region`?
   - El hook consulta el colegio con `fields: ['id', 'region']` - ¿esto causa el error?

2. ✅ **Schema de `persona-trayectorias`**
   - ¿Existe un campo `region` (no `colegio_region`)?
   - ¿Hay validaciones que rechacen campos específicos?

3. ✅ **Logs del servidor Strapi**
   - ¿Qué payload recibe exactamente Strapi?
   - ¿En qué punto falla la validación?

---

## 📝 Información Completa

Ver documento completo: `PREGUNTAS-PARA-STRAPI-ERROR-REGION.md`

---

**Contacto:** Mati (desarrollador frontend)  
**Documentación completa disponible en el repositorio**
