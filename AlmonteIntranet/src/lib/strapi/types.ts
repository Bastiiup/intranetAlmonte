/**
 * Tipos TypeScript para respuestas de Strapi
 * 
 * Define la estructura estándar de las respuestas de la API de Strapi
 */

// Estructura básica de una respuesta de Strapi
export interface StrapiResponse<T> {
  data: T | T[]
  meta?: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

// Estructura de un error de Strapi
export interface StrapiError {
  error: {
    status: number
    name: string
    message: string
    details?: unknown
  }
}

// Tipo para datos con atributos de Strapi
export interface StrapiEntity<T> {
  id: number
  attributes: T
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

// Helper para extraer datos de una respuesta de Strapi
export function unwrapStrapiResponse<T>(response: StrapiResponse<StrapiEntity<T>>): T[] {
  const data = Array.isArray(response.data) ? response.data : [response.data]
  return data.map((item) => item.attributes)
}

// Helper para extraer un solo item
export function unwrapStrapiItem<T>(response: StrapiResponse<StrapiEntity<T>>): T {
  const data = Array.isArray(response.data) ? response.data[0] : response.data
  return data.attributes
}


