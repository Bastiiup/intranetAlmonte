# Explicación: Manejo de Contactos y Colegios en el Sistema

## 📋 Resumen Ejecutivo

El sistema utiliza una **relación indirecta** entre **Personas (Contactos)** y **Colegios** a través de una entidad intermedia llamada **"Trayectorias"** (`persona-trayectorias`). Esto permite que una persona pueda tener múltiples relaciones con diferentes colegios a lo largo del tiempo, con diferentes roles, cursos, niveles, etc.

---

## 🏗️ Estructura de Datos en Strapi

### 1. **Colegios** (`colegios`)
Content Type principal que representa instituciones educativas.

**Campos principales:**
- `colegio_nombre` (string)
- `rbd` (number) - RBD del colegio
- `estado` (enum: 'Por Verificar', 'Verificado', 'Aprobado')
- `dependencia` (string)
- `region`, `zona` (string)
- `comuna` (relación con `comunas`)
- `telefonos` (componente repeatable)
- `emails` (componente repeatable)
- `direcciones` (componente repeatable)
- `cartera_asignaciones` (relación con asignaciones comerciales)

**Endpoint Strapi:** `/api/colegios`

---

### 2. **Personas** (`personas`)
Content Type que representa contactos/personas del sistema.

**Campos principales:**
- `nombre_completo` (string)
- `nombres`, `primer_apellido`, `segundo_apellido` (string)
- `rut` (string)
- `activo` (boolean)
- `nivel_confianza` (enum: 'baja', 'media', 'alta')
- `origen` (enum: 'mineduc', 'csv', 'manual', 'crm', 'web', 'otro')
- `emails` (componente repeatable)
- `telefonos` (componente repeatable)
- `imagen` (media)
- `tags` (relación)
- `trayectorias` (relación Many-to-Many con `persona-trayectorias`)

**Endpoint Strapi:** `/api/personas`

---

### 3. **Trayectorias** (`persona-trayectorias`)
**ENTIDAD INTERMEDIA** que conecta Personas con Colegios. Esta es la clave del sistema.

**Campos principales:**
- `persona` (relación Many-to-One con `personas`)
- `colegio` (relación Many-to-One con `colegios`)
- `cargo` (string) - Ej: "Profesor", "Director", "Coordinador"
- `curso` (string) - Ej: "1° Básico", "Matemáticas"
- `nivel` (string) - Ej: "Básico", "Medio"
- `grado` (string) - Ej: "1°", "2°"
- `is_current` (boolean) - Indica si es la trayectoria actual

**Endpoint Strapi:** `/api/persona-trayectorias`

**Importante:** Una persona puede tener múltiples trayectorias (historial laboral/académico), y cada trayectoria conecta a un colegio específico.

---

## 🔗 Relación entre Personas y Colegios

```
Persona (1) ──< Trayectoria >── (1) Colegio
```

**Diagrama de relaciones:**
```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Persona   │◄────────┤  Trayectoria     ├────────►│  Colegio    │
│             │         │                  │         │             │
│ - nombre    │         │ - cargo          │         │ - nombre    │
│ - emails    │         │ - curso          │         │ - rbd       │
│ - telefonos │         │ - nivel          │         │ - estado    │
│ - rut       │         │ - grado          │         │ - comuna    │
│             │         │ - is_current     │         │             │
└─────────────┘         └──────────────────┘         └─────────────┘
```

**Ejemplo real:**
- **Persona:** "Juan Pérez"
- **Trayectoria 1:** 
  - Colegio: "Colegio San José"
  - Cargo: "Profesor"
  - Curso: "Matemáticas 3° Medio"
  - is_current: `true`
- **Trayectoria 2:**
  - Colegio: "Colegio San José" (mismo colegio, diferente rol)
  - Cargo: "Coordinador Académico"
  - is_current: `false` (historial)

---

## 🔍 Cómo Obtener Contactos de un Colegio

### Estrategia de Consulta

**Problema:** Strapi no permite hacer un populate inverso directo desde Colegio → Personas a través de Trayectorias en una sola query.

**Solución:** Buscar Personas que tengan trayectorias relacionadas con el colegio específico.

### Código de Ejemplo (API Route)

```typescript
// GET /api/crm/colegios/[id]/contacts

// 1. Construir query para buscar personas con trayectorias en este colegio
const paramsObj = new URLSearchParams({
  'filters[activo][$eq]': 'true',  // Solo personas activas
  'filters[trayectorias][colegio][id][$eq]': colegioId.toString(),  // Filtro por colegio
  'populate[trayectorias]': 'true',
  'populate[trayectorias.colegio]': 'true',
  'populate[emails]': 'true',
  'populate[telefonos]': 'true',
})

// 2. Hacer la consulta
const response = await strapiClient.get(`/api/personas?${paramsObj.toString()}`)

// 3. Filtrar trayectorias para mostrar solo las del colegio actual
const contactosFiltrados = contactos.map((contacto) => {
  const trayectorias = contacto.attributes.trayectorias || []
  
  // Filtrar solo las trayectorias de este colegio
  const trayectoriasDelColegio = trayectorias.filter((t) => {
    const colegio = t.colegio?.data || t.colegio
    const colegioIdTrayectoria = colegio?.id || colegio?.documentId
    return colegioIdTrayectoria === colegioId
  })

  return {
    ...contacto,
    attributes: {
      ...contacto.attributes,
      trayectorias: trayectoriasDelColegio,  // Solo trayectorias del colegio
    },
  }
})
```

### Sintaxis de Filtros en Strapi v4

Para filtrar por relaciones anidadas:
```
filters[trayectorias][colegio][id][$eq]=123
```

Esto significa: "Buscar personas donde alguna trayectoria tenga un colegio con id=123"

---

## 📊 Cómo Obtener Pedidos de un Colegio

### Relación Indirecta Compleja

Los pedidos se relacionan con colegios a través de una cadena de relaciones:

```
Pedido → Cliente (wo-clientes) → Persona → Trayectoria → Colegio
```

### Estrategia de Consulta (3 pasos)

```typescript
// GET /api/crm/colegios/[id]/pedidos

// PASO 1: Obtener personas con trayectorias en este colegio
const personasParams = new URLSearchParams({
  'filters[trayectorias][colegio][id][$eq]': colegioId.toString(),
})
const personasResponse = await strapiClient.get(`/api/personas?${personasParams.toString()}`)
const personaIds = personasResponse.data.map(p => p.documentId || p.id)

// PASO 2: Obtener clientes (wo-clientes) relacionados con esas personas
const clientesParams = new URLSearchParams({
  'populate[persona]': 'true',
})
personaIds.forEach((personaId, index) => {
  clientesParams.append(`filters[$or][${index}][persona][id][$eq]`, personaId)
})
const clientesResponse = await strapiClient.get(`/api/wo-clientes?${clientesParams.toString()}`)
const clienteIds = clientesResponse.data.map(c => c.documentId || c.id)

// PASO 3: Obtener pedidos relacionados con esos clientes
const pedidosParams = new URLSearchParams({
  'populate[cliente]': 'true',
  'populate[items]': 'true',
})
clienteIds.forEach((clienteId, index) => {
  pedidosParams.append(`filters[$or][${index}][cliente][id][$eq]`, clienteId)
})
const pedidosResponse = await strapiClient.get(`/api/pedidos?${pedidosParams.toString()}`)
```

**Nota:** Se usa `$or` porque Strapi no permite `$in` directamente en algunos casos.

---

## 🎯 Casos de Uso Comunes

### 1. **Obtener todos los contactos de un colegio**
```typescript
GET /api/crm/colegios/{colegioId}/contacts
```
- Retorna personas que tienen al menos una trayectoria con ese colegio
- Incluye todas las trayectorias de cada persona (filtradas por colegio)
- Muestra emails, teléfonos, cargo, curso, nivel, grado

### 2. **Agrupar contactos por curso/cargo**
```typescript
// En el frontend, después de obtener contactos:
const contactosPorCargo = contactos.reduce((grupos, contacto) => {
  const trayectoria = contacto.trayectorias?.find(t => t.is_current) || contacto.trayectorias?.[0]
  const grupo = trayectoria?.curso || trayectoria?.nivel || trayectoria?.cargo || 'Sin cargo'
  
  if (!grupos[grupo]) grupos[grupo] = []
  grupos[grupo].push(contacto)
  return grupos
}, {})
```

### 3. **Obtener pedidos de alumnos de un colegio**
```typescript
GET /api/crm/colegios/{colegioId}/pedidos
```
- Retorna pedidos de clientes que son personas con trayectorias en ese colegio
- Incluye información del cliente, items, total, estado

### 4. **Crear una nueva trayectoria**
```typescript
POST /api/persona-trayectorias
{
  data: {
    persona: { connect: [personaId] },
    colegio: { connect: [colegioId] },
    cargo: "Profesor",
    curso: "Matemáticas",
    nivel: "Medio",
    grado: "3°",
    is_current: true
  }
}
```

---

## ⚠️ Consideraciones Importantes

### 1. **IDs en Strapi v4**
Strapi v4 puede usar dos tipos de IDs:
- `id` (number) - ID numérico interno
- `documentId` (string) - ID de documento (más común en v4)

**Siempre verificar ambos:**
```typescript
const id = entity.documentId || entity.id
```

### 2. **Populate Anidado en Strapi v4**
Sintaxis correcta para populate anidado:
```typescript
// ✅ Correcto
'populate[cartera_asignaciones][populate][ejecutivo]': 'true'

// ❌ Incorrecto
'populate[cartera_asignaciones.ejecutivo]': 'true'
```

### 3. **Filtros por Relaciones Anidadas**
Para filtrar personas por colegio en trayectorias:
```typescript
'filters[trayectorias][colegio][id][$eq]': colegioId.toString()
```

### 4. **Múltiples Trayectorias**
Una persona puede tener múltiples trayectorias:
- Diferentes colegios
- Mismo colegio, diferentes roles/cursos
- Historial (is_current: false) y actual (is_current: true)

**Siempre filtrar trayectorias después de obtener los datos:**
```typescript
const trayectoriasDelColegio = trayectorias.filter(t => 
  t.colegio?.id === colegioId || t.colegio?.documentId === colegioId
)
```

---

## 📝 Resumen para Otra IA

**Pregunta:** "¿Cómo se relacionan contactos y colegios?"

**Respuesta:**
1. **No hay relación directa** entre Personas y Colegios
2. **Se usa una entidad intermedia:** `persona-trayectorias`
3. **Una trayectoria conecta:** una Persona + un Colegio + información contextual (cargo, curso, nivel, grado)
4. **Para obtener contactos de un colegio:** Buscar personas con `filters[trayectorias][colegio][id][$eq]=X`
5. **Para obtener pedidos de un colegio:** Personas → Clientes → Pedidos (3 pasos)
6. **Una persona puede tener múltiples trayectorias** (historial en diferentes colegios/roles)
7. **Siempre filtrar trayectorias** después de obtener datos para mostrar solo las relevantes

**Estructura clave:**
```
Persona ──< Trayectoria (cargo, curso, nivel, is_current) >── Colegio
```
