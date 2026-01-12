/**
 * Helpers para populate de Strapi con fallbacks automáticos
 * Maneja errores comunes de populate anidado
 */

import strapiClient from './client'
import type { StrapiResponse, StrapiEntity } from './types'
import { logger } from '../logging/logger'

/**
 * Opciones para populate de curso
 */
export interface CursoPopulateOptions {
  includeMateriales?: boolean
  includeColegio?: boolean
  includeListaUtiles?: boolean
  includeListaUtilesMateriales?: boolean
}

/**
 * Intenta hacer populate de un curso con fallback automático
 * Maneja errores 500/400 comunes cuando el content type no está configurado
 * 
 * @param cursoId - ID del curso (numérico o documentId)
 * @param options - Opciones de populate
 * @returns Curso con datos poblados
 */
export async function getCursoWithPopulate<T = any>(
  cursoId: string | number,
  options: CursoPopulateOptions = {}
): Promise<StrapiResponse<StrapiEntity<T>>> {
  const {
    includeMateriales = true,
    includeColegio = true,
    includeListaUtiles = true,
    includeListaUtilesMateriales = true,
  } = options

  // Construir params base
  const baseParams = new URLSearchParams()
  if (includeMateriales) {
    baseParams.append('populate[materiales]', 'true')
  }
  if (includeColegio) {
    baseParams.append('populate[colegio]', 'true')
  }
  if (includeListaUtiles) {
    baseParams.append('populate[lista_utiles]', 'true')
    if (includeListaUtilesMateriales) {
      baseParams.append('populate[lista_utiles][populate][materiales]', 'true')
    }
  }

  // Intentar con populate completo
  try {
    return await strapiClient.get<StrapiResponse<StrapiEntity<T>>>(
      `/api/cursos/${cursoId}?${baseParams.toString()}`
    )
  } catch (error: any) {
    // Si falla con populate anidado de lista_utiles.materiales (error 500 común),
    // intentar sin populate anidado
    if ((error.status === 500 || error.status === 400) && includeListaUtilesMateriales) {
      logger.warn(
        '[Populate Helper] Error 500/400 con populate anidado lista_utiles.materiales, intentando sin populate anidado',
        { cursoId }
      )
      
      const fallbackParams = new URLSearchParams()
      if (includeMateriales) {
        fallbackParams.append('populate[materiales]', 'true')
      }
      if (includeColegio) {
        fallbackParams.append('populate[colegio]', 'true')
      }
      if (includeListaUtiles) {
        fallbackParams.append('populate[lista_utiles]', 'true')
      }

      try {
        return await strapiClient.get<StrapiResponse<StrapiEntity<T>>>(
          `/api/cursos/${cursoId}?${fallbackParams.toString()}`
        )
      } catch (secondError: any) {
        // Si también falla, intentar sin lista_utiles completamente
        logger.warn(
          '[Populate Helper] Error también sin populate anidado, intentando sin lista_utiles',
          { cursoId }
        )
        
        const minimalParams = new URLSearchParams()
        if (includeMateriales) {
          minimalParams.append('populate[materiales]', 'true')
        }
        if (includeColegio) {
          minimalParams.append('populate[colegio]', 'true')
        }
        
        return await strapiClient.get<StrapiResponse<StrapiEntity<T>>>(
          `/api/cursos/${cursoId}?${minimalParams.toString()}`
        )
      }
    }
    
    // Si es otro tipo de error, propagarlo
    throw error
  }
}

/**
 * Obtiene múltiples cursos con populate y fallbacks
 * 
 * @param filters - Filtros para la búsqueda (ej: { colegio: { id: { $eq: 123 } } })
 * @param options - Opciones de populate
 * @returns Lista de cursos con datos poblados
 */
export async function getCursosWithPopulate<T = any>(
  filters: Record<string, any> = {},
  options: CursoPopulateOptions = {}
): Promise<StrapiResponse<StrapiEntity<T>[]>> {
  const {
    includeMateriales = true,
    includeColegio = true,
    includeListaUtiles = true,
    includeListaUtilesMateriales = true,
  } = options

  // Construir params base
  const baseParams = new URLSearchParams()
  
  // Agregar filtros (formato Strapi: filters[colegio][id][$eq]=123)
  // Soporta filtros anidados como { colegio: { id: { $eq: 123 } } }
  const addFilters = (filtersObj: Record<string, any>, prefix = 'filters') => {
    Object.entries(filtersObj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Es un objeto anidado
        Object.entries(value).forEach(([subKey, subValue]) => {
          if (typeof subValue === 'object' && subValue !== null && !Array.isArray(subValue)) {
            // Tiene operadores como $eq, $ne, etc.
            Object.entries(subValue).forEach(([op, opValue]) => {
              baseParams.append(`${prefix}[${key}][${subKey}][${op}]`, String(opValue))
            })
          } else {
            // Valor directo
            baseParams.append(`${prefix}[${key}][${subKey}]`, String(subValue))
          }
        })
      } else {
        // Valor simple
        baseParams.append(`${prefix}[${key}]`, String(value))
      }
    })
  }
  
  if (Object.keys(filters).length > 0) {
    addFilters(filters)
  }
  
  // Agregar populate
  if (includeMateriales) {
    baseParams.append('populate[materiales]', 'true')
  }
  if (includeColegio) {
    baseParams.append('populate[colegio]', 'true')
  }
  if (includeListaUtiles) {
    baseParams.append('populate[lista_utiles]', 'true')
    if (includeListaUtilesMateriales) {
      baseParams.append('populate[lista_utiles][populate][materiales]', 'true')
    }
  }

  // Intentar con populate completo
  try {
    return await strapiClient.get<StrapiResponse<StrapiEntity<T>[]>>(
      `/api/cursos?${baseParams.toString()}`
    )
  } catch (error: any) {
    // Si falla con populate anidado, intentar sin populate anidado
    if ((error.status === 500 || error.status === 400) && includeListaUtilesMateriales) {
      logger.warn(
        '[Populate Helper] Error 500/400 con populate anidado lista_utiles.materiales, intentando sin populate anidado',
        { filters }
      )
      
      const fallbackParams = new URLSearchParams(baseParams)
      fallbackParams.delete('populate[lista_utiles][populate][materiales]')

      try {
        return await strapiClient.get<StrapiResponse<StrapiEntity<T>[]>>(
          `/api/cursos?${fallbackParams.toString()}`
        )
      } catch (secondError: any) {
        // Si también falla, intentar sin lista_utiles completamente
        logger.warn(
          '[Populate Helper] Error también sin populate anidado, intentando sin lista_utiles',
          { filters }
        )
        
        const minimalParams = new URLSearchParams(baseParams)
        minimalParams.delete('populate[lista_utiles]')
        minimalParams.delete('populate[lista_utiles][populate][materiales]')
        
        return await strapiClient.get<StrapiResponse<StrapiEntity<T>[]>>(
          `/api/cursos?${minimalParams.toString()}`
        )
      }
    }
    
    // Si es otro tipo de error, propagarlo
    throw error
  }
}

