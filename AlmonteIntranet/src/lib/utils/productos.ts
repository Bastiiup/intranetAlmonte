/**
 * Utilidades para normalización y búsqueda de productos
 */

export interface Material {
  id: string | number
  nombre?: string
  aprobado?: boolean
  [key: string]: any
}

/**
 * Normaliza un ID a string para comparaciones consistentes
 */
export function normalizarId(id: string | number | undefined | null): string {
  if (id === undefined || id === null) return ''
  return String(id)
}

/**
 * Busca un producto en un array de materiales por ID normalizado
 */
export function buscarProducto(
  materiales: Material[],
  identificador: string | number
): Material | undefined {
  if (!materiales || materiales.length === 0) return undefined
  
  const idNormalizado = normalizarId(identificador)
  
  return materiales.find(m => {
    const materialId = normalizarId(m.id)
    return materialId === idNormalizado
  })
}

/**
 * Busca un producto por múltiples criterios (ID, nombre, índice)
 * Útil para compatibilidad con código legacy
 */
export function buscarProductoFlexible(
  materiales: Material[],
  identificador?: string | number,
  nombreProducto?: string,
  indiceProducto?: number
): Material | undefined {
  if (!materiales || materiales.length === 0) return undefined
  
  // Prioridad 1: Buscar por ID
  if (identificador !== undefined && identificador !== null) {
    const producto = buscarProducto(materiales, identificador)
    if (producto) return producto
  }
  
  // Prioridad 2: Buscar por nombre
  if (nombreProducto) {
    const producto = materiales.find(m => 
      m.nombre && m.nombre.toLowerCase() === nombreProducto.toLowerCase()
    )
    if (producto) return producto
  }
  
  // Prioridad 3: Buscar por índice
  if (indiceProducto !== undefined && indiceProducto >= 0 && indiceProducto < materiales.length) {
    return materiales[indiceProducto]
  }
  
  return undefined
}
