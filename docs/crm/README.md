# 📚 Documentación del CRM - Sistema de Gestión de Colegios y Contactos

**Última actualización:** Enero 2026  
**Versión:** 2.0

---

## 📋 Tabla de Contenidos

1. [Arquitectura de Datos](#arquitectura-de-datos)
2. [Estructura en Strapi](#estructura-en-strapi)
3. [Endpoints API](#endpoints-api)
4. [Guía de Uso](#guía-de-uso)
5. [Troubleshooting](#troubleshooting)
6. [Consideraciones Técnicas](#consideraciones-técnicas)

---

## 🏗️ Arquitectura de Datos

### Modelo de Relaciones

El sistema utiliza una **relación indirecta** entre **Personas (Contactos)** y **Colegios** a través de una entidad intermedia llamada **"Trayectorias"** (`persona-trayectorias`).

```
Persona ──(1:N)──> Trayectoria ──(N:1)──> Colegio
```

**Diagrama:**
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

**Ventajas:**
- Una persona puede tener múltiples relaciones con diferentes colegios
- Historial completo de trayectorias (pasadas y actuales)
- Información contextual por trayectoria (cargo, curso, nivel, grado)

---

## 📊 Estructura en Strapi

### 1. Content Type: `colegios`

**Campos principales:**
- `colegio_nombre` (Text) *
- `rbd` (Number) *
- `estado` (Enumeration)
- `dependencia` (Enumeration)
- `region`, `zona` (Text)
- `comuna` (Relation manyToOne → `comunas`)
- `persona_trayectorias` (Relation oneToMany → `profesores`)

**Componentes repeatables:**
- `telefonos` - Teléfonos del colegio
- `emails` - Emails del colegio
- `direcciones` - Direcciones del colegio
- `logo` - Logo del colegio

**Endpoint:** `/api/colegios`

---

### 2. Content Type: `personas`

**Campos principales:**
- `nombre_completo` (Text)
- `nombres`, `primer_apellido`, `segundo_apellido` (Text)
- `rut` (Text)
- `activo` (Boolean)
- `nivel_confianza` (Enumeration)
- `origen` (Enumeration)
- `trayectorias` (Relation oneToMany → `profesores`)

**Componentes repeatables:**
- `emails` - Emails de contacto
- `telefonos` - Teléfonos de contacto
- `imagen` - Imagen de perfil

**Endpoint:** `/api/personas`

---

### 3. Content Type: `profesores` (Trayectorias)

**⚠️ IMPORTANTE:** En Strapi Admin aparece como "Colegio · Profesores", pero el endpoint es `/api/profesores` o `/api/persona-trayectorias`.

**Campos principales:**
- `persona` (Relation manyToOne → `personas`)
- `colegio` (Relation manyToOne → `colegios`)
- `cargo` (String, opcional)
- `curso` (Relation → `curso`)
- `asignatura` (Relation → `asignatura`)
- `anio` (Integer) - Año académico
- `fecha_inicio`, `fecha_fin` (Date)
- `is_current` (Boolean) - Indica si es la trayectoria actual
- `activo` (Boolean)

**Endpoint:** `/api/profesores` o `/api/persona-trayectorias`

---

## 🔌 Endpoints API

### Colegios

```
GET    /api/crm/colegios              # Listar colegios
GET    /api/crm/colegios/[id]         # Detalle de colegio
POST   /api/crm/colegios              # Crear colegio
PUT    /api/crm/colegios/[id]         # Actualizar colegio
DELETE /api/crm/colegios/[id]         # Eliminar colegio
GET    /api/crm/colegios/list         # Lista simple para selectores
GET    /api/crm/colegios/[id]/contacts    # Contactos del colegio
GET    /api/crm/colegios/[id]/pedidos    # Pedidos del colegio
GET    /api/crm/colegios/[id]/leads      # Leads del colegio
GET    /api/crm/colegios/[id]/activities # Actividades del colegio
```

### Personas/Contactos

```
GET    /api/crm/personas              # Listar personas
GET    /api/crm/contacts              # Listar contactos
GET    /api/crm/contacts/[id]         # Detalle de contacto
POST   /api/crm/contacts              # Crear contacto
PUT    /api/crm/contacts/[id]         # Actualizar contacto
```

### Trayectorias

```
POST   /api/persona-trayectorias      # Crear trayectoria
PUT    /api/persona-trayectorias/[id] # Actualizar trayectoria
DELETE /api/persona-trayectorias/[id] # Eliminar trayectoria
```

---

## 📖 Guía de Uso

### Obtener Contactos de un Colegio

**Endpoint:** `GET /api/crm/colegios/[id]/contacts`

**Estrategia:** Buscar personas que tengan trayectorias relacionadas con el colegio específico.

**Ejemplo de query:**
```typescript
const params = new URLSearchParams({
  'filters[activo][$eq]': 'true',
  'filters[trayectorias][colegio][id][$eq]': colegioId.toString(),
  'populate[trayectorias]': 'true',
  'populate[trayectorias][populate][colegio]': 'true',
  'populate[emails]': 'true',
  'populate[telefonos]': 'true',
})
```

### Crear Contacto con Trayectoria

**Flujo:**
1. Crear la persona: `POST /api/crm/contacts`
2. Crear la trayectoria: `POST /api/persona-trayectorias`

**Ejemplo:**
```typescript
// 1. Crear persona
const personaResponse = await fetch('/api/crm/contacts', {
  method: 'POST',
  body: JSON.stringify({
    nombres: "Juan",
    primer_apellido: "Pérez",
    rut: "12345678-9",
    emails: [{ email: "juan@example.com", principal: true }],
  }),
})
const personaId = personaResponse.data.documentId || personaResponse.data.id

// 2. Crear trayectoria
await fetch('/api/persona-trayectorias', {
  method: 'POST',
  body: JSON.stringify({
    data: {
      persona: { connect: [parseInt(personaId)] },
      colegio: { connect: [colegioId] },
      cargo: "Profesor",
      curso: { connect: [cursoId] },
      asignatura: { connect: [asignaturaId] },
      anio: 2026,
      is_current: true,
    },
  }),
})
```

### Editar Contacto y Trayectorias

**Componente:** `TrayectoriaManager`

**Funcionalidades:**
- ✅ Agregar nueva trayectoria
- ✅ Editar trayectoria existente
- ✅ Eliminar trayectoria
- ✅ Marcar trayectoria como actual (`is_current`)

**Uso:**
```typescript
<TrayectoriaManager
  trayectorias={formData.trayectorias || []}
  onChange={(trayectorias) => setFormData({ ...formData, trayectorias })}
/>
```

---

## 🔧 Troubleshooting

### Problema: Contactos no aparecen en colegio

**Causas posibles:**
1. Filtro de trayectorias incorrecto
2. IDs inválidos (0, null, undefined)
3. Populate no incluye todas las relaciones necesarias

**Solución:**
1. Verificar que las trayectorias se crearon correctamente
2. Usar IDs numéricos para `connect` en Strapi
3. Asegurar populate completo: `populate[trayectorias][populate][colegio]=*`

### Problema: Datos no se guardan

**Causas posibles:**
1. IDs inválidos al crear trayectorias
2. Formato de `connect` incorrecto
3. Campos requeridos faltantes

**Solución:**
```typescript
// Validar IDs antes de crear
if (!personaId || personaId === 0 || isNaN(personaId)) {
  throw new Error('ID de persona inválido')
}

// Usar formato correcto de connect
{
  data: {
    persona: { connect: [parseInt(personaId)] },  // Array con ID numérico
    colegio: { connect: [parseInt(colegioId)] },
  }
}
```

### Problema: Endpoint de trayectorias no funciona

**Verificar:**
1. El nombre real del content type en Strapi Admin
2. Probar diferentes endpoints: `/api/profesores`, `/api/persona-trayectorias`
3. Verificar permisos en Strapi

---

## ⚙️ Consideraciones Técnicas

### IDs en Strapi v4

Strapi v4 puede usar dos tipos de IDs:
- `id` (number) - ID numérico interno
- `documentId` (string) - ID de documento (más común)

**Siempre verificar ambos:**
```typescript
const id = entity.documentId || entity.id
```

**Para `connect` en relaciones, usar ID numérico:**
```typescript
// Convertir documentId a id numérico si es necesario
const personaResponse = await strapiClient.get(`/api/personas/${documentId}?fields=id`)
const personaIdNum = personaResponse.data.id
```

### Sintaxis de Populate en Strapi v4

**✅ Correcto:**
```
populate[trayectorias][populate][colegio]=*
populate[trayectorias][populate][curso]=*
```

**❌ Incorrecto:**
```
populate[trayectorias.colegio]=*
```

### Filtros por Relaciones Anidadas

Para filtrar personas por colegio en trayectorias:
```typescript
'filters[trayectorias][colegio][id][$eq]': colegioId.toString()
```

### Connect en Strapi v4

Para relacionar entidades al crear/actualizar:
```typescript
{
  data: {
    persona: { connect: [personaIdNum] },  // Array con ID numérico
    colegio: { connect: [colegioIdNum] },
  }
}
```

---

## 📁 Archivos Clave

### Frontend
- `src/app/(admin)/(apps)/crm/colegios/[id]/page.tsx` - Vista detallada de colegio
- `src/app/(admin)/(apps)/crm/personas/[id]/editar/page.tsx` - Editar persona
- `src/app/(admin)/(apps)/crm/personas/nuevo/page.tsx` - Crear persona
- `src/app/(admin)/(apps)/crm/personas/components/TrayectoriaManager.tsx` - Gestor de trayectorias
- `src/app/(admin)/(apps)/crm/personas/components/PersonaForm.tsx` - Formulario de persona

### Backend (API Routes)
- `src/app/api/crm/colegios/[id]/contacts/route.ts` - Obtener contactos de colegio
- `src/app/api/crm/contacts/[id]/route.ts` - GET/PUT/DELETE contacto
- `src/app/api/crm/contacts/route.ts` - POST contacto
- `src/app/api/persona-trayectorias/route.ts` - POST trayectoria
- `src/app/api/persona-trayectorias/[id]/route.ts` - PUT/DELETE trayectoria

---

## 📝 Notas Importantes

1. **Content Type `profesores`:**
   - El endpoint puede ser `/api/profesores` o `/api/persona-trayectorias`
   - Verificar en Strapi Admin cuál es el nombre técnico real

2. **IDs en Strapi:**
   - Para `connect` en relaciones, siempre usar el ID numérico (`id`), no `documentId`
   - Para búsquedas, puedes usar ambos

3. **Populate en Strapi v4:**
   - Sintaxis correcta: `populate[relacion][populate][subrelacion]`
   - Sintaxis incorrecta: `populate[relacion.subrelacion]`

4. **Trayectorias:**
   - Una persona puede tener múltiples trayectorias
   - Solo una trayectoria puede tener `is_current: true`
   - Las trayectorias conectan `persona` + `colegio` + datos contextuales (cargo, curso, asignatura, año)

---

**Última actualización:** Enero 2026

