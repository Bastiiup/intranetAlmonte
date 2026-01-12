/**
 * Tipos TypeScript para el módulo CRM
 */

// Tipos para Material (componente repeatable)
export interface MaterialData {
  material_nombre: string
  tipo: 'util' | 'libro' | 'cuaderno' | 'otro'
  cantidad: number
  obligatorio: boolean
  descripcion?: string | null
}

// Tipos para Lista de Útiles
export interface ListaUtilesData {
  id?: number
  documentId?: string
  nombre?: string
  nivel?: 'Basica' | 'Media'
  grado?: number
  descripcion?: string | null
  activo?: boolean
  materiales?: MaterialData[]
}

// Tipos para Curso
export interface CursoData {
  id?: number
  documentId?: string
  nombre_curso: string
  nivel?: 'Basica' | 'Media' | null
  grado?: string | null // "1" a "8"
  paralelo?: string | null // "A", "B", "C", etc.
  activo: boolean
  colegio?: any
  lista_utiles?: ListaUtilesData | null
  materiales?: MaterialData[]
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

// Tipos para requests de actualización
export interface UpdateCursoRequest {
  nombre_curso?: string
  nivel?: 'Basica' | 'Media'
  grado?: string
  paralelo?: string | null
  activo?: boolean
  lista_utiles?: number | string | null
  materiales?: MaterialData[]
}

// Tipos para requests de creación
export interface CreateCursoRequest {
  nombre_curso: string
  nivel: 'Basica' | 'Media'
  grado: string
  paralelo?: string | null
  activo?: boolean
  lista_utiles?: number | string | null
  materiales?: MaterialData[]
  colegio: number | string
}

