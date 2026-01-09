/**
 * Funciones helper para trabajar con respuestas y datos de Strapi
 * Centraliza la lógica común para evitar duplicación de código
 */

/**
 * Extrae datos de una respuesta de Strapi, manejando diferentes estructuras
 * @param response - Respuesta de Strapi (puede ser StrapiResponse, StrapiEntity, array, etc.)
 * @returns Datos extraídos o null si no hay datos
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
    // Si response.data tiene .data anidado (StrapiResponse anidado)
    if (response.data.data) {
      return response.data.data as T
    }
    return response.data as T
  }
  
  // Si tiene .attributes, combinarlos con el objeto principal
  if (response.attributes) {
    return { ...response, ...response.attributes } as T
  }
  
  return response as T
}

/**
 * Obtiene el ID preferido (documentId o id) de una entidad de Strapi
 * @param entity - Entidad de Strapi
 * @returns ID (documentId preferido, o id como fallback) o null
 */
export function getStrapiId(entity: any): string | number | null {
  if (!entity) return null
  return entity.documentId || entity.id || null
}

/**
 * Normaliza estructura de persona desde diferentes formatos de Strapi
 * @param persona - Datos de persona en cualquier formato de Strapi
 * @returns Persona normalizada o null
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
 * @param nombres - Nombres de la persona
 * @param primerApellido - Primer apellido
 * @param segundoApellido - Segundo apellido
 * @returns Nombre completo o null si no hay componentes
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

/**
 * Normaliza estructura de colaborador desde diferentes formatos de Strapi
 * @param colaborador - Datos de colaborador en cualquier formato de Strapi
 * @returns Colaborador normalizado o null
 */
export function normalizeColaborador(colaborador: any): any {
  if (!colaborador) return null
  
  // Si tiene .data
  if (colaborador.data) {
    const data = colaborador.data
    if (data.attributes) {
      return { ...data, ...data.attributes }
    }
    return data
  }
  
  // Si tiene .attributes
  if (colaborador.attributes) {
    return { ...colaborador, ...colaborador.attributes }
  }
  
  return colaborador
}

/**
 * Extrae múltiples entidades de una respuesta de Strapi
 * @param response - Respuesta de Strapi
 * @returns Array de entidades extraídas
 */
export function extractStrapiDataArray<T>(response: any): T[] {
  if (!response) return []
  
  // Si es array directo
  if (Array.isArray(response)) {
    return response as T[]
  }
  
  // Si tiene .data
  if (response.data) {
    if (Array.isArray(response.data)) {
      return response.data as T[]
    }
    // Si es un solo objeto, retornarlo como array
    return [response.data as T]
  }
  
  // Si es un solo objeto, retornarlo como array
  return [response as T]
}

