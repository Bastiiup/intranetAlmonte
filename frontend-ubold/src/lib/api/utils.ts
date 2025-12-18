/**
 * Utilidades comunes para las APIs
 */

import { NextResponse } from 'next/server'

/**
 * Crea una respuesta de éxito estandarizada
 */
export function createSuccessResponse<T>(data: T, meta?: unknown, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta && { meta }),
    },
    { status }
  )
}

/**
 * Crea una respuesta de error estandarizada
 */
export function createErrorResponse(
  error: string,
  status = 500,
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details && { details }),
    },
    { status }
  )
}

/**
 * Maneja errores de forma consistente
 */
export function handleApiError(error: any, defaultMessage = 'Error en la petición') {
  console.error('[API Error]', {
    message: error.message,
    status: error.status,
    details: error.details,
    stack: error.stack,
  })

  return createErrorResponse(
    error.message || defaultMessage,
    error.status || 500,
    error.details
  )
}

/**
 * Extrae datos de una respuesta de Strapi normalizando arrays
 */
export function extractStrapiData<T>(response: any): T[] {
  if (!response) {
    return []
  }

  if (Array.isArray(response)) {
    return response
  }

  if (response.data) {
    if (Array.isArray(response.data)) {
      return response.data
    }
    return [response.data]
  }

  return [response]
}
