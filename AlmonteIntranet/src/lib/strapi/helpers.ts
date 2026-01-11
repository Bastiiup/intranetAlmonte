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

/**
 * Normaliza la estructura de una imagen de Strapi (componente o media)
 * Intenta extraer la URL y otros metadatos de la forma más simple posible
 * @param imageRaw - Imagen en cualquier formato de Strapi
 * @returns Imagen normalizada con url, alternativeText, width, height o null
 */
export function normalizeImage(imageRaw: any): { url: string; alternativeText?: string; width?: number; height?: number; name?: string; formats?: any } | null {
  if (!imageRaw) return null

  // Si es un componente con campo 'imagen' (Multiple Media)
  if (imageRaw.imagen) {
    const imageData = imageRaw.imagen
    // Si es array directo (ESTRUCTURA REAL DE STRAPI)
    if (Array.isArray(imageData) && imageData.length > 0) {
      const firstImage = imageData[0]
      return {
        url: firstImage.url || null,
        alternativeText: firstImage.alternativeText || null,
        width: firstImage.width || null,
        height: firstImage.height || null,
        name: firstImage.name || null,
        formats: firstImage.formats || null,
      }
    }
    // Si tiene data (estructura Strapi estándar alternativa)
    else if (imageData.data) {
      const dataArray = Array.isArray(imageData.data) ? imageData.data : [imageData.data]
      if (dataArray.length > 0) {
        const firstImage = dataArray[0]
        return {
          url: firstImage.attributes?.url || firstImage.url || null,
          alternativeText: firstImage.attributes?.alternativeText || firstImage.alternativeText || null,
          width: firstImage.attributes?.width || firstImage.width || null,
          height: firstImage.attributes?.height || firstImage.height || null,
        }
      }
    }
    // Si es objeto directo con url
    else if (imageData.url) {
      return {
        url: imageData.url,
        alternativeText: imageData.alternativeText || null,
        width: imageData.width || null,
        height: imageData.height || null,
      }
    }
  }
  // Si es un objeto directo con url (ej. Single Media)
  else if (imageRaw.url) {
    return {
      url: imageRaw.url,
      alternativeText: imageRaw.alternativeText || null,
      width: imageRaw.width || null,
      height: imageRaw.height || null,
    }
  }
  // Si tiene data (estructura Strapi estándar sin componente)
  else if (imageRaw.data) {
    const dataArray = Array.isArray(imageRaw.data) ? imageRaw.data : [imageRaw.data]
    if (dataArray.length > 0) {
      const firstImage = dataArray[0]
      return {
        url: firstImage.attributes?.url || firstImage.url || null,
        alternativeText: firstImage.attributes?.alternativeText || firstImage.alternativeText || null,
        width: firstImage.attributes?.width || firstImage.width || null,
        height: firstImage.attributes?.height || firstImage.height || null,
      }
    }
  }
  return null
}

/**
 * Normaliza la estructura de una portada de Strapi (componente o media)
 * Es idéntica a normalizeImage, pero se mantiene separada por claridad
 * @param portadaRaw - Portada en cualquier formato de Strapi
 * @returns Portada normalizada con url, alternativeText, width, height o null
 */
export function normalizePortada(portadaRaw: any): { url: string; alternativeText?: string; width?: number; height?: number; name?: string; formats?: any } | null {
  return normalizeImage(portadaRaw)
}

