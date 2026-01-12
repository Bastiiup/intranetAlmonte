/**
 * Helpers para filtrar datos según la plataforma del colaborador
 */

import type { Platform } from '@/hooks/usePlatform'

/**
 * Obtiene el filtro de plataforma para usar en queries de Strapi/WooCommerce
 * @param userPlatform Plataforma del colaborador
 * @param fieldName Nombre del campo que contiene la plataforma (default: 'platform' o 'originPlatform')
 * @returns Filtro de Strapi o null si es 'general' (no filtrar)
 */
export function getPlatformFilter(
  userPlatform: Platform,
  fieldName: string = 'platform'
): Record<string, any> | null {
  // Si es 'general', no filtrar (puede ver todas las plataformas)
  if (userPlatform === 'general') {
    return null
  }
  
  // Si es específico, filtrar por esa plataforma
  return {
    [fieldName]: {
      $eq: userPlatform,
    },
  }
}

/**
 * Filtra un array de items según la plataforma del colaborador
 * @param items Array de items a filtrar
 * @param userPlatform Plataforma del colaborador
 * @param getPlatformField Función para obtener la plataforma de un item
 * @returns Array filtrado
 */
export function filterByPlatform<T>(
  items: T[],
  userPlatform: Platform,
  getPlatformField: (item: T) => string | null | undefined
): T[] {
  // Si es 'general', retornar todos los items
  if (userPlatform === 'general') {
    return items
  }
  
  // Filtrar solo items de la plataforma del colaborador
  return items.filter((item) => {
    const itemPlatform = getPlatformField(item)
    return itemPlatform === userPlatform
  })
}

/**
 * Obtiene el parámetro de plataforma para APIs de WooCommerce
 * @param userPlatform Plataforma del colaborador
 * @returns 'moraleja' | 'escolar' | null (null significa que puede ver ambas)
 */
export function getWooCommercePlatformParam(
  userPlatform: Platform
): 'moraleja' | 'escolar' | null {
  if (userPlatform === 'general') {
    return null // Puede ver ambas, el frontend decidirá cuál mostrar
  }
  
  return userPlatform
}

/**
 * Verifica si un item pertenece a una plataforma accesible por el colaborador
 * @param itemPlatform Plataforma del item
 * @param userPlatform Plataforma del colaborador
 * @returns true si el colaborador puede ver ese item
 */
export function canViewItem(
  itemPlatform: string | null | undefined,
  userPlatform: Platform
): boolean {
  // Si el colaborador es 'general', puede ver todo
  if (userPlatform === 'general') {
    return true
  }
  
  // Si el item no tiene plataforma definida, permitir verlo (compatibilidad)
  if (!itemPlatform) {
    return true
  }
  
  // Solo puede ver items de su plataforma
  return itemPlatform === userPlatform
}

