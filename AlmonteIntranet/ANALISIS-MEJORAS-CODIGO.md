# 📊 Análisis y Sugerencias de Mejoras - Código CRM

**Fecha:** Enero 2026  
**Archivo analizado:** `src/app/api/crm/cursos/[id]/route.ts`  
**Alcance:** Análisis completo del proyecto y sugerencias de mejoras

---

## 📋 Resumen Ejecutivo

Este documento contiene un análisis detallado del código actual y sugerencias de mejoras específicas, priorizadas y accionables. Las mejoras se basan en:

- ✅ Documentación existente (`MEJORAS_CODIGO.md`, `DOCUMENTACION-COMPLETA-CRM.md`)
- ✅ Patrones ya implementados en el proyecto
- ✅ Mejores prácticas de Next.js 16 y TypeScript
- ✅ Consistencia con el resto del codebase

---

## 🎯 Mejoras para `cursos/[id]/route.ts`

### 1. ✅ Usar Utilidades Existentes de API

**Problema Actual:**
- El archivo no usa `createSuccessResponse` ni `createErrorResponse` de `lib/api/utils.ts`
- Manejo de errores duplicado e inconsistente

**Solución:**
```typescript
// ❌ ANTES
return NextResponse.json({
  success: true,
  data: response.data,
}, { status: 200 })

// ✅ DESPUÉS
import { createSuccessResponse, createErrorResponse } from '@/lib/api/utils'

return createSuccessResponse(response.data)
```

**Beneficios:**
- ✅ Consistencia en todas las respuestas
- ✅ Menos código duplicado
- ✅ Más fácil de mantener

### 2. ✅ Extraer Lógica de Populate a Helper Reutilizable

**Problema Actual:**
- Lógica de populate con fallbacks duplicada en múltiples archivos
- Código anidado difícil de mantener

**Solución: Crear `lib/strapi/populate-helpers.ts`**
```typescript
/**
 * Intenta hacer populate de lista_utiles con fallback automático
 * @param cursoId - ID del curso
 * @param includeListaUtiles - Si incluir lista_utiles (default: true)
 */
export async function getCursoWithPopulate(
  cursoId: string | number,
  includeListaUtiles = true
) {
  const baseParams = new URLSearchParams({
    'populate[materiales]': 'true',
    'populate[colegio]': 'true',
  })

  if (includeListaUtiles) {
    baseParams.append('populate[lista_utiles]', 'true')
    baseParams.append('populate[lista_utiles][populate][materiales]', 'true')
  }

  try {
    return await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/cursos/${cursoId}?${baseParams.toString()}`
    )
  } catch (error: any) {
    // Si falla con populate anidado, intentar sin populate de materiales
    if ((error.status === 500 || error.status === 400) && includeListaUtiles) {
      const fallbackParams = new URLSearchParams({
        'populate[materiales]': 'true',
        'populate[colegio]': 'true',
        'populate[lista_utiles]': 'true',
      })
      
      try {
        return await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${cursoId}?${fallbackParams.toString()}`
        )
      } catch (secondError: any) {
        // Último fallback: sin lista_utiles
        const minimalParams = new URLSearchParams({
          'populate[materiales]': 'true',
          'populate[colegio]': 'true',
        })
        return await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${cursoId}?${minimalParams.toString()}`
        )
      }
    }
    throw error
  }
}
```

**Uso en route.ts:**
```typescript
// ❌ ANTES (75+ líneas de código anidado)
let response: any
try {
  const paramsObj = new URLSearchParams({...})
  response = await strapiClient.get(...)
} catch (error: any) {
  if (error.status === 500 || error.status === 400) {
    try {
      // ... más código anidado
    } catch (secondError: any) {
      // ... más código anidado
    }
  }
}

// ✅ DESPUÉS (1 línea)
const response = await getCursoWithPopulate(id)
```

### 3. ✅ Mejorar Tipos TypeScript

**Problema Actual:**
- Uso de `any` en varios lugares
- Falta de tipos específicos para Curso

**Solución:**
```typescript
// Crear tipos en lib/strapi/types.ts o lib/crm/types.ts
export interface CursoData {
  id?: number
  documentId?: string
  nombre_curso: string
  nivel?: 'Basica' | 'Media'
  grado?: string // "1" a "8"
  paralelo?: string | null
  activo: boolean
  colegio?: any
  lista_utiles?: ListaUtilesData | null
  materiales?: MaterialData[]
  createdAt?: string
  updatedAt?: string
}

export interface MaterialData {
  material_nombre: string
  tipo: 'util' | 'libro' | 'cuaderno' | 'otro'
  cantidad: number
  obligatorio: boolean
  descripcion?: string | null
}

export interface UpdateCursoRequest {
  nombre_curso?: string
  nivel?: 'Basica' | 'Media'
  grado?: string
  paralelo?: string | null
  activo?: boolean
  lista_utiles?: number | null
  materiales?: MaterialData[]
}
```

**Uso:**
```typescript
// ❌ ANTES
const cursoData: any = { data: {} }

// ✅ DESPUÉS
const cursoData: { data: Partial<CursoData> } = { data: {} }
```

### 4. ✅ Centralizar Validaciones

**Problema Actual:**
- Validaciones duplicadas en múltiples archivos
- Mensajes de error inconsistentes

**Solución: Crear `lib/crm/validations.ts`**
```typescript
import { z } from 'zod'

export const UpdateCursoSchema = z.object({
  nombre_curso: z.string().min(1, 'El nombre del curso no puede estar vacío').optional(),
  nivel: z.enum(['Basica', 'Media']).optional(),
  grado: z.string().regex(/^[1-8]$/, 'El grado debe ser entre 1 y 8').optional(),
  paralelo: z.string().nullable().optional(),
  activo: z.boolean().optional(),
  lista_utiles: z.union([z.number(), z.string(), z.null()]).optional(),
  materiales: z.array(z.object({
    material_nombre: z.string().min(1),
    tipo: z.enum(['util', 'libro', 'cuaderno', 'otro']).default('util'),
    cantidad: z.number().int().positive().default(1),
    obligatorio: z.boolean().default(true),
    descripcion: z.string().optional().nullable(),
  })).optional(),
})

export type UpdateCursoInput = z.infer<typeof UpdateCursoSchema>
```

**Uso:**
```typescript
// ❌ ANTES
if (body.nombre_curso !== undefined && !body.nombre_curso?.trim()) {
  return NextResponse.json(
    { success: false, error: 'El nombre del curso no puede estar vacío' },
    { status: 400 }
  )
}

// ✅ DESPUÉS
try {
  const validatedData = UpdateCursoSchema.parse(body)
  // ... usar validatedData
} catch (error) {
  if (error instanceof z.ZodError) {
    return createErrorResponse(
      'Datos inválidos',
      400,
      { errors: error.errors }
    )
  }
  throw error
}
```

### 5. ✅ Mejorar Manejo de Relaciones

**Problema Actual:**
- Lógica de `lista_utiles` duplicada
- Manejo manual de `connect` y `disconnect`

**Solución: Crear helper en `lib/strapi/relations.ts`**
```typescript
/**
 * Prepara relación manyToOne para Strapi
 */
export function prepareManyToOneRelation(
  value: number | string | null | undefined,
  fieldName: string
): Record<string, any> | undefined {
  if (value === null || value === '') {
    return { [fieldName]: { disconnect: true } }
  }
  
  const id = typeof value === 'number' ? value : parseInt(String(value))
  if (isNaN(id)) {
    return undefined
  }
  
  return { [fieldName]: { connect: [id] } }
}
```

**Uso:**
```typescript
// ❌ ANTES
if (body.lista_utiles !== undefined) {
  if (body.lista_utiles === null || body.lista_utiles === '') {
    cursoData.data.lista_utiles = { disconnect: true }
  } else {
    const listaUtilesId = typeof body.lista_utiles === 'number' 
      ? body.lista_utiles 
      : parseInt(String(body.lista_utiles))
    if (!isNaN(listaUtilesId)) {
      cursoData.data.lista_utiles = { connect: [listaUtilesId] }
    }
  }
}

// ✅ DESPUÉS
const listaUtilesRelation = prepareManyToOneRelation(body.lista_utiles, 'lista_utiles')
if (listaUtilesRelation) {
  Object.assign(cursoData.data, listaUtilesRelation)
}
```

### 6. ✅ Usar Logger Centralizado

**Problema Actual:**
- Cada archivo define su propio `debugLog`
- Inconsistencia en formato de logs

**Solución: Ya existe en `MEJORAS_CODIGO.md` - Implementar `lib/logging/logger.ts`**
```typescript
// Ya documentado en MEJORAS_CODIGO.md
import { logger } from '@/lib/logging/logger'

// ❌ ANTES
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}
debugLog('[API /crm/cursos/[id] GET] Buscando curso:', id)

// ✅ DESPUÉS
logger.debug('[API /crm/cursos/[id] GET] Buscando curso', { id })
logger.error('[API /crm/cursos/[id] GET] Error', { error, id })
```

---

## 🔧 Mejoras Generales del Proyecto

### 7. ✅ Crear Servicio de Cursos

**Problema Actual:**
- Lógica de negocio mezclada con rutas API
- Difícil de testear y reutilizar

**Solución: Crear `lib/services/cursoService.ts`**
```typescript
import strapiClient from '@/lib/strapi/client'
import { getCursoWithPopulate } from '@/lib/strapi/populate-helpers'
import type { CursoData, UpdateCursoRequest } from '@/lib/crm/types'

export class CursoService {
  /**
   * Obtiene un curso con todos sus datos poblados
   */
  static async findById(id: string | number): Promise<CursoData | null> {
    try {
      const response = await getCursoWithPopulate(id)
      const curso = Array.isArray(response.data) ? response.data[0] : response.data
      return curso as CursoData
    } catch (error: any) {
      if (error.status === 404) return null
      throw error
    }
  }

  /**
   * Actualiza un curso
   */
  static async update(
    id: string | number,
    data: UpdateCursoRequest
  ): Promise<CursoData> {
    const cursoData: any = { data: {} }

    // Actualizar campos simples
    if (data.nombre_curso !== undefined) {
      cursoData.data.nombre_curso = data.nombre_curso.trim()
    }
    if (data.nivel !== undefined) cursoData.data.nivel = data.nivel
    if (data.grado !== undefined) cursoData.data.grado = data.grado
    if (data.paralelo !== undefined) cursoData.data.paralelo = data.paralelo || null
    if (data.activo !== undefined) cursoData.data.activo = data.activo

    // Actualizar relación lista_utiles
    const listaUtilesRelation = prepareManyToOneRelation(data.lista_utiles, 'lista_utiles')
    if (listaUtilesRelation) {
      Object.assign(cursoData.data, listaUtilesRelation)
    }

    // Actualizar materiales
    if (data.materiales !== undefined) {
      if (Array.isArray(data.materiales) && data.materiales.length > 0) {
        cursoData.data.materiales = data.materiales.map(m => ({
          material_nombre: m.material_nombre || '',
          tipo: m.tipo || 'util',
          cantidad: m.cantidad || 1,
          obligatorio: m.obligatorio !== undefined ? m.obligatorio : true,
          ...(m.descripcion && { descripcion: m.descripcion }),
        }))
      } else {
        cursoData.data.materiales = []
      }
    }

    // Limpiar campos undefined/null
    Object.keys(cursoData.data).forEach(key => {
      if (cursoData.data[key] === undefined || cursoData.data[key] === null) {
        delete cursoData.data[key]
      }
    })

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<CursoData>>>(
      `/api/cursos/${id}`,
      cursoData
    )

    return (Array.isArray(response.data) ? response.data[0] : response.data) as CursoData
  }

  /**
   * Elimina un curso
   */
  static async delete(id: string | number): Promise<void> {
    await strapiClient.delete(`/api/cursos/${id}`)
  }
}
```

**Uso en route.ts:**
```typescript
// ❌ ANTES (100+ líneas de lógica en el handler)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    // ... 100+ líneas de lógica
  } catch (error) {
    // ... manejo de errores
  }
}

// ✅ DESPUÉS (20 líneas)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validar
    const validatedData = UpdateCursoSchema.parse(body)
    
    // Actualizar
    const curso = await CursoService.update(id, validatedData)
    
    return createSuccessResponse(curso)
  } catch (error) {
    return handleApiError(error, 'Error al actualizar curso')
  }
}
```

### 8. ✅ Implementar Middleware de Validación

**Problema Actual:**
- Validaciones repetidas en cada endpoint
- Fácil olvidar validar campos

**Solución: Crear `lib/api/middleware.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export function withValidation<T extends z.ZodType>(
  schema: T,
  handler: (req: NextRequest, data: z.infer<T>, params: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: any) => {
    try {
      const body = await request.json()
      const validatedData = schema.parse(body)
      return handler(request, validatedData, context)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse('Datos inválidos', 400, { errors: error.errors })
      }
      throw error
    }
  }
}
```

**Uso:**
```typescript
export const PUT = withValidation(
  UpdateCursoSchema,
  async (request, validatedData, { params }) => {
    const { id } = await params
    const curso = await CursoService.update(id, validatedData)
    return createSuccessResponse(curso)
  }
)
```

### 9. ✅ Mejorar Documentación de Código

**Problema Actual:**
- Comentarios inconsistentes
- Falta de JSDoc en funciones complejas

**Solución:**
```typescript
/**
 * Obtiene un curso específico con sus materiales y lista de útiles
 * 
 * @param id - ID del curso (numérico o documentId)
 * @returns Curso con materiales y lista de útiles poblados
 * @throws {Error} Si el curso no existe o hay error de conexión
 * 
 * @example
 * ```typescript
 * const curso = await CursoService.findById(123)
 * console.log(curso.materiales) // Array de materiales
 * ```
 */
static async findById(id: string | number): Promise<CursoData | null>
```

---

## 📊 Priorización de Mejoras

### 🔴 Alta Prioridad (Implementar Primero)

1. **Usar utilidades existentes** (`createSuccessResponse`, `createErrorResponse`)
   - Impacto: Alto
   - Esfuerzo: Bajo (30 min por archivo)
   - Archivos afectados: `cursos/[id]/route.ts`, `colegios/[id]/cursos/route.ts`

2. **Extraer lógica de populate a helper**
   - Impacto: Alto
   - Esfuerzo: Medio (2-3 horas)
   - Reduce duplicación en 3+ archivos

3. **Mejorar tipos TypeScript**
   - Impacto: Medio-Alto
   - Esfuerzo: Bajo-Medio (1-2 horas)
   - Previene errores en tiempo de ejecución

### 🟡 Media Prioridad

4. **Centralizar validaciones con Zod**
   - Impacto: Alto
   - Esfuerzo: Medio (3-4 horas)
   - Requiere: Ya tienes `zod` instalado ✅

5. **Crear servicio de cursos**
   - Impacto: Alto
   - Esfuerzo: Medio (4-5 horas)
   - Mejora testabilidad y reutilización

6. **Usar logger centralizado**
   - Impacto: Medio
   - Esfuerzo: Bajo (1 hora)
   - Ya está documentado en `MEJORAS_CODIGO.md`

### 🟢 Baja Prioridad (Nice to Have)

7. **Middleware de validación**
   - Impacto: Medio
   - Esfuerzo: Medio (2-3 horas)
   - Mejora DX pero no crítico

8. **Mejorar documentación JSDoc**
   - Impacto: Bajo-Medio
   - Esfuerzo: Bajo (1 hora)
   - Mejora mantenibilidad a largo plazo

---

## 🚀 Plan de Implementación Sugerido

### Fase 1: Quick Wins (1-2 días)
1. ✅ Refactorizar `cursos/[id]/route.ts` para usar utilidades existentes
2. ✅ Agregar tipos TypeScript básicos
3. ✅ Implementar logger centralizado

### Fase 2: Reducción de Duplicación (3-5 días)
1. ✅ Crear helper de populate reutilizable
2. ✅ Crear helper de relaciones
3. ✅ Aplicar a todos los archivos de cursos

### Fase 3: Validaciones y Servicios (1 semana)
1. ✅ Implementar validaciones con Zod
2. ✅ Crear `CursoService`
3. ✅ Refactorizar endpoints para usar servicio

### Fase 4: Mejoras Adicionales (Opcional)
1. ⏳ Middleware de validación
2. ⏳ Mejorar documentación JSDoc
3. ⏳ Tests unitarios para servicios

---

## 📝 Ejemplo Completo Refactorizado

### Antes (240 líneas):
```typescript
// cursos/[id]/route.ts - Versión actual
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // ... 75 líneas de lógica de populate con fallbacks
    // ... manejo de errores manual
  } catch (error: any) {
    // ... manejo de errores
  }
}
```

### Después (50 líneas):
```typescript
// cursos/[id]/route.ts - Versión refactorizada
import { NextRequest } from 'next/server'
import { createSuccessResponse, createErrorResponse } from '@/lib/api/utils'
import { CursoService } from '@/lib/services/cursoService'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logger.debug('[API /crm/cursos/[id] GET]', { id })
    
    const curso = await CursoService.findById(id)
    
    if (!curso) {
      return createErrorResponse('Curso no encontrado', 404)
    }
    
    return createSuccessResponse(curso)
  } catch (error: any) {
    logger.error('[API /crm/cursos/[id] GET] Error', { error, id: await params.then(p => p.id) })
    return createErrorResponse(
      error.message || 'Error al obtener curso',
      error.status || 500,
      error.details
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    logger.debug('[API /crm/cursos/[id] PUT]', { id })
    
    // Validar con Zod
    const validatedData = UpdateCursoSchema.parse(body)
    
    // Actualizar
    const curso = await CursoService.update(id, validatedData)
    
    logger.info('[API /crm/cursos/[id] PUT] Curso actualizado', { id })
    return createSuccessResponse(curso, { message: 'Curso actualizado exitosamente' })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('Datos inválidos', 400, { errors: error.errors })
    }
    
    logger.error('[API /crm/cursos/[id] PUT] Error', { error, id: await params.then(p => p.id) })
    return createErrorResponse(
      error.message || 'Error al actualizar curso',
      error.status || 500,
      error.details
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logger.debug('[API /crm/cursos/[id] DELETE]', { id })
    
    await CursoService.delete(id)
    
    logger.info('[API /crm/cursos/[id] DELETE] Curso eliminado', { id })
    return createSuccessResponse(null, { message: 'Curso eliminado exitosamente' })
  } catch (error: any) {
    logger.error('[API /crm/cursos/[id] DELETE] Error', { error, id: await params.then(p => p.id) })
    return createErrorResponse(
      error.message || 'Error al eliminar curso',
      error.status || 500,
      error.details
    )
  }
}
```

**Reducción:** De 240 líneas a ~50 líneas (79% menos código)  
**Mejoras:**
- ✅ Código más legible
- ✅ Más fácil de testear
- ✅ Consistente con el resto del proyecto
- ✅ Mejor manejo de errores
- ✅ Tipos TypeScript completos

---

## 🔍 Archivos a Crear/Modificar

### Nuevos Archivos a Crear:
1. `src/lib/strapi/populate-helpers.ts` - Helpers para populate con fallbacks
2. `src/lib/strapi/relations.ts` - Helpers para relaciones Strapi
3. `src/lib/crm/types.ts` - Tipos específicos del CRM
4. `src/lib/crm/validations.ts` - Schemas de validación Zod
5. `src/lib/services/cursoService.ts` - Servicio de cursos
6. `src/lib/logging/logger.ts` - Logger centralizado (ya documentado)

### Archivos a Modificar:
1. `src/app/api/crm/cursos/[id]/route.ts` - Refactorizar completo
2. `src/app/api/crm/colegios/[id]/cursos/route.ts` - Usar nuevos helpers
3. `src/lib/strapi/types.ts` - Agregar tipos de Curso

---

## ✅ Checklist de Implementación

### Paso 1: Preparación
- [ ] Crear `lib/strapi/populate-helpers.ts`
- [ ] Crear `lib/strapi/relations.ts`
- [ ] Crear `lib/crm/types.ts`
- [ ] Crear `lib/crm/validations.ts`
- [ ] Crear `lib/logging/logger.ts` (si no existe)

### Paso 2: Servicio
- [ ] Crear `lib/services/cursoService.ts`
- [ ] Implementar métodos: `findById`, `update`, `delete`
- [ ] Agregar tests básicos (opcional)

### Paso 3: Refactorización
- [ ] Refactorizar `cursos/[id]/route.ts`
- [ ] Refactorizar `colegios/[id]/cursos/route.ts`
- [ ] Verificar que todo funciona

### Paso 4: Testing
- [ ] Probar GET curso
- [ ] Probar PUT curso
- [ ] Probar DELETE curso
- [ ] Probar casos de error

---

## 📚 Referencias

- Documentación existente: `docs/MEJORAS_CODIGO.md`
- Documentación CRM: `DOCUMENTACION-COMPLETA-CRM.md`
- Utilidades API: `src/lib/api/utils.ts`
- Cliente Strapi: `src/lib/strapi/client.ts`

---

**Última actualización:** Enero 2026  
**Autor:** Análisis automatizado del código  
**Estado:** ✅ Listo para implementación

