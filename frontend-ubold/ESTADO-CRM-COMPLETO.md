# Estado Completo del CRM - Plan de Acción

## ✅ **Módulos Completamente Integrados con Strapi**

### 1. **Colegios** (`/crm/colegios`)
- ✅ Content-type `Colegio` en Strapi
- ✅ CRUD completo (crear, editar, listar, eliminar)
- ✅ Búsqueda y filtros
- ✅ Relación con Personas mediante Trayectorias
- ✅ API Routes: `/api/crm/colegios`, `/api/crm/colegios/[id]`, `/api/crm/colegios/list`

### 2. **Contactos** (`/crm/contacts`)
- ✅ Content-type `Persona` en Strapi
- ✅ CRUD completo
- ✅ Búsqueda y filtros (origen, nivel_confianza)
- ✅ Paginación del servidor
- ✅ Relación con Colegios mediante Trayectorias
- ✅ API Route: `/api/crm/contacts`

### 3. **Oportunidades** (`/crm/opportunities`)
- ✅ Content-type `Oportunidad` en Strapi
- ✅ CRUD completo (crear, editar, eliminar)
- ✅ Búsqueda y filtros (etapa, estado, prioridad)
- ✅ Relación con Persona (contacto), Colaborador (propietario), Libro (producto)
- ✅ Selección de productos desde WooCommerce (Moraleja, Escolar)
- ✅ API Routes: `/api/crm/oportunidades`, `/api/crm/oportunidades/[id]`

### 4. **Pipeline** (`/crm/pipeline`)
- ✅ Vista Kanban integrada con Oportunidades
- ✅ Drag & Drop funcional (actualiza etapa en Strapi)
- ✅ Crear oportunidades desde Pipeline
- ✅ Filtros y búsqueda
- ✅ Sincronización bidireccional con Strapi

---

## ⚠️ **Módulos con UI pero Sin Integración (Mock Data)**

### 5. **Leads** (`/crm/leads`)
**Estado:** UI completa, pero usa mock data
**Prioridad:** 🔴 ALTA (base para convertir a Oportunidades)

**Qué falta:**
- [ ] Crear content-type `Lead` en Strapi
- [ ] API Routes: `/api/crm/leads`, `/api/crm/leads/[id]`
- [ ] Conectar UI con Strapi
- [ ] Funcionalidad "Convertir a Oportunidad"

**Campos sugeridos para Strapi:**
- `nombre` (Text, required)
- `email` (Email)
- `telefono` (Text)
- `empresa` (Text)
- `monto_estimado` (Number)
- `etiqueta` (Enum: Cold Lead, Prospect, Hot Lead)
- `estado` (Enum: In Progress, Proposal Sent, Follow Up, Pending, Negotiation, Rejected)
- `asignado_a` → Colaborador (manyToOne)
- `fuente` (Text, default: "Manual")
- `fecha_creacion` (Date)
- `activo` (Boolean, default: true)

---

### 6. **Actividades** (`/crm/activities`)
**Estado:** UI completa, pero usa mock data
**Prioridad:** 🔴 ALTA (historial de interacciones es crítico)

**Qué falta:**
- [ ] Crear content-type `Actividad` en Strapi
- [ ] API Routes: `/api/crm/activities`, `/api/crm/activities/[id]`
- [ ] Conectar UI con Strapi
- [ ] Timeline de actividades relacionadas

**Campos sugeridos para Strapi:**
- `tipo` (Enum: llamada, reunion, email, tarea, nota, required)
- `titulo` (Text, required)
- `descripcion` (Rich Text)
- `fecha` (DateTime, required)
- `duracion` (Number, minutos)
- `relacionado_con_persona` → Persona (manyToOne, optional)
- `relacionado_con_oportunidad` → Oportunidad (manyToOne, optional)
- `relacionado_con_lead` → Lead (manyToOne, optional)
- `asignado_a` → Colaborador (manyToOne)
- `estado` (Enum: pendiente, completada, cancelada, default: pendiente)
- `activo` (Boolean, default: true)

---

### 7. **Deals/Negocios** (`/crm/deals`)
**Estado:** UI completa, pero usa mock data
**Prioridad:** 🟡 MEDIA (puede reutilizar Oportunidades o ser separado)

**Decisión necesaria:**
- **Opción A:** Reutilizar `Oportunidad` (más simple, menos duplicación)
- **Opción B:** Crear `Deal` separado (más flexible, permite diferencias)

**Si se crea Deal separado:**
- [ ] Crear content-type `Deal` en Strapi
- [ ] API Routes: `/api/crm/deals`, `/api/crm/deals/[id]`
- [ ] Conectar UI con Strapi
- [ ] Widgets de estadísticas con datos reales

**Campos sugeridos (si es separado):**
- Similar a Oportunidad + `probabilidad` (Number, 0-100)

---

### 8. **Customers/Clientes** (`/crm/customers`)
**Estado:** UI completa, pero usa mock data
**Prioridad:** 🟡 MEDIA (puede ser una vista de Personas con filtro)

**Decisión necesaria:**
- **Opción A:** Vista filtrada de `Persona` (más simple)
- **Opción B:** Crear `Cliente` separado (más control)

**Si se crea Cliente separado:**
- [ ] Crear content-type `Cliente` en Strapi
- [ ] API Routes: `/api/crm/customers`, `/api/crm/customers/[id]`
- [ ] Conectar UI con Strapi

---

### 9. **Proposals/Propuestas** (`/crm/proposals`)
**Estado:** UI básica, mock data
**Prioridad:** 🟢 BAJA (puede esperar)

**Qué falta:**
- [ ] Crear content-type `Propuesta` en Strapi
- [ ] API Routes
- [ ] Conectar UI con Strapi
- [ ] Relación con Oportunidad

**Campos sugeridos:**
- `numero` (Text, required, unique)
- `titulo` (Text, required)
- `descripcion` (Rich Text)
- `monto` (Number, required)
- `moneda` (Enum: USD, CLP, EUR)
- `validez_hasta` (Date)
- `estado` (Enum: borrador, enviada, aceptada, rechazada, vencida)
- `oportunidad` → Oportunidad (manyToOne)
- `productos` → Libro (manyToMany, optional)
- `archivo_pdf` (Media, optional)
- `activo` (Boolean, default: true)

---

### 10. **Estimations/Cotizaciones** (`/crm/estimations`)
**Estado:** UI básica, mock data
**Prioridad:** 🟢 BAJA (similar a Propuestas, puede unificarse)

**Decisión necesaria:**
- ¿Unificar con Propuestas o mantener separado?

---

### 11. **Campaign/Campañas** (`/crm/campaign`)
**Estado:** UI básica, mock data
**Prioridad:** 🟢 BAJA (marketing, no crítico para ventas)

**Qué falta:**
- [ ] Definir requerimientos (¿qué tipo de campañas?)
- [ ] Crear content-type `Campaña` en Strapi
- [ ] API Routes
- [ ] Conectar UI con Strapi

---

## 🎯 **Plan de Acción Priorizado**

### **FASE 1: Leads (Alta Prioridad) - 2-3 días**
**Justificación:** Los leads son la entrada al pipeline. Sin leads, no hay oportunidades.

**Tareas:**
1. Crear content-type `Lead` en Strapi
2. Crear API Routes (`/api/crm/leads`, `/api/crm/leads/[id]`)
3. Conectar UI con Strapi
4. Implementar "Convertir a Oportunidad"
5. Testing completo

---

### **FASE 2: Actividades (Alta Prioridad) - 3-4 días**
**Justificación:** El historial de interacciones es crítico para el seguimiento de ventas.

**Tareas:**
1. Crear content-type `Actividad` en Strapi
2. Crear API Routes (`/api/crm/activities`, `/api/crm/activities/[id]`)
3. Conectar UI con Strapi
4. Implementar timeline de actividades relacionadas
5. Agregar actividades desde Oportunidades/Leads/Contactos
6. Testing completo

---

### **FASE 3: Deals (Media Prioridad) - 1-2 días**
**Decisión:** Reutilizar `Oportunidad` o crear `Deal` separado

**Si se reutiliza Oportunidad:**
- Solo ajustar UI para mostrar como "Deals"
- Agregar campo `probabilidad` a Oportunidad si no existe

**Si se crea Deal separado:**
- Crear content-type `Deal` en Strapi
- Crear API Routes
- Conectar UI con Strapi

---

### **FASE 4: Customers (Media Prioridad) - 1 día**
**Decisión:** Vista filtrada de `Persona` o crear `Cliente` separado

**Si es vista filtrada:**
- Crear página que filtre Personas con `activo = true`
- Agregar filtros adicionales si es necesario

**Si se crea Cliente separado:**
- Crear content-type `Cliente` en Strapi
- Crear API Routes
- Conectar UI con Strapi

---

### **FASE 5: Propuestas y Cotizaciones (Baja Prioridad) - 4-5 días**
**Decisión:** ¿Unificar en un solo content-type o mantener separados?

**Tareas:**
1. Decidir arquitectura
2. Crear content-type(s) en Strapi
3. Crear API Routes
4. Conectar UI con Strapi
5. Relación con Oportunidad

---

### **FASE 6: Campañas (Baja Prioridad) - 5-7 días**
**Tareas:**
1. Definir requerimientos (¿qué tipo de campañas?)
2. Crear content-type `Campaña` en Strapi
3. Crear API Routes
4. Conectar UI con Strapi
5. Implementar lógica de negocio

---

## 📊 **Dashboard y Reportes (Futuro)**

### Funcionalidades adicionales a considerar:
- [ ] Dashboard con métricas del CRM
  - Total de oportunidades por etapa
  - Valor total del pipeline
  - Conversión de leads a oportunidades
  - Actividades pendientes
  - Oportunidades próximas a cerrar
- [ ] Exportación de datos (CSV, Excel)
- [ ] Integración con email (enviar desde CRM)
- [ ] Notificaciones de cambios importantes
- [ ] Calendario de actividades y reuniones
- [ ] Reportes personalizados

---

## 🔧 **Mejoras Técnicas Pendientes**

### Optimizaciones:
- [ ] Cache de datos frecuentes
- [ ] Paginación optimizada (cursor-based)
- [ ] Búsqueda full-text mejorada
- [ ] Filtros avanzados (rango de fechas, múltiples valores)
- [ ] Exportación masiva de datos

### UX/UI:
- [ ] Loading states mejorados
- [ ] Skeleton loaders
- [ ] Toast notifications para acciones
- [ ] Confirmaciones antes de eliminar
- [ ] Validaciones en tiempo real en formularios

---

## 📋 **Checklist de Verificación por Módulo**

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
- [ ] Testing manual completo

---

## 🚀 **Próximos Pasos Inmediatos**

1. **Decidir prioridades con el equipo**
   - ¿Leads es crítico ahora?
   - ¿Actividades es crítico ahora?
   - ¿Qué módulos son más importantes para el negocio?

2. **Implementar FASE 1 (Leads)**
   - Crear content-type en Strapi
   - Crear API Routes
   - Conectar UI
   - Testing

3. **Implementar FASE 2 (Actividades)**
   - Crear content-type en Strapi
   - Crear API Routes
   - Conectar UI
   - Timeline de actividades
   - Testing

---

## 📝 **Notas Importantes**

- **Relaciones clave:**
  - Personas ↔ Colegios (mediante Trayectorias)
  - Oportunidades → Personas (contacto)
  - Oportunidades → Colaboradores (propietario)
  - Oportunidades → Libros (producto)
  - Actividades → Personas/Oportunidades/Leads (polimórfico)
  - Leads → Colaboradores (asignado_a)
  - Propuestas → Oportunidades

- **Campos comunes:**
  - `activo` (Boolean) para soft delete
  - `createdAt`, `updatedAt` (Date) automáticos
  - `documentId` (String) como ID principal en Strapi

- **Patrón de implementación:**
  - Seguir el mismo patrón usado en Oportunidades
  - API Routes como proxy a Strapi
  - Transformación de datos en `data.ts`
  - UI con React Table para listados
  - Modales para crear/editar
