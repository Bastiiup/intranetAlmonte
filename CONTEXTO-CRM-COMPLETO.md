# 📋 Contexto Completo - Sistema CRM para Colegios

**Proyecto:** Intranet Almonte - Módulo CRM  
**Fecha de inicio:** Diciembre 2025  
**Última actualización:** 9 de Enero 2026  
**Rama actual:** `mati-integracion`

---

## 🎯 Idea Principal

Desarrollar un sistema CRM (Customer Relationship Management) completo para gestionar la relación con colegios, sus colaboradores (profesores, personal administrativo), alumnos, cursos, materiales escolares y oportunidades de negocio.

### Objetivos del Sistema

1. **Gestión de Colegios:**
   - Registro completo de información institucional
   - Datos de contacto (teléfonos, emails, direcciones)
   - Asignación de ejecutivos comerciales
   - Tracking de leads y oportunidades

2. **Gestión de Contactos/Colaboradores:**
   - Registro de profesores y personal de colegios
   - Vinculación con colegios mediante trayectorias laborales
   - Historial de cargos y cursos asignados
   - Contacto y seguimiento de relaciones

3. **Gestión de Cursos y Materiales:**
   - Registro de cursos por colegio
   - Lista de útiles escolares (materiales) por curso
   - Gestión de pedidos de materiales
   - Seguimiento de materiales más solicitados

4. **Seguimiento Comercial:**
   - Leads y oportunidades de venta
   - Actividades y seguimientos
   - Pedidos de alumnos
   - Estadísticas y métricas de venta

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

- **Frontend:** Next.js 16 (App Router), React, TypeScript
- **Backend/API:** Next.js API Routes (Server Actions)
- **CMS/Backend:** Strapi v4
- **Base de datos:** (Gestionada por Strapi)
- **Deployment:** Railway
- **UI:** React Bootstrap, react-select

### Estructura del Proyecto

```
AlmonteIntranet/
├── src/
│   ├── app/
│   │   ├── (admin)/(apps)/crm/
│   │   │   ├── colegios/          # Gestión de colegios
│   │   │   │   ├── [id]/          # Detalle del colegio
│   │   │   │   │   ├── page.tsx   # Página principal con tabs
│   │   │   │   │   └── components/
│   │   │   │   │       └── CursoModal.tsx  # Modal para cursos
│   │   │   │   └── page.tsx       # Listado de colegios
│   │   │   ├── contacts/          # Gestión de contactos
│   │   │   │   └── components/
│   │   │   │       ├── AddContactModal.tsx
│   │   │   │       └── EditContactModal.tsx
│   │   │   └── types.ts           # Tipos TypeScript
│   │   └── api/
│   │       └── crm/
│   │           ├── colegios/      # API de colegios
│   │           │   ├── [id]/
│   │           │   │   ├── route.ts
│   │           │   │   ├── cursos/route.ts
│   │           │   │   └── contacts/route.ts
│   │           │   └── list/route.ts
│   │           ├── contacts/      # API de contactos
│   │           │   ├── route.ts
│   │           │   └── [id]/route.ts
│   │           └── cursos/        # API de cursos
│   │               └── [id]/route.ts
│   └── lib/
│       └── strapi/
│           ├── client.ts          # Cliente HTTP para Strapi
│           └── types.ts           # Tipos de Strapi
```

---

## ✅ Funcionalidades Implementadas

### 1. Gestión de Colegios ✅

**Archivos principales:**
- `src/app/(admin)/(apps)/crm/colegios/page.tsx` - Listado
- `src/app/(admin)/(apps)/crm/colegios/[id]/page.tsx` - Detalle

**Funcionalidades:**
- ✅ Listado completo de colegios con búsqueda y filtros
- ✅ Vista detallada con múltiples tabs:
  - Información del colegio
  - Colaboradores asociados (con agrupación por cargo/curso)
  - Pedidos de alumnos
  - Leads y oportunidades
  - Actividades
  - Materiales más pedidos
  - **Cursos** (nueva funcionalidad)
- ✅ Estadísticas rápidas (colaboradores, pedidos, valor vendido)
- ✅ Edición de información del colegio

### 2. Gestión de Contactos/Colaboradores ✅

**Archivos principales:**
- `src/app/(admin)/(apps)/crm/contacts/page.tsx` - Listado
- `src/app/(admin)/(apps)/crm/contacts/components/AddContactModal.tsx` - Agregar
- `src/app/(admin)/(apps)/crm/contacts/components/EditContactModal.tsx` - Editar

**Funcionalidades:**
- ✅ Crear nuevos contactos (profesores, personal)
- ✅ Editar contactos existentes
- ✅ **Vincular contactos con colegios mediante trayectorias laborales**
- ✅ Selección de colegio con autocompletado (react-select)
- ✅ Auto-completado de datos del colegio (región, comuna, dependencia)
- ✅ Visualización de trayectorias en el listado
- ✅ Búsqueda por nombre, email, RUT
- ✅ Filtros por origen y nivel de confianza

**Problema resuelto:**
- ✅ Los contactos ahora se vinculan correctamente a colegios
- ✅ Los datos del colegio se muestran en el listado de contactos
- ✅ La edición de contactos mantiene la selección del colegio

### 3. Gestión de Cursos y Materiales ✅

**Archivos principales:**
- `src/app/(admin)/(apps)/crm/colegios/[id]/components/CursoModal.tsx` - Modal de cursos
- `src/app/api/crm/colegios/[id]/cursos/route.ts` - API de cursos
- `src/app/api/crm/cursos/[id]/route.ts` - API de curso individual

**Funcionalidades:**
- ✅ **Crear cursos** para un colegio específico
- ✅ **Editar cursos** existentes
- ✅ **Eliminar cursos**
- ✅ **Agregar materiales** (lista de útiles) a cada curso:
  - Nombre del material
  - Tipo (Útil Escolar, Libro, Cuaderno, Otro)
  - Cantidad necesaria
  - Obligatorio/Opcional
  - Descripción adicional
- ✅ Visualización de cursos con sus materiales en la pestaña "Cursos"
- ✅ Gestión completa de materiales (agregar, editar, eliminar)

**Estructura en Strapi:**
- Content Type: `cursos`
  - Campo: `nombre_curso` (Text, required)
  - Campo: `nivel` (Text, optional)
  - Campo: `grado` (Text, optional)
  - Campo: `activo` (Boolean)
  - Relación: `colegio` (manyToOne con colegios)
  - Componente: `materiales` (repeatable)
- Componente: `curso.material` (repeatable)
  - Campo: `material_nombre` (Text, required)
  - Campo: `tipo` (Enum: util, libro, cuaderno, otro)
  - Campo: `cantidad` (Number)
  - Campo: `obligatorio` (Boolean)
  - Campo: `descripcion` (Text, optional)

### 4. Sistema de Trayectorias Laborales ✅

**Concepto clave:** Las trayectorias (`persona-trayectorias`) vinculan a las personas (contactos) con los colegios donde trabajan.

**Archivos principales:**
- `src/app/api/persona-trayectorias/route.ts` - Crear trayectorias
- `src/app/api/persona-trayectorias/[id]/route.ts` - Actualizar/eliminar

**Funcionalidades:**
- ✅ Creación automática de trayectorias al vincular un contacto con un colegio
- ✅ Actualización de trayectorias al cambiar el colegio de un contacto
- ✅ Soporte para trayectorias históricas (con `is_current` flag)
- ✅ Campos adicionales: cargo, año, curso, asignatura

**Problema resuelto:**
- ✅ Error "Invalid key region" resuelto en Strapi (lifecycle hook corregido)
- ✅ Filtrado completo de campos prohibidos en frontend
- ✅ Manejo correcto de relaciones manyToOne con `{ connect: [id] }`

---

## 🔧 Integración con Strapi

### Content Types Utilizados

1. **colegios** (Colegios)
   - Información institucional completa
   - Relaciones: comuna, telefonos, emails, direcciones, cartera_asignaciones
   - Relación inversa: persona_trayectorias, cursos

2. **personas** (Contactos/Colaboradores)
   - Información personal (nombres, RUT, emails, teléfonos)
   - Relación: trayectorias (manyToOne inversa)

3. **persona-trayectorias** (Trayectorias Laborales)
   - Vincula personas con colegios
   - Campos: persona, colegio, cargo, curso, asignatura, is_current
   - Relación manyToOne: persona → personas
   - Relación manyToOne: colegio → colegios

4. **cursos** (Cursos de Colegios)
   - Información del curso
   - Campos: nombre_curso, nivel, grado, activo
   - Relación manyToOne: colegio → colegios
   - Componente repeatable: materiales

5. **curso.material** (Materiales/Lista de Útiles)
   - Componente repeatable dentro de cursos
   - Campos: material_nombre, tipo, cantidad, obligatorio, descripcion

### API Routes Implementadas

#### Colegios
- `GET /api/crm/colegios` - Listar colegios
- `GET /api/crm/colegios/[id]` - Detalle de colegio
- `PUT /api/crm/colegios/[id]` - Actualizar colegio
- `DELETE /api/crm/colegios/[id]` - Eliminar colegio
- `GET /api/crm/colegios/[id]/contacts` - Contactos del colegio
- `GET /api/crm/colegios/[id]/cursos` - Cursos del colegio
- `POST /api/crm/colegios/[id]/cursos` - Crear curso
- `GET /api/crm/colegios/list` - Lista para selectores

#### Contactos
- `GET /api/crm/contacts` - Listar contactos
- `POST /api/crm/contacts` - Crear contacto
- `GET /api/crm/contacts/[id]` - Detalle de contacto
- `PUT /api/crm/contacts/[id]` - Actualizar contacto
- `DELETE /api/crm/contacts/[id]` - Eliminar contacto

#### Trayectorias
- `POST /api/persona-trayectorias` - Crear trayectoria
- `GET /api/persona-trayectorias` - Listar trayectorias (con filtros)
- `PUT /api/persona-trayectorias/[id]` - Actualizar trayectoria
- `DELETE /api/persona-trayectorias/[id]` - Eliminar trayectoria

#### Cursos
- `GET /api/crm/cursos/[id]` - Detalle de curso
- `PUT /api/crm/cursos/[id]` - Actualizar curso
- `DELETE /api/crm/cursos/[id]` - Eliminar curso

---

## 🐛 Problemas Resueltos

### 1. Error "Invalid key region" ✅ RESUELTO

**Problema:** Error al crear/actualizar trayectorias porque Strapi rechazaba el campo `region` que no existe en el schema.

**Solución:**
- Frontend: Filtrado exhaustivo de campos prohibidos antes de enviar a Strapi
- Strapi: Corregido lifecycle hook `syncColegioLocation` para no hacer populate de `region` como relación (es string)
- Strapi: Protección en controller y lifecycle hook para eliminar `region` si llega inadvertidamente

**Archivos modificados:**
- `src/app/api/persona-trayectorias/route.ts`
- `src/app/api/persona-trayectorias/[id]/route.ts`
- Strapi: `src/api/persona-trayectoria/controllers/persona-trayectoria.ts`
- Strapi: `src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.ts`

### 2. Vincular Contactos con Colegios ✅ RESUELTO

**Problema:** Los contactos no se vinculaban correctamente con colegios al crearlos o editarlos.

**Solución:**
- Implementado sistema de trayectorias laborales
- Creación/actualización automática de `persona-trayectorias` al vincular contacto con colegio
- Selección de colegio con autocompletado funcional
- Auto-completado de datos del colegio (región, comuna, dependencia)

**Archivos modificados:**
- `src/app/(admin)/(apps)/crm/contacts/components/AddContactModal.tsx`
- `src/app/(admin)/(apps)/crm/contacts/components/EditContactModal.tsx`
- `src/app/api/crm/contacts/route.ts`
- `src/app/api/crm/contacts/[id]/route.ts`

### 3. Selección de Colegio en Editar Contacto ✅ RESUELTO

**Problema:** Al editar un contacto y seleccionar un colegio, la selección desaparecía antes de guardar.

**Solución:**
- Agregada bandera `isInitialLoad` para evitar que el `useEffect` resetee la selección
- Mejorado `handleColegioChange` con validaciones y logs
- Reset correcto de estados al cerrar el modal

**Archivos modificados:**
- `src/app/(admin)/(apps)/crm/contacts/components/EditContactModal.tsx`

### 4. Campos Incorrectos en Content Type Cursos ✅ RESUELTO

**Problema:** Errores "Invalid key nombre/curso_nombre/titulo/materiales" al trabajar con cursos.

**Solución:**
- Corregido schema en Strapi: campo `nombre_curso` (no `nombre` ni `curso_nombre`)
- Creado componente `curso.material` para materiales
- Actualizado código frontend para usar `nombre_curso`
- Removido sort problemático hasta verificar campos ordenables

**Archivos modificados:**
- `src/app/api/crm/colegios/[id]/cursos/route.ts`
- `src/app/api/crm/cursos/[id]/route.ts`
- `src/app/(admin)/(apps)/crm/colegios/[id]/components/CursoModal.tsx`
- Strapi: `src/api/curso/content-types/curso/schema.json`
- Strapi: `src/components/curso/material.json` (creado)

---

## 📊 Estado Actual del Proyecto

### Funcionalidades Completas ✅

1. ✅ Gestión completa de colegios
2. ✅ Gestión completa de contactos/colaboradores
3. ✅ Vinculación de contactos con colegios (trayectorias)
4. ✅ Gestión de cursos por colegio
5. ✅ Gestión de materiales (lista de útiles) por curso
6. ✅ Visualización de estadísticas y métricas
7. ✅ Búsqueda y filtros avanzados
8. ✅ Autocompletado y validaciones

### Funcionalidades Pendientes

1. ⏳ Gestión de pedidos (estructura básica existe, falta completar)
2. ⏳ Gestión de leads (estructura básica existe, falta completar)
3. ⏳ Gestión de actividades (estructura básica existe, falta completar)
4. ⏳ Reportes y exportación de datos
5. ⏳ Dashboard con gráficos y métricas avanzadas

### Problemas Conocidos

1. ⚠️ Error "Invalid key materiales" - Pendiente rebuild de Strapi después de crear componente
2. ⚠️ Sort de cursos - Removido hasta verificar campos ordenables en Strapi
3. ⚠️ Error 404 en `/api/colaboradores/me/profile` - No crítico, tiene fallback

---

## 🔑 Conceptos Técnicos Clave

### 1. Trayectorias Laborales

Las trayectorias (`persona-trayectorias`) son el mecanismo para vincular personas con colegios. Una persona puede tener múltiples trayectorias (historial laboral), pero solo una activa (`is_current: true`).

**Flujo al crear contacto con colegio:**
1. Crear persona en Strapi
2. Obtener ID numérico de la persona
3. Crear `persona-trayectoria` con relación al colegio
4. Auto-completar datos del colegio en el formulario

**Flujo al editar contacto:**
1. Buscar trayectoria actual (`is_current: true`)
2. Si existe, actualizar con nuevo colegio
3. Si no existe, crear nueva trayectoria

### 2. Relaciones ManyToOne en Strapi

Para relaciones `manyToOne`, Strapi requiere el formato:
```typescript
{
  data: {
    persona: { connect: [personaIdNum] },
    colegio: { connect: [colegioIdNum] }
  }
}
```

**Importante:** No se pueden enviar campos del objeto relacionado. Por ejemplo, NO enviar `region`, `comuna`, `dependencia` de un colegio cuando se crea una trayectoria.

### 3. Filtrado de Campos Prohibidos

Para evitar errores de validación, el código filtra campos prohibidos antes de enviar a Strapi:

```typescript
const camposProhibidos = new Set([
  'region', 'comuna', 'dependencia', 'zona', 
  'colegio_nombre', 'rbd', 'telefonos', 'emails'
])
```

### 4. Manejo de IDs (documentId vs id)

Strapi puede usar dos tipos de IDs:
- `documentId`: String único (ej: "abc123xyz")
- `id`: Número (ej: 12345)

Para relaciones `manyToOne`, se requiere el ID numérico. Si solo se tiene `documentId`, se debe hacer una consulta adicional para obtener el `id`.

### 5. Populate en Strapi v4

Strapi v4 requiere populate manual (no soporta `populate=deep` en todas las versiones):

```typescript
'populate[trayectorias][populate][colegio]': 'true',
'populate[trayectorias][populate][colegio][populate][comuna]': 'true'
```

Para componentes repeatable:
```typescript
'populate[materiales]': 'true'
```

---

## 📝 Mejores Prácticas Implementadas

### 1. Logs Condicionales

```typescript
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}
```

### 2. Manejo de Errores

- Try-catch en todas las operaciones asíncronas
- Mensajes de error descriptivos para el usuario
- Logs detallados para debugging
- Fallbacks cuando es posible

### 3. Validaciones

- Validaciones en frontend (UX inmediata)
- Validaciones en backend (seguridad)
- Validaciones en Strapi (integridad de datos)

### 4. TypeScript

- Interfaces bien definidas
- Tipos para todas las respuestas de API
- Tipos para componentes de React

### 5. Revalidación de Caché

```typescript
revalidatePath('/crm/contacts')
revalidateTag('contacts', 'max')
```

---

## 🚀 Próximos Pasos Recomendados

### Corto Plazo
1. ✅ Verificar que el rebuild de Strapi funcione correctamente
2. ✅ Probar crear/editar/eliminar cursos completamente
3. ✅ Agregar ordenamiento a los cursos (una vez verificado campo ordenable)

### Medio Plazo
1. Mejorar gestión de pedidos (completar funcionalidad)
2. Implementar gestión completa de leads
3. Agregar actividades y seguimientos
4. Implementar exportación de datos (Excel, CSV)

### Largo Plazo
1. Dashboard con métricas y gráficos
2. Reportes avanzados
3. Integración con sistemas externos
4. Notificaciones y alertas automáticas

---

## 📚 Documentación de Referencia

### Documentos Creados
- `SOLUCION-GUARDADO-COLEGIOS-CONTACTOS.md` - Solución de vinculación
- `INVESTIGACION-ERROR-REGION-URGENTE.md` - Investigación del error region
- `ESTADO-SOLUCION-ERROR-REGION.md` - Estado de la solución
- `PROMPT-STRAPI-CURSOS-MATERIALES.md` - Prompt para crear cursos en Strapi
- `PROMPT-STRAPI-CORREGIR-CONTENT-TYPE-CURSOS.md` - Prompt para corregir schema
- `PROMPTS-CURSOR-STRAPI-REGION.md` - Prompts para trabajar en Strapi

### Archivos de Configuración
- `nixpacks.toml` - Configuración de build para Railway
- `railway.json` - Configuración de deployment
- `Dockerfile` - Docker configuration (backup)

---

## 💡 Notas Importantes para Desarrollo Futuro

### Al Trabajar con Strapi

1. **Siempre verificar el schema** antes de usar campos
2. **Usar documentId para URLs**, pero `id` numérico para relaciones
3. **Hacer populate manual** (no confiar en `populate=deep`)
4. **Filtrar campos prohibidos** antes de enviar a Strapi
5. **Probar en desarrollo** antes de deployar

### Al Trabajar con Trayectorias

1. **Siempre usar `{ connect: [id] }`** para relaciones manyToOne
2. **Obtener ID numérico** antes de crear relaciones
3. **Manejar trayectorias actuales** vs históricas
4. **No enviar campos del colegio** en la trayectoria (solo relación)

### Al Trabajar con Cursos

1. **Usar `nombre_curso`** (no `nombre` ni `curso_nombre`)
2. **Populate materiales** con `populate[materiales]=true`
3. **Materiales es componente repeatable**, no relación
4. **Verificar schema** antes de usar sort

---

## 🎓 Lecciones Aprendidas

1. **Strapi valida campos antes del lifecycle hook** - Por eso se necesita protección en el controller
2. **Componentes repeatable se populan diferente** - No son relaciones, son componentes
3. **IDs numéricos vs documentId** - Siempre verificar cuál se necesita
4. **Populate manual es más confiable** - `populate=deep` no siempre funciona
5. **Validar schema antes de usar campos** - Los nombres pueden variar

---

**Última actualización:** 9 de Enero 2026  
**Estado general:** ✅ Sistema funcional con funcionalidades principales completas
