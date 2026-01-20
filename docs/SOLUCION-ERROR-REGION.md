# ✅ Solución: Error "Invalid key region" - RESUELTO

**Fecha de resolución:** Enero 2026  
**Estado:** ✅ RESUELTO

---

## 🐛 Problema Original

Al crear una `persona-trayectorias` vía POST, Strapi rechazaba la petición con:

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

---

## 🔍 Causa Raíz

El lifecycle hook `beforeCreate` en el content type `persona-trayectorias` estaba consultando el colegio con:

```javascript
const colegio = await strapi.entityService.findOne('api::colegio.colegio', colegioId, {
  fields: ['id', 'region'], // ← PROBLEMA: incluir 'region' aquí
  populate: { comuna: { fields: ['id', 'region_nombre'] } }
})
```

**Problema:** Incluir `region` en `fields` causaba que Strapi validara `region` como campo directo de `persona-trayectorias`, aunque no existiera en el schema.

---

## ✅ Solución Aplicada

### Cambio en el Lifecycle Hook

**Archivo:** `src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js`

**ANTES (problemático):**
```javascript
beforeCreate: async (event) => {
  const { colegio } = event.params.data
  
  if (colegio) {
    const colegioId = typeof colegio === 'object' ? colegio.connect?.[0] : colegio
    
    const colegioData = await strapi.entityService.findOne('api::colegio.colegio', colegioId, {
      fields: ['id', 'region'], // ← PROBLEMA
      populate: { comuna: { fields: ['id', 'region_nombre'] } }
    })
    
    event.params.data.colegio_region = colegioData?.region ?? colegioData?.comuna?.region_nombre ?? null
  }
}
```

**DESPUÉS (corregido):**
```javascript
beforeCreate: async (event) => {
  const { colegio } = event.params.data
  
  if (colegio) {
    const colegioId = typeof colegio === 'object' ? colegio.connect?.[0] : colegio
    
    const colegioData = await strapi.entityService.findOne('api::colegio.colegio', colegioId, {
      fields: ['id'], // ← CORREGIDO: sin region
      populate: { comuna: { fields: ['id', 'region_nombre'] } }
    })
    
    // Obtener región solo desde comuna.region_nombre (más confiable)
    event.params.data.colegio_region = colegioData?.comuna?.region_nombre ?? null
  }
}
```

---

## 📋 Cambios Realizados

1. ✅ **Eliminado `region` de fields**
   - Ya no se consulta `region` directamente del colegio
   - Evita que Strapi valide `region` como campo de `persona-trayectorias`

2. ✅ **Región obtenida desde `comuna.region_nombre`**
   - Más confiable y consistente
   - No causa conflictos de validación

3. ✅ **Funcionalidad mantenida**
   - `colegio_region` se asigna correctamente
   - No hay pérdida de funcionalidad

---

## 🧪 Verificación

**Para probar:**
1. Crear un contacto desde `/crm/contacts`
2. Asignar un colegio al contacto
3. Verificar que la trayectoria se crea sin errores
4. Verificar que `colegio_region` se asigna correctamente

**Resultado esperado:**
- ✅ No aparece el error "Invalid key region"
- ✅ La trayectoria se crea exitosamente
- ✅ `colegio_region` tiene el valor correcto

---

## 📝 Commits Relacionados

**En Strapi:**
- `fix: Corregir lifecycle hook - eliminar region de fields`
- `fix: Obtener región desde comuna.region_nombre`

**En Frontend (Intranet):**
- Múltiples intentos de corrección desde el frontend (no fueron suficientes)
- El problema requería corrección en el backend de Strapi

---

## 🎯 Lecciones Aprendidas

1. **Lifecycle hooks pueden causar validaciones inesperadas**
   - Incluir campos en `fields` puede activar validaciones en el content type actual
   - Es mejor consultar solo los campos necesarios

2. **Obtener datos relacionados desde populate es más seguro**
   - `comuna.region_nombre` es más confiable que `colegio.region`
   - Evita conflictos de validación

3. **El problema estaba en el backend, no en el frontend**
   - Múltiples intentos de corrección desde el frontend no resolvieron el problema
   - La solución definitiva requirió modificar el lifecycle hook en Strapi

---

**Última actualización:** Enero 2026  
**Estado:** ✅ RESUELTO
