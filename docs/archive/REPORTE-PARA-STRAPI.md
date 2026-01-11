# 🐛 Reporte de Problema para Strapi - Creación de Trayectorias/Profesores

**Fecha:** 8 de enero de 2026  
**Versión de Strapi:** v4 (o v5, según corresponda)  
**Contexto:** Sistema CRM para gestión de colegios y colaboradores

---

## 📋 RESUMEN DEL PROBLEMA

No podemos crear registros en el content type **"Profesores"** (que conecta `persona` y `colegio`) desde nuestra aplicación Next.js. Los intentos de creación fallan silenciosamente o devuelven errores de validación.

---

## 🏗️ ESTRUCTURA DE DATOS EN STRAPI

### Content Type: `colegio` / `colegios`

```json
{
  "rbd": "Number *",
  "colegio_nombre": "Text *",
  "dependencia": "Enumeration",
  "region": "Text",
  "zona": "Text",
  "comuna": "Relation (manyToOne) → Ubicación. Comuna",
  "persona_trayectorias": "Relation (oneToMany) → Colegio · Profesores",
  "telefonos": "Repeatable Component",
  "emails": "Repeatable Component",
  "direcciones": "Repeatable Component"
}
```

### Content Type: `persona` / `personas`

```json
{
  "rut": "Text",
  "nombres": "Text",
  "primer_apellido": "Text",
  "segundo_apellido": "Text",
  "nombre_completo": "Text",
  "nivel_confianza": "Enumeration",
  "origen": "Enumeration",
  "activo": "Boolean",
  "emails": "Repeatable Component",
  "telefonos": "Repeatable Component",
  "trayectorias": "Relation (oneToMany) → ???" // ⚠️ ¿Cuál es el nombre técnico?
}
```

### Content Type: `Profesores` (nombre visual en Strapi Admin)

**⚠️ IMPORTANTE:** En Strapi Admin aparece como **"Colegio · Profesores"**, pero necesitamos saber:
- ¿Cuál es el **nombre técnico** del content type?
- ¿El endpoint de API es `/api/profesores` o tiene otro nombre?

**Campos esperados:**
```json
{
  "persona": "Relation (manyToOne) → api::persona.persona",
  "colegio": "Relation (manyToOne) → api::colegio.colegio",
  "cargo": "String",
  "anio": "Integer",
  "curso": "Relation → api::curso.curso",
  "asignatura": "Relation → api::asignatura.asignatura",
  "is_current": "Boolean",
  "activo": "Boolean"
}
```

---

## 🔍 QUÉ ESTAMOS INTENTANDO HACER

### Objetivo
Crear un registro en "Profesores" que conecte una `persona` existente con un `colegio` existente, incluyendo información del cargo y otros datos.

### Flujo Actual

1. **Crear Persona:**
   ```http
   POST /api/personas
   {
     "data": {
       "nombres": "Juan",
       "primer_apellido": "Pérez",
       "emails": [{ "email": "juan@example.com", "principal": true }],
       "activo": true
     }
   }
   ```
   ✅ **Esto funciona correctamente**

2. **Obtener ID numérico de la persona:**
   ```http
   GET /api/personas/{personaId}?fields[0]=id
   ```
   ✅ **Esto funciona correctamente**

3. **Crear Trayectoria/Profesor:**
   ```http
   POST /api/profesores  // ⚠️ ¿Es este el endpoint correcto?
   {
     "data": {
       "persona": { "connect": [11482] },  // ID numérico
       "colegio": { "connect": [123] },     // ID numérico
       "cargo": "Profesor de Matemáticas",
       "is_current": true,
       "activo": true
     }
   }
   ```
   ❌ **Esto NO funciona**

---

## ❌ ERRORES QUE RECIBIMOS

### Error 1: Endpoint no encontrado
```json
{
  "error": {
    "status": 404,
    "name": "NotFoundError",
    "message": "Not Found"
  }
}
```
**Posible causa:** El endpoint `/api/profesores` no existe o tiene otro nombre.

### Error 2: Validación de relaciones
```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "1 relation(s) of type api::persona.persona associated with this entity do not exist",
    "details": {
      "errors": [{
        "path": [],
        "message": "1 relation(s) of type api::persona.persona associated with this entity do not exist",
        "name": "ValidationError",
        "value": {
          "persona": { "connect": [11482] },
          "colegio": { "connect": [123] },
          "cargo": "Profesor",
          "is_current": true,
          "activo": true
        }
      }]
    }
  }
}
```
**Posible causa:** 
- El ID de persona no existe o es incorrecto
- El formato de `connect` no es el correcto
- El content type no está configurado correctamente

### Error 3: ID inválido
```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Invalid ID"
  }
}
```
**Posible causa:** El ID enviado no es válido para Strapi.

---

## 🔧 LO QUE HEMOS INTENTADO

### 1. Diferentes nombres de endpoint
- ✅ `/api/persona-trayectorias` → 404 Not Found
- ✅ `/api/profesores` → 404 Not Found (o error de validación)
- ✅ `/api/colegio-profesores` → 404 Not Found

### 2. Diferentes formatos de `connect`
```javascript
// Opción 1: Array con ID numérico
{ "persona": { "connect": [11482] } }

// Opción 2: Array con objeto
{ "persona": { "connect": [{ "id": 11482 }] } }

// Opción 3: ID directo
{ "persona": 11482 }

// Opción 4: Objeto con id
{ "persona": { "id": 11482 } }
```

### 3. Verificar que los IDs existen
```javascript
// Verificar persona
GET /api/personas/11482
// ✅ Responde correctamente con los datos

// Verificar colegio
GET /api/colegios/123
// ✅ Responde correctamente con los datos
```

### 4. Usar documentId en lugar de id
```javascript
// Intentamos con documentId
{ "persona": { "connect": ["xvule1pp5in57iyezi3bwnka"] } }
// ❌ Mismo error
```

---

## 📊 INFORMACIÓN TÉCNICA

### Versión de Strapi
- ¿Qué versión de Strapi están usando? (v4 o v5)
- ¿Está configurado con SQLite, PostgreSQL, MySQL, etc.?

### Configuración de Relaciones

**En el content type "Profesores":**
- ¿La relación `persona` está configurada como `manyToOne`?
- ¿La relación `colegio` está configurada como `manyToOne`?
- ¿Ambas relaciones están marcadas como `required: true`?

**En el content type "persona":**
- ¿Existe una relación `trayectorias` o `profesores` configurada como `oneToMany`?
- ¿Cuál es el nombre técnico de esta relación?

**En el content type "colegio":**
- ¿Existe una relación `persona_trayectorias` configurada como `oneToMany`?
- ¿Cuál es el nombre técnico de esta relación?

### Permisos
- ¿El content type "Profesores" tiene permisos de creación habilitados para el rol que estamos usando?
- ¿Las relaciones tienen permisos de lectura habilitados?

---

## 🎯 PREGUNTAS ESPECÍFICAS PARA STRAPI

1. **¿Cuál es el nombre técnico del content type que conecta `persona` y `colegio`?**
   - ¿Es `profesores`?
   - ¿Es `persona-trayectorias`?
   - ¿Es otro nombre?

2. **¿Cuál es el endpoint correcto para crear registros en este content type?**
   - ¿`POST /api/profesores`?
   - ¿`POST /api/persona-trayectorias`?
   - ¿Otro endpoint?

3. **¿Cuál es el formato correcto para crear relaciones con `connect`?**
   ```javascript
   // ¿Es esto correcto?
   { "persona": { "connect": [11482] } }
   
   // ¿O debería ser?
   { "persona": { "connect": [{ "id": 11482 }] } }
   
   // ¿O algo diferente?
   ```

4. **¿Necesitamos usar `id` numérico o `documentId` string para las relaciones?**
   - En Strapi v4, ¿cuál es el formato correcto?
   - En Strapi v5, ¿cuál es el formato correcto?

5. **¿Hay alguna configuración especial necesaria para que las relaciones funcionen?**
   - ¿Necesitamos configurar algo en el Content-Type Builder?
   - ¿Hay algún plugin o configuración adicional requerida?

6. **¿El error "1 relation(s) of type api::persona.persona associated with this entity do not exist" significa que:**
   - El ID no existe?
   - El formato es incorrecto?
   - Hay un problema de permisos?
   - Hay un problema de configuración?

---

## 📝 EJEMPLO DE CÓDIGO QUE ESTAMOS USANDO

### Cliente Strapi (Next.js API Route)

```typescript
import strapiClient from '@/lib/strapi/client'

// Intentamos crear la trayectoria
const trayectoriaData = {
  data: {
    persona: { connect: [11482] },  // ID numérico de persona
    colegio: { connect: [123] },    // ID numérico de colegio
    cargo: "Profesor de Matemáticas",
    is_current: true,
    activo: true,
  },
}

const response = await strapiClient.post('/api/profesores', trayectoriaData)
```

### Verificación de IDs

```typescript
// Verificamos que la persona existe
const personaResponse = await strapiClient.get('/api/personas/11482')
console.log('Persona:', personaResponse.data)
// ✅ Responde: { id: 11482, documentId: "abc123", attributes: {...} }

// Verificamos que el colegio existe
const colegioResponse = await strapiClient.get('/api/colegios/123')
console.log('Colegio:', colegioResponse.data)
// ✅ Responde: { id: 123, documentId: "xyz789", attributes: {...} }
```

---

## 🔍 LOGS DE DEBUGGING

### Logs del Cliente (Next.js)
```
[API /crm/contacts POST] Persona creada: {
  documentId: "xvule1pp5in57iyezi3bwnka",
  id: 11482,
  data: {...}
}

[API /crm/contacts POST] Creando trayectoria: {
  personaId: 11482,
  colegioId: 123,
  cargo: "Profesor"
}

[API /crm/contacts POST] ❌ Error al crear trayectoria: {
  message: "1 relation(s) of type api::persona.persona associated with this entity do not exist",
  status: 400,
  details: {...}
}
```

---

## ✅ LO QUE SÍ FUNCIONA

1. ✅ Crear personas (`POST /api/personas`)
2. ✅ Crear colegios (`POST /api/colegios`)
3. ✅ Obtener personas (`GET /api/personas`)
4. ✅ Obtener colegios (`GET /api/colegios`)
5. ✅ Obtener relaciones populadas (`GET /api/personas/{id}?populate[trayectorias]=true`)
6. ✅ Actualizar personas (`PUT /api/personas/{id}`)
7. ✅ Actualizar colegios (`PUT /api/colegios/{id}`)

---

## ❌ LO QUE NO FUNCIONA

1. ❌ Crear registros en "Profesores" (`POST /api/profesores` o `/api/persona-trayectorias`)
2. ❌ Actualizar registros en "Profesores" (`PUT /api/profesores/{id}`)
3. ❌ Eliminar registros en "Profesores" (`DELETE /api/profesores/{id}`)

---

## 🎯 RESULTADO ESPERADO

Queremos poder crear un registro en "Profesores" que:
1. Conecte una `persona` existente (ID: 11482)
2. Conecte un `colegio` existente (ID: 123)
3. Incluya información adicional (cargo, año, curso, asignatura)
4. Se pueda consultar desde ambas direcciones:
   - Desde `persona.trayectorias`
   - Desde `colegio.persona_trayectorias`

---

## 📞 INFORMACIÓN DE CONTACTO

**Sistema:** CRM Intranet Almonte  
**Ambiente:** Producción/Staging  
**URL de Strapi:** `https://strapi.moraleja.cl`  
**Versión de Next.js:** 16.0.10

---

## 📎 ARCHIVOS ADICIONALES

Si necesitan más información, podemos proporcionar:
- Logs completos del servidor
- Configuración de Strapi (si es posible exportarla)
- Ejemplos de respuestas de Strapi
- Código completo de las API routes

---

**Gracias por su ayuda. Esperamos poder resolver este problema pronto.**

---

**Última actualización:** 8 de enero de 2026
