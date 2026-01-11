/**
 * Módulo de manejo de errores
 * Exporta clases de error personalizadas y helpers para manejo de errores en API routes
 */

import { NextResponse } from 'next/server'
import { StrapiError } from './StrapiError'
import { ValidationError } from './ValidationError'

export { StrapiError } from './StrapiError'
export { ValidationError } from './ValidationError'

/**
 * Maneja errores en endpoints de API y retorna una respuesta apropiada
 */
export function handleApiError(error: unknown): NextResponse {
  // Error de Strapi
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

  // Error de validación
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        field: error.field,
        value: error.value,
      },
      { status: 400 }
    )
  }

  // Error de Zod (si se usa Zod para validaciones)
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
    return NextResponse.json(
      {
        success: false,
        error: 'Datos inválidos',
        details: (error as any).errors,
      },
      { status: 400 }
    )
  }

  // Error desconocido
  console.error('[API] Error no manejado:', error)
  
  // En producción, no exponer detalles del error
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return NextResponse.json(
    {
      success: false,
      error: 'Error interno del servidor',
      ...(isDevelopment && {
        details: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : { error },
      }),
    },
    { status: 500 }
  )
}

/**
 * Wrapper para manejar errores en funciones async de API routes
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }) as T
}


