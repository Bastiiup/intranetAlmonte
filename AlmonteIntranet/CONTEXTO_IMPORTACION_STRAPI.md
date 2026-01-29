# Contexto de Importación a Strapi

## 📋 Resumen General

Estamos importando datos educativos desde archivos CSV/Excel a Strapi. El proceso tiene dos partes principales:

1. **Importación de Niveles/Asignaturas**: Crea colegios y cursos
2. **Importación de Matriculados**: Actualiza la cantidad de alumnos por curso

---

## 🔄 Flujo Completo de Datos

### **PASO 1: Importación de Niveles/Asignaturas**

#### **Archivo de Entrada**
- **Formato**: CSV o Excel
- **Columnas esperadas**:
  - `agno` / `año` / `AGNO`: Año del curso (ej: 2022, 2023, 2024)
  - `rbd` / `RBD`: RBD del colegio (identificador único)
  - `nivel` / `Nivel` / `ID_NIVEL`: Nivel educativo (ej: "Básico", "Media", o código MINEDUC)
  - `id_nivel` / `ID_NIVEL`: ID numérico del nivel (opcional, ayuda a parsear)
  - `ens_bas_med` / `ENS_BAS_MED` / `tipo_ensenanza`: Tipo de enseñanza
  - `asignatura`: Nombre de la asignatura (opcional)
  - `cantidad_alumnos`: Cantidad de alumnos (opcional, puede venir aquí o en el otro archivo)

#### **Procesamiento**

1. **Normalización de datos**:
   ```typescript
   // Ejemplo de fila procesada:
   {
     rbd: "12345",
     año: 2022,
     nivel: "Básico",  // Parseado desde "ID_NIVEL" o texto
     grado: "1",       // Extraído del nivel (1º, 2º, 3º, etc.)
     asignatura: "Matemáticas", // Opcional
     cantidad_alumnos: 25       // Opcional
   }
   ```

2. **Función `parseNivel`**:
   - Convierte códigos MINEDUC a formato legible
   - Extrae el grado (1º, 2º, 3º, etc.)
   - Determina si es "Básico" o "Media"
   - Ejemplos:
     - `ID_NIVEL: 110` → `{ nivel: "Básico", grado: "1" }`
     - `ID_NIVEL: 210` → `{ nivel: "Media", grado: "1" }`
     - `"III Medio"` → `{ nivel: "Media", grado: "3" }`

3. **Agrupación**:
   - Se agrupa por `RBD` y `año`
   - Cada combinación RBD + año genera múltiples cursos

#### **Datos Enviados a Strapi**

##### **A. Crear Colegio (si no existe)**
```http
POST /api/colegios
Content-Type: application/json

{
  "data": {
    "colegio_nombre": "Colegio RBD 12345",  // Nombre temporal
    "rbd": 12345,                           // RBD del archivo
    "estado": "Por Verificar"
  }
}
```

**Respuesta esperada**:
```json
{
  "data": {
    "id": 123,
    "documentId": "abc123",
    "attributes": {
      "colegio_nombre": "Colegio RBD 12345",
      "rbd": 12345,
      "estado": "Por Verificar"
    }
  }
}
```

##### **B. Crear Curso (si no existe)**
```http
POST /api/cursos
Content-Type: application/json

{
  "data": {
    "nombre_curso": "1º Básico 2022",        // Formato: "{grado}º {nivel} {año}"
    "nivel": "Básico",                       // "Básico" o "Media"
    "grado": "1",                           // String: "1", "2", "3", etc.
    "activo": true,
    "colegio": {                            // Relación manyToOne
      "connect": [123]                       // ID del colegio
    },
    "asignatura": "Matemáticas",            // Opcional
    "cantidad_alumnos": 25                  // Opcional (si viene en este archivo)
  }
}
```

**⚠️ IMPORTANTE**: NO enviamos el campo `año` directamente porque Strapi lo rechaza con "Invalid key año". El año va incluido en `nombre_curso`.

**Respuesta esperada**:
```json
{
  "data": {
    "id": 456,
    "documentId": "def456",
    "attributes": {
      "nombre_curso": "1º Básico 2022",
      "nivel": "Básico",
      "grado": "1",
      "activo": true,
      "colegio": {
        "data": {
          "id": 123
        }
      }
    }
  }
}
```

##### **C. Actualizar Curso (si ya existe)**
```http
PUT /api/cursos/456
Content-Type: application/json

{
  "data": {
    "nombre_curso": "1º Básico 2022",
    "nivel": "Básico",
    "grado": "1",
    "asignatura": "Matemáticas",            // Opcional
    "cantidad_alumnos": 25                  // Opcional
  }
}
```

---

### **PASO 2: Importación de Matriculados**

#### **Archivo de Entrada**
- **Formato**: CSV o Excel
- **Columnas esperadas**:
  - `agno` / `año` / `AGNO`: Año del curso
  - `rbd` / `RBD`: RBD del colegio
  - `nivel` / `Nivel` / `ID_NIVEL`: Nivel educativo
  - `id_nivel` / `ID_NIVEL`: ID numérico del nivel
  - `N_ALU` / `n_alu`: **Cantidad de alumnos matriculados** (campo principal)
  - `N_ALU_GRADO1` / `n_alu_grado1`: Alumnos de grado 1 (para cursos combinados, opcional)
  - `ens_bas_med` / `ENS_BAS_MED`: Tipo de enseñanza

#### **Procesamiento**

1. **Normalización**:
   ```typescript
   // Ejemplo de fila procesada:
   {
     rbd: "12345",
     año: 2022,
     nivel: "Básico",
     grado: "1",
     cantidad_alumnos: 30  // De N_ALU
   }
   ```

2. **Búsqueda de curso existente**:
   - Se busca por: `colegioId` + `nivel` + `grado` + `año`
   - Si no existe, se registra un error (el curso debe crearse primero con la importación de niveles)

#### **Datos Enviados a Strapi**

##### **Actualizar Cantidad de Alumnos**
```http
PUT /api/cursos/456
Content-Type: application/json

{
  "data": {
    "cantidad_alumnos": 30                  // Solo actualizamos este campo
  }
}
```

**Respuesta esperada**:
```json
{
  "data": {
    "id": 456,
    "documentId": "def456",
    "attributes": {
      "nombre_curso": "1º Básico 2022",
      "nivel": "Básico",
      "grado": "1",
      "cantidad_alumnos": 30,                // ✅ Actualizado
      "colegio": {
        "data": {
          "id": 123
        }
      }
    }
  }
}
```

---

## 🔍 Consultas a Strapi (GET)

### **1. Obtener todos los colegios**
```http
GET /api/colegios?pagination[pageSize]=10000&publicationState=preview
```

**Propósito**: Mapear RBD → ID de colegio

**Respuesta**:
```json
{
  "data": [
    {
      "id": 123,
      "documentId": "abc123",
      "attributes": {
        "colegio_nombre": "Colegio Ejemplo",
        "rbd": 12345
      }
    }
  ],
  "meta": {
    "pagination": {
      "total": 1000
    }
  }
}
```

### **2. Obtener todos los cursos**
```http
GET /api/cursos?pagination[pageSize]=10000&publicationState=preview&populate[colegio]=true
```

**Propósito**: Crear índice en memoria para búsquedas rápidas (optimización)

**Respuesta**:
```json
{
  "data": [
    {
      "id": 456,
      "documentId": "def456",
      "attributes": {
        "nombre_curso": "1º Básico 2022",
        "nivel": "Básico",
        "grado": "1",
        "cantidad_alumnos": 30,
        "colegio": {
          "data": {
            "id": 123,
            "attributes": {
              "colegio_nombre": "Colegio Ejemplo",
              "rbd": 12345
            }
          }
        }
      }
    }
  ]
}
```

### **3. Verificar si existe un colegio por RBD**
```http
GET /api/colegios?filters[rbd][$eq]=12345&publicationState=preview
```

**Propósito**: Verificar antes de crear un colegio nuevo

---

## 📊 Estructura de Datos en Strapi

### **Content Type: `colegios`**
```typescript
{
  colegio_nombre: string        // Nombre del colegio
  rbd: number                  // RBD único
  estado: string                // "Por Verificar", "Activo", etc.
  // ... otros campos
}
```

### **Content Type: `cursos`**
```typescript
{
  nombre_curso: string          // "1º Básico 2022" (incluye año)
  nivel: string                 // "Básico" o "Media"
  grado: string                 // "1", "2", "3", etc. (STRING, no número)
  activo: boolean               // true/false
  cantidad_alumnos: number      // Cantidad de alumnos (opcional)
  asignatura: string            // Nombre de asignatura (opcional)
  colegio: relation             // Relación manyToOne con colegios
  // ❌ NO tiene campo 'año' directo - Strapi lo rechaza
}
```

---

## ⚙️ Optimizaciones Implementadas

### **Antes (Lento)**
- ❌ 1 GET por cada curso buscado
- ❌ Miles de llamadas a Strapi
- ❌ Tiempo: ~1-2 segundos por curso

### **Ahora (Rápido)**
- ✅ 1 GET al inicio para todos los colegios
- ✅ 1 GET al inicio para todos los cursos
- ✅ Índice en memoria para búsquedas instantáneas
- ✅ Tiempo: ~0.01-0.1 segundos por curso
- ✅ **Mejora: 10-100x más rápido**

---

## 🔑 Puntos Clave

1. **RBD es el identificador principal** para mapear colegios
2. **El año NO se envía como campo separado** - va en `nombre_curso`
3. **`grado` debe ser STRING** ("1", "2", "3"), no número
4. **Los cursos se identifican por**: `colegioId` + `nivel` + `grado` + `año`
5. **La relación `colegio` usa `connect`** en creación: `{ connect: [colegioId] }`
6. **Si un colegio no existe, se crea automáticamente** con nombre temporal
7. **Si un curso no existe en importación de matriculados, se registra error** (debe crearse primero)

---

## 🐛 Errores Comunes y Soluciones

### **Error: "Invalid key año"**
- **Causa**: Intentar enviar campo `año` directamente
- **Solución**: El año va en `nombre_curso`, no como campo separado

### **Error: "Curso no encontrado" en importación de matriculados**
- **Causa**: El curso no existe en Strapi
- **Solución**: Importar niveles/asignaturas primero

### **Error: "Colegio no encontrado"**
- **Causa**: El RBD no existe en Strapi
- **Solución**: El sistema crea el colegio automáticamente (o verificar que el RBD sea correcto)

---

## 📝 Ejemplo Completo de Flujo

### **Archivo de Niveles (CSV)**
```csv
agno,rbd,nivel,id_nivel,ens_bas_med
2022,12345,Básico,110,ENS_BAS
2022,12345,Básico,120,ENS_BAS
2023,12345,Media,210,ENS_MED
```

### **Procesamiento**
1. RBD `12345` → Buscar/Crear colegio → ID: `123`
2. Para cada fila:
   - `2022, 12345, Básico, 110` → Crear curso "1º Básico 2022" → ID: `456`
   - `2022, 12345, Básico, 120` → Crear curso "2º Básico 2022" → ID: `457`
   - `2023, 12345, Media, 210` → Crear curso "1º Media 2023" → ID: `458`

### **Archivo de Matriculados (CSV)**
```csv
agno,rbd,nivel,id_nivel,N_ALU
2022,12345,Básico,110,30
2022,12345,Básico,120,28
2023,12345,Media,210,25
```

### **Procesamiento**
1. RBD `12345` → Colegio ID: `123`
2. Para cada fila:
   - `2022, 12345, Básico, 110, 30` → Buscar curso ID `456` → Actualizar `cantidad_alumnos: 30`
   - `2022, 12345, Básico, 120, 28` → Buscar curso ID `457` → Actualizar `cantidad_alumnos: 28`
   - `2023, 12345, Media, 210, 25` → Buscar curso ID `458` → Actualizar `cantidad_alumnos: 25`

---

## 🎯 Resultado Final en Strapi

### **Colegio**
```json
{
  "id": 123,
  "attributes": {
    "colegio_nombre": "Colegio RBD 12345",
    "rbd": 12345,
    "estado": "Por Verificar"
  }
}
```

### **Cursos**
```json
[
  {
    "id": 456,
    "attributes": {
      "nombre_curso": "1º Básico 2022",
      "nivel": "Básico",
      "grado": "1",
      "cantidad_alumnos": 30,
      "colegio": { "data": { "id": 123 } }
    }
  },
  {
    "id": 457,
    "attributes": {
      "nombre_curso": "2º Básico 2022",
      "nivel": "Básico",
      "grado": "2",
      "cantidad_alumnos": 28,
      "colegio": { "data": { "id": 123 } }
    }
  },
  {
    "id": 458,
    "attributes": {
      "nombre_curso": "1º Media 2023",
      "nivel": "Media",
      "grado": "1",
      "cantidad_alumnos": 25,
      "colegio": { "data": { "id": 123 } }
    }
  }
]
```

---

## 📞 Endpoints de la API

### **Importar Niveles/Asignaturas**
```
POST /api/crm/colegios/import-niveles-asignaturas
Content-Type: multipart/form-data o application/json

Body: {
  file: File (CSV/Excel) o
  data: Array<{ rbd, año, nivel, id_nivel, ... }>
}
```

### **Importar Matriculados**
```
POST /api/crm/colegios/import-matriculados
Content-Type: multipart/form-data o application/json

Body: {
  file: File (CSV/Excel) o
  data: Array<{ rbd, año, nivel, id_nivel, N_ALU, ... }>
}
```

### **Verificar Importación**
```
GET /api/crm/colegios/verificar-importacion

Response: {
  totalColegios: number,
  totalCursos: number,
  cursosConAlumnos: number,
  porcentajeCursosConAlumnos: string,
  cursosRecientes: Array<...>,
  colegiosRecientes: Array<...>
}
```

---

## 🔍 Cómo Verificar en Strapi

1. **Ver colegios creados**:
   - Ir a `Content Manager` → `Colegios`
   - Buscar por RBD o nombre
   - Verificar que el RBD coincida con el archivo

2. **Ver cursos creados**:
   - Ir a `Content Manager` → `Cursos`
   - Filtrar por colegio
   - Verificar que `nombre_curso` incluya el año
   - Verificar que `cantidad_alumnos` esté actualizado (si se importó matriculados)

3. **Verificar relaciones**:
   - Abrir un curso
   - Verificar que el campo `colegio` esté relacionado correctamente

---

## 📌 Notas Importantes

- **El proceso es idempotente**: Si se ejecuta dos veces, actualiza en lugar de duplicar
- **Los colegios no se sobrescriben**: Si ya existe, se usa el existente
- **Los cursos se actualizan si existen**: Se actualiza `nombre_curso`, `nivel`, `grado`, etc.
- **La cantidad de alumnos se actualiza**: Si se importa matriculados, se actualiza `cantidad_alumnos`
- **El proceso es optimizado**: Carga todo en memoria al inicio para evitar miles de llamadas

---

**Última actualización**: 2024
**Versión**: 1.0
