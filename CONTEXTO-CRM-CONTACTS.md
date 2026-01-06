# Contexto: Sistema de Contactos CRM (`/crm/contacts`)

## 📋 Resumen Ejecutivo

El sistema de contactos CRM es una aplicación Next.js 16 que gestiona contactos (personas) integrada con Strapi v4 como backend. La ruta `/crm/contacts` muestra un listado de contactos con funcionalidades de búsqueda, filtrado, paginación y CRUD completo.

---

## 🏗️ Arquitectura del Sistema

### Flujo de Datos

```
Usuario → /crm/contacts
    ↓
page.tsx (Componente React Client-Side)
    ↓
data.ts → getContacts()
    ↓
/api/crm/contacts (API Route - Next.js)
    ↓
Strapi Client → /api/personas (Strapi v4)
    ↓
Datos transformados → ContactType
    ↓
TanStack Table → UI Renderizada
```

---

## 📁 Estructura de Archivos

### 1. **Frontend - Página Principal**
**`frontend-ubold/src/app/(admin)/(apps)/crm/contacts/page.tsx`**

- **Tipo**: Componente React Client-Side (`'use client'`)
- **Responsabilidades**:
  - Renderiza la tabla de contactos usando TanStack Table
  - Maneja estados: loading, error, paginación, filtros
  - Integra modales de agregar/editar contactos
  - Búsqueda global y filtros por origen/confianza
  - Paginación del lado del servidor

- **Estados principales**:
  ```typescript
  - contactsData: ContactType[]
  - loading: boolean
  - error: string | null
  - pagination: { pageIndex: number, pageSize: number }
  - globalFilter: string
  - filtroOrigen: string
  - filtroConfianza: string
  ```

- **Columnas de la tabla**:
  - `select`: Checkbox de selección
  - `contacto`: Nombre + avatar + cargo
  - `empresa`: Institución + dependencia
  - `ubicacion`: Comuna + región + zona
  - `datosColegio`: Teléfonos, emails, website del colegio
  - `contactoInfo`: Email y teléfono del contacto
  - `representanteComercial`: Nombre del ejecutivo asignado
  - `fechaOrigen`: Fecha de creación + badge "Nuevo" + origen
  - `label`: Etiqueta de confianza (Cold Lead, Prospect, Hot Lead)
  - `categories`: Categorías basadas en tags y origen
  - `actions`: Botón de editar

---

### 2. **Frontend - Lógica de Datos**
**`frontend-ubold/src/app/(admin)/(apps)/crm/contacts/data.ts`**

- **Función principal**: `getContacts(query: ContactsQuery): Promise<ContactsResult>`
  - Llama a `/api/crm/contacts` con parámetros de query
  - Transforma datos de Strapi a `ContactType`
  - Maneja paginación y metadatos

- **Función de transformación**: `transformPersonaToContact(persona: PersonaEntity): ContactType`
  - Convierte datos de Strapi (`PersonaAttributes`) a formato de UI (`ContactType`)
  - Maneja diferentes formatos de respuesta de Strapi (con/sin `attributes`, `data`, etc.)
  - Extrae datos anidados: trayectorias → colegio → comuna → región
  - Mapea `nivel_confianza` → `label` (Cold Lead, Prospect, Hot Lead)
  - Mapea `origen` → `categories`
  - Extrae representante comercial de `cartera_asignaciones`

- **Tipos importantes**:
  ```typescript
  type ContactsQuery = {
    page?: number
    pageSize?: number
    search?: string
    origin?: string[]
    confidence?: string
  }
  
  type ContactsResult = {
    contacts: ContactType[]
    pagination: {
      page: number
      pageSize: number
      total: number
      pageCount: number
    }
  }
  ```

---

### 3. **Backend - API Routes**

#### **`frontend-ubold/src/app/api/crm/contacts/route.ts`**

**GET `/api/crm/contacts`**
- Obtiene listado de contactos desde Strapi
- **Query params**:
  - `page`: Número de página (default: 1)
  - `pageSize`: Tamaño de página (default: 50)
  - `search`: Búsqueda por nombre_completo, email o rut
  - `origin`: Filtro por origen (mineduc, csv, manual, crm, web, otro)
  - `confidence`: Filtro por nivel_confianza (baja, media, alta)

- **Populate de Strapi**:
  ```typescript
  populate[emails] = true
  populate[telefonos] = true
  populate[imagen] = true
  populate[tags] = true
  populate[trayectorias][populate][colegio][populate] = '*' // Wildcard para populate profundo
  ```

- **Filtros**:
  - `filters[activo][$eq] = true` (solo contactos activos)
  - Búsqueda: `filters[$or][0][nombre_completo][$containsi]` o `filters[rut][$eq]`
  - Origen: `filters[origen][$eq]`
  - Confianza: `filters[nivel_confianza][$eq]`

**POST `/api/crm/contacts`**
- Crea un nuevo contacto (persona) en Strapi
- **Body esperado**:
  ```typescript
  {
    nombres: string (requerido)
    primer_apellido?: string
    segundo_apellido?: string
    rut?: string
    genero?: string
    cumpleagno?: string
    emails?: Array<{ email: string, principal?: boolean }>
    telefonos?: Array<{ telefono_raw: string, principal?: boolean }>
    nivel_confianza?: 'baja' | 'media' | 'alta'
    origen?: 'mineduc' | 'csv' | 'manual' | 'crm' | 'web' | 'otro'
    activo?: boolean
    trayectoria?: {
      colegio: number | string (ID del colegio)
      cargo?: string
      is_current?: boolean
    }
  }
  ```
- Si se proporciona `trayectoria`, crea una relación `persona-trayectoria` después de crear la persona
- Revalida cache: `/crm/personas`, `/crm/contacts`, tags `personas` y `contacts`

---

#### **`frontend-ubold/src/app/api/crm/contacts/[id]/route.ts`**

**GET `/api/crm/contacts/[id]`**
- Obtiene un contacto específico por ID
- Popula: emails, telefonos, imagen, tags

**PUT `/api/crm/contacts/[id]`**
- Actualiza un contacto existente
- Mismo formato de body que POST
- Si se proporciona `trayectoria`:
  - Busca trayectorias existentes con `is_current = true`
  - Si existe, la actualiza
  - Si no existe, crea una nueva
- Revalida cache

**DELETE `/api/crm/contacts/[id]`**
- Elimina un contacto permanentemente
- Revalida cache

---

### 4. **Componentes Modales**

#### **`frontend-ubold/src/app/(admin)/(apps)/crm/contacts/components/AddContactModal.tsx`**

- Modal para crear nuevos contactos
- **Campos del formulario**:
  - `nombres` (requerido)
  - `email` (requerido)
  - `cargo` (opcional)
  - `telefono` (opcional)
  - `colegioId` (select de colegios, opcional)
  - `region`, `comuna`, `dependencia` (opcionales, no se envían a Strapi actualmente)
  - `origen` (select: MINEDUC, CSV, Manual, CRM, Web, Otro)
  - `etiqueta` (select: Cold Lead, Prospect, Hot Lead)

- **Flujo**:
  1. Carga lista de colegios desde `/api/crm/colegios/list`
  2. Usuario completa formulario
  3. Valida campos requeridos
  4. Envía POST a `/api/crm/contacts`
  5. Si hay `colegioId`, se crea una trayectoria automáticamente
  6. Llama `onSuccess()` para refrescar la lista

---

#### **`frontend-ubold/src/app/(admin)/(apps)/crm/contacts/components/EditContactModal.tsx`**

- Modal para editar contactos existentes
- Similar a `AddContactModal` pero:
  - Precarga datos del contacto existente
  - Usa PUT en lugar de POST
  - Maneja actualización de trayectorias existentes

---

### 5. **Tipos TypeScript**
**`frontend-ubold/src/app/(admin)/(apps)/crm/types.ts`**

```typescript
export type ContactType = {
  id: number
  name: string
  cargo?: string
  description: string
  email: string
  phone: string
  empresa?: string
  region?: string
  comuna?: string
  zona?: string
  dependencia?: string
  representanteComercial?: string
  telefonosColegio?: string[]
  emailsColegio?: string[]
  websiteColegio?: string
  avatar?: StaticImageData | string
  label: {
    text: string
    variant: string
  }
  categories: {
    name: string
    variant: string
  }[]
  origen?: string
  createdAt?: Date
  updatedAt?: Date
}
```

---

## 🔄 Integración con Strapi

### Content Type: `persona`

**Campos principales**:
- `nombres`, `primer_apellido`, `segundo_apellido`, `nombre_completo`
- `rut`
- `nivel_confianza`: 'baja' | 'media' | 'alta'
- `origen`: 'mineduc' | 'csv' | 'manual' | 'crm' | 'web' | 'otro'
- `activo`: boolean
- `emails`: Component (array de objetos con `email` y `principal`)
- `telefonos`: Component (array de objetos con `telefono_norm`, `telefono_raw`, `principal`)
- `imagen`: Media (imagen de perfil)
- `tags`: Relation (many-to-many con `tag`)
- `trayectorias`: Relation (one-to-many con `persona-trayectoria`)

### Content Type: `persona-trayectoria`

**Campos**:
- `persona`: Relation (many-to-one con `persona`)
- `colegio`: Relation (many-to-one con `colegio`)
- `cargo`: string
- `is_current`: boolean

### Content Type: `colegio`

**Campos relevantes**:
- `colegio_nombre`: string
- `dependencia`: string
- `zona`: string
- `telefonos`: Component
- `emails`: Component
- `website`: string
- `comuna`: Relation (many-to-one con `comuna`)
- `cartera_asignaciones`: Relation (one-to-many con `cartera-asignacion`)

---

## 🎨 Mapeos y Transformaciones

### Nivel de Confianza → Label
```typescript
{
  "baja": { text: "Cold Lead", variant: "info" },
  "media": { text: "Prospect", variant: "warning" },
  "alta": { text: "Hot Lead", variant: "success" }
}
```

### Origen → Categoría
```typescript
{
  "mineduc": { name: "MINEDUC", variant: "primary" },
  "csv": { name: "Importado", variant: "secondary" },
  "manual": { name: "Manual", variant: "light" },
  "crm": { name: "CRM", variant: "info" },
  "web": { name: "Web", variant: "success" },
  "otro": { name: "Otro", variant: "dark" }
}
```

---

## 🔍 Búsqueda y Filtros

### Búsqueda Global
- Busca en: `nombre_completo`, `emails.email`, `rut`
- Si el término coincide con formato RUT (`^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$`), busca exacto por RUT
- Si no, busca con `$containsi` (case-insensitive)

### Filtros Disponibles
- **Origen**: MINEDUC, CSV, Manual, CRM, Web, Otro
- **Confianza/Etiqueta**: Cold Lead (baja), Prospect (media), Hot Lead (alta)
- **Comuna, Región, Cargo**: (UI preparada pero no implementada aún)

---

## 📊 Paginación

- **Tipo**: Server-side pagination
- **Default**: 50 items por página
- **Parámetros Strapi**: `pagination[page]`, `pagination[pageSize]`
- **Respuesta**: Incluye `meta.pagination` con `total`, `page`, `pageSize`, `pageCount`

---

## 🔐 Cache y Revalidación

### Revalidación de Paths
```typescript
revalidatePath('/crm/personas')
revalidatePath('/crm/personas/[id]', 'page')
revalidatePath('/crm/contacts')
```

### Revalidación de Tags
```typescript
revalidateTag('personas', 'max')
revalidateTag('contacts', 'max')
```

**Nota**: En Next.js 16, `revalidateTag` requiere un segundo argumento (`'max'`).

---

## ⚠️ Consideraciones Importantes

### IDs en Strapi
- Strapi v4 usa `documentId` como identificador principal (string)
- También puede usar `id` (number)
- El código maneja ambos formatos

### Populate Profundo
- Para evitar errores 500, se usa wildcard: `populate[trayectorias][populate][colegio][populate] = '*'`
- Esto popula todos los campos del colegio sin especificar cada uno

### Formatos de Respuesta de Strapi
- Strapi puede devolver datos en diferentes formatos:
  - Con `attributes`: `{ id, attributes: { ... } }`
  - Sin `attributes`: `{ id, ... }`
  - Con `data`: `{ data: { ... } }`
  - El código maneja todos estos casos en `transformPersonaToContact`

### Relaciones
- Las relaciones se manejan con `connect` en Strapi:
  ```typescript
  colegio: { connect: [colegioId] }
  persona: { connect: [personaId] }
  ```

---

## 🚀 Endpoints API

### Frontend → Backend
- `GET /api/crm/contacts?page=1&pageSize=50&search=...&origin=...&confidence=...`
- `POST /api/crm/contacts` (crear)
- `GET /api/crm/contacts/[id]` (obtener uno)
- `PUT /api/crm/contacts/[id]` (actualizar)
- `DELETE /api/crm/contacts/[id]` (eliminar)

### Backend → Strapi
- `GET /api/personas?pagination[page]=1&pagination[pageSize]=50&populate=...&filters=...`
- `POST /api/personas` (crear)
- `GET /api/personas/[id]?populate=...`
- `PUT /api/personas/[id]` (actualizar)
- `DELETE /api/personas/[id]` (eliminar)
- `POST /api/persona-trayectorias` (crear trayectoria)
- `PUT /api/persona-trayectorias/[id]` (actualizar trayectoria)
- `GET /api/persona-trayectorias?filters[persona][id][$eq]=...` (buscar trayectorias)

---

## 📝 Notas de Desarrollo

1. **Client-Side Rendering**: La página principal es `'use client'` porque usa hooks de React y TanStack Table
2. **Server Actions**: Las API routes son server-side y usan `strapiClient` para comunicarse con Strapi
3. **Transformación de Datos**: Los datos se transforman de formato Strapi a formato UI en `data.ts`
4. **Manejo de Errores**: Todos los endpoints manejan errores y devuelven respuestas consistentes con `success: boolean`
5. **Validación**: Validación básica en frontend y backend (nombres requerido, email requerido en frontend)

---

## 🔗 Archivos Relacionados

- `frontend-ubold/src/lib/strapi/client.ts` - Cliente de Strapi
- `frontend-ubold/src/lib/strapi/config.ts` - Configuración de Strapi
- `frontend-ubold/src/lib/strapi/types.ts` - Tipos de Strapi
- `frontend-ubold/src/app/api/crm/colegios/list/route.ts` - Lista de colegios para selects

---

## 📌 Próximos Pasos / Mejoras Pendientes

1. Implementar filtros de Comuna, Región y Cargo
2. Agregar exportación de contactos (CSV/Excel)
3. Agregar selección múltiple y acciones en lote
4. Mejorar manejo de imágenes (upload, crop, etc.)
5. Agregar validación de RUT chileno
6. Implementar búsqueda avanzada con múltiples criterios


