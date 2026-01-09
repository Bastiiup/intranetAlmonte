# 📋 Explicación Completa: Qué Estamos Intentando Hacer con Strapi

**Fecha:** Enero 2026  
**Propósito:** Documentar todas las queries, filtros y operaciones que estamos haciendo para verificar que Strapi las entienda correctamente.

---

## 🏗️ ESTRUCTURA DE DATOS EN STRAPI

### Content Type: `persona-trayectoria` (singular) / `persona-trayectorias` (plural)

```json
{
  "persona": "relation → api::persona.persona (manyToOne)",
  "colegio": "relation → api::colegio.colegio (manyToOne)",
  
  "cargo": "string",  // ⚠️ String libre, NO enum
  "anio": "integer",  // ⚠️ Año académico, NO hay "nivel" ni "grado"
  
  "curso": "relation → api::curso.curso",  // ⚠️ RELACIÓN, no string
  "asignatura": "relation → api::asignatura.asignatura",  // ⚠️ RELACIÓN, no string
  "curso_asignatura": "relation → api::curso-asignatura.curso-asignatura",
  
  "fecha_inicio": "date",
  "fecha_fin": "date",
  "is_current": "boolean",
  "activo": "boolean",
  "notas": "text",
  
  // Campos adicionales de tracking
  "org_display_name": "string",
  "role_key": "string",
  "department": "string",
  "colegio_comuna": "relation → comuna",
  "colegio_region": "string",
  
  // Campos para autenticación MIRA
  "correo": "email (unique)",
  "password": "password (private)",
  "fecha_registro": "datetime",
  "ultimo_acceso": "datetime"
}
```

### Content Type: `colegio` / `colegios`

```json
{
  "colegio_nombre": "string",
  "rbd": "integer",
  "dependencia": "string",
  "estado": "string",
  "region": "string",
  "zona": "string",
  "comuna": "relation → api::comuna.comuna (manyToOne)",
  "persona_trayectorias": "relation oneToMany → persona-trayectoria",
  "cartera_asignaciones": "relation → cartera-asignacion",
  "telefonos": "component repeatable",
  "emails": "component repeatable",
  "direcciones": "component repeatable"
}
```

### Content Type: `persona` / `personas`

```json
{
  "nombre_completo": "string",
  "nombres": "string",
  "primer_apellido": "string",
  "segundo_apellido": "string",
  "rut": "string",
  "activo": "boolean",
  "nivel_confianza": "enum",
  "origen": "enum",
  "trayectorias": "relation oneToMany → persona-trayectoria",
  "emails": "component repeatable",
  "telefonos": "component repeatable",
  "tags": "relation",
  "imagen": "media"
}
```

---

## 🔍 QUERY 1: Obtener Contactos de un Colegio

### Objetivo
Encontrar todas las **personas** que tienen una **trayectoria** asociada a un **colegio** específico.

### Endpoint
```
GET /api/personas?filters[trayectorias][colegio][id][$eq]={colegioId}
```

### Query Completa que Estamos Enviando

```typescript
// URL construida:
/api/personas?
  pagination[page]=1&
  pagination[pageSize]=50&
  sort[0]=updatedAt:desc&
  
  // Populate de trayectorias con TODAS sus relaciones
  populate[trayectorias][populate][colegio][populate][comuna]=true&
  populate[trayectorias][populate][curso]=true&
  populate[trayectorias][populate][asignatura]=true&
  populate[trayectorias][populate][curso_asignatura]=true&
  
  // Populate de persona
  populate[emails]=true&
  populate[telefonos]=true&
  populate[imagen]=true&
  populate[tags]=true&
  
  // Filtros
  filters[activo][$eq]=true&
  filters[trayectorias][colegio][id][$eq]={colegioIdNum}
```

### ⚠️ PROBLEMA POTENCIAL

**Filtro anidado:** `filters[trayectorias][colegio][id][$eq]`

**Lo que esperamos:**
- Strapi debería encontrar todas las personas que tienen al menos una trayectoria donde `trayectoria.colegio.id = {colegioIdNum}`

**Posibles problemas:**
1. Si el `colegioId` es un `documentId` (string), el filtro por `id` numérico no funcionará
2. Strapi puede requerir que el filtro se haga de otra manera para relaciones anidadas

### Solución Actual

```typescript
// PASO 1: Convertir documentId a id numérico
if (isDocumentId) {
  const colegioResponse = await strapiClient.get(`/api/colegios/${colegioId}?fields[0]=id`)
  colegioIdNum = colegioResponse.data.id
}

// PASO 2: Filtrar por id numérico
paramsObj.append('filters[trayectorias][colegio][id][$eq]', String(colegioIdNum))

// PASO 3: Filtrar manualmente en el código (por si el filtro de Strapi no funciona)
const trayectoriasDelColegio = trayectorias.filter((t) => {
  const tColegioId = colegioData?.id
  const tColegioDocId = colegioData?.documentId
  return (tColegioId && String(tColegioId) === String(colegioIdNum)) ||
         (tColegioDocId && String(tColegioDocId) === String(colegioId))
})
```

---

## ➕ QUERY 2: Crear Nueva Trayectoria

### Objetivo
Crear una nueva relación `persona-trayectoria` que conecte una **persona** con un **colegio**.

### Endpoint
```
POST /api/persona-trayectorias
```

### Payload que Estamos Enviando

```json
{
  "data": {
    "persona": { "connect": [11482] },  // ⚠️ ID numérico de la persona
    "colegio": { "connect": [123] },     // ⚠️ ID numérico del colegio
    "cargo": "Profesor",
    "anio": 2024,
    "curso": { "connect": [45] },       // ⚠️ Opcional: ID numérico del curso (relación)
    "asignatura": { "connect": [67] },   // ⚠️ Opcional: ID numérico de la asignatura (relación)
    "is_current": true,
    "activo": true
  }
}
```

### ⚠️ ERROR ACTUAL

```
Error: 1 relation(s) of type api::persona.persona associated with this entity do not exist
```

**Causa:**
- Estamos enviando `persona: { connect: [11482] }` pero el ID `11482` puede no existir o puede ser incorrecto
- El `personaId` puede ser un `documentId` (string) y estamos intentando usarlo como ID numérico

### Solución Implementada

```typescript
// Obtener el ID numérico de la persona si es documentId
let personaIdNum: number | null = null
const isDocumentId = typeof personaId === 'string' && !/^\d+$/.test(personaId)

if (isDocumentId) {
  const personaResponse = await fetch(`/api/crm/contacts/${personaId}?fields=id`)
  const personaResult = await personaResponse.json()
  if (personaResult.success && personaResult.data) {
    const personaData = Array.isArray(personaResult.data) ? personaResult.data[0] : personaResult.data
    if (personaData && typeof personaData === 'object' && 'id' in personaData) {
      personaIdNum = personaData.id as number
    }
  }
} else {
  personaIdNum = parseInt(personaId)
}

// Validar antes de crear
if (!personaIdNum || isNaN(personaIdNum)) {
  throw new Error('No se pudo obtener el ID de la persona')
}

// Crear trayectoria con ID numérico válido
{
  "data": {
    "persona": { "connect": [personaIdNum] },  // ✅ ID numérico válido
    "colegio": { "connect": [colegioIdNum] },   // ✅ ID numérico válido
    ...
  }
}
```

---

## ✏️ QUERY 3: Actualizar Trayectoria Existente

### Objetivo
Actualizar los campos de una trayectoria existente (cargo, colegio, curso, asignatura, etc.)

### Endpoint
```
PUT /api/persona-trayectorias/{trayectoriaId}
```

### Payload que Estamos Enviando

```json
{
  "data": {
    "colegio": { "connect": [123] },
    "cargo": "Profesor Actualizado",
    "anio": 2025,
    "curso": { "connect": [45] },
    "asignatura": { "connect": [67] },
    "is_current": true
  }
}
```

### ⚠️ CONSIDERACIONES

1. **No enviamos `persona`** en el PUT porque la relación ya existe
2. **Usamos `connect`** para actualizar relaciones
3. **Validamos `colegioId`** antes de enviar (no puede ser 0, null, undefined)

---

## 🔄 QUERY 4: Obtener Persona con Trayectorias (para Editar)

### Objetivo
Obtener una persona con todas sus trayectorias y sus relaciones completas (colegio, curso, asignatura, comuna)

### Endpoint
```
GET /api/personas/{personaId}?populate=...
```

### Query Completa

```typescript
/api/personas/{personaId}?
  populate[emails]=true&
  populate[telefonos]=true&
  populate[imagen]=true&
  populate[tags]=true&
  
  // Populate completo de trayectorias
  populate[trayectorias][populate][colegio][populate][comuna]=true&
  populate[trayectorias][populate][colegio][fields][0]=colegio_nombre&
  populate[trayectorias][populate][colegio][fields][1]=rbd&
  populate[trayectorias][populate][colegio][fields][2]=dependencia&
  populate[trayectorias][populate][colegio][fields][3]=region&
  populate[trayectorias][populate][colegio][fields][4]=zona&
  
  // Populate de curso y asignatura (SON RELACIONES)
  populate[trayectorias][populate][curso]=true&
  populate[trayectorias][populate][asignatura]=true&
  populate[trayectorias][populate][curso_asignatura]=true
```

### Estructura de Respuesta Esperada

```json
{
  "data": {
    "id": 11482,
    "documentId": "abc123xyz",
    "attributes": {
      "nombre_completo": "Juan Pérez",
      "nombres": "Juan",
      "trayectorias": {
        "data": [
          {
            "id": 456,
            "documentId": "tray789",
            "attributes": {
              "cargo": "Profesor",
              "anio": 2024,
              "is_current": true,
              "colegio": {
                "data": {
                  "id": 123,
                  "documentId": "colegio456",
                  "attributes": {
                    "colegio_nombre": "Colegio San Juan",
                    "rbd": 1930,
                    "dependencia": "Particular Subvencionado",
                    "region": "Valparaíso",
                    "comuna": {
                      "data": {
                        "id": 78,
                        "attributes": {
                          "nombre": "Quilpué"
                        }
                      }
                    }
                  }
                }
              },
              "curso": {
                "data": {
                  "id": 45,
                  "attributes": {
                    "nombre": "Matemáticas"
                  }
                }
              },
              "asignatura": {
                "data": {
                  "id": 67,
                  "attributes": {
                    "nombre": "Álgebra"
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

---

## 🗑️ QUERY 5: Eliminar Trayectoria

### Objetivo
Eliminar una trayectoria existente.

### Endpoint
```
DELETE /api/persona-trayectorias/{trayectoriaId}
```

### Implementación

```typescript
await strapiClient.delete(`/api/persona-trayectorias/${trayectoriaId}`)
```

**Nota:** `trayectoriaId` puede ser `id` numérico o `documentId` string.

---

## 🔍 QUERY 6: Buscar Trayectorias de una Persona

### Objetivo
Encontrar todas las trayectorias de una persona específica, especialmente la actual (`is_current: true`).

### Endpoint
```
GET /api/persona-trayectorias?filters[persona][id][$eq]={personaId}&filters[is_current][$eq]=true
```

### ⚠️ PROBLEMA

**Filtro:** `filters[persona][id][$eq]={personaId}`

**Si `personaId` es un `documentId` (string):**
- El filtro por `id` numérico no funcionará
- Necesitamos obtener el ID numérico primero

### Solución

```typescript
// Obtener ID numérico si es documentId
let personaIdNum: number | string = personaId
const isDocumentId = typeof personaId === 'string' && !/^\d+$/.test(personaId)

if (isDocumentId) {
  const personaResponse = await strapiClient.get(`/api/personas/${personaId}?fields=id`)
  personaIdNum = personaResponse.data.id
}

// Usar ID numérico en el filtro
const url = `/api/persona-trayectorias?filters[persona][id][$eq]=${personaIdNum}&filters[is_current][$eq]=true`
```

---

## 📊 QUERY 7: Listar Colegios (para Selector)

### Objetivo
Obtener una lista simple de colegios para usar en selectores/dropdowns.

### Endpoint
```
GET /api/colegios?pagination[pageSize]=500&sort[0]=colegio_nombre:asc
```

### Con Búsqueda

```
GET /api/colegios?
  pagination[page]=1&
  pagination[pageSize]=100&
  sort[0]=colegio_nombre:asc&
  filters[colegio_nombre][$containsi]={searchTerm}
```

### Respuesta Transformada

```typescript
const colegios = data.map((colegio) => ({
  id: typeof id === 'number' ? id : parseInt(id) || 0,  // ⚠️ Siempre número
  documentId: colegio.documentId || String(colegio.id || ''),
  nombre: attrs.colegio_nombre || 'Sin nombre',
  rbd: attrs.rbd || null,
}))
```

---

## ⚠️ PROBLEMAS IDENTIFICADOS Y SOLUCIONES

### Problema 1: IDs en Strapi v4

**Strapi v4 usa dos tipos de IDs:**
- `id`: Numérico (ej: `123`)
- `documentId`: String alfanumérico (ej: `xvule1pp5in57iyezi3bwnka`)

**Solución:**
- Siempre verificar si es `documentId` antes de usar como ID numérico
- Obtener el ID numérico si es necesario para filtros y `connect`

### Problema 2: Filtros en Relaciones Anidadas

**Query:**
```
filters[trayectorias][colegio][id][$eq]={colegioId}
```

**Problema:**
- Puede no funcionar si `colegioId` es un `documentId`
- Strapi puede requerir sintaxis diferente

**Solución:**
- Convertir `documentId` a `id` numérico antes de filtrar
- Filtrar manualmente en el código como respaldo

### Problema 3: Populate de Relaciones Anidadas

**Sintaxis Correcta (Strapi v4):**
```
populate[trayectorias][populate][colegio][populate][comuna]=true
```

**Sintaxis Incorrecta:**
```
populate[trayectorias.colegio.comuna]=true  // ❌ No funciona
```

### Problema 4: Connect en Relaciones

**Correcto:**
```json
{
  "persona": { "connect": [11482] },  // Array con ID numérico
  "colegio": { "connect": [123] }
}
```

**Incorrecto:**
```json
{
  "persona": 11482,  // ❌ No funciona
  "colegio": "123"   // ❌ No funciona
}
```

### Problema 5: Validación de IDs

**Error común:**
- Enviar `colegioId = 0` o `colegioId = '0'` cuando no se selecciona un colegio

**Solución:**
```typescript
// Validar antes de enviar
if (!colegioId || colegioId === '' || colegioId === '0' || colegioId === 0) {
  // No crear trayectoria
  return
}
```

---

## 🧪 CASOS DE USO COMPLETOS

### Caso 1: Crear Persona con Trayectoria

```typescript
// 1. Crear persona
POST /api/personas
{
  "data": {
    "nombres": "Juan",
    "primer_apellido": "Pérez",
    "emails": [{ "email": "juan@example.com", "principal": true }],
    "activo": true
  }
}

// Respuesta: { "data": { "id": 11482, "documentId": "abc123" } }

// 2. Crear trayectoria
POST /api/persona-trayectorias
{
  "data": {
    "persona": { "connect": [11482] },  // ✅ ID numérico
    "colegio": { "connect": [123] },    // ✅ ID numérico
    "cargo": "Profesor",
    "anio": 2024,
    "is_current": true,
    "activo": true
  }
}
```

### Caso 2: Editar Persona y Actualizar Trayectoria

```typescript
// 1. Obtener persona con trayectorias
GET /api/personas/{personaId}?populate[trayectorias][populate][colegio]=true

// 2. Actualizar datos básicos de persona
PUT /api/personas/{personaId}
{
  "data": {
    "nombres": "Juan Actualizado"
  }
}

// 3. Actualizar trayectoria existente
PUT /api/persona-trayectorias/{trayectoriaId}
{
  "data": {
    "cargo": "Profesor Actualizado",
    "colegio": { "connect": [456] }  // Cambiar de colegio
  }
}
```

### Caso 3: Ver Colaboradores de un Colegio

```typescript
// 1. Obtener ID numérico del colegio (si es documentId)
GET /api/colegios/{colegioId}?fields[0]=id

// 2. Buscar personas con trayectorias en este colegio
GET /api/personas?
  filters[activo][$eq]=true&
  filters[trayectorias][colegio][id][$eq]={colegioIdNum}&
  populate[trayectorias][populate][colegio]=true&
  populate[trayectorias][populate][curso]=true&
  populate[trayectorias][populate][asignatura]=true

// 3. Filtrar manualmente trayectorias del colegio específico
// (por si el filtro de Strapi no funciona correctamente)
```

---

## 📝 CHECKLIST DE VERIFICACIÓN

### ✅ Lo que SÍ estamos haciendo correctamente:

1. ✅ Convertir `documentId` a `id` numérico cuando es necesario
2. ✅ Validar IDs antes de crear/actualizar (no 0, no null, no undefined)
3. ✅ Usar sintaxis correcta de populate para relaciones anidadas
4. ✅ Usar `connect` para relaciones en create/update
5. ✅ Filtrar manualmente en el código como respaldo
6. ✅ Logs de debugging extensivos

### ⚠️ Lo que puede estar fallando:

1. ⚠️ **Filtro anidado:** `filters[trayectorias][colegio][id][$eq]` puede no funcionar si Strapi no soporta filtros tan anidados
2. ⚠️ **Populate de curso/asignatura:** Si estos content types no existen o tienen otro nombre, fallará
3. ⚠️ **ID de persona en connect:** Si el ID no existe o es incorrecto, Strapi devolverá error 400

---

## 🔧 RECOMENDACIONES PARA STRAPI

### Si el filtro anidado no funciona:

**Alternativa 1: Query directa a persona-trayectorias**
```
GET /api/persona-trayectorias?
  filters[colegio][id][$eq]={colegioId}&
  populate[persona]=true&
  populate[colegio]=true
```

Luego obtener las personas desde las trayectorias:
```typescript
const personasIds = trayectorias.map(t => t.persona.id)
GET /api/personas?filters[id][$in]={personasIds}
```

**Alternativa 2: Usar GraphQL** (si está habilitado)
```graphql
query {
  personas(
    filters: { trayectorias: { colegio: { id: { eq: 123 } } } }
  ) {
    data {
      id
      attributes {
        nombre_completo
        trayectorias {
          data {
            attributes {
              cargo
              colegio {
                data {
                  attributes {
                    colegio_nombre
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 📊 RESUMEN DE QUERIES

| Operación | Endpoint | Método | Filtros/Populate | Problema Potencial |
|-----------|----------|--------|------------------|-------------------|
| Obtener contactos de colegio | `/api/personas` | GET | `filters[trayectorias][colegio][id][$eq]` | Filtro anidado puede no funcionar |
| Crear trayectoria | `/api/persona-trayectorias` | POST | `persona: {connect: [id]}` | ID de persona puede no existir |
| Actualizar trayectoria | `/api/persona-trayectorias/{id}` | PUT | `colegio: {connect: [id]}` | ID de colegio puede ser 0 |
| Obtener persona con trayectorias | `/api/personas/{id}` | GET | `populate[trayectorias][populate][colegio]` | Populate anidado puede fallar |
| Buscar trayectorias de persona | `/api/persona-trayectorias` | GET | `filters[persona][id][$eq]` | ID puede ser documentId |
| Listar colegios | `/api/colegios` | GET | `filters[colegio_nombre][$containsi]` | Ninguno conocido |

---

## 🎯 CONCLUSIÓN

**Lo que Strapi debería entender:**

1. ✅ **Relaciones:** `persona-trayectoria` conecta `persona` y `colegio`
2. ✅ **Populate:** Sintaxis correcta para relaciones anidadas
3. ✅ **Connect:** Formato correcto para crear/actualizar relaciones
4. ⚠️ **Filtros anidados:** Puede requerir configuración especial o alternativa

**Si los colaboradores no aparecen, verificar:**

1. ¿El filtro `filters[trayectorias][colegio][id][$eq]` está funcionando?
2. ¿Las trayectorias tienen el campo `colegio` correctamente poblado?
3. ¿El `colegioId` que estamos usando es el correcto (numérico vs documentId)?
4. ¿Los logs muestran que Strapi está devolviendo datos?

**Próximos pasos de debugging:**

1. Agregar más logs en el API route de contactos
2. Verificar la respuesta raw de Strapi
3. Probar el filtro directamente en Strapi Admin
4. Considerar query alternativa si el filtro anidado no funciona

---

**Fin del documento**
