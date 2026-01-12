/**
 * Helpers para manejar relaciones en Strapi
 * Simplifica la creación de relaciones manyToOne, oneToMany, etc.
 */

/**
 * Prepara relación manyToOne para Strapi
 * Maneja connect, disconnect y valores null/undefined
 * 
 * @param value - ID de la relación (number, string, null, undefined)
 * @param fieldName - Nombre del campo de relación
 * @returns Objeto con la relación preparada o undefined si no hay valor válido
 * 
 * @example
 * ```typescript
 * const listaUtilesRelation = prepareManyToOneRelation(body.lista_utiles, 'lista_utiles')
 * if (listaUtilesRelation) {
 *   Object.assign(cursoData.data, listaUtilesRelation)
 * }
 * ```
 */
export function prepareManyToOneRelation(
  value: number | string | null | undefined,
  fieldName: string
): Record<string, any> | undefined {
  // Si es null o string vacío, desconectar
  if (value === null || value === '') {
    return { [fieldName]: { disconnect: true } }
  }
  
  // Si es undefined, no hacer nada
  if (value === undefined) {
    return undefined
  }
  
  // Convertir a número
  const id = typeof value === 'number' ? value : parseInt(String(value))
  
  // Si no es un número válido, retornar undefined
  if (isNaN(id) || id <= 0) {
    return undefined
  }
  
  // Retornar relación connect
  return { [fieldName]: { connect: [id] } }
}

/**
 * Prepara relación manyToMany para Strapi
 * Maneja connect, disconnect y set
 * 
 * @param values - Array de IDs o null/undefined
 * @param fieldName - Nombre del campo de relación
 * @param operation - Operación: 'connect', 'disconnect', o 'set' (default: 'set')
 * @returns Objeto con la relación preparada o undefined si no hay valores válidos
 * 
 * @example
 * ```typescript
 * const tagsRelation = prepareManyToManyRelation(body.tags, 'tags', 'set')
 * if (tagsRelation) {
 *   Object.assign(data.data, tagsRelation)
 * }
 * ```
 */
export function prepareManyToManyRelation(
  values: (number | string)[] | null | undefined,
  fieldName: string,
  operation: 'connect' | 'disconnect' | 'set' = 'set'
): Record<string, any> | undefined {
  // Si es null, desconectar todos
  if (values === null) {
    return { [fieldName]: { disconnect: true } }
  }
  
  // Si es undefined, no hacer nada
  if (values === undefined) {
    return undefined
  }
  
  // Si no es array, retornar undefined
  if (!Array.isArray(values)) {
    return undefined
  }
  
  // Convertir a números y filtrar inválidos
  const ids = values
    .map(v => typeof v === 'number' ? v : parseInt(String(v)))
    .filter(id => !isNaN(id) && id > 0)
  
  // Si no hay IDs válidos, retornar undefined
  if (ids.length === 0) {
    return undefined
  }
  
  // Retornar relación según operación
  return { [fieldName]: { [operation]: ids } }
}

/**
 * Limpia campos undefined y null de un objeto
 * Útil antes de enviar datos a Strapi
 * 
 * @param data - Objeto a limpiar
 * @returns Objeto sin campos undefined/null
 * 
 * @example
 * ```typescript
 * const cleanData = cleanUndefinedNullFields(cursoData.data)
 * ```
 */
export function cleanUndefinedNullFields<T extends Record<string, any>>(data: T): Partial<T> {
  const cleaned: Partial<T> = {}
  
  Object.keys(data).forEach(key => {
    const value = data[key]
    // Solo incluir si no es undefined ni null
    if (value !== undefined && value !== null) {
      cleaned[key as keyof T] = value
    }
  })
  
  return cleaned
}

