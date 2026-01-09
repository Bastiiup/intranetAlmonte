# 📚 Manejo Actual de Colegios y Contactos

**Última actualización:** Enero 2026  
**Versión:** 2.0 - Con gestión completa de trayectorias

---

## 🏗️ Arquitectura de Datos

### Modelos en Strapi

1. **`colegios`** - Colegios/escuelas
2. **`personas`** - Personas/contactos/colaboradores
3. **`persona-trayectorias`** - Relación entre personas y colegios (con cargo, curso, nivel, grado, is_current)

### Relaciones

```
Persona ──(1:N)──> Persona-Trayectoria ──(N:1)──> Colegio
```

**Campos de `persona-trayectorias`:**
- `persona` (relación con `personas`)
- `colegio` (relación con `colegios`)
- `cargo` (string, opcional)
- `curso` (string, opcional)
- `nivel` (string, opcional)
- `grado` (string, opcional)
- `is_current` (boolean) - Indica si es la trayectoria actual

---

## 🔍 1. Obtener Contactos de un Colegio

### Endpoint
```
GET /api/crm/colegios/[id]/contacts
```

### Implementación
**Archivo:** `frontend-ubold/src/app/api/crm/colegios/[id]/contacts/route.ts`

```typescript
// Estrategia: Filtrar personas que tengan trayectorias en este colegio
const paramsObj = new URLSearchParams({
  'filters[activo][$eq]': 'true',
  'filters[trayectorias][colegio][id][$eq]': colegioId.toString(),
  'populate[trayectorias]': 'true',
  'populate[trayectorias][populate][colegio]': 'true',
})

const response = await strapiClient.get(`/api/personas?${paramsObj.toString()}`)

// Filtrar solo las trayectorias de este colegio específico
const contactosFiltrados = contactos.map((contacto) => {
  const trayectoriasDelColegio = trayectorias.filter((t) => {
    const colegioIdTrayectoria = colegio?.id || colegio?.documentId
    return colegioIdTrayectoria === colegioId
  })
  return { ...contacto, attributes: { ...attrs, trayectorias: trayectoriasDelColegio } }
})
```

### Uso en Frontend
**Archivo:** `frontend-ubold/src/app/(admin)/(apps)/crm/colegios/[id]/page.tsx`

```typescript
const fetchContactos = async () => {
  const response = await fetch(`/api/crm/colegios/${colegioId}/contacts`)
  const result = await response.json()
  if (response.ok && result.success) {
    const contactosData = Array.isArray(result.data) ? result.data : [result.data]
    const contactosTransformed = contactosData.map((contacto) => {
      const attrs = contacto.attributes || contacto
      return {
        id: contacto.documentId || contacto.id,
        nombre_completo: attrs.nombre_completo,
        rut: attrs.rut,
        emails: attrs.emails || [],
        telefonos: attrs.telefonos || [],
        trayectorias: attrs.trayectorias || [], // Solo trayectorias de este colegio
      }
    })
    setContactos(contactosTransformed)
  }
}
```

---

## ✏️ 2. Editar Persona/Contacto

### Endpoint
```
PUT /api/crm/contacts/[id]
```

### Flujo Completo

#### Paso 1: Obtener datos de la persona (con trayectorias)
**Archivo:** `frontend-ubold/src/app/(admin)/(apps)/crm/personas/[id]/editar/page.tsx`

```typescript
const fetchPersona = async () => {
  const response = await fetch(`/api/crm/contacts/${personaId}`)
  const result = await response.json()
  const persona = result.data
  const attrs = persona.attributes || persona

  // Transformar trayectorias
  const trayectorias = (attrs.trayectorias || []).map((t) => {
    const tAttrs = t.attributes || t
    const colegio = tAttrs.colegio?.data?.attributes || tAttrs.colegio?.attributes || tAttrs.colegio
    return {
      id: t.id || t.documentId,
      documentId: t.documentId || String(t.id || ''),
      colegioId: colegio?.id || colegio?.documentId,
      colegioNombre: colegio?.colegio_nombre || 'Sin nombre',
      cargo: tAttrs.cargo || '',
      curso: tAttrs.curso || '',
      nivel: tAttrs.nivel || '',
      grado: tAttrs.grado || '',
      is_current: tAttrs.is_current !== undefined ? tAttrs.is_current : false,
    }
  })

  setFormData({ ...formData, trayectorias })
}
```

#### Paso 2: Usar TrayectoriaManager para editar
**Componente:** `frontend-ubold/src/app/(admin)/(apps)/crm/personas/components/TrayectoriaManager.tsx`

```typescript
<TrayectoriaManager
  trayectorias={formData.trayectorias || []}
  onChange={(trayectorias) => setFormData({ ...formData, trayectorias })}
/>
```

**Funcionalidades del TrayectoriaManager:**
- ✅ Agregar nueva trayectoria (con búsqueda de colegios)
- ✅ Editar trayectoria existente
- ✅ Eliminar trayectoria (marca para borrado)
- ✅ Marcar trayectoria como actual (`is_current`)
- ✅ Campos: colegio, cargo, curso, nivel, grado, is_current

#### Paso 3: Guardar cambios
**Archivo:** `frontend-ubold/src/app/(admin)/(apps)/crm/personas/[id]/editar/page.tsx`

```typescript
const handleSubmit = async (data) => {
  // 1. Actualizar datos básicos de la persona
  const response = await fetch(`/api/crm/contacts/${personaId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombres: data.nombres,
      primer_apellido: data.primer_apellido,
      // ... otros campos
    }),
  })

  // 2. Gestionar trayectorias
  if (data.trayectorias && Array.isArray(data.trayectorias)) {
    // Separar en categorías
    const trayectoriasToCreate = data.trayectorias.filter(t => t.isNew && !t.toDelete)
    const trayectoriasToUpdate = data.trayectorias.filter(t => !t.isNew && !t.toDelete && t.isEditing)
    const trayectoriasToDelete = data.trayectorias.filter(t => t.toDelete && !t.isNew)

    // Crear nuevas
    for (const trayectoria of trayectoriasToCreate) {
      await fetch('/api/persona-trayectorias', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            persona: { connect: [parseInt(personaId)] },
            colegio: { connect: [parseInt(String(trayectoria.colegioId))] },
            cargo: trayectoria.cargo || null,
            curso: trayectoria.curso || null,
            nivel: trayectoria.nivel || null,
            grado: trayectoria.grado || null,
            is_current: trayectoria.is_current || false,
          },
        }),
      })
    }

    // Actualizar existentes
    for (const trayectoria of trayectoriasToUpdate) {
      const trayectoriaId = trayectoria.documentId || trayectoria.id
      await fetch(`/api/persona-trayectorias/${trayectoriaId}`, {
        method: 'PUT',
        body: JSON.stringify({
          data: {
            colegio: { connect: [parseInt(String(trayectoria.colegioId))] },
            cargo: trayectoria.cargo || null,
            curso: trayectoria.curso || null,
            nivel: trayectoria.nivel || null,
            grado: trayectoria.grado || null,
            is_current: trayectoria.is_current || false,
          },
        }),
      })
    }

    // Eliminar
    for (const trayectoria of trayectoriasToDelete) {
      const trayectoriaId = trayectoria.documentId || trayectoria.id
      await fetch(`/api/persona-trayectorias/${trayectoriaId}`, {
        method: 'DELETE',
      })
    }
  }
}
```

### API Backend: Manejo de IDs
**Archivo:** `frontend-ubold/src/app/api/crm/contacts/[id]/route.ts`

**Problema:** Strapi puede usar `id` (numérico) o `documentId` (string alfanumérico).

**Solución:** Convertir `documentId` a `id` numérico antes de filtrar trayectorias.

```typescript
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // Obtener el ID numérico si tenemos documentId
  let personaIdNum: number | string = id
  const isDocumentId = typeof id === 'string' && !/^\d+$/.test(id)
  
  if (isDocumentId) {
    // Intentar obtener la persona para obtener su ID numérico
    const personaResponse = await strapiClient.get(`/api/personas/${id}?fields=id`)
    if (personaResponse.data?.id) {
      personaIdNum = personaResponse.data.id
    }
  }
  
  // Usar personaIdNum para filtrar trayectorias
  const trayectoriasResponse = await strapiClient.get(
    `/api/persona-trayectorias?filters[persona][id][$eq]=${personaIdNum}&filters[is_current][$eq]=true`
  )
}
```

---

## ➕ 3. Crear Nueva Persona/Contacto

### Endpoint
```
POST /api/crm/contacts
```

### Flujo Completo

#### Paso 1: Formulario con TrayectoriaManager
**Archivo:** `frontend-ubold/src/app/(admin)/(apps)/crm/personas/nuevo/page.tsx`

```typescript
<PersonaForm
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  initialTrayectorias={[]} // Permite agregar trayectorias desde el inicio
/>
```

#### Paso 2: Crear persona primero
```typescript
const handleSubmit = async (data) => {
  // 1. Crear la persona
  const response = await fetch('/api/crm/contacts', {
    method: 'POST',
    body: JSON.stringify({
      nombres: data.nombres,
      primer_apellido: data.primer_apellido,
      // ... otros campos
    }),
  })

  const result = await response.json()
  const personaId = result.data.documentId || result.data.id
```

#### Paso 3: Crear trayectorias después
```typescript
  // 2. Crear trayectorias si existen
  if (data.trayectorias && Array.isArray(data.trayectorias) && data.trayectorias.length > 0) {
    const trayectoriasToCreate = data.trayectorias.filter(t => !t.toDelete && t.colegioId)
    
    for (const trayectoria of trayectoriasToCreate) {
      await fetch('/api/persona-trayectorias', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            persona: { connect: [parseInt(String(personaId))] },
            colegio: { connect: [parseInt(String(trayectoria.colegioId))] },
            cargo: trayectoria.cargo || null,
            curso: trayectoria.curso || null,
            nivel: trayectoria.nivel || null,
            grado: trayectoria.grado || null,
            is_current: trayectoria.is_current || false,
          },
        }),
      })
    }
  }
}
```

---

## 🔧 4. API Routes para Trayectorias

### POST /api/persona-trayectorias
**Archivo:** `frontend-ubold/src/app/api/persona-trayectorias/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Validaciones
  if (!body.data.persona || !body.data.colegio) {
    return NextResponse.json({ error: 'Persona y colegio son obligatorios' }, { status: 400 })
  }

  const response = await strapiClient.post('/api/persona-trayectorias', body)
  return NextResponse.json({ success: true, data: response.data })
}
```

### PUT /api/persona-trayectorias/[id]
**Archivo:** `frontend-ubold/src/app/api/persona-trayectorias/[id]/route.ts`

```typescript
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  const response = await strapiClient.put(`/api/persona-trayectorias/${id}`, body)
  return NextResponse.json({ success: true, data: response.data })
}
```

### DELETE /api/persona-trayectorias/[id]
```typescript
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await strapiClient.delete(`/api/persona-trayectorias/${id}`)
  return NextResponse.json({ success: true })
}
```

---

## 📊 5. Vista Detallada de Colegio

### Endpoint
```
GET /api/crm/colegios/[id]
```

### Componente Principal
**Archivo:** `frontend-ubold/src/app/(admin)/(apps)/crm/colegios/[id]/page.tsx`

### Tabs Disponibles

1. **Información**
   - Datos básicos del colegio
   - Contactos asociados (con agrupación por cargo/curso)
   - Ubicación
   - Ejecutivo comercial

2. **Colaboradores**
   - Tabla/cards con:
     - Foto de perfil
     - Nombre completo
     - Cargo actual
     - Curso/Nivel/Grado
     - Todos los emails
     - Todos los teléfonos
     - Acciones: Ver perfil, Editar, Contactar

3. **Pedidos**
   - Alumnos que están comprando
   - Query en 3 pasos:
     - Personas con trayectorias en este colegio
     - Clientes de esas personas
     - Pedidos de esos clientes
   - Tabla con: nombre estudiante, fecha pedido, estado, total, materiales solicitados

4. **Materiales Más Pedidos**
   - Top 10 materiales más solicitados
   - Agrupado por producto
   - Cantidad total y valor total

5. **Leads**
   - Leads relacionados con el colegio

6. **Actividades**
   - Actividades relacionadas con el colegio

### Estadísticas Rápidas (Cards)
- Total colaboradores activos
- Total alumnos comprando
- Total pedidos del colegio
- Valor total vendido al colegio

---

## 🎯 6. Componente TrayectoriaManager

### Props
```typescript
interface TrayectoriaManagerProps {
  trayectorias: TrayectoriaItem[]
  onChange: (trayectorias: TrayectoriaItem[]) => void
  disabled?: boolean
}
```

### Funcionalidades

1. **Búsqueda de Colegios**
   - Búsqueda con debounce (300ms)
   - Endpoint: `/api/crm/colegios/list?search=...`
   - Muestra: nombre, RBD

2. **Agregar Trayectoria**
   - Botón "Agregar Trayectoria"
   - Formulario inline con:
     - Selector de colegio (búsqueda)
     - Campo cargo
     - Campo curso
     - Campo nivel
     - Campo grado
     - Checkbox `is_current`

3. **Editar Trayectoria**
   - Botón editar en cada trayectoria
   - Modo edición inline
   - Guardar cambios

4. **Eliminar Trayectoria**
   - Botón eliminar
   - Si es nueva: elimina directamente
   - Si existe: marca `toDelete: true` para borrado posterior

5. **Marcar como Actual**
   - Checkbox `is_current`
   - Al marcar una, desmarca las demás automáticamente

### Estados de Trayectoria
```typescript
interface TrayectoriaItem {
  id?: string | number
  documentId?: string
  colegioId?: number | string
  colegioNombre?: string
  cargo?: string
  curso?: string
  nivel?: string
  grado?: string
  is_current?: boolean
  isNew?: boolean        // Nueva trayectoria (no existe en BD)
  isEditing?: boolean    // Modo edición activo
  toDelete?: boolean     // Marcada para eliminar
}
```

---

## ⚠️ 7. Consideraciones Importantes

### IDs en Strapi v4

Strapi v4 puede usar dos tipos de IDs:
- **`id`**: Numérico (ej: `123`)
- **`documentId`**: String alfanumérico (ej: `xvule1pp5in57iyezi3bwnka`)

**Solución:** Siempre verificar y convertir cuando sea necesario:

```typescript
// Detectar si es documentId
const isDocumentId = typeof id === 'string' && !/^\d+$/.test(id)

// Obtener ID numérico si es necesario
if (isDocumentId) {
  const personaResponse = await strapiClient.get(`/api/personas/${id}?fields=id`)
  personaIdNum = personaResponse.data.id
}
```

### Sintaxis de Populate en Strapi v4

**❌ Incorrecto:**
```
populate[cartera_asignaciones.ejecutivo]=true
```

**✅ Correcto:**
```
populate[cartera_asignaciones][populate][ejecutivo]=true
```

### Filtros en Relaciones Anidadas

Para filtrar personas por colegio en trayectorias:

```typescript
// Correcto
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

## 📝 8. Ejemplo Completo: Crear Persona con Trayectorias

```typescript
// 1. Usuario completa formulario en /crm/personas/nuevo
const formData = {
  nombres: "Juan",
  primer_apellido: "Pérez",
  emails: [{ email: "juan@example.com", principal: true }],
  telefonos: [{ telefono_norm: "+56912345678", principal: true }],
  trayectorias: [
    {
      isNew: true,
      colegioId: 123,
      colegioNombre: "Colegio San Juan",
      cargo: "Profesor",
      curso: "Matemáticas",
      nivel: "Media",
      grado: "1° Medio",
      is_current: true,
    }
  ]
}

// 2. Frontend envía POST /api/crm/contacts
const response = await fetch('/api/crm/contacts', {
  method: 'POST',
  body: JSON.stringify(formData)
})
const personaId = response.data.documentId // "abc123xyz"

// 3. Frontend crea trayectorias
for (const trayectoria of formData.trayectorias) {
  await fetch('/api/persona-trayectorias', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        persona: { connect: [parseInt(personaId)] },
        colegio: { connect: [trayectoria.colegioId] },
        cargo: trayectoria.cargo,
        curso: trayectoria.curso,
        nivel: trayectoria.nivel,
        grado: trayectoria.grado,
        is_current: trayectoria.is_current,
      }
    })
  })
}

// 4. Ahora la persona aparece en:
//    - /crm/personas (listado)
//    - /crm/colegios/123 (como contacto del colegio)
```

---

## 🔄 9. Flujo de Sincronización

1. **Crear/Editar Persona** → Actualiza `personas`
2. **Crear/Editar Trayectoria** → Actualiza `persona-trayectorias`
3. **Ver Colegio** → Consulta `personas` filtradas por `trayectorias.colegio`
4. **Ver Persona** → Consulta `personas` con `populate[trayectorias]`

**Revalidación:**
```typescript
revalidatePath('/crm/personas')
revalidatePath('/crm/colegios')
revalidateTag('personas')
```

---

## 📚 Archivos Clave

### Frontend
- `frontend-ubold/src/app/(admin)/(apps)/crm/colegios/[id]/page.tsx` - Vista detallada de colegio
- `frontend-ubold/src/app/(admin)/(apps)/crm/personas/[id]/editar/page.tsx` - Editar persona
- `frontend-ubold/src/app/(admin)/(apps)/crm/personas/nuevo/page.tsx` - Crear persona
- `frontend-ubold/src/app/(admin)/(apps)/crm/personas/components/TrayectoriaManager.tsx` - Gestor de trayectorias
- `frontend-ubold/src/app/(admin)/(apps)/crm/personas/components/PersonaForm.tsx` - Formulario de persona

### Backend (API Routes)
- `frontend-ubold/src/app/api/crm/colegios/[id]/contacts/route.ts` - Obtener contactos de colegio
- `frontend-ubold/src/app/api/crm/contacts/[id]/route.ts` - GET/PUT/DELETE contacto
- `frontend-ubold/src/app/api/crm/contacts/route.ts` - POST contacto
- `frontend-ubold/src/app/api/persona-trayectorias/route.ts` - POST trayectoria
- `frontend-ubold/src/app/api/persona-trayectorias/[id]/route.ts` - PUT/DELETE trayectoria

---

## ✅ Resumen de Mejoras Recientes

1. ✅ **Gestión completa de trayectorias** - Agregar, editar, eliminar
2. ✅ **Componente TrayectoriaManager** - Reutilizable y completo
3. ✅ **Manejo de IDs** - Soporte para `id` numérico y `documentId` string
4. ✅ **Campos adicionales** - curso, nivel, grado en trayectorias
5. ✅ **Vista detallada de colegio** - Con estadísticas y múltiples tabs
6. ✅ **Agrupación de contactos** - Por cargo, curso, nivel
7. ✅ **Validaciones** - En frontend y backend
8. ✅ **Feedback visual** - Notificaciones de éxito/error

---

**Fin del documento**
