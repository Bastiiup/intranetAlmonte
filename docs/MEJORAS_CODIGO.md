# 🔧 Sugerencias de Mejoras para el Código

## 📋 Resumen Ejecutivo

Este documento contiene sugerencias de mejoras basadas en la revisión del código actual, enfocándose en:
- Reducción de código duplicado
- Mejora de tipos TypeScript
- Optimización de manejo de errores
- Mejora de mantenibilidad
- Mejora de performance

---

## 🎯 1. Crear Funciones Helper Reutilizables

### Problema Actual
Hay mucha lógica duplicada para:
- Extraer datos de respuestas de Strapi
- Normalizar estructuras de persona/colaborador
- Manejar IDs (documentId vs id numérico)
- Parsear cookies

### Solución: Crear `lib/strapi/helpers.ts`

```typescript
/**
 * Extrae datos de una respuesta de Strapi, manejando diferentes estructuras
 */
export function extractStrapiData<T>(response: any): T | null {
  if (!response) return null
  
  // Si es array, tomar el primero
  if (Array.isArray(response)) {
    return response[0] as T
  }
  
  // Si tiene .data
  if (response.data) {
    if (Array.isArray(response.data)) {
      return response.data[0] as T
    }
    // Si response.data tiene .data anidado
    if (response.data.data) {
      return response.data.data as T
    }
    return response.data as T
  }
  
  // Si tiene .attributes
  if (response.attributes) {
    return { ...response, ...response.attributes } as T
  }
  
  return response as T
}

/**
 * Obtiene el ID preferido (documentId o id) de una entidad de Strapi
 */
export function getStrapiId(entity: any): string | number | null {
  if (!entity) return null
  return entity.documentId || entity.id || null
}

/**
 * Normaliza estructura de persona desde diferentes formatos de Strapi
 */
export function normalizePersona(persona: any): any {
  if (!persona) return null
  
  // Si tiene .data
  if (persona.data) {
    const data = persona.data
    if (data.attributes) {
      return { ...data, ...data.attributes }
    }
    return data
  }
  
  // Si tiene .attributes
  if (persona.attributes) {
    return { ...persona, ...persona.attributes }
  }
  
  return persona
}

/**
 * Construye nombre completo desde componentes
 */
export function buildNombreCompleto(
  nombres?: string | null,
  primerApellido?: string | null,
  segundoApellido?: string | null
): string | null {
  const parts = [
    nombres?.trim(),
    primerApellido?.trim(),
    segundoApellido?.trim()
  ].filter(Boolean)
  
  return parts.length > 0 ? parts.join(' ') : null
}
```

**Beneficios:**
- ✅ Reduce código duplicado en ~70%
- ✅ Consistencia en el manejo de datos
- ✅ Más fácil de mantener y testear

---

## 🎯 2. Mejorar Tipos TypeScript

### Problema Actual
- Uso excesivo de `any`
- Interfaces incompletas
- Falta de tipos para respuestas de Strapi

### Solución: Crear tipos más específicos

```typescript
// lib/strapi/types.ts (mejorar)

export interface PersonaData {
  id?: number
  documentId?: string
  rut: string
  nombres?: string | null
  primer_apellido?: string | null
  segundo_apellido?: string | null
  nombre_completo?: string | null
  genero?: string | null
  cumpleagno?: string | null
  bio?: string | null
  job_title?: string | null
  telefono_principal?: string | null
  direccion?: any
  redes_sociales?: any
  skills?: string[] | null
  imagen?: any
  portada?: any
  telefonos?: Array<{ numero: string; tipo?: string }>
  emails?: Array<{ email: string; tipo?: string }>
}

export interface ColaboradorData {
  id?: number
  documentId?: string
  email_login: string
  rol?: string
  activo: boolean
  persona?: PersonaData | null
  usuario?: any
  empresa?: any
}

export interface CreateColaboradorRequest {
  email_login: string
  password?: string
  rol?: string
  activo?: boolean
  persona?: {
    personaId?: string | number
    rut?: string
    nombres?: string
    primer_apellido?: string
    segundo_apellido?: string
    genero?: string
    cumpleagno?: string
  }
  usuario?: any
}
```

**Beneficios:**
- ✅ Mejor autocompletado en IDE
- ✅ Detección temprana de errores
- ✅ Documentación implícita del código

---

## 🎯 3. Centralizar Manejo de Cookies

### Problema Actual
- Lógica de cookies duplicada en múltiples archivos
- Inconsistencias en nombres de cookies

### Solución: Crear `lib/auth/cookies.ts`

```typescript
import { cookies } from 'next/headers'

const COOKIE_NAMES = {
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  AUTH_COLABORADOR: 'auth_colaborador',
  COLABORADOR_DATA: 'colaboradorData',
  COLABORADOR: 'colaborador',
} as const

export async function getColaboradorFromCookies() {
  const cookieStore = await cookies()
  const cookieNames = [
    COOKIE_NAMES.AUTH_COLABORADOR,
    COOKIE_NAMES.COLABORADOR_DATA,
    COOKIE_NAMES.COLABORADOR,
  ]
  
  for (const cookieName of cookieNames) {
    const cookieValue = cookieStore.get(cookieName)?.value
    if (cookieValue) {
      try {
        const colaborador = JSON.parse(cookieValue)
        // Normalizar estructura
        if (colaborador && !colaborador.documentId && colaborador.id) {
          colaborador.documentId = colaborador.id
        }
        return colaborador
      } catch (error) {
        console.warn(`[Cookies] Error al parsear ${cookieName}:`, error)
        continue
      }
    }
  }
  
  return null
}
```

**Beneficios:**
- ✅ Un solo lugar para cambiar lógica de cookies
- ✅ Consistencia en toda la aplicación
- ✅ Más fácil de testear

---

## 🎯 4. Crear Servicio para Manejo de Personas

### Problema Actual
- Lógica de creación/búsqueda de personas duplicada
- Manejo complejo de relaciones

### Solución: Crear `lib/services/personaService.ts`

```typescript
import strapiClient from '@/lib/strapi/client'
import { getStrapiId, normalizePersona, buildNombreCompleto } from '@/lib/strapi/helpers'

export interface PersonaInput {
  rut: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  genero?: string
  cumpleagno?: string
}

export class PersonaService {
  /**
   * Busca una persona por RUT
   */
  static async findByRut(rut: string): Promise<any | null> {
    try {
      const response = await strapiClient.get<any>(
        `/api/personas?filters[rut][$eq]=${encodeURIComponent(rut.trim())}&pagination[pageSize]=1`
      )
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return normalizePersona(response.data[0])
      }
      return null
    } catch (error: any) {
      if (error.status === 404) return null
      throw error
    }
  }
  
  /**
   * Crea o actualiza una persona
   * Retorna el ID (documentId preferido) de la persona
   */
  static async createOrUpdate(input: PersonaInput): Promise<string | number> {
    // Buscar primero
    const personaExistente = await this.findByRut(input.rut)
    
    if (personaExistente) {
      // Actualizar si hay cambios
      const updateData: any = {
        data: {},
      }
      
      if (input.nombres?.trim()) updateData.data.nombres = input.nombres.trim()
      if (input.primer_apellido?.trim()) updateData.data.primer_apellido = input.primer_apellido.trim()
      if (input.segundo_apellido?.trim()) updateData.data.segundo_apellido = input.segundo_apellido.trim()
      if (input.genero) updateData.data.genero = input.genero
      if (input.cumpleagno) updateData.data.cumpleagno = input.cumpleagno
      
      const nombreCompleto = buildNombreCompleto(
        input.nombres,
        input.primer_apellido,
        input.segundo_apellido
      )
      if (nombreCompleto) {
        updateData.data.nombre_completo = nombreCompleto
      }
      
      if (Object.keys(updateData.data).length > 0) {
        const personaId = getStrapiId(personaExistente)
        if (personaId) {
          await strapiClient.put(`/api/personas/${personaId}`, updateData)
        }
      }
      
      return getStrapiId(personaExistente)!
    }
    
    // Crear nueva
    const nombreCompleto = buildNombreCompleto(
      input.nombres,
      input.primer_apellido,
      input.segundo_apellido
    )
    
    const createData = {
      data: {
        rut: input.rut.trim(),
        nombres: input.nombres?.trim() || null,
        primer_apellido: input.primer_apellido?.trim() || null,
        segundo_apellido: input.segundo_apellido?.trim() || null,
        nombre_completo: nombreCompleto,
        genero: input.genero || null,
        cumpleagno: input.cumpleagno || null,
        origen: 'manual',
        activo: true,
      },
    }
    
    const response = await strapiClient.post<any>('/api/personas', createData)
    const personaCreada = extractStrapiData(response)
    
    const personaId = getStrapiId(personaCreada)
    if (!personaId) {
      throw new Error('No se pudo obtener el ID de la persona creada')
    }
    
    return personaId
  }
}
```

**Uso en route.ts:**
```typescript
// Antes (100+ líneas)
// ... código complejo de búsqueda/creación ...

// Después (5 líneas)
const personaId = await PersonaService.createOrUpdate({
  rut: personaData.rut,
  nombres: personaData.nombres,
  primer_apellido: personaData.primer_apellido,
  segundo_apellido: personaData.segundo_apellido,
  genero: personaData.genero,
  cumpleagno: personaData.cumpleagno,
})
```

**Beneficios:**
- ✅ Reduce código en POST de colaboradores de ~200 líneas a ~50
- ✅ Lógica reutilizable
- ✅ Más fácil de testear
- ✅ Manejo de errores centralizado

---

## 🎯 5. Mejorar Manejo de Errores

### Problema Actual
- Manejo de errores inconsistente
- Algunos errores se "tragaban" silenciosamente
- Mensajes de error poco claros

### Solución: Crear clase de errores personalizada

```typescript
// lib/errors/StrapiError.ts
export class StrapiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'StrapiError'
  }
  
  static fromResponse(error: any): StrapiError {
    return new StrapiError(
      error.message || 'Error desconocido',
      error.status || 500,
      error.details
    )
  }
}

// lib/errors/ValidationError.ts
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Helper para manejar errores en endpoints
export function handleApiError(error: unknown) {
  if (error instanceof StrapiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.details,
      },
      { status: error.status }
    )
  }
  
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        field: error.field,
      },
      { status: 400 }
    )
  }
  
  // Error desconocido
  console.error('[API] Error no manejado:', error)
  return NextResponse.json(
    {
      success: false,
      error: 'Error interno del servidor',
    },
    { status: 500 }
  )
}
```

**Uso:**
```typescript
export async function POST(request: Request) {
  try {
    // ... código ...
    
    if (!body.email_login) {
      throw new ValidationError('El email_login es obligatorio', 'email_login')
    }
    
    // ...
  } catch (error) {
    return handleApiError(error)
  }
}
```

**Beneficios:**
- ✅ Manejo consistente de errores
- ✅ Mensajes más claros
- ✅ Mejor debugging

---

## 🎯 6. Optimizar Logs

### Problema Actual
- Demasiados logs en producción
- Logs inconsistentes
- Información sensible en logs

### Solución: Sistema de logging configurable

```typescript
// lib/logging/logger.ts
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const

type LogLevel = keyof typeof LOG_LEVELS

class Logger {
  private level: LogLevel
  
  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || 
                 (process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG')
  }
  
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level]
  }
  
  error(message: string, ...args: any[]) {
    if (this.shouldLog('ERROR')) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  }
  
  warn(message: string, ...args: any[]) {
    if (this.shouldLog('WARN')) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }
  
  info(message: string, ...args: any[]) {
    if (this.shouldLog('INFO')) {
      console.log(`[INFO] ${message}`, ...args)
    }
  }
  
  debug(message: string, ...args: any[]) {
    if (this.shouldLog('DEBUG')) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  }
}

export const logger = new Logger()
```

**Uso:**
```typescript
// Antes
console.log('[API /colaboradores POST] ✅ Persona creada exitosamente:', personaId)
console.error('[API /colaboradores POST] ❌ Error al crear persona:', createError)

// Después
logger.debug('Persona creada exitosamente', { personaId })
logger.error('Error al crear persona', { error: createError })
```

**Beneficios:**
- ✅ Logs controlables por ambiente
- ✅ Menos ruido en producción
- ✅ Mejor performance

---

## 🎯 7. Validaciones con Zod

### Problema Actual
- Validaciones manuales repetitivas
- Fácil de olvidar validar campos

### Solución: Usar Zod para validaciones

```typescript
import { z } from 'zod'

const CreateColaboradorSchema = z.object({
  email_login: z.string().email('Email inválido').min(1, 'Email requerido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres').optional(),
  rol: z.string().optional(),
  persona: z.object({
    personaId: z.union([z.string(), z.number()]).optional(),
    rut: z.string().min(1, 'RUT requerido').optional(),
    nombres: z.string().optional(),
    primer_apellido: z.string().optional(),
    segundo_apellido: z.string().optional(),
    genero: z.string().optional(),
    cumpleagno: z.string().optional(),
  }).optional(),
}).refine(
  (data) => !data.persona || data.persona.rut || data.persona.personaId,
  { message: 'Persona debe tener RUT o personaId' }
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validar con Zod
    const validatedData = CreateColaboradorSchema.parse(body)
    
    // ... usar validatedData ...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }
    throw error
  }
}
```

**Beneficios:**
- ✅ Validaciones automáticas
- ✅ Mensajes de error claros
- ✅ TypeScript types generados automáticamente

---

## 🎯 8. Refactorizar Código de Vinculación de Persona

### Problema Actual
- Código muy largo y anidado en POST de colaboradores
- Difícil de seguir la lógica

### Solución: Extraer a función separada

```typescript
// En route.ts
async function handlePersonaRelation(
  personaData: any
): Promise<string | number | null> {
  if (!personaData) return null
  
  // Si ya tiene personaId, usarlo
  if (personaData.personaId) {
    return personaData.personaId
  }
  
  // Si tiene RUT, buscar o crear
  if (personaData.rut) {
    return await PersonaService.createOrUpdate({
      rut: personaData.rut,
      nombres: personaData.nombres,
      primer_apellido: personaData.primer_apellido,
      segundo_apellido: personaData.segundo_apellido,
      genero: personaData.genero,
      cumpleagno: personaData.cumpleagno,
    })
  }
  
  return null
}

// En POST
const personaId = await handlePersonaRelation(body.persona)
```

**Beneficios:**
- ✅ Código más legible
- ✅ Más fácil de testear
- ✅ Lógica separada por responsabilidad

---

## 🎯 9. Mejorar Verificación de Relación Persona-Colaborador

### Problema Actual
- Verificación después de crear es compleja
- Puede fallar silenciosamente

### Solución: Función dedicada con retry

```typescript
async function ensurePersonaLinked(
  colaboradorId: string | number,
  personaId: string | number,
  maxRetries: number = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Verificar si está vinculado
      const colaborador = await strapiClient.get<any>(
        `/api/colaboradores/${colaboradorId}?populate[persona][fields]=id`
      )
      
      const colaboradorData = extractStrapiData(colaborador)
      const personaVinculada = colaboradorData?.attributes?.persona || colaboradorData?.persona
      
      if (personaVinculada) {
        const vinculadaId = getStrapiId(normalizePersona(personaVinculada))
        if (vinculadaId && String(vinculadaId) === String(personaId)) {
          return true
        }
      }
      
      // Si no está vinculado, intentar vincular
      if (attempt < maxRetries) {
        await strapiClient.put(`/api/colaboradores/${colaboradorId}`, {
          data: { persona: personaId },
        })
        
        // Esperar un poco antes de verificar de nuevo
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      logger.warn(`Intento ${attempt} de vincular persona falló:`, error)
      if (attempt === maxRetries) {
        return false
      }
    }
  }
  
  return false
}
```

---

## 🎯 10. Prioridades de Implementación

### Alta Prioridad (✅ Implementado)
1. ✅ **Funciones Helper** (`lib/strapi/helpers.ts`) - Reduce duplicación inmediatamente
2. ✅ **Servicio de Personas** (`lib/services/personaService.ts`) - Simplifica código crítico
3. ✅ **Manejo de Cookies centralizado** (`lib/auth/cookies.ts`) - Evita bugs de autenticación

### Media Prioridad (✅ Implementado)
4. ✅ **Mejorar tipos TypeScript** (`lib/strapi/types.ts`) - Mejora calidad del código
   - Agregados tipos: `PersonaData`, `ColaboradorData`, `CreateColaboradorRequest`, `UpdateColaboradorRequest`, `CreatePersonaRequest`, `UpdatePersonaRequest`
5. ✅ **Sistema de logging** (`lib/logging/logger.ts`) - Mejora debugging y performance
   - Logger con niveles configurables (ERROR, WARN, INFO, DEBUG)
   - Métodos específicos para API routes (`logger.api()`, `logger.apiError()`)
   - Control por ambiente (producción vs desarrollo)
6. ✅ **Manejo de errores mejorado** (`lib/errors/`) - Mejora experiencia de usuario
   - `StrapiError`: Error personalizado para errores de Strapi
   - `ValidationError`: Error para validaciones
   - `handleApiError()`: Helper para manejar errores en endpoints
   - `withErrorHandling()`: Wrapper para funciones async

### Refactorización (✅ En progreso)
7. ✅ **Refactorización de endpoints** - Optimización continua
   - ✅ `/api/colaboradores/[id]/route.ts` - Refactorizado para usar nuevos sistemas
   - ✅ `/api/colaboradores/route.ts` - Ya refactorizado anteriormente
   - ✅ `/api/colaboradores/me/profile/route.ts` - Ya refactorizado anteriormente
   - ✅ `/api/auth/login/route.ts` - Ya refactorizado anteriormente

### Baja Prioridad (Pendiente)
8. ⏳ **Validaciones con Zod** - Nice to have (requiere instalar dependencia)

---

## 📝 Notas Finales

- Estas mejoras pueden implementarse gradualmente
- Cada mejora es independiente y puede aplicarse por separado
- Se recomienda empezar con las de alta prioridad
- Después de implementar, hacer testing exhaustivo

---

## 🔗 Archivos a Modificar

### Nuevos archivos a crear:
- `lib/strapi/helpers.ts`
- `lib/services/personaService.ts`
- `lib/auth/cookies.ts`
- `lib/errors/StrapiError.ts`
- `lib/logging/logger.ts`

### Archivos a refactorizar:
- `app/api/colaboradores/route.ts` (POST)
- `app/api/colaboradores/me/profile/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/colaboradores/[id]/route.ts` (PUT)

