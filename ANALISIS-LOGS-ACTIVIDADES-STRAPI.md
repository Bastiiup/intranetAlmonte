# Análisis: Sistema de Logs de Actividades y Conexión con Strapi

## 📋 Resumen Ejecutivo

El sistema de logs de actividades tiene **dos componentes principales**:

1. **Actividades del CRM** (`/api/actividades` en Strapi)
   - Actividades relacionadas con contactos, leads, oportunidades y colegios
   - Se muestran en `/crm/activities` y en el detalle de contactos
   - Content Type: **"Actividad"** en Strapi

2. **Logs de Actividades del Sistema** (`/api/activity-logs` en Strapi)
   - Logs automáticos de todas las acciones del sistema
   - Se muestran en `/logs` y en el timeline del perfil de usuario
   - Content Type: **"Log de Actividades"** en Strapi

---

## 🔌 Conexión con Strapi

### 1. Actividades del CRM (`/api/actividades`)

#### Content Type en Strapi: **"Actividad"**

**Endpoint**: `/api/actividades`

**Estructura del Content Type**:
```typescript
interface ActividadAttributes {
  // Campos REQUERIDOS
  tipo: 'llamada' | 'email' | 'reunion' | 'nota' | 'cambio_estado' | 'tarea' | 'recordatorio' | 'otro'
  titulo: string
  fecha: string (Datetime)
  estado: 'completada' | 'pendiente' | 'cancelada' | 'en_progreso'
  
  // Campos OPCIONALES
  descripcion?: string
  notas?: string
  
  // Relaciones (ManyToOne)
  relacionado_con_contacto?: Persona (Relation)
  relacionado_con_lead?: Lead (Relation)
  relacionado_con_oportunidad?: Oportunidad (Relation)
  relacionado_con_colegio?: Colegio (Relation)
  creado_por?: Colaborador (Relation)
}
```

**Configuración en Strapi**:
- `draftAndPublish`: **Deshabilitado** (las actividades se guardan directamente)
- Las actividades se crean automáticamente cuando se realizan acciones en el CRM

**Archivos relacionados**:
- `src/app/api/crm/activities/route.ts` - GET/POST actividades
- `src/app/api/crm/activities/[id]/route.ts` - GET/PUT/DELETE actividad individual
- `src/app/(admin)/(apps)/crm/activities/page.tsx` - Página de actividades
- `src/lib/crm/activity-helper.ts` - Helper para crear actividades automáticamente

---

### 2. Logs de Actividades del Sistema (`/api/activity-logs`)

#### Content Type en Strapi: **"Log de Actividades"**

**Endpoint**: `/api/activity-logs`

**Estructura del Content Type**:
```typescript
interface LogActivityAttributes {
  accion: 'crear' | 'actualizar' | 'eliminar' | 'ver' | 'exportar' | 'sincronizar' | 
          'cambiar_estado' | 'login' | 'logout' | 'descargar' | 'imprimir' | 'ocultar' | 'mostrar'
  entidad: string // Ej: 'contacto', 'lead', 'oportunidad', 'colegio', 'timeline'
  entidad_id?: string
  descripcion: string
  fecha: string (Datetime)
  datos_anteriores?: string (JSON)
  datos_nuevos?: string (JSON)
  ip_address?: string
  user_agent?: string
  metadata?: string (JSON)
  
  // Relación (ManyToOne)
  usuario?: Colaborador (Relation)
}
```

**Configuración en Strapi**:
- `draftAndPublish`: **Deshabilitado** (los logs se guardan directamente)
- Los logs se crean automáticamente mediante el servicio de logging

**Archivos relacionados**:
- `src/lib/logging/service.ts` - Servicio principal de logging
- `src/app/api/logs/route.ts` - GET/POST logs generales
- `src/app/api/logs/usuario/[id]/route.ts` - GET logs de un usuario específico
- `src/app/(admin)/(apps)/users/profile/components/Account.tsx` - Timeline en perfil

---

## 🔄 Flujo de Funcionamiento

### Flujo 1: Crear Actividad del CRM

```
Usuario realiza acción en CRM
    ↓
API Route (ej: /api/crm/leads/route.ts)
    ↓
createActivity() desde activity-helper.ts
    ↓
POST /api/actividades a Strapi
    ↓
Strapi guarda en Content Type "Actividad"
    ↓
Se muestra en /crm/activities y detalle de contacto
```

**Ejemplo de código**:
```typescript
// En /api/crm/leads/route.ts
import { createActivity } from '@/lib/crm/activity-helper'

// Después de crear un lead
await createActivity({
  titulo: `Lead "${leadData.nombre}" creado`,
  tipo: 'nota',
  relacionado_con_lead: leadId,
  creado_por: colaboradorId
})
```

---

### Flujo 2: Crear Log de Actividad del Sistema

```
Usuario realiza acción en el sistema
    ↓
API Route recibe request
    ↓
logActivity() desde logging/service.ts
    ↓
Extrae usuario de cookies (colaboradorData)
    ↓
POST /api/activity-logs a Strapi
    ↓
Strapi guarda en Content Type "Log de Actividades"
    ↓
Se muestra en /logs y timeline del perfil
```

**Ejemplo de código**:
```typescript
// En cualquier API Route
import { logActivity } from '@/lib/logging/service'

export async function POST(request: NextRequest) {
  // ... lógica de la API ...
  
  // Registrar log automáticamente
  await logActivity(request, {
    accion: 'crear',
    entidad: 'contacto',
    entidadId: nuevoContactoId,
    descripcion: `Contacto "${nombre}" creado`
  })
  
  // ... resto del código ...
}
```

---

## 📍 Dónde se Muestran los Logs

### 1. Página de Actividades del CRM
- **Ruta**: `/crm/activities`
- **Archivo**: `src/app/(admin)/(apps)/crm/activities/page.tsx`
- **API**: `GET /api/crm/activities`
- **Muestra**: Actividades relacionadas con contactos, leads, oportunidades, colegios
- **Filtros**: Tipo, estado, relación, búsqueda

### 2. Detalle de Contacto
- **Ruta**: `/crm/contacts/[id]`
- **Archivo**: `src/app/(admin)/(apps)/crm/contacts/[id]/page.tsx`
- **API**: `GET /api/crm/contacts/[id]` (incluye actividades relacionadas)
- **Muestra**: Actividades relacionadas con ese contacto específico

### 3. Página de Logs del Sistema
- **Ruta**: `/logs`
- **Archivo**: (No encontrado en el código actual, pero existe en navegación)
- **API**: `GET /api/logs`
- **Muestra**: Todos los logs de actividades del sistema

### 4. Timeline del Perfil de Usuario
- **Ruta**: `/users/profile/[id]`
- **Archivo**: `src/app/(admin)/(apps)/users/profile/components/Account.tsx`
- **API**: `GET /api/logs/usuario/[id]`
- **Muestra**: Logs de actividades del usuario específico

---

## 🔍 Consultas a Strapi

### Obtener Actividades del CRM

```typescript
// GET /api/actividades
const params = new URLSearchParams({
  'filters[relacionado_con_contacto][id][$eq]': contactoId,
  'populate[creado_por]': 'true',
  'populate[relacionado_con_contacto]': 'true',
  'sort[0]': 'fecha:desc',
  'pagination[pageSize]': '100'
})

const response = await strapiClient.get(`/api/actividades?${params}`)
```

### Obtener Logs del Sistema

```typescript
// GET /api/activity-logs
const response = await strapiClient.get(
  `/api/activity-logs?populate[usuario][populate]=*&pagination[page]=1&pagination[pageSize]=100&sort=fecha:desc`
)
```

### Obtener Logs de un Usuario Específico

```typescript
// GET /api/activity-logs?filters[usuario][id][$eq]=${usuarioId}
const response = await strapiClient.get(
  `/api/activity-logs?filters[usuario][id][$eq]=${usuarioId}&populate[usuario][populate]=*&sort=fecha:desc`
)
```

---

## 🔑 Puntos Clave

### 1. Diferencias entre Actividades y Logs

| Característica | Actividades (`/api/actividades`) | Logs (`/api/activity-logs`) |
|---------------|----------------------------------|----------------------------|
| **Propósito** | Actividades manuales/automáticas del CRM | Logs automáticos del sistema |
| **Relaciones** | Contacto, Lead, Oportunidad, Colegio | Solo Usuario (Colaborador) |
| **Creación** | Manual o automática desde CRM | Automática desde servicio de logging |
| **Campos** | tipo, titulo, descripcion, notas, estado | accion, entidad, descripcion, metadata |
| **Uso** | Seguimiento de interacciones con clientes | Auditoría de acciones del sistema |

### 2. Manejo de Usuario en Logs

El servicio de logging extrae el usuario de las cookies:
- **Cookie principal**: `colaboradorData`
- **Cookies alternativas**: `colaborador`, `auth_colaborador`
- **Prioridad**: `documentId` > `id` (Strapi v5 prefiere documentId para relaciones)

```typescript
// En logging/service.ts
const usuario = await getUserFromRequest(request)
const usuarioId = usuario?.documentId || usuario?.id

// Si no hay usuario, el log se crea sin usuario (usuario anónimo)
```

### 3. IDs en Strapi

- **documentId**: UUID o string (preferido en Strapi v5)
- **id**: Número entero (fallback)
- Las APIs manejan ambos casos para compatibilidad

### 4. Publication State

- **Ambos Content Types tienen `draftAndPublish: false`**
- No se necesita publicar manualmente
- Los registros se guardan directamente

---

## 🛠️ Configuración en Strapi

### 1. Content Type "Actividad"

**Campos requeridos**:
- `tipo` (Enumeration): llamada, email, reunion, nota, cambio_estado, tarea, recordatorio, otro
- `titulo` (Text)
- `fecha` (Datetime)
- `estado` (Enumeration): completada, pendiente, cancelada, en_progreso

**Campos opcionales**:
- `descripcion` (Text)
- `notas` (Text)

**Relaciones**:
- `relacionado_con_contacto` → Persona (ManyToOne)
- `relacionado_con_lead` → Lead (ManyToOne)
- `relacionado_con_oportunidad` → Oportunidad (ManyToOne)
- `relacionado_con_colegio` → Colegio (ManyToOne)
- `creado_por` → Colaborador (ManyToOne)

**Permisos**:
- Settings → Users & Permissions → Roles → [Rol] → Actividad
- Habilitar: `find`, `findOne`, `create`, `update`, `delete`

---

### 2. Content Type "Log de Actividades"

**Campos requeridos**:
- `accion` (Enumeration): crear, actualizar, eliminar, ver, exportar, sincronizar, cambiar_estado, login, logout, descargar, imprimir, ocultar, mostrar
- `entidad` (Text)
- `descripcion` (Text)
- `fecha` (Datetime)

**Campos opcionales**:
- `entidad_id` (Text)
- `datos_anteriores` (Text - JSON)
- `datos_nuevos` (Text - JSON)
- `ip_address` (Text)
- `user_agent` (Text)
- `metadata` (Text - JSON)

**Relaciones**:
- `usuario` → Colaborador (ManyToOne, opcional)

**Permisos**:
- Settings → Users & Permissions → Roles → [Rol] → Log de Actividades
- Habilitar: `find`, `findOne`, `create`, `update`, `delete`

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Crear Actividad al Crear Lead

```typescript
// En /api/crm/leads/route.ts
import { createActivity } from '@/lib/crm/activity-helper'

export async function POST(request: NextRequest) {
  // ... crear lead ...
  
  // Crear actividad automáticamente
  await createActivity({
    titulo: `Lead "${leadData.nombre}" creado`,
    tipo: 'nota',
    descripcion: `Lead creado desde ${leadData.origen}`,
    relacionado_con_lead: nuevoLeadId,
    creado_por: colaboradorId
  })
  
  // ... retornar respuesta ...
}
```

### Ejemplo 2: Registrar Log al Actualizar Contacto

```typescript
// En /api/crm/contacts/[id]/route.ts
import { logActivity } from '@/lib/logging/service'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  
  // ... actualizar contacto ...
  
  // Registrar log
  await logActivity(request, {
    accion: 'actualizar',
    entidad: 'contacto',
    entidadId: id,
    descripcion: `Contacto actualizado: ${body.nombre}`,
    datosAnteriores: contactoAnterior,
    datosNuevos: body
  })
  
  // ... retornar respuesta ...
}
```

### Ejemplo 3: Obtener Actividades de un Contacto

```typescript
// En /api/crm/contacts/[id]/route.ts
const actividadesParams = new URLSearchParams({
  'filters[relacionado_con_contacto][id][$eq]': String(personaId),
  'populate[creado_por]': 'true',
  'sort[0]': 'fecha:desc',
  'pagination[pageSize]': '100'
})

const actividadesResponse = await strapiClient.get(
  `/api/actividades?${actividadesParams.toString()}`
)
```

---

## ⚠️ Problemas Comunes y Soluciones

### Error: "Content-type 'Actividad' no existe"

**Causa**: El Content Type no está creado en Strapi o el endpoint es incorrecto.

**Solución**:
1. Verificar que el Content Type "Actividad" existe en Strapi
2. Verificar que el endpoint sea `/api/actividades` (plural con "es")
3. Reiniciar Strapi después de crear el Content Type

---

### Error: "Invalid key usuario" o "usuario do not exist"

**Causa**: El ID del colaborador no existe en Strapi o el formato es incorrecto.

**Solución**:
1. Verificar que el colaborador existe en Strapi
2. Usar `documentId` en lugar de `id` si es posible (Strapi v5)
3. Si el colaborador no existe, omitir `creado_por` (es opcional)

---

### Error: "403 Forbidden" al crear actividad/log

**Causa**: Permisos insuficientes en Strapi.

**Solución**:
1. Ir a Strapi Admin → Settings → Users & Permissions → Roles
2. Seleccionar el rol apropiado (Public, Authenticated, etc.)
3. Buscar "Actividad" o "Log de Actividades"
4. Habilitar: `find`, `findOne`, `create`, `update`, `delete`

---

### Los logs no muestran el usuario

**Causa**: El usuario no se está extrayendo correctamente de las cookies.

**Solución**:
1. Verificar que la cookie `colaboradorData` existe
2. Verificar que la cookie contiene `id` o `documentId`
3. Revisar logs del servidor para ver qué usuario se está extrayendo
4. El log se creará sin usuario si no se puede extraer (usuario anónimo)

---

## 📝 Notas Importantes

1. **No confundir Actividades con Logs**:
   - Actividades = Interacciones con clientes (CRM)
   - Logs = Auditoría del sistema

2. **Ambos Content Types tienen `draftAndPublish: false`**:
   - No se necesita publicar manualmente
   - Los registros se guardan directamente

3. **El usuario en logs es opcional**:
   - Si no se puede extraer de las cookies, el log se crea sin usuario
   - Se identifica como "Usuario Anónimo" por IP

4. **Strapi v5 prefiere `documentId`**:
   - Para relaciones ManyToOne, usar `documentId` si está disponible
   - Si no, usar `id` como fallback

5. **Los logs no bloquean el flujo principal**:
   - Si falla la creación de un log, no afecta la operación principal
   - Los errores se registran en consola pero no se lanzan excepciones

---

## 🔗 Archivos Clave

### APIs
- `src/app/api/crm/activities/route.ts` - CRUD de actividades
- `src/app/api/crm/activities/[id]/route.ts` - Operaciones individuales
- `src/app/api/logs/route.ts` - CRUD de logs generales
- `src/app/api/logs/usuario/[id]/route.ts` - Logs de usuario específico

### Servicios
- `src/lib/crm/activity-helper.ts` - Helper para crear actividades
- `src/lib/logging/service.ts` - Servicio principal de logging

### UI
- `src/app/(admin)/(apps)/crm/activities/page.tsx` - Página de actividades
- `src/app/(admin)/(apps)/crm/contacts/[id]/page.tsx` - Actividades en detalle de contacto
- `src/app/(admin)/(apps)/users/profile/components/Account.tsx` - Timeline en perfil

---

**Última actualización**: Enero 2026
**Versión**: 1.0
