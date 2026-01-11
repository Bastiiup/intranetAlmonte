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
  documentId?: string
  attributes: T
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

// Tipos para Persona
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
  origen?: string
  activo?: boolean
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

// Tipos para Colaborador
export interface ColaboradorData {
  id?: number
  documentId?: string
  email_login: string
  rol?: string
  rol_principal?: string
  rol_operativo?: string
  activo: boolean
  persona?: PersonaData | null
  usuario?: any
  empresa?: any
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

// Tipos para requests de creación/actualización
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

export interface UpdateColaboradorRequest {
  email_login?: string
  password?: string
  rol?: string
  activo?: boolean
  persona?: string | number | null
}

export interface CreatePersonaRequest {
  rut: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  genero?: string
  cumpleagno?: string
  bio?: string
  job_title?: string
  telefono_principal?: string
  direccion?: any
  redes_sociales?: any
  skills?: string[]
  origen?: string
  activo?: boolean
}

export interface UpdatePersonaRequest {
  rut?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  nombre_completo?: string
  genero?: string
  cumpleagno?: string
  bio?: string
  job_title?: string
  telefono_principal?: string
  direccion?: any
  redes_sociales?: any
  skills?: string[]
  imagen?: any
  portada?: any
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


