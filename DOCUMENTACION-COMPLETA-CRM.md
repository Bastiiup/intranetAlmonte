# 📚 Documentación Completa - Sistema CRM Intranet Almonte

**Proyecto:** Intranet Almonte - Módulo CRM  
**Fecha de inicio:** Diciembre 2024  
**Última actualización:** 9 de Enero 2026  
**Rama:** `mati-integracion`  
**Estado:** ✅ Funcional - Features principales completas

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Historia de Desarrollo](#historia-de-desarrollo)
3. [Arquitectura Técnica](#arquitectura-técnica)
4. [Funcionalidades Implementadas](#funcionalidades-implementadas)
5. [Problemas Resueltos](#problemas-resueltos)
6. [Integración con Strapi](#integración-con-strapi)
7. [Archivos Creados y Modificados](#archivos-creados-y-modificados)
8. [Estado Actual del Proyecto](#estado-actual-del-proyecto)
9. [Próximos Pasos](#próximos-pasos)

---

## 🎯 Resumen Ejecutivo

El módulo CRM de la Intranet Almonte es un sistema completo para gestionar la relación comercial con colegios, sus colaboradores (profesores, personal administrativo), cursos, materiales escolares y oportunidades de negocio.

### Objetivos Alcanzados

✅ **Gestión completa de colegios** con información institucional, contactos, pedidos, leads y actividades  
✅ **Gestión de contactos/colaboradores** vinculados a colegios mediante trayectorias laborales  
✅ **Sistema de cursos** con materiales (listas de útiles) por colegio  
✅ **Sistema de listas de útiles predefinidas** reutilizables entre cursos  
✅ **Importación y exportación de materiales** desde/hacia Excel  
✅ **Visualización de estadísticas** y métricas de venta  
✅ **Búsqueda y filtros avanzados** en todas las entidades

---

## 📅 Historia de Desarrollo

### Fase 1: Creación Base del CRM (Diciembre 2024)

**Objetivo:** Establecer estructura base y gestión de colegios

**Implementado:**
- Listado de colegios con búsqueda y filtros
- Vista detallada de colegio con tabs (información, contactos, pedidos, leads, actividades, materiales, cursos)
- API routes para CRUD de colegios
- Integración inicial con Strapi

**Commits relevantes:**
- Estructura base del módulo CRM
- API routes para colegios
- Páginas de listado y detalle

### Fase 2: Gestión de Contactos y Trayectorias (Enero 2025)

**Objetivo:** Vincular contactos (profesores/personal) con colegios

**Implementado:**
- Listado de contactos con búsqueda
- Crear/editar contactos
- Sistema de trayectorias laborales (`persona-trayectorias`)
- Vinculación automática de contactos con colegios
- Autocompletado de datos del colegio (región, comuna, dependencia)
- Selector de colegios con react-select

**Problemas encontrados y resueltos:**
- ❌ Error "Invalid key region" al crear trayectorias
- ✅ Solución: Filtrado de campos prohibidos en frontend + protección en Strapi lifecycle hooks
- ❌ Selección de colegio desaparecía al editar contacto
- ✅ Solución: Implementación de bandera `isInitialLoad` y mejor manejo de estado

**Commits relevantes:**
- `f8c64f84` - Implementar sistema de trayectorias
- `c0715bd0` - Corregir selección de colegio en EditContactModal
- `84dae30d` - Mejorar lógica completa de edición de trayectorias
- `8376e445` - Filtrar campos no permitidos al crear trayectorias

### Fase 3: Sistema de Cursos y Materiales (Enero 2025)

**Objetivo:** Gestionar cursos y sus listas de útiles por colegio

**Implementado:**
- Crear/editar/eliminar cursos
- Gestión de materiales (lista de útiles) por curso
- Visualización de cursos en tab del colegio
- API routes para cursos

**Problemas encontrados y resueltos:**
- ❌ Error "Invalid key nombre/curso_nombre/materiales"
- ✅ Solución: Corrección del schema en Strapi (campo `nombre_curso`, componente `curso.material`)
- ❌ Errores de sort en queries
- ✅ Solución: Removido sort hasta verificar campos ordenables en Strapi

**Commits relevantes:**
- `116d9295` - Implementar gestión completa de cursos y materiales
- `f9fa733a` - Actualizar código para usar nombre_curso correcto
- `bb30494d` - Agregar prompt para corregir content type cursos en Strapi

### Fase 4: Rediseño de Cursos y Sistema de Listas Predefinidas (Enero 2026)

**Objetivo:** Rediseñar estructura de cursos y crear sistema de listas de útiles reutilizables

**Implementado:**
- Rediseño de CursoModal: nivel, grado, paralelo (dropdowns dinámicos)
- Auto-generación de `nombre_curso`: "{grado}° {nivel} {paralelo}"
- Integración de listas de útiles predefinidas
- Materiales adicionales (fuera de lista predefinida)
- API routes para listas-utiles (CRUD completo)
- Validaciones (no duplicar cursos, no eliminar listas en uso)

**Commits relevantes:**
- `df87cf3a` - Rediseño sistema de cursos y módulo de listas de útiles
- `3b1ee971` - Integrar funcionalidades completas de cursos y listas de útiles
- `c227790c` - Corregir manejo de errores en API routes de listas-utiles

### Fase 5: Importación y Exportación Excel (Enero 2026)

**Objetivo:** Facilitar carga masiva de materiales desde Excel y exportar listas

**Implementado:**
- Importación desde Excel/CSV con preview editable
- Exportación a Excel con formato estándar
- Componente ImportarMaterialesExcelModal
- Función utilidad `exportarMaterialesAExcel`
- Botones de exportar en CursoModal y vista de cursos
- Procesamiento de archivos .xlsx, .xls, .csv

**Dependencias agregadas:**
- `xlsx` - Procesamiento de archivos Excel
- `@types/xlsx` - Tipos TypeScript

**Commits relevantes:**
- `e8f0326e` - Implementar importación de materiales desde Excel
- `7c315558` - Implementar exportación de materiales a Excel

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

- **Frontend:** Next.js 16 (App Router), React 18, TypeScript
- **Backend/API:** Next.js API Routes (Server Actions)
- **CMS/Backend:** Strapi v4
- **Base de datos:** (Gestionada por Strapi)
- **Deployment:** Railway
- **UI Components:** React Bootstrap, react-select
- **Utilidades:** xlsx (Excel), pdfjs-dist (PDF - futuro)

### Estructura del Proyecto

```
AlmonteIntranet/
├── src/
│   ├── app/
│   │   ├── (admin)/(apps)/crm/
│   │   │   ├── colegios/
│   │   │   │   ├── page.tsx                    # Listado de colegios
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx                # Detalle del colegio (tabs)
│   │   │   │   │   └── components/
│   │   │   │   │       ├── CursoModal.tsx      # Modal crear/editar curso
│   │   │   │   │       └── ImportarMaterialesExcelModal.tsx
│   │   │   │   └── components/
│   │   │   │       ├── AddColegioModal.tsx
│   │   │   │       ├── EditColegioModal.tsx
│   │   │   │       └── ColegiosListing.tsx
│   │   │   ├── contacts/
│   │   │   │   ├── page.tsx                    # Listado de contactos
│   │   │   │   └── components/
│   │   │   │       ├── AddContactModal.tsx
│   │   │   │       └── EditContactModal.tsx
│   │   │   ├── listas-utiles/                  # (Pendiente: estructura creada, falta UI)
│   │   │   │   └── page.tsx                    # (Pendiente)
│   │   │   └── types.ts
│   │   └── api/
│   │       └── crm/
│   │           ├── colegios/
│   │           │   ├── route.ts                # GET, POST colegios
│   │           │   ├── [id]/
│   │           │   │   ├── route.ts            # GET, PUT, DELETE colegio
│   │           │   │   ├── contacts/route.ts   # GET contactos del colegio
│   │           │   │   ├── cursos/route.ts     # GET, POST cursos del colegio
│   │           │   │   ├── pedidos/route.ts
│   │           │   │   ├── leads/route.ts
│   │           │   │   └── activities/route.ts
│   │           │   └── list/route.ts           # GET lista simple para selects
│   │           ├── contacts/
│   │           │   ├── route.ts                # GET, POST contactos
│   │           │   └── [id]/route.ts           # GET, PUT, DELETE contacto
│   │           ├── cursos/
│   │           │   └── [id]/route.ts           # GET, PUT, DELETE curso
│   │           └── listas-utiles/
│   │               ├── route.ts                # GET, POST listas
│   │               ├── [id]/route.ts           # GET, PUT, DELETE lista
│   │               └── import-excel/route.ts   # POST importar Excel
│   └── helpers/
│       └── excel.ts                            # Funciones utilidad Excel
│   └── lib/
│       └── strapi/
│           ├── client.ts                       # Cliente HTTP para Strapi
│           └── types.ts                        # Tipos de Strapi
```

---

## ✅ Funcionalidades Implementadas

### 1. Gestión de Colegios ✅

**Archivos principales:**
- `src/app/(admin)/(apps)/crm/colegios/page.tsx`
- `src/app/(admin)/(apps)/crm/colegios/[id]/page.tsx`
- `src/app/api/crm/colegios/route.ts`
- `src/app/api/crm/colegios/[id]/route.ts`

**Funcionalidades:**
- ✅ Listado completo de colegios con búsqueda y filtros
- ✅ Vista detallada con múltiples tabs:
  - Información del colegio (datos institucionales)
  - Colaboradores asociados (con agrupación por cargo/curso)
  - Pedidos de alumnos
  - Leads y oportunidades
  - Actividades
  - Materiales más pedidos
  - **Cursos** (gestión completa)
- ✅ Estadísticas rápidas (colaboradores, pedidos, valor vendido)
- ✅ Crear/editar/eliminar colegios
- ✅ Búsqueda avanzada

### 2. Gestión de Contactos/Colaboradores ✅

**Archivos principales:**
- `src/app/(admin)/(apps)/crm/contacts/page.tsx`
- `src/app/(admin)/(apps)/crm/contacts/components/AddContactModal.tsx`
- `src/app/(admin)/(apps)/crm/contacts/components/EditContactModal.tsx`
- `src/app/api/crm/contacts/route.ts`
- `src/app/api/crm/contacts/[id]/route.ts`

**Funcionalidades:**
- ✅ Crear nuevos contactos (profesores, personal)
- ✅ Editar contactos existentes
- ✅ **Vincular contactos con colegios mediante trayectorias laborales**
- ✅ Selección de colegio con autocompletado (react-select)
- ✅ Auto-completado de datos del colegio (región, comuna, dependencia)
- ✅ Visualización de trayectorias en el listado
- ✅ Búsqueda por nombre, email, RUT
- ✅ Filtros por origen y nivel de confianza

**Características técnicas:**
- Sistema de trayectorias (`persona-trayectorias`) para historial laboral
- Solo una trayectoria activa por persona (`is_current: true`)
- Populate manual de relaciones (Strapi no soporta `populate=deep`)
- Manejo robusto de IDs (documentId vs id numérico)

### 3. Sistema de Trayectorias Laborales ✅

**Archivos principales:**
- `src/app/api/persona-trayectorias/route.ts`
- `src/app/api/persona-trayectorias/[id]/route.ts`

**Funcionalidades:**
- ✅ Crear trayectorias automáticamente al vincular contacto con colegio
- ✅ Actualizar trayectorias al cambiar colegio de un contacto
- ✅ Soporte para trayectorias históricas (con `is_current` flag)
- ✅ Campos adicionales: cargo, año, curso, asignatura

**Problemas resueltos:**
- ✅ Error "Invalid key region" - Filtrado de campos prohibidos + protección en Strapi
- ✅ Manejo correcto de relaciones manyToOne con `{ connect: [id] }`
- ✅ Extracción correcta de IDs numéricos desde respuestas de Strapi

### 4. Gestión de Cursos y Materiales ✅

**Archivos principales:**
- `src/app/(admin)/(apps)/crm/colegios/[id]/components/CursoModal.tsx`
- `src/app/api/crm/colegios/[id]/cursos/route.ts`
- `src/app/api/crm/cursos/[id]/route.ts`

**Funcionalidades:**
- ✅ **Crear cursos** para un colegio específico
- ✅ **Editar cursos** existentes
- ✅ **Eliminar cursos**
- ✅ **Estructura de curso:**
  - Nivel (Básica | Media) - Dropdown
  - Grado (1-8 para Básica, 1-4 para Media) - Dropdown dinámico
  - Paralelo (A, B, C, D, E, F) - Dropdown opcional
  - Nombre del curso - Auto-generado: "{grado}° {nivel} {paralelo}"
  - Activo (checkbox)
- ✅ **Lista de útiles predefinida:**
  - Dropdown para seleccionar lista existente
  - Filtrado por nivel y grado
  - Badge visual con cantidad de materiales
- ✅ **Materiales adicionales:**
  - Sección colapsable para materiales fuera de la lista predefinida
  - Gestión completa (agregar, editar, eliminar)
  - Importación desde Excel
  - Exportación a Excel
- ✅ Visualización de cursos con sus materiales en la pestaña "Cursos"
- ✅ Validación de duplicados (mismo nivel+grado+paralelo en colegio)

**Estructura de materiales:**
- `material_nombre` (Text, required)
- `tipo` (Enum: util, libro, cuaderno, otro)
- `cantidad` (Number)
- `obligatorio` (Boolean)
- `descripcion` (Text, optional)

### 5. Sistema de Listas de Útiles Predefinidas ✅

**Archivos principales:**
- `src/app/api/crm/listas-utiles/route.ts`
- `src/app/api/crm/listas-utiles/[id]/route.ts`
- `src/app/api/crm/listas-utiles/import-excel/route.ts`

**Funcionalidades:**
- ✅ Crear/editar/eliminar listas de útiles
- ✅ Listar listas con filtros (nivel, grado, activo)
- ✅ Validación: No eliminar listas usadas por cursos activos
- ✅ Populate de materiales en todas las rutas
- ✅ **Importación desde Excel/CSV:**
  - Procesamiento de archivos .xlsx, .xls, .csv
  - Detección automática de columnas (Material, Tipo, Cantidad, Obligatorio, Descripción)
  - Normalización de tipos de materiales
  - Validación de formato

**Pendiente (estructura creada, falta UI):**
- ⏳ Página de listado de listas de útiles
- ⏳ Modal para crear/editar listas
- ⏳ Página de detalle de lista
- ⏳ Función de duplicar listas
- ⏳ Importación desde PDF con Claude API

### 6. Importación y Exportación Excel ✅

**Archivos principales:**
- `src/app/(admin)/(apps)/crm/colegios/[id]/components/ImportarMaterialesExcelModal.tsx`
- `src/app/api/crm/listas-utiles/import-excel/route.ts`
- `src/helpers/excel.ts`

**Funcionalidades:**
- ✅ **Importación desde Excel:**
  - Drag & drop de archivos
  - Preview editable antes de guardar
  - Validación de tipo de archivo (.xlsx, .xls, .csv)
  - Validación de tamaño máximo
  - Detección automática de columnas
  - Normalización de datos

- ✅ **Exportación a Excel:**
  - Botón en CursoModal (materiales adicionales)
  - Botón en cada curso del tab
  - Formato estándar: Material | Tipo | Cantidad | Obligatorio | Descripción
  - Ajuste automático de ancho de columnas
  - Nombre de archivo con fecha: `{nombre}_YYYY-MM-DD.xlsx`
  - Exporta materiales de lista predefinida + adicionales combinados

**Dependencias:**
- `xlsx` (^0.18.5)
- `@types/xlsx` (^0.0.36)

---

## 🐛 Problemas Resueltos

### 1. Error "Invalid key region" ✅ RESUELTO

**Problema:**
Al crear/actualizar trayectorias, Strapi rechazaba el campo `region` que no existe en el schema de `persona-trayectorias`. El error persistía incluso después de filtrar en frontend.

**Solución implementada:**

**Frontend:**
- Filtrado exhaustivo de campos prohibidos antes de enviar a Strapi
- Lista de campos prohibidos: `region`, `comuna`, `dependencia`, `zona`, `colegio_nombre`, `rbd`, etc.
- Creación de payload limpio campo por campo

**Strapi (backend):**
- Corregido lifecycle hook `syncColegioLocation` para no hacer populate de `region` como relación (es string)
- Agregada protección adicional en controller y lifecycle hook para eliminar `region` si llega inadvertidamente
- Verificación en línea 71 del lifecycle: se estaba haciendo populate incorrecto

**Archivos modificados:**
- `src/app/api/persona-trayectorias/route.ts`
- `src/app/api/persona-trayectorias/[id]/route.ts`
- `src/app/(admin)/(apps)/crm/contacts/components/AddContactModal.tsx`
- `src/app/(admin)/(apps)/crm/contacts/components/EditContactModal.tsx`
- Strapi: `src/api/persona-trayectoria/controllers/persona-trayectoria.ts`
- Strapi: `src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.ts`

**Documentación creada:**
- `INVESTIGACION-ERROR-REGION-URGENTE.md`
- `SOLUCION-ERROR-REGION.md`
- `PROMPT-ERROR-REGION-PERSISTENTE.md`

### 2. Selección de Colegio en Editar Contacto ✅ RESUELTO

**Problema:**
Al editar un contacto y seleccionar un colegio, la selección desaparecía antes de guardar debido a que el `useEffect` reseteaba el estado después de la interacción del usuario.

**Solución:**
- Agregada bandera `isInitialLoad` para evitar que el `useEffect` resetee la selección después de la carga inicial
- Mejorado `handleColegioChange` con validaciones y logs
- Reset correcto de estados al cerrar el modal

**Archivos modificados:**
- `src/app/(admin)/(apps)/crm/contacts/components/EditContactModal.tsx`

**Commits:**
- `c0715bd0` - Corregir problema de selección de colegio en EditContactModal
- `5c9a0772` - Agregar useEffect para resetear isInitialLoad al cerrar modal

### 3. Campos Incorrectos en Content Type Cursos ✅ RESUELTO

**Problema:**
Errores "Invalid key nombre/curso_nombre/titulo/materiales" al trabajar con cursos. El schema en Strapi no estaba correctamente configurado.

**Solución:**
- Corregido schema en Strapi: campo `nombre_curso` (no `nombre` ni `curso_nombre`)
- Creado componente `curso.material` para materiales (componente repeatable)
- Actualizado código frontend para usar consistentemente `nombre_curso`
- Removido sort problemático hasta verificar campos ordenables
- Agregado fallback para `populate[lista_utiles]` (retry sin populate si error 500)

**Archivos modificados:**
- `src/app/api/crm/colegios/[id]/cursos/route.ts`
- `src/app/api/crm/cursos/[id]/route.ts`
- `src/app/(admin)/(apps)/crm/colegios/[id]/components/CursoModal.tsx`
- Strapi: `src/api/curso/content-types/curso/schema.json`
- Strapi: `src/components/curso/material.json` (creado)

**Documentación creada:**
- `PROMPT-STRAPI-CORREGIR-CONTENT-TYPE-CURSOS.md`
- `PROMPT-STRAPI-CURSOS-MATERIALES.md`
- `PROMPT-STRAPI-VERIFICAR-CAMPOS-CURSOS.md`

### 4. Extracción de ID en AddContactModal ✅ RESUELTO

**Problema:**
El modal de agregar contacto fallaba porque no se extraía correctamente el ID numérico de la persona recién creada desde la respuesta de Strapi.

**Solución:**
- Manejo de diferentes formatos de respuesta de Strapi
- Extracción correcta de ID numérico desde `data.attributes.id` o `data.id`
- Fallbacks para obtener ID numérico antes de crear trayectoria

**Archivos modificados:**
- `src/app/(admin)/(apps)/crm/contacts/components/AddContactModal.tsx`

**Commits:**
- `4cb89eeb` - Corregir extracción de ID en AddContactModal

### 5. Params TypeScript en Next.js 16 ✅ RESUELTO

**Problema:**
Error de TypeScript: `Property 'id' is missing in type 'Promise<{ id: string; }>' but required in type '{ id: string; }'`. En Next.js 16, los params son asíncronos.

**Solución:**
- Actualizado tipo de `params` de `{ id: string }` a `Promise<{ id: string }>`
- Agregado `await params` en todos los métodos (GET, PUT, DELETE)

**Archivos modificados:**
- `src/app/api/crm/listas-utiles/[id]/route.ts`
- `src/app/api/crm/cursos/[id]/route.ts`
- Otros API routes con params dinámicos

**Commits:**
- `f65d24de` - Corregir tipo de params en API routes para Next.js 16

### 6. Populate de lista_utiles Error 500 ✅ RESUELTO

**Problema:**
Error 500 al intentar popular `lista_utiles` en queries de cursos, probablemente porque el content type aún no estaba configurado en Strapi.

**Solución:**
- Implementado fallback: intenta populate completo, si falla con 500, reintenta sin populate de `lista_utiles`
- Log de warning para indicar que se necesita configurar en Strapi
- Compatibilidad hacia atrás: funciona aunque Strapi no tenga el content type aún

**Archivos modificados:**
- `src/app/api/crm/colegios/[id]/cursos/route.ts`
- `src/app/api/crm/cursos/[id]/route.ts`

**Commits:**
- `1048eed9` - Manejar error 500 de populate lista_utiles con fallback

---

## 🔧 Integración con Strapi

### Content Types Utilizados

#### 1. colegios (Colegios)

**Campos principales:**
- `nombre` (Text, required)
- `rbd` (Text, unique)
- `comuna` (Relation: manyToOne)
- `telefonos` (Component: repeatable)
- `emails` (Component: repeatable)
- `direcciones` (Component: repeatable)
- `cartera_asignaciones` (Relation: manyToMany)
- `persona_trayectorias` (Relation: oneToMany inversa)
- `cursos` (Relation: oneToMany inversa)

#### 2. personas (Contactos/Colaboradores)

**Campos principales:**
- `nombres` (Text, required)
- `apellidos` (Text, required)
- `rut` (Text, unique)
- `emails` (Component: repeatable)
- `telefonos` (Component: repeatable)
- `trayectorias` (Relation: oneToMany inversa)

#### 3. persona-trayectorias (Trayectorias Laborales)

**Campos principales:**
- `persona` (Relation: manyToOne → personas)
- `colegio` (Relation: manyToOne → colegios)
- `cargo` (Text, optional)
- `curso` (Text, optional)
- `asignatura` (Text, optional)
- `is_current` (Boolean, default: true)
- `fecha_inicio` (Date, optional)
- `fecha_fin` (Date, optional)

**Relaciones:**
- manyToOne: persona → personas
- manyToOne: colegio → colegios

**Notas importantes:**
- NO incluir campos del colegio (region, comuna, dependencia) - solo relación
- Usar formato `{ connect: [id] }` para relaciones manyToOne
- Solo una trayectoria activa por persona (`is_current: true`)

#### 4. cursos (Cursos de Colegios)

**Campos principales:**
- `nombre_curso` (Text, required) - ⚠️ NO usar `nombre` ni `curso_nombre`
- `nivel` (Text, optional) - "Basica" | "Media"
- `grado` (Text, optional) - "1" a "8"
- `paralelo` (Text, optional) - "A", "B", "C", etc.
- `activo` (Boolean, default: true)
- `colegio` (Relation: manyToOne → colegios)
- `lista_utiles` (Relation: manyToOne → listas-utiles, optional)
- `materiales` (Component: repeatable → curso.material)

**Componente: curso.material (repeatable):**
- `material_nombre` (Text, required)
- `tipo` (Enum: util, libro, cuaderno, otro)
- `cantidad` (Number)
- `obligatorio` (Boolean)
- `descripcion` (Text, optional)

#### 5. listas-utiles (Listas de Útiles Predefinidas) ⚠️ PENDIENTE EN STRAPI

**Campos esperados:**
- `nombre` (Text, required)
- `nivel` (Enum: Basica, Media, required)
- `grado` (Integer, required, min: 1, max: 8)
- `descripcion` (Text, optional)
- `materiales` (Component: repeatable → curso.material)
- `activo` (Boolean, default: true)

**Relaciones:**
- manyToOne inversa: cursos (varios cursos pueden usar la misma lista)

**Estado:**
- ⚠️ El content type debe crearse en Strapi
- 📄 Prompt disponible: `PROMPT-STRAPI-LISTAS-UTILES.md`

### API Routes Implementadas

#### Colegios
- `GET /api/crm/colegios` - Listar colegios (con filtros y búsqueda)
- `GET /api/crm/colegios/[id]` - Detalle de colegio (con populate completo)
- `PUT /api/crm/colegios/[id]` - Actualizar colegio
- `DELETE /api/crm/colegios/[id]` - Eliminar colegio
- `GET /api/crm/colegios/[id]/contacts` - Contactos del colegio
- `GET /api/crm/colegios/[id]/cursos` - Cursos del colegio
- `POST /api/crm/colegios/[id]/cursos` - Crear curso
- `GET /api/crm/colegios/list` - Lista simple para selectores

#### Contactos
- `GET /api/crm/contacts` - Listar contactos (con filtros y búsqueda)
- `POST /api/crm/contacts` - Crear contacto (con creación automática de trayectoria)
- `GET /api/crm/contacts/[id]` - Detalle de contacto
- `PUT /api/crm/contacts/[id]` - Actualizar contacto (con actualización de trayectoria)
- `DELETE /api/crm/contacts/[id]` - Eliminar contacto

#### Trayectorias
- `POST /api/persona-trayectorias` - Crear trayectoria
- `GET /api/persona-trayectorias` - Listar trayectorias (con filtros)
- `PUT /api/persona-trayectorias/[id]` - Actualizar trayectoria
- `DELETE /api/persona-trayectorias/[id]` - Eliminar trayectoria

#### Cursos
- `GET /api/crm/cursos/[id]` - Detalle de curso (con populate de materiales y lista_utiles)
- `PUT /api/crm/cursos/[id]` - Actualizar curso
- `DELETE /api/crm/cursos/[id]` - Eliminar curso

#### Listas de Útiles
- `GET /api/crm/listas-utiles` - Listar listas (con filtros: nivel, grado, activo)
- `POST /api/crm/listas-utiles` - Crear lista
- `GET /api/crm/listas-utiles/[id]` - Detalle de lista
- `PUT /api/crm/listas-utiles/[id]` - Actualizar lista
- `DELETE /api/crm/listas-utiles/[id]` - Eliminar lista (con validación de uso)
- `POST /api/crm/listas-utiles/import-excel` - Importar materiales desde Excel/CSV

### Populate Manual en Strapi v4

**Importante:** Strapi v4 no soporta `populate=deep` en todas las versiones. Se usa populate manual:

```typescript
const params = new URLSearchParams({
  'populate[trayectorias][populate][colegio]': 'true',
  'populate[trayectorias][populate][colegio][populate][comuna]': 'true',
  'populate[materiales]': 'true',
  'populate[lista_utiles]': 'true',
  'populate[lista_utiles][populate][materiales]': 'true',
})
```

**Para componentes repeatable:**
- `populate[materiales]=true` (no es relación, es componente)

**Para relaciones manyToOne:**
- `populate[colegio]=true`
- `populate[colegio][populate][comuna]=true` (anidado)

---

## 📁 Archivos Creados y Modificados

### Archivos Creados

#### Frontend
- `src/app/(admin)/(apps)/crm/colegios/page.tsx`
- `src/app/(admin)/(apps)/crm/colegios/[id]/page.tsx`
- `src/app/(admin)/(apps)/crm/colegios/[id]/components/CursoModal.tsx`
- `src/app/(admin)/(apps)/crm/colegios/[id]/components/ImportarMaterialesExcelModal.tsx`
- `src/app/(admin)/(apps)/crm/colegios/components/AddColegioModal.tsx`
- `src/app/(admin)/(apps)/crm/colegios/components/EditColegioModal.tsx`
- `src/app/(admin)/(apps)/crm/colegios/components/ColegiosListing.tsx`
- `src/app/(admin)/(apps)/crm/contacts/page.tsx`
- `src/app/(admin)/(apps)/crm/contacts/components/AddContactModal.tsx`
- `src/app/(admin)/(apps)/crm/contacts/components/EditContactModal.tsx`
- `src/app/(admin)/(apps)/crm/types.ts`

#### API Routes
- `src/app/api/crm/colegios/route.ts`
- `src/app/api/crm/colegios/[id]/route.ts`
- `src/app/api/crm/colegios/[id]/contacts/route.ts`
- `src/app/api/crm/colegios/[id]/cursos/route.ts`
- `src/app/api/crm/colegios/[id]/pedidos/route.ts`
- `src/app/api/crm/colegios/[id]/leads/route.ts`
- `src/app/api/crm/colegios/[id]/activities/route.ts`
- `src/app/api/crm/colegios/list/route.ts`
- `src/app/api/crm/contacts/route.ts`
- `src/app/api/crm/contacts/[id]/route.ts`
- `src/app/api/crm/cursos/[id]/route.ts`
- `src/app/api/crm/listas-utiles/route.ts`
- `src/app/api/crm/listas-utiles/[id]/route.ts`
- `src/app/api/crm/listas-utiles/import-excel/route.ts`
- `src/app/api/persona-trayectorias/route.ts`
- `src/app/api/persona-trayectorias/[id]/route.ts`

#### Utilidades
- `src/helpers/excel.ts`

#### Documentación
- `CONTEXTO-CRM-COMPLETO.md`
- `RESUMEN-IMPLEMENTACION-LISTAS-UTILES.md`
- `PROMPT-STRAPI-LISTAS-UTILES.md`
- `PROMPT-STRAPI-CORREGIR-CONTENT-TYPE-CURSOS.md`
- `PROMPT-STRAPI-CURSOS-MATERIALES.md`
- `INVESTIGACION-ERROR-REGION-URGENTE.md`
- `SOLUCION-ERROR-REGION.md`
- `PROMPT-ERROR-REGION-PERSISTENTE.md`
- `docs/CAMBIOS_INTRANET_CRM.md`
- `DOCUMENTACION-COMPLETA-CRM.md` (este archivo)

### Archivos Modificados

- `package.json` - Agregadas dependencias: `xlsx`, `@types/xlsx`
- Múltiples archivos de tipos y configuraciones según necesidades

---

## 📊 Estado Actual del Proyecto

### Funcionalidades Completas ✅

1. ✅ Gestión completa de colegios (CRUD + visualización detallada)
2. ✅ Gestión completa de contactos/colaboradores (CRUD + búsqueda)
3. ✅ Vinculación de contactos con colegios (trayectorias)
4. ✅ Gestión de cursos por colegio (CRUD + materiales)
5. ✅ Sistema de listas de útiles predefinidas (API completa, UI pendiente)
6. ✅ Importación de materiales desde Excel/CSV
7. ✅ Exportación de materiales a Excel
8. ✅ Visualización de estadísticas y métricas
9. ✅ Búsqueda y filtros avanzados
10. ✅ Validaciones y manejo de errores

### Funcionalidades Parcialmente Implementadas ⏳

1. ⏳ **Módulo UI de Listas de Útiles:**
   - ✅ API routes completas
   - ⏳ Página de listado
   - ⏳ Modal crear/editar
   - ⏳ Página de detalle
   - ⏳ Función duplicar

2. ⏳ **Importación desde PDF:**
   - ⏳ Extracción de texto PDF
   - ⏳ Integración con Claude API
   - ⏳ Preview editable

### Funcionalidades Pendientes

1. ⏳ Gestión completa de pedidos (estructura básica existe)
2. ⏳ Gestión completa de leads (estructura básica existe)
3. ⏳ Gestión completa de actividades (estructura básica existe)
4. ⏳ Reportes y exportación de datos avanzada
5. ⏳ Dashboard con gráficos y métricas avanzadas
6. ⏳ Notificaciones y alertas automáticas

### Problemas Conocidos / Pendientes

1. ⚠️ **Content Type `listas-utiles` en Strapi:**
   - Pendiente crear en Strapi
   - Prompt disponible: `PROMPT-STRAPI-LISTAS-UTILES.md`
   - El código tiene fallbacks para funcionar sin él

2. ⚠️ **Campo `paralelo` en content type `cursos`:**
   - Debe agregarse en Strapi si se desea usar paralelos
   - Actualmente funciona sin él (opcional)

### Dependencias Agregadas

```json
{
  "dependencies": {
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/xlsx": "^0.0.36"
  }
}
```

**Instalación:**
```bash
cd AlmonteIntranet
npm install
```

---

## 🚀 Próximos Pasos

### Corto Plazo (Alta Prioridad)

1. **Crear content type `listas-utiles` en Strapi**
   - Usar prompt: `PROMPT-STRAPI-LISTAS-UTILES.md`
   - Verificar permisos (find, findOne, create, update, delete)
   - Rebuild de Strapi

2. **Crear módulo UI de Listas de Útiles**
   - Página de listado (`listas-utiles/page.tsx`)
   - Modal crear/editar (`ListaUtilesModal.tsx`)
   - Agregar al menú/navegación

3. **Implementar función duplicar listas**
   - Modal para cambiar nombre de la copia
   - Copiar todos los materiales

### Medio Plazo (Prioridad Media)

4. **Implementar importación desde PDF**
   - Extracción de texto (pdfjs-dist o pdf-parse)
   - Integración con Claude API
   - Preview editable
   - Manejo de errores

5. **Completar gestión de pedidos**
   - Estructura básica existe, falta completar funcionalidad

6. **Completar gestión de leads**
   - Estructura básica existe, falta completar funcionalidad

7. **Completar gestión de actividades**
   - Estructura básica existe, falta completar funcionalidad

### Largo Plazo (Prioridad Baja)

8. **Dashboard con métricas avanzadas**
   - Gráficos de ventas
   - Estadísticas por colegio/contacto
   - Tendencias

9. **Reportes y exportación avanzada**
   - Exportar colegios, contactos, cursos a Excel/PDF
   - Reportes personalizados

10. **Notificaciones y alertas**
    - Alertas de nuevos leads
    - Recordatorios de seguimientos
    - Notificaciones de pedidos

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

### 5. Populate Manual en Strapi v4

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
- Generics en llamadas a Strapi

### 5. Revalidación de Caché

```typescript
revalidatePath('/crm/contacts')
revalidateTag('contacts', 'max')
```

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
5. **Usar fallback** para `populate[lista_utiles]` si Strapi no está configurado

### Al Trabajar con Excel

1. **Importación dinámica** de `xlsx` solo en el cliente
2. **Validar tipo y tamaño** de archivo antes de procesar
3. **Preview editable** antes de guardar
4. **Normalizar datos** (tipos de materiales, valores booleanos)

---

## 🎓 Lecciones Aprendidas

1. **Strapi valida campos antes del lifecycle hook** - Por eso se necesita protección en el controller
2. **Componentes repeatable se populan diferente** - No son relaciones, son componentes
3. **IDs numéricos vs documentId** - Siempre verificar cuál se necesita
4. **Populate manual es más confiable** - `populate=deep` no siempre funciona
5. **Validar schema antes de usar campos** - Los nombres pueden variar
6. **Next.js 16 params son asíncronos** - Usar `Promise<{ id: string }>` y `await params`
7. **Fallbacks son esenciales** - Para compatibilidad durante desarrollo
8. **Logs condicionales** - Útiles en desarrollo, evitar en producción

---

## 📚 Documentación de Referencia

### Documentos Creados en el Proyecto

- `CONTEXTO-CRM-COMPLETO.md` - Contexto general del sistema CRM
- `RESUMEN-IMPLEMENTACION-LISTAS-UTILES.md` - Estado de implementación de listas de útiles
- `PROMPT-STRAPI-LISTAS-UTILES.md` - Prompt para crear content type en Strapi
- `PROMPT-STRAPI-CORREGIR-CONTENT-TYPE-CURSOS.md` - Prompt para corregir schema
- `PROMPT-STRAPI-CURSOS-MATERIALES.md` - Prompt para crear cursos
- `INVESTIGACION-ERROR-REGION-URGENTE.md` - Investigación del error region
- `SOLUCION-ERROR-REGION.md` - Solución implementada
- `PROMPT-ERROR-REGION-PERSISTENTE.md` - Prompt para Strapi
- `docs/CAMBIOS_INTRANET_CRM.md` - Cambios específicos del frontend
- `docs/crm/README.md` - Documentación técnica del CRM
- `docs/crm/TROUBLESHOOTING.md` - Guía de solución de problemas

### Archivos de Configuración

- `nixpacks.toml` - Configuración de build para Railway
- `railway.json` - Configuración de deployment
- `Dockerfile` - Docker configuration (backup)

---

## 🔄 Flujo de Trabajo Recomendado para Integración

### Para Integrar esta Rama a Main

1. **Revisar cambios:**
   ```bash
   git checkout main
   git pull origin main
   git checkout mati-integracion
   git diff main...mati-integracion
   ```

2. **Verificar dependencias:**
   ```bash
   cd AlmonteIntranet
   npm install
   ```

3. **Revisar content types en Strapi:**
   - Verificar que `cursos` tenga campo `nombre_curso` y componente `materiales`
   - Verificar que `persona-trayectorias` esté correctamente configurado
   - ⚠️ Crear content type `listas-utiles` (usar `PROMPT-STRAPI-LISTAS-UTILES.md`)

4. **Revisar variables de entorno:**
   - Verificar `STRAPI_URL` y `STRAPI_API_TOKEN`

5. **Probar funcionalidades principales:**
   - Crear/editar contacto con colegio
   - Crear/editar curso con materiales
   - Importar/exportar materiales Excel
   - Listar colegios y contactos

6. **Revisar logs:**
   - Verificar que no haya errores 500 en populate de `lista_utiles`
   - Verificar que no haya errores "Invalid key region"

7. **Merge:**
   ```bash
   git checkout main
   git merge mati-integracion
   # Resolver conflictos si los hay
   git push origin main
   ```

---

## 📞 Contacto y Soporte

Para dudas sobre el código o la implementación:
- Revisar documentación en `docs/crm/`
- Revisar prompts para Strapi en archivos `PROMPT-STRAPI-*.md`
- Revisar troubleshooting en `docs/crm/TROUBLESHOOTING.md`

---

**Última actualización:** 9 de Enero 2026  
**Estado general:** ✅ Sistema funcional con funcionalidades principales completas  
**Próximo paso:** Crear content type `listas-utiles` en Strapi y completar módulo UI
