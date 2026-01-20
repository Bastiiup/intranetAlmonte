# ✅ Resumen: Error "Invalid key region" - RESUELTO

**Fecha:** Enero 2026  
**Prioridad:** 🔴 ALTA  
**Estado:** ✅ RESUELTO - Enero 2026

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

## ✅ Solución Aplicada

**Corrección en Strapi (Enero 2026):**

1. ✅ **Lifecycle hook corregido**
   - Eliminado `region` de `fields` en la consulta del colegio
   - Ahora obtiene la región solo desde `comuna.region_nombre`
   - Mantiene la funcionalidad de asignar `colegio_region` correctamente

2. ✅ **Cambios en el código:**
   ```javascript
   // ANTES: fields: ['id', 'region'] ← Causaba el error
   // DESPUÉS: fields: ['id'] ← Sin region
   // Región obtenida desde: comuna.region_nombre
   ```

3. ✅ **Estado:** El error "Invalid key region" está resuelto

---

## 📝 Información Completa

Ver documento completo: `PREGUNTAS-PARA-STRAPI-ERROR-REGION.md`

---

**Contacto:** Mati (desarrollador frontend)  
**Documentación completa disponible en el repositorio**
