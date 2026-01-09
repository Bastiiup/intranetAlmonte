# 🚨 Investigación Urgente - Error "Invalid key region" Persiste

**Fecha:** 9 de Enero 2026  
**Estado:** ⚠️ **ERROR PERSISTE DESPUÉS DE SOLUCIÓN IMPLEMENTADA**

---

## 📋 Situación Actual

El error `Invalid key region` **sigue apareciendo** después de implementar la protección en el lifecycle hook. Esto indica que:

1. ❌ La protección en `beforeCreate`/`beforeUpdate` **NO está funcionando** (el error ocurre antes)
2. ❌ O el problema está en **otro lugar** del código de Strapi
3. ❌ O el rebuild de Strapi **no se ha aplicado correctamente**

---

## 🔍 Análisis del Error

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

### Verificación del Frontend

El frontend **NO está enviando `region`**:

```json
// Payload enviado desde frontend:
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

**✅ Confirmado:** No hay campo `region` en el payload.

---

## 🎯 Causas Posibles

### 1. Error Ocurre ANTES del Lifecycle Hook

Si el error ocurre **antes** de que se ejecute `beforeCreate`, la protección no funcionará.

**Lugares donde puede ocurrir:**
- ✅ Validación de schema de Strapi (antes del lifecycle hook)
- ✅ Middleware de validación
- ✅ Transformación de datos en el controller

**Solución requerida:**
```javascript
// En el controller o middleware ANTES del lifecycle hook
// src/api/persona-trayectoria/controllers/persona-trayectoria.js

async create(ctx) {
  const { data } = ctx.request.body;
  
  // ⚠️ PROTECCIÓN: Eliminar region ANTES de cualquier validación
  if (data && 'region' in data) {
    strapi.log.warn('[persona-trayectoria.controller] Campo "region" detectado en controller, eliminándolo');
    delete data.region;
  }
  
  // ... resto del código
}
```

### 2. Problema en el Array de `fields` al Consultar Colegio

Si el lifecycle hook consulta el colegio con `fields: ['region', ...]`, Strapi puede estar validando esto.

**Ubicación probable:**
```javascript
// src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js

async beforeCreate(event) {
  const { data } = event.params;
  
  if (data.colegio) {
    // ⚠️ PROBLEMA: Si aquí se consulta el colegio con 'region' en fields
    const colegio = await strapi.entityService.findOne(
      'api::colegio.colegio',
      colegioId,
      {
        fields: ['region', 'comuna', 'dependencia'] // ⚠️ ESTO CAUSA EL ERROR
      }
    );
  }
}
```

**Solución requerida:**
```javascript
// ✅ SOLUCIÓN: Remover 'region' del array de fields
const colegio = await strapi.entityService.findOne(
  'api::colegio.colegio',
  colegioId,
  {
    fields: ['comuna', 'dependencia', 'zona'] // Sin 'region'
    // O usar populate:
    // populate: ['comuna'] // comuna tiene region
  }
);
```

### 3. Validación de Schema de Strapi

Strapi puede estar validando el schema **antes** del lifecycle hook.

**Verificar:**
- Si `region` está definido en el schema de `persona-trayectoria` (no debería estar)
- Si hay validaciones personalizadas que incluyan `region`

**Solución:**
- Asegurar que `region` **NO esté** en el schema de `persona-trayectoria`
- Si está, removerlo del schema

---

## 🔧 Pasos de Investigación en Strapi

### Paso 1: Verificar si el Lifecycle Hook se Ejecuta

**Agregar logs en el lifecycle hook:**

```javascript
// src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js

async beforeCreate(event) {
  strapi.log.info('[persona-trayectoria.lifecycle] beforeCreate ejecutándose');
  strapi.log.info('[persona-trayectoria.lifecycle] data recibida:', JSON.stringify(event.params.data));
  
  const { data } = event.params;
  
  // Verificar si region está presente
  if ('region' in data) {
    strapi.log.warn('[persona-trayectoria.lifecycle] ⚠️ Campo "region" detectado, eliminándolo');
    delete data.region;
  } else {
    strapi.log.info('[persona-trayectoria.lifecycle] ✅ No hay campo "region" en data');
  }
  
  // ... resto del código
}
```

**Si NO aparece el log:**
- El error ocurre **antes** del lifecycle hook
- Necesitamos agregar protección en el **controller**

**Si SÍ aparece el log pero el error persiste:**
- El problema está en otro lugar (probablemente en la consulta al colegio)

### Paso 2: Buscar Todas las Referencias a `region`

**En el proyecto de Strapi, ejecutar:**

```bash
# Buscar todas las referencias a 'region' en el código
grep -r "region" src/api/persona-trayectoria/

# Buscar específicamente en fields
grep -r "fields.*region" src/api/persona-trayectoria/

# Buscar en lifecycles
grep -r "region" src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js
```

### Paso 3: Revisar el Controller

**Archivo:** `src/api/persona-trayectoria/controllers/persona-trayectoria.js`

**Agregar protección en el método `create`:**

```javascript
async create(ctx) {
  const { data } = ctx.request.body;
  
  // ⚠️ PROTECCIÓN TEMPRANA: Eliminar region ANTES de cualquier procesamiento
  if (data && 'region' in data) {
    strapi.log.warn('[persona-trayectoria.controller] Campo "region" detectado en controller, eliminándolo');
    delete data.region;
  }
  
  // Actualizar el body con data limpia
  ctx.request.body.data = data;
  
  // Continuar con el flujo normal
  return await strapi.entityService.create('api::persona-trayectoria.persona-trayectoria', {
    data: data,
  });
}
```

### Paso 4: Revisar el Schema

**Verificar que `region` NO esté en el schema:**

```bash
# Buscar en el schema
grep -r "region" src/api/persona-trayectoria/content-types/persona-trayectoria/schema.json
```

**Si `region` está en el schema:**
- Removerlo del schema
- Rebuild de Strapi requerido

---

## ✅ Solución Completa Recomendada

### 1. Protección en Controller (ANTES del lifecycle hook)

```javascript
// src/api/persona-trayectoria/controllers/persona-trayectoria.js

async create(ctx) {
  let { data } = ctx.request.body;
  
  // PROTECCIÓN: Eliminar region si está presente
  if (data && 'region' in data) {
    strapi.log.warn('[persona-trayectoria.controller] Campo "region" detectado, eliminándolo');
    delete data.region;
  }
  
  // Actualizar el body
  ctx.request.body.data = data;
  
  // Continuar con el flujo normal
  return await super.create(ctx);
}
```

### 2. Protección en Lifecycle Hook (ya implementada)

```javascript
// src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js

async beforeCreate(event) {
  const { data } = event.params;
  
  if ('region' in data) {
    strapi.log.warn('[persona-trayectoria.lifecycle] Campo "region" detectado, eliminándolo');
    delete data.region;
  }
}
```

### 3. Verificar Consultas al Colegio

```javascript
// Asegurar que NO se use 'region' en fields al consultar colegio
const colegio = await strapi.entityService.findOne(
  'api::colegio.colegio',
  colegioId,
  {
    fields: ['comuna', 'dependencia', 'zona'] // Sin 'region'
  }
);
```

### 4. Verificar Schema

- Asegurar que `region` **NO esté** en el schema de `persona-trayectoria`

---

## 🚀 Acción Inmediata Requerida

1. ✅ **Agregar logs en el lifecycle hook** para verificar si se ejecuta
2. ✅ **Agregar protección en el controller** (antes del lifecycle hook)
3. ✅ **Buscar todas las referencias a `region`** en el código de Strapi
4. ✅ **Verificar que NO se use `region` en `fields`** al consultar colegio
5. ✅ **Verificar que `region` NO esté en el schema**
6. ✅ **Rebuild y reiniciar Strapi**
7. ✅ **Probar crear una trayectoria** y revisar logs

---

## 📊 Verificación Post-Corrección

### Logs Esperados (si funciona):

```
[persona-trayectoria.controller] Campo "region" detectado, eliminándolo
[persona-trayectoria.lifecycle] beforeCreate ejecutándose
[persona-trayectoria.lifecycle] ✅ No hay campo "region" en data
```

### Si el Error Persiste:

1. Revisar logs para ver en qué punto falla
2. Verificar si hay middleware adicional que valide `region`
3. Revisar si hay plugins de Strapi que modifiquen el payload

---

**Última actualización:** 9 de Enero 2026  
**Prioridad:** 🔴 **ALTA** - Error bloquea funcionalidad crítica
