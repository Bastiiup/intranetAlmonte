# Plan de Acción: Integración CRM con Strapi

## 📊 Estado Actual del CRM

### ✅ **Implementado con Strapi**
1. **Contactos** (`/crm/contacts`)
   - ✅ Integrado con Strapi (content-type: `Persona`)
   - ✅ CRUD completo (crear, editar, listar)
   - ✅ Búsqueda y filtros (origen, nivel_confianza)
   - ✅ Paginación del servidor
   - ✅ Relación con Colegios mediante Trayectorias
   - ✅ API Route: `/api/crm/contacts`

2. **Colegios** (`/crm/colegios`)
   - ✅ Integrado con Strapi (content-type: `Colegio`)
   - ✅ CRUD completo
   - ✅ Relación con Personas mediante Trayectorias
   - ✅ API Routes: `/api/crm/colegios`, `/api/crm/colegios/[id]`, `/api/crm/colegios/list`

### ⚠️ **Parcialmente Implementado**
3. **Oportunidades** (`/crm/opportunities`)
   - ⚠️ Código de integración existe en `data.ts`
   - ❌ Endpoint `/api/oportunidades` no existe
   - ❌ Falta API Route en Next.js
   - ❌ Falta verificar si existe content-type en Strapi
   - ✅ UI completa con filtros y paginación

### ❌ **Solo Mock Data (Pendiente de Integración)**
4. **Leads** (`/crm/leads`)
5. **Pipeline/Embudo** (`/crm/pipeline`)
6. **Deals/Negocios** (`/crm/deals`)
7. **Campaign/Campaña** (`/crm/campaign`)
8. **Proposals/Propuestas** (`/crm/proposals`)
9. **Estimations/Cotizaciones** (`/crm/estimations`)
10. **Customers/Clientes** (`/crm/customers`)
11. **Activities/Actividades** (`/crm/activities`)
12. **Automatizaciones** (`/crm/automatizaciones`)

---

## 🎯 Plan de Acción Priorizado

### **FASE 1: Completar Oportunidades (Alta Prioridad)**
**Tiempo estimado: 2-3 días**

#### Objetivo
Completar la integración de Oportunidades que ya tiene código parcial.

#### Tareas
1. **Verificar/crear content-type en Strapi**
   - Verificar si existe `Oportunidad` en Strapi
   - Si no existe, crear con campos:
     - `nombre` (Text)
     - `descripcion` (Text, Rich Text)
     - `monto` (Number)
     - `moneda` (Enum: USD, CLP, etc.)
     - `etapa` (Enum: Qualification, Proposal Sent, Negotiation, Won, Lost)
     - `estado` (Enum: open, in-progress, closed)
     - `prioridad` (Enum: low, medium, high)
     - `fecha_cierre` (Date)
     - `fuente` (Text)
     - `activo` (Boolean)
     - Relaciones:
       - `producto` → Producto (opcional)
       - `contacto` → Persona
       - `propietario` → Intranet-colaboradores

2. **Crear API Route**
   - Crear `/api/crm/oportunidades/route.ts` (GET, POST)
   - Crear `/api/crm/oportunidades/[id]/route.ts` (GET, PUT, DELETE)
   - Implementar búsqueda, filtros y paginación

3. **Actualizar data.ts**
   - Cambiar endpoint de `/api/oportunidades` a `/api/crm/oportunidades`
   - Verificar transformación de datos

4. **Testing**
   - Probar listado, creación, edición, eliminación
   - Verificar filtros y búsqueda

---

### **FASE 2: Pipeline/Embudo (Alta Prioridad)**
**Tiempo estimado: 3-4 días**

#### Objetivo
Implementar vista Kanban para gestionar oportunidades/deals en diferentes etapas.

#### Tareas
1. **Definir modelo de datos**
   - Reutilizar `Oportunidad` o crear `Deal` separado
   - Decidir si Pipeline es solo una vista de Oportunidades o entidad separada

2. **Crear content-type en Strapi** (si es necesario)
   - Si se reutiliza Oportunidad, solo ajustar UI
   - Si se crea Deal separado, definir campos similares a Oportunidad

3. **Implementar API Routes**
   - `/api/crm/pipeline/route.ts` para obtener deals por etapa
   - `/api/crm/pipeline/[id]/route.ts` para actualizar etapa

4. **Actualizar componente Pipeline**
   - Conectar con Strapi en lugar de mock data
   - Implementar drag & drop para cambiar etapas
   - Actualizar estado en Strapi al mover cards

---

### **FASE 3: Leads (Media Prioridad)**
**Tiempo estimado: 2-3 días**

#### Objetivo
Gestionar leads (prospectos iniciales) antes de convertirlos en oportunidades.

#### Tareas
1. **Crear content-type en Strapi**
   - `Lead` con campos:
     - `nombre` (Text)
     - `email` (Email)
     - `telefono` (Text)
     - `empresa` (Text)
     - `monto_estimado` (Number)
     - `etiqueta` (Enum o relación)
     - `asignado_a` → Intranet-colaboradores
     - `estado` (Enum: In Progress, Proposal Sent, Follow Up, Pending, Negotiation, Rejected)
     - `fecha_creacion` (Date)
     - `fuente` (Text)

2. **Crear API Routes**
   - `/api/crm/leads/route.ts`
   - `/api/crm/leads/[id]/route.ts`

3. **Actualizar página Leads**
   - Reemplazar mock data con llamadas a Strapi
   - Implementar CRUD completo

4. **Funcionalidad de conversión**
   - Botón "Convertir a Oportunidad" que crea una Oportunidad desde un Lead

---

### **FASE 4: Deals/Negocios (Media Prioridad)**
**Tiempo estimado: 2-3 días**

#### Objetivo
Gestionar negocios (deals) con seguimiento de probabilidad y valor.

#### Tareas
1. **Decidir modelo**
   - Opción A: Reutilizar `Oportunidad` (más simple)
   - Opción B: Crear `Deal` separado (más flexible)

2. **Si se crea Deal separado:**
   - Crear content-type `Deal` en Strapi
   - Campos similares a Oportunidad + `probabilidad` (Number 0-100)
   - Crear API Routes

3. **Actualizar página Deals**
   - Conectar con Strapi
   - Implementar widgets de estadísticas (usar datos reales)

---

### **FASE 5: Actividades (Media Prioridad)**
**Tiempo estimado: 3-4 días**

#### Objetivo
Registrar actividades (llamadas, reuniones, emails) relacionadas con contactos/oportunidades.

#### Tareas
1. **Crear content-type en Strapi**
   - `Actividad` con campos:
     - `tipo` (Enum: llamada, reunion, email, tarea, nota)
     - `titulo` (Text)
     - `descripcion` (Rich Text)
     - `fecha` (DateTime)
     - `duracion` (Number, minutos)
     - `relacionado_con` → Persona, Oportunidad, Lead (polimórfico)
     - `asignado_a` → Intranet-colaboradores
     - `estado` (Enum: pendiente, completada, cancelada)

2. **Crear API Routes**
   - `/api/crm/activities/route.ts`
   - `/api/crm/activities/[id]/route.ts`

3. **Implementar UI**
   - Timeline de actividades
   - Formulario para crear actividades
   - Filtros por tipo, fecha, relacionado con

---

### **FASE 6: Propuestas y Cotizaciones (Baja Prioridad)**
**Tiempo estimado: 4-5 días**

#### Objetivo
Gestionar propuestas comerciales y cotizaciones.

#### Tareas
1. **Crear content-types en Strapi**
   - `Propuesta` y `Cotizacion` (o unificar en uno)
   - Campos: monto, productos/servicios, validez, estado, relacionado con Oportunidad

2. **Crear API Routes**
3. **Implementar UI**
   - Listado con filtros
   - Formulario de creación/edición
   - Vista de detalle

---

### **FASE 7: Campañas y Automatizaciones (Baja Prioridad)**
**Tiempo estimado: 5-7 días**

#### Objetivo
Gestionar campañas de marketing y automatizaciones.

#### Tareas
1. **Definir requerimientos**
   - ¿Qué tipo de campañas? (email, sms, etc.)
   - ¿Qué automatizaciones? (workflows, triggers)

2. **Crear content-types**
3. **Implementar lógica de negocio**
4. **Crear UI**

---

## 🔧 Consideraciones Técnicas

### Patrón de Implementación (basado en Contactos/Colegios)

1. **Estructura de archivos:**
   ```
   src/app/(admin)/(apps)/crm/[modulo]/
   ├── page.tsx              # Página principal
   ├── data.ts               # Funciones de transformación y fetch
   ├── components/
   │   ├── [Modulo]Listing.tsx
   │   ├── Add[Modulo]Modal.tsx
   │   └── Edit[Modulo]Modal.tsx
   └── [id]/
       └── page.tsx          # Detalle (opcional)
   
   src/app/api/crm/[modulo]/
   ├── route.ts              # GET (list), POST (create)
   └── [id]/
       └── route.ts          # GET (detail), PUT (update), DELETE
   ```

2. **Transformación de datos:**
   - Crear función `transform[Entity]To[Type]()` en `data.ts`
   - Manejar diferentes formatos de respuesta de Strapi
   - Mapear campos de Strapi a tipos del frontend

3. **Populate de relaciones:**
   - Usar sintaxis Strapi v4: `populate[relacion][populate][subrelacion]`
   - Evitar populate profundo innecesario (causa errores 500)

4. **Paginación del servidor:**
   - Usar `manualPagination: true` en TanStack Table
   - Pasar `page` y `pageSize` a la API

5. **Búsqueda y filtros:**
   - Implementar en API Route usando `filters[$or]` de Strapi
   - Usar debounce en búsqueda del frontend (300ms)

---

## 📋 Checklist de Verificación

Para cada módulo nuevo, verificar:

- [ ] Content-type creado en Strapi con campos correctos
- [ ] Permisos configurados en Strapi (find, findOne, create, update, delete)
- [ ] API Route creada con GET y POST
- [ ] API Route [id] creada con GET, PUT, DELETE
- [ ] Función de transformación implementada
- [ ] Página conectada con datos reales (no mock)
- [ ] CRUD completo funcional
- [ ] Búsqueda implementada
- [ ] Filtros implementados
- [ ] Paginación del servidor funcionando
- [ ] Manejo de errores implementado
- [ ] Loading states implementados
- [ ] Validaciones en formularios
- [ ] Relaciones con otros módulos funcionando

---

## 🚀 Próximos Pasos Inmediatos

1. **Completar Oportunidades** (Fase 1)
   - Verificar/crear content-type en Strapi
   - Crear API Routes faltantes
   - Probar integración completa

2. **Decidir arquitectura para Pipeline**
   - ¿Reutilizar Oportunidad o crear Deal separado?
   - Definir etapas del pipeline

3. **Priorizar siguientes módulos**
   - Basado en necesidades del negocio
   - Considerar dependencias entre módulos

---

## 📝 Notas Adicionales

- **Relaciones importantes:**
  - Personas ↔ Colegios (mediante Trayectorias)
  - Oportunidades → Personas (contacto)
  - Oportunidades → Colaboradores (propietario)
  - Actividades → Personas/Oportunidades (polimórfico)

- **Campos comunes a considerar:**
  - `activo` (Boolean) para soft delete
  - `createdAt`, `updatedAt` (Date) automáticos
  - `documentId` (String) como ID principal en Strapi

- **Mejoras futuras:**
  - Dashboard con métricas del CRM
  - Exportación de datos (CSV, Excel)
  - Integración con email (enviar desde CRM)
  - Notificaciones de cambios importantes
