# 🚨 Error "Invalid key region" - Problema Persistente

**Fecha:** 9 de Enero 2026  
**Rama:** `mati-integracion`  
**Estado:** ✅ **SOLUCIÓN IMPLEMENTADA EN STRAPI** (pendiente verificación)

---

## 📋 Resumen Ejecutivo

El error `Invalid key region` sigue apareciendo al crear/actualizar trayectorias (`persona-trayectorias`) a pesar de múltiples filtros y verificaciones en el frontend. El error indica que Strapi está rechazando el campo `region` que **NO está siendo enviado** desde el frontend.

---

## 🔍 Análisis del Problema

### Error Observado

```
[Strapi Client] ❌ Error response: {
  "data": null,
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

### Verificaciones Implementadas en Frontend

El código en `/api/persona-trayectorias/route.ts` tiene **múltiples capas de filtrado**:

1. ✅ **Lista de campos prohibidos** que incluye `region`
2. ✅ **Eliminación automática** de campos prohibidos en `body.data`
3. ✅ **Construcción limpia del payload** solo con campos permitidos
4. ✅ **Verificaciones adicionales** antes de enviar a Strapi
5. ✅ **Logs detallados** que confirman que `region` NO está en el payload final

### Payload Enviado a Strapi

El payload que se envía es:

```json
{
  "data": {
    "persona": { "connect": [12345] },
    "colegio": { "connect": [67890] },
    "cargo": "Profesor",
    "is_current": true,
    "activo": true
  }
}
```

**⚠️ NOTA:** El campo `region` **NO está presente** en el payload.

---

## 🎯 Causa Raíz Probable

Basado en el análisis anterior y la estructura de Strapi, el problema está en el **backend de Strapi**, específicamente en el **lifecycle hook** `syncColegioLocation` que se ejecuta cuando se crea/actualiza una `persona-trayectoria`.

### Ubicación del Problema

**Archivo en Strapi:**
```
src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js
```

**Código problemático (probable):**

```javascript
async beforeCreate(event) {
  const { data } = event.params;
  
  if (data.colegio) {
    // ⚠️ PROBLEMA: Aquí se está intentando acceder a campos del colegio
    // que pueden incluir 'region', y Strapi lo está validando incorrectamente
    const colegio = await strapi.entityService.findOne(
      'api::colegio.colegio',
      data.colegio,
      {
        fields: ['region', 'comuna', 'dependencia'] // ⚠️ ESTO CAUSA EL ERROR
      }
    );
    
    // ... resto del código
  }
}
```

---

## ✅ Solución Implementada en Strapi

### Protección Adicional en Lifecycle Hook

El equipo de Strapi implementó una protección adicional que elimina automáticamente el campo `region` si llega inadvertidamente:

**Archivo:** `src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js`

**Código implementado:**

```javascript
// PROTECCIÓN: Eliminar campos que no existen en el schema
if ('region' in data) {
  strapi.log.warn('[persona-trayectoria.lifecycle] Campo "region" detectado, eliminándolo');
  delete data.region;
}
```

**Aplicado en:**
- ✅ `beforeCreate`: Elimina `region` si está presente en el payload
- ✅ `beforeUpdate`: Elimina `region` si está presente en el payload
- ✅ Logs de advertencia: Registra cuando se detecta y elimina `region`

**Documentación:** `docs/SOLUCION_DEFINITIVA_ERROR_REGION.md`

### ⚠️ Análisis de la Solución

Esta solución es una **protección adicional** que:
- ✅ Elimina `region` antes de cualquier validación de Strapi
- ✅ Registra un warning en los logs para debugging
- ✅ Permite que el flujo continúe normalmente sin errores

**Sin embargo, esto NO resuelve la causa raíz si:**
- El problema está en el array de `fields` cuando se consulta el colegio
- El campo `region` se está agregando en otro lugar del proceso
- Strapi está validando `region` en una validación previa al lifecycle hook

---

## 🔍 Verificación Post-Implementación

### Pasos para Verificar

1. **Rebuild de Strapi:**
   ```bash
   npm run build
   # o
   yarn build
   ```

2. **Reiniciar Strapi:**
   ```bash
   npm run develop
   # o
   npm run start
   ```

3. **Intentar crear/actualizar una trayectoria** desde el frontend

4. **Revisar los logs de Strapi:**
   - Si aparece el warning: `[persona-trayectoria.lifecycle] Campo "region" detectado, eliminándolo`
     - ✅ La protección está funcionando
     - ⚠️ **PERO** necesitamos investigar de dónde viene `region`
   - Si NO aparece el warning pero SÍ aparece el error:
     - ❌ El problema está en otro lugar (probablemente en el array de `fields` al consultar el colegio)

### Escenarios Posibles

#### Escenario 1: Warning aparece en logs
```
[persona-trayectoria.lifecycle] Campo "region" detectado, eliminándolo
```
**Significado:**
- ✅ La protección está funcionando
- ⚠️ `region` está llegando desde algún lugar
- 🔍 **Acción:** Investigar la fuente del campo `region`

**Posibles fuentes:**
- El frontend está enviando `region` (aunque los logs dicen que no)
- El lifecycle hook está agregando `region` al consultar el colegio
- Algún middleware está modificando el payload

#### Escenario 2: Error persiste sin warning
```
[Strapi Client] ❌ Error response: {"error":{"message":"Invalid key region"}}
```
**Sin warning en logs de Strapi**

**Significado:**
- ❌ La protección NO está funcionando o el error ocurre antes del lifecycle hook
- 🔍 **Causa probable:** El problema está en el array de `fields` al consultar el colegio

**Solución adicional requerida:**
```javascript
// En el método que consulta el colegio (probablemente syncColegioLocation)
const colegio = await strapi.entityService.findOne(
  'api::colegio.colegio',
  colegioId,
  {
    // ❌ REMOVER 'region' de aquí si está presente
    fields: ['comuna', 'dependencia', 'zona'] // Sin 'region'
  }
);
```

---

## ✅ Solución Adicional Requerida (si el error persiste)

### Opción 1: Remover `region` del array de `fields`

**Archivo:** `src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js`

**Cambio requerido:**

```javascript
// ❌ ANTES (causa el error)
const colegio = await strapi.entityService.findOne(
  'api::colegio.colegio',
  colegioId,
  {
    fields: ['region', 'comuna', 'dependencia', 'zona']
  }
);

// ✅ DESPUÉS (solución)
const colegio = await strapi.entityService.findOne(
  'api::colegio.colegio',
  colegioId,
  {
    fields: ['comuna', 'dependencia', 'zona'] // Remover 'region'
  }
);
```

### Opción 2: Usar `populate` en lugar de `fields`

```javascript
// ✅ ALTERNATIVA: Usar populate para obtener relaciones
const colegio = await strapi.entityService.findOne(
  'api::colegio.colegio',
  colegioId,
  {
    populate: ['comuna'] // Obtener comuna que tiene region
  }
);

// Luego acceder a region desde comuna.region
if (colegio.comuna && colegio.comuna.region) {
  // Usar colegio.comuna.region
}
```

### Opción 3: Validar que `region` no esté en el payload

```javascript
async beforeCreate(event) {
  const { data } = event.params;
  
  // ⚠️ Asegurar que region no esté en el payload
  if ('region' in data) {
    delete data.region;
  }
  
  // ... resto del código
}
```

---

## 🔧 Verificación en Strapi

### Pasos para Identificar el Problema

1. **Abrir el archivo de lifecycles:**
   ```
   src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js
   ```

2. **Buscar referencias a `region`:**
   ```bash
   grep -n "region" src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js
   ```

3. **Revisar el método `beforeCreate` o `beforeUpdate`:**
   - Verificar si hay consultas a `colegio` que incluyan `region` en `fields`
   - Verificar si hay validaciones que incluyan `region`

4. **Revisar el método `syncColegioLocation`:**
   - Este método probablemente sincroniza datos del colegio a la trayectoria
   - Verificar que no esté intentando copiar `region` directamente

---

## 📝 Logs de Debugging

El frontend ya tiene logs detallados que confirman que `region` NO se envía:

```
[API /persona-trayectorias POST] ✅ Verificación - region en payload: false
[API /persona-trayectorias POST] ✅ Verificación final - tiene region: false
```

**Esto confirma que el problema está en Strapi, no en el frontend.**

---

## 🚀 Acciones Requeridas

### Inmediatas (Post-Rebuild)

1. ✅ **Rebuild y reiniciar Strapi**
2. ✅ **Probar crear/actualizar una trayectoria** desde el frontend
3. ✅ **Revisar logs de Strapi** para ver si aparece el warning

### Si el Warning Aparece en Logs

1. 🔍 **Investigar la fuente de `region`:**
   - Revisar el payload completo que llega al lifecycle hook
   - Verificar si algún middleware está modificando el payload
   - Revisar si el frontend está enviando `region` de alguna forma

### Si el Error Persiste Sin Warning

1. 🔍 **Revisar el método que consulta el colegio:**
   - Buscar `strapi.entityService.findOne` con `fields: ['region', ...]`
   - Remover `region` del array de `fields`
   - Usar `populate` en lugar de `fields` si se necesita acceder a `region` desde `comuna`

2. 🔍 **Revisar validaciones previas:**
   - Verificar si hay validaciones de schema que incluyan `region`
   - Revisar si hay middleware que valide `region` antes del lifecycle hook

### Confirmación Final

1. ✅ **Probar crear una trayectoria** después de todos los cambios
2. ✅ **Confirmar que el error desaparece**
3. ✅ **Verificar que no aparezcan warnings en los logs** (o si aparecen, que sean esperados)

---

## 📚 Referencias

- **Documentación anterior:** `SOLUCION-ERROR-REGION.md`
- **Prompt para Strapi:** `PROMPT-CURSOR-STRAPI.md`
- **Guía de revisión:** `GUIA-REVISAR-STRAPI-REGION.md`

---

## ⚠️ Nota Importante

Este error **NO puede ser resuelto desde el frontend** porque:
- El frontend ya está filtrando correctamente todos los campos prohibidos
- El payload enviado NO contiene `region`
- El error viene de la validación interna de Strapi en el lifecycle hook

**La solución debe aplicarse directamente en el código de Strapi.**

---

## 📊 Estado Actual

- ✅ **Protección implementada** en lifecycle hook (`beforeCreate` y `beforeUpdate`)
- ⏳ **Pendiente:** Rebuild de Strapi y verificación
- ⏳ **Pendiente:** Confirmar si el error desaparece o si aparece el warning en logs

---

**Última actualización:** 9 de Enero 2026  
**Estado:** ✅ Solución implementada - Pendiente verificación post-rebuild
