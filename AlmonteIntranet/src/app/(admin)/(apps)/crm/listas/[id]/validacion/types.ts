/**
 * Tipos compartidos para el módulo de validación de listas
 */

export interface CoordenadasProducto {
  pagina: number
  posicion_x?: number
  posicion_y?: number
  region?: string
  ancho?: number
  alto?: number
}

export interface ProductoIdentificado {
  id: string | number
  validado: boolean
  /** Posición en el PDF / orden de aparición (1, 2, 3...) */
  orden?: number
  /** Categoría del producto (ej. Libro, Útil, etc.) */
  categoria?: string
  imagen?: string
  isbn?: string
  nombre: string
  marca?: string
  cantidad: number
  comprar: boolean
  disponibilidad: 'disponible' | 'no_disponible' | 'no_encontrado'
  precio: number
  precio_woocommerce?: number
  /** Asignatura (ej. Matemáticas, Lenguaje) */
  asignatura?: string
  descripcion?: string
  woocommerce_id?: number
  woocommerce_sku?: string
  stock_quantity?: number
  encontrado_en_woocommerce?: boolean
  coordenadas?: CoordenadasProducto
}

export interface ListaData {
  id: number | string
  documentId?: string
  nombre: string
  nivel: 'Basica' | 'Media'
  grado: number
  año?: number
  pdf_id?: number | string
  pdf_url?: string
  pdf_nombre?: string
  colegio?: {
    id: number | string
    nombre: string
  }
  materiales?: any[]
  versiones_materiales?: any[]
  estado_revision?: 'borrador' | 'revisado' | 'publicado' | null
  fecha_publicacion?: string | null
  fecha_revision?: string | null
}
