# Verificación de Importación en Strapi - Guía para IA

## 🎯 Objetivo
Este documento permite verificar que los datos de importación se están enviando y guardando correctamente en Strapi.

---

## 📋 Content Types Involucrados

### 1. Content Type: `colegios`

#### Campos Relevantes
```json
{
  "colegio_nombre": "string (required)",
  "rbd": "number (unique, required)",
  "estado": "string (default: 'Por Verificar')"
}
```

#### Verificación en Strapi
```sql
-- Query para verificar colegios creados por importación
SELECT 
  id,
  documentId,
  colegio_nombre,
  rbd,
  estado,
  createdAt,
  updatedAt
FROM colegios
WHERE colegio_nombre LIKE 'Colegio RBD%'
   OR estado = 'Por Verificar'
ORDER BY createdAt DESC
LIMIT 100;
```

**Puntos de Verificación**:
- ✅ `rbd` debe ser un número único
- ✅ `colegio_nombre` debe seguir el patrón "Colegio RBD {rbd}" para colegios auto-creados
- ✅ `estado` debe ser "Por Verificar" para colegios nuevos
- ✅ No debe haber duplicados por RBD

---

### 2. Content Type: `cursos`

#### Campos Relevantes
```json
{
  "nombre_curso": "string (required)",
  "nivel": "string (enum: 'Basica' | 'Media')",
  "grado": "string (required, format: '1'-'8' para Básica, '1'-'4' para Media)",
  "activo": "boolean (default: true)",
  "cantidad_alumnos": "number (optional)",
  "asignatura": "string (optional)",
  "colegio": "relation (manyToOne, required)"
}
```

#### ⚠️ IMPORTANTE: Campo `año` NO existe
- **NO se envía** el campo `año` directamente
- El año está incluido en `nombre_curso` (ej: "1º Básico 2022")
- Si Strapi tiene un campo `año` en el schema, **NO debe usarse** en las importaciones

#### Verificación en Strapi
```sql
-- Query para verificar cursos creados/actualizados
SELECT 
  c.id,
  c.documentId,
  c.nombre_curso,
  c.nivel,
  c.grado,
  c.cantidad_alumnos,
  c.asignatura,
  c.activo,
  c.createdAt,
  c.updatedAt,
  co.id as colegio_id,
  co.rbd as colegio_rbd,
  co.colegio_nombre
FROM cursos c
LEFT JOIN colegios co ON c.colegio = co.id
WHERE c.nombre_curso LIKE '%2022%'
   OR c.nombre_curso LIKE '%2023%'
   OR c.nombre_curso LIKE '%2024%'
   OR c.nombre_curso LIKE '%2025%'
ORDER BY c.updatedAt DESC
LIMIT 200;
```

**Puntos de Verificación**:
- ✅ `nombre_curso` debe incluir el año (ej: "1º Básico 2022")
- ✅ `nivel` debe ser exactamente "Basica" o "Media" (case-sensitive)
- ✅ `grado` debe ser STRING ("1", "2", "3", etc.), NO número
- ✅ `colegio` debe tener una relación válida (no null)
- ✅ `cantidad_alumnos` debe ser un número positivo si existe
- ✅ No debe haber cursos duplicados con mismo colegio + nivel + grado + año

---

## 🔍 Requests HTTP que se Envían a Strapi

### Request 1: Crear Colegio (si no existe)

```http
POST https://{STRAPI_URL}/api/colegios
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "data": {
    "colegio_nombre": "Colegio RBD 12345",
    "rbd": 12345,
    "estado": "Por Verificar"
  }
}
```

**Response Esperado (200 OK)**:
```json
{
  "data": {
    "id": 123,
    "documentId": "abc123def456",
    "attributes": {
      "colegio_nombre": "Colegio RBD 12345",
      "rbd": 12345,
      "estado": "Por Verificar",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "meta": {}
}
```

**Errores Posibles**:
- `400 Bad Request`: Datos inválidos (rbd no es número, etc.)
- `409 Conflict`: RBD ya existe (esto es OK, se usa el existente)
- `401 Unauthorized`: Token inválido

---

### Request 2: Crear Curso

```http
POST https://{STRAPI_URL}/api/cursos
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "data": {
    "nombre_curso": "1º Básico 2022",
    "nivel": "Basica",
    "grado": "1",
    "activo": true,
    "colegio": {
      "connect": [123]
    },
    "asignatura": "Matemáticas",
    "cantidad_alumnos": 25
  }
}
```

**Response Esperado (200 OK)**:
```json
{
  "data": {
    "id": 456,
    "documentId": "def456ghi789",
    "attributes": {
      "nombre_curso": "1º Básico 2022",
      "nivel": "Basica",
      "grado": "1",
      "activo": true,
      "asignatura": "Matemáticas",
      "cantidad_alumnos": 25,
      "colegio": {
        "data": {
          "id": 123,
          "attributes": {
            "colegio_nombre": "Colegio RBD 12345",
            "rbd": 12345
          }
        }
      },
      "createdAt": "2024-01-15T10:35:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    }
  },
  "meta": {}
}
```

**Errores Posibles**:
- `400 Bad Request`: 
  - "Invalid key año" → **ESPERADO**, no se debe enviar `año`
  - "Invalid key ano" → **ESPERADO**, no se debe enviar `ano`
  - Campo requerido faltante
  - `grado` no es string (debe ser "1", no 1)
- `404 Not Found`: Colegio con ID 123 no existe
- `401 Unauthorized`: Token inválido

---

### Request 3: Actualizar Curso (Importación de Niveles)

```http
PUT https://{STRAPI_URL}/api/cursos/456
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "data": {
    "nombre_curso": "1º Básico 2022",
    "nivel": "Basica",
    "grado": "1",
    "asignatura": "Matemáticas",
    "cantidad_alumnos": 25
  }
}
```

**Response Esperado (200 OK)**:
```json
{
  "data": {
    "id": 456,
    "documentId": "def456ghi789",
    "attributes": {
      "nombre_curso": "1º Básico 2022",
      "nivel": "Basica",
      "grado": "1",
      "asignatura": "Matemáticas",
      "cantidad_alumnos": 25,
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  },
  "meta": {}
}
```

---

### Request 4: Actualizar Cantidad de Alumnos (Importación de Matriculados)

```http
PUT https://{STRAPI_URL}/api/cursos/456
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "data": {
    "cantidad_alumnos": 30
  }
}
```

**Response Esperado (200 OK)**:
```json
{
  "data": {
    "id": 456,
    "documentId": "def456ghi789",
    "attributes": {
      "nombre_curso": "1º Básico 2022",
      "nivel": "Basica",
      "grado": "1",
      "cantidad_alumnos": 30,
      "updatedAt": "2024-01-15T11:30:00.000Z"
    }
  },
  "meta": {}
}
```

**Verificación**:
- ✅ `cantidad_alumnos` debe actualizarse de 25 a 30
- ✅ `updatedAt` debe cambiar a la fecha/hora actual

---

## 📊 Queries de Verificación en Strapi

### Query 1: Verificar Colegios Creados Recientemente

```http
GET https://{STRAPI_URL}/api/colegios?filters[colegio_nombre][$contains]=RBD&sort=createdAt:desc&pagination[limit]=50
Authorization: Bearer {API_TOKEN}
```

**Verificar**:
- ✅ Colegios con nombre "Colegio RBD {número}" existen
- ✅ RBD es único (no duplicados)
- ✅ `createdAt` es reciente (últimas horas/días)

---

### Query 2: Verificar Cursos Creados/Actualizados

```http
GET https://{STRAPI_URL}/api/cursos?populate[colegio]=true&sort=updatedAt:desc&pagination[limit]=100
Authorization: Bearer {API_TOKEN}
```

**Verificar**:
- ✅ `nombre_curso` incluye el año
- ✅ `nivel` es "Basica" o "Media"
- ✅ `grado` es string ("1", "2", etc.)
- ✅ `colegio` está relacionado correctamente
- ✅ `cantidad_alumnos` tiene valor si se importó matriculados

---

### Query 3: Verificar Cursos por Colegio y Año

```http
GET https://{STRAPI_URL}/api/cursos?filters[colegio][rbd][$eq]=12345&populate[colegio]=true&filters[nombre_curso][$contains]=2022
Authorization: Bearer {API_TOKEN}
```

**Verificar**:
- ✅ Todos los cursos del colegio RBD 12345 para el año 2022
- ✅ No hay duplicados (mismo nivel + grado + año)
- ✅ Relación con colegio es correcta

---

### Query 4: Verificar Cursos con Cantidad de Alumnos

```http
GET https://{STRAPI_URL}/api/cursos?filters[cantidad_alumnos][$notNull]=true&populate[colegio]=true&sort=cantidad_alumnos:desc&pagination[limit]=100
Authorization: Bearer {API_TOKEN}
```

**Verificar**:
- ✅ Cursos tienen `cantidad_alumnos` > 0
- ✅ `cantidad_alumnos` es un número positivo
- ✅ `updatedAt` es reciente (si se importó matriculados)

---

## ✅ Checklist de Verificación

### Para Importación de Niveles/Asignaturas

- [ ] **Colegios creados**:
  - [ ] Existen colegios con nombre "Colegio RBD {rbd}"
  - [ ] RBD es único (no hay duplicados)
  - [ ] `estado` es "Por Verificar"

- [ ] **Cursos creados**:
  - [ ] `nombre_curso` incluye el año (ej: "1º Básico 2022")
  - [ ] `nivel` es "Basica" o "Media" (exacto, case-sensitive)
  - [ ] `grado` es STRING ("1", "2", etc.), NO número
  - [ ] `colegio` está relacionado correctamente
  - [ ] No hay cursos duplicados (mismo colegio + nivel + grado + año)

- [ ] **Datos opcionales**:
  - [ ] `asignatura` se guarda si viene en el archivo
  - [ ] `cantidad_alumnos` se guarda si viene en el archivo

---

### Para Importación de Matriculados

- [ ] **Cursos actualizados**:
  - [ ] `cantidad_alumnos` se actualiza correctamente
  - [ ] `updatedAt` cambia a fecha/hora reciente
  - [ ] Solo se actualiza `cantidad_alumnos`, otros campos no cambian

- [ ] **Cursos no encontrados**:
  - [ ] Se registran errores si el curso no existe
  - [ ] Los errores indican que se debe importar niveles primero

---

## 🐛 Errores Comunes y Soluciones

### Error 1: "Invalid key año"
```
Status: 400 Bad Request
Error: "Invalid key año"
```

**Causa**: Se está intentando enviar el campo `año` directamente.

**Solución**: 
- ✅ **CORRECTO**: El año va en `nombre_curso` (ej: "1º Básico 2022")
- ❌ **INCORRECTO**: Enviar `"año": 2022` en el payload

**Verificación en Strapi**:
```sql
-- Verificar que NO existe campo año en cursos
SELECT * FROM cursos WHERE año IS NOT NULL;
-- Debe retornar 0 resultados o el campo no debe existir
```

---

### Error 2: "grado must be a string"
```
Status: 400 Bad Request
Error: "grado must be a string"
```

**Causa**: Se está enviando `grado` como número en lugar de string.

**Solución**:
- ✅ **CORRECTO**: `"grado": "1"` (string)
- ❌ **INCORRECTO**: `"grado": 1` (número)

**Verificación en Strapi**:
```sql
-- Verificar que grado es string
SELECT id, grado, typeof(grado) FROM cursos LIMIT 10;
-- Debe mostrar tipo 'string' o 'text'
```

---

### Error 3: "Colegio not found"
```
Status: 404 Not Found
Error: "Colegio with id 123 not found"
```

**Causa**: Se está intentando relacionar un curso con un colegio que no existe.

**Solución**:
- Verificar que el colegio existe antes de crear el curso
- O crear el colegio automáticamente si no existe

**Verificación en Strapi**:
```sql
-- Verificar que el colegio existe
SELECT id, rbd, colegio_nombre FROM colegios WHERE id = 123;
-- Debe retornar 1 resultado
```

---

### Error 4: "RBD already exists"
```
Status: 409 Conflict
Error: "RBD already exists"
```

**Causa**: Se está intentando crear un colegio con un RBD que ya existe.

**Solución**:
- ✅ **ESPERADO**: Este error es normal, se debe usar el colegio existente
- Verificar que el sistema busca el colegio existente antes de crear

**Verificación en Strapi**:
```sql
-- Verificar duplicados por RBD
SELECT rbd, COUNT(*) as count 
FROM colegios 
GROUP BY rbd 
HAVING COUNT(*) > 1;
-- Debe retornar 0 resultados (no duplicados)
```

---

## 📈 Métricas de Éxito

### Después de Importación de Niveles/Asignaturas

```sql
-- Total de colegios creados
SELECT COUNT(*) as total_colegios 
FROM colegios 
WHERE colegio_nombre LIKE 'Colegio RBD%'
   OR estado = 'Por Verificar';

-- Total de cursos creados
SELECT COUNT(*) as total_cursos 
FROM cursos 
WHERE nombre_curso LIKE '%2022%'
   OR nombre_curso LIKE '%2023%'
   OR nombre_curso LIKE '%2024%'
   OR nombre_curso LIKE '%2025%';

-- Cursos por nivel
SELECT nivel, COUNT(*) as cantidad 
FROM cursos 
GROUP BY nivel;

-- Cursos por grado
SELECT grado, COUNT(*) as cantidad 
FROM cursos 
GROUP BY grado 
ORDER BY CAST(grado AS INTEGER);
```

### Después de Importación de Matriculados

```sql
-- Cursos con cantidad de alumnos
SELECT COUNT(*) as cursos_con_alumnos 
FROM cursos 
WHERE cantidad_alumnos IS NOT NULL 
  AND cantidad_alumnos > 0;

-- Total de alumnos matriculados
SELECT SUM(cantidad_alumnos) as total_alumnos 
FROM cursos 
WHERE cantidad_alumnos IS NOT NULL;

-- Cursos actualizados recientemente
SELECT COUNT(*) as cursos_actualizados 
FROM cursos 
WHERE cantidad_alumnos IS NOT NULL 
  AND updatedAt > DATE_SUB(NOW(), INTERVAL 1 DAY);
```

---

## 🔗 Relaciones Verificadas

### Relación: cursos.colegio → colegios.id

**Verificación**:
```sql
-- Cursos sin colegio relacionado (ERROR)
SELECT c.id, c.nombre_curso, c.colegio 
FROM cursos c 
WHERE c.colegio IS NULL;

-- Cursos con colegio relacionado (OK)
SELECT 
  c.id as curso_id,
  c.nombre_curso,
  co.id as colegio_id,
  co.rbd,
  co.colegio_nombre
FROM cursos c
INNER JOIN colegios co ON c.colegio = co.id
LIMIT 10;
```

**Resultado Esperado**:
- ✅ 0 cursos sin colegio relacionado
- ✅ Todos los cursos tienen un colegio válido

---

## 📝 Ejemplo de Verificación Completa

### Paso 1: Verificar Colegio Creado

```http
GET /api/colegios?filters[rbd][$eq]=12345
```

**Resultado Esperado**:
```json
{
  "data": [
    {
      "id": 123,
      "attributes": {
        "colegio_nombre": "Colegio RBD 12345",
        "rbd": 12345,
        "estado": "Por Verificar"
      }
    }
  ]
}
```

### Paso 2: Verificar Cursos del Colegio

```http
GET /api/cursos?filters[colegio][id][$eq]=123&populate[colegio]=true
```

**Resultado Esperado**:
```json
{
  "data": [
    {
      "id": 456,
      "attributes": {
        "nombre_curso": "1º Básico 2022",
        "nivel": "Basica",
        "grado": "1",
        "cantidad_alumnos": 30,
        "colegio": {
          "data": {
            "id": 123,
            "attributes": {
              "rbd": 12345
            }
          }
        }
      }
    }
  ]
}
```

### Paso 3: Verificar Actualización de Matriculados

```http
GET /api/cursos/456?populate[colegio]=true
```

**Resultado Esperado**:
```json
{
  "data": {
    "id": 456,
    "attributes": {
      "nombre_curso": "1º Básico 2022",
      "cantidad_alumnos": 30,
      "updatedAt": "2024-01-15T11:30:00.000Z"
    }
  }
}
```

**Verificar**:
- ✅ `cantidad_alumnos` = 30 (actualizado)
- ✅ `updatedAt` es reciente (últimas horas)

---

## 🎯 Puntos Críticos de Validación

1. **RBD es único**: No debe haber duplicados
2. **grado es STRING**: Debe ser "1", "2", etc., NO 1, 2
3. **año NO se envía**: Va en `nombre_curso`, no como campo separado
4. **Relación colegio es válida**: Todos los cursos deben tener colegio
5. **cantidad_alumnos es número positivo**: Si existe, debe ser > 0
6. **No hay duplicados de cursos**: Mismo colegio + nivel + grado + año = único

---

## 📞 Endpoints de la Aplicación

### Importar Niveles/Asignaturas
```
POST /api/crm/colegios/import-niveles-asignaturas
```

### Importar Matriculados
```
POST /api/crm/colegios/import-matriculados
```

### Verificar Estado
```
GET /api/crm/colegios/verificar-importacion
```

---

**Última actualización**: 2024
**Versión**: 1.0
**Para uso con**: Strapi AI Assistant
