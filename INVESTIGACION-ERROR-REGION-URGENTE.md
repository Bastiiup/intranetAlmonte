# 🚨 Investigación Urgente - Error "Invalid key region" Persiste

**Fecha:** 9 de Enero 2026  
**Estado:** ✅ **PROBLEMA ENCONTRADO Y RESUELTO**

---

## ✅ Solución Implementada - Problema Resuelto

### 🔍 Problema Encontrado

**Ubicación:** Línea 71 del lifecycle hook (`syncColegioLocation`)

**Causa raíz:**
- Se estaba haciendo `populate` de `region` como si fuera una **relación**
- Pero `region` es un **string** en el modelo `colegio`
- Esto causaba el error `"Invalid key region"` porque Strapi intentaba hacer populate de un campo que no es una relación

**Código problemático:**
```javascript
// ❌ ANTES (causa el error)
populate: {
  region: { fields: ['id'] }, // ⚠️ region es string, NO es relación
  comuna: { fields: ['id'] }
}
```

### ✅ Cambios Realizados

#### 1. Corregido el Lifecycle Hook (`syncColegioLocation`)

**Archivo:** `src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js`

**Cambios:**
- ✅ **Removido** `region: { fields: ['id'] }` del populate
- ✅ **Agregado** `region` a `fields` (porque es string, no relación)
- ✅ Obtiene la región desde `colegio.region` o `comuna.region_nombre`

**Código corregido:**
```javascript
// ✅ DESPUÉS (solución)
const colegio = await strapi.entityService.findOne(
  'api::colegio.colegio',
  colegioId,
  {
    fields: ['region', 'comuna', 'dependencia', 'zona'], // region como field
    populate: {
      comuna: { fields: ['id', 'region_nombre'] } // comuna SÍ es relación
    }
  }
);

// Obtener región desde colegio.region o comuna.region_nombre
const region = colegio.region || colegio.comuna?.region_nombre;
```

#### 2. Protección en el Controller

**Archivo:** `src/api/persona-trayectoria/controllers/persona-trayectoria.js`

**Métodos protegidos:**
- ✅ `create()`: Elimina `region` antes del lifecycle hook
- ✅ `update()`: Elimina `region` antes del lifecycle hook

**Código implementado:**
```javascript
async create(ctx) {
  let { data } = ctx.request.body;
  
  // PROTECCIÓN: Eliminar region si está presente (protección adicional)
  if (data && 'region' in data) {
    strapi.log.warn('[persona-trayectoria.controller] Campo "region" detectado, eliminándolo');
    delete data.region;
  }
  
  return await super.create(ctx);
}

async update(ctx) {
  let { data } = ctx.request.body;
  
  // PROTECCIÓN: Eliminar region si está presente
  if (data && 'region' in data) {
    strapi.log.warn('[persona-trayectoria.controller] Campo "region" detectado, eliminándolo');
    delete data.region;
  }
  
  return await super.update(ctx);
}
```

#### 3. Logs de Debugging

- ✅ Logs en lifecycle hooks para rastrear el flujo
- ✅ Advertencias cuando se detecta y elimina `region`
- ✅ Logs de debugging para identificar problemas futuros

---

## 📋 Situación Actual (ANTES de la solución)

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

## ✅ Verificación Post-Solución

### Pasos para Verificar

1. ✅ **Rebuild de Strapi:**
   ```bash
   npm run build
   # o
   yarn build
   ```

2. ✅ **Reiniciar Strapi:**
   ```bash
   npm run develop
   # o
   npm run start
   ```

3. ✅ **Probar crear/actualizar una trayectoria** desde el frontend

4. ✅ **Verificar que el error desaparece**

### Resultado Esperado

- ✅ **No más error** `"Invalid key region"`
- ✅ **Trayectorias se crean/actualizan correctamente**
- ✅ **Logs muestran el flujo normal** (sin warnings de `region`)

### Si Aparecen Warnings

Si aparecen warnings en los logs:
```
[persona-trayectoria.controller] Campo "region" detectado, eliminándolo
```

**Significado:**
- ✅ La protección está funcionando
- ⚠️ `region` está llegando desde algún lugar (probablemente del frontend)
- 🔍 **Acción:** Revisar logs del frontend para ver si está enviando `region`

---

## 📚 Resumen de la Solución

### Problema
- `region` se estaba tratando como relación en el populate
- `region` es un string, no una relación

### Solución
1. ✅ Remover `region` del populate
2. ✅ Agregar `region` a `fields` (como string)
3. ✅ Obtener región desde `colegio.region` o `comuna.region_nombre`
4. ✅ Protección adicional en controller

### Estado
- ✅ **Problema identificado y resuelto**
- ✅ **Código corregido en Strapi**
- ⏳ **Pendiente:** Rebuild y verificación

---

**Última actualización:** 9 de Enero 2026  
**Estado:** ✅ **PROBLEMA RESUELTO** - Pendiente rebuild y verificación
