# 🔍 Guía: Revisar y Corregir Error "region" en Strapi

**Objetivo:** Encontrar y corregir el lifecycle hook que causa el error `Invalid key region`

---

## 📍 Paso 1: Ubicar el Lifecycle Hook

1. **Ir a Strapi Admin** → Content-Type Builder
2. **Buscar el content type:** `persona-trayectorias`
3. **Ir a la pestaña "Lifecycle hooks"** o buscar el archivo del modelo

**Ubicación del archivo (probable):**
```
src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js
```
o
```
src/api/persona-trayectorias/content-types/persona-trayectorias/lifecycles.js
```

---

## 🔍 Paso 2: Buscar el Hook `syncColegioLocation`

Buscar en el archivo de lifecycles:

```javascript
// Buscar algo como esto:
beforeCreate: async (event) => {
  // ... código que consulta el colegio
  const colegio = await strapi.entityService.findOne('api::colegio.colegio', colegioId, {
    fields: ['id', 'region'], // ← AQUÍ ESTÁ EL PROBLEMA
    populate: { comuna: { fields: ['id', 'region_nombre'] } }
  })
  
  // ... código que asigna colegio_region
  event.params.data.colegio_region = colegio?.region ?? colegio?.comuna?.region_nombre ?? null
}
```

---

## 🐛 Paso 3: Identificar el Problema

**Problema probable:**
- El hook está consultando el colegio con `fields: ['id', 'region']`
- Cuando Strapi procesa la relación `colegio: { connect: [id] }`, podría estar intentando incluir `region` en la validación
- Strapi rechaza `region` porque NO existe en el schema de `persona-trayectorias`

---

## ✅ Paso 4: Solución

### Opción A: Modificar el Hook (Recomendado)

**Cambiar la consulta del colegio para NO incluir `region` en fields:**

```javascript
// ANTES (problemático):
const colegio = await strapi.entityService.findOne('api::colegio.colegio', colegioId, {
  fields: ['id', 'region'], // ← Quitar 'region' de aquí
  populate: { comuna: { fields: ['id', 'region_nombre'] } }
})

// DESPUÉS (corregido):
const colegio = await strapi.entityService.findOne('api::colegio.colegio', colegioId, {
  fields: ['id'], // ← Solo id, sin region
  populate: { 
    comuna: { fields: ['id', 'region_nombre'] },
    // O mejor aún, obtener region directamente del colegio si existe
  }
})

// Obtener region de otra forma:
// Opción 1: Del colegio directamente (si tiene campo region)
const region = colegio?.region || colegio?.comuna?.region_nombre || null

// Opción 2: Consultar region por separado si es necesario
```

### Opción B: Deshabilitar Validación Temporalmente

Si necesitas una solución rápida, comentar temporalmente el hook:

```javascript
beforeCreate: async (event) => {
  // TEMPORALMENTE DESHABILITADO - Causa error "Invalid key region"
  // TODO: Corregir para no incluir region en fields
  return
  
  // ... código original comentado
}
```

---

## 🧪 Paso 5: Probar

1. **Guardar los cambios en Strapi**
2. **Reiniciar Strapi** (si es necesario)
3. **Probar crear una trayectoria** desde el frontend
4. **Verificar que el error desaparece**

---

## 📋 Checklist de Verificación

- [ ] Encontré el archivo de lifecycles de `persona-trayectorias`
- [ ] Identifiqué el hook `syncColegioLocation` o similar
- [ ] Verifiqué que consulta el colegio con `fields: ['id', 'region']`
- [ ] Modifiqué para quitar `region` de fields
- [ ] Probé crear una trayectoria y funciona

---

## 🔍 Búsqueda Rápida en Código

Si no encuentras el archivo, busca en todo el proyecto Strapi:

```bash
# Buscar referencias a "region" en lifecycles
grep -r "region" src/api/*/content-types/*/lifecycles.js

# Buscar syncColegioLocation
grep -r "syncColegioLocation" src/

# Buscar beforeCreate en persona-trayectoria
grep -r "beforeCreate" src/api/persona-trayectoria/
```

---

## ⚠️ Nota Importante

**NO modifiques el schema** de `persona-trayectorias` para agregar `region`. El problema está en el lifecycle hook, no en el schema.

---

**Última actualización:** Enero 2026
