/**
 * Helpers para obtener la plataforma del colaborador en el servidor
 */

import { cookies } from 'next/headers'
import type { Platform } from '@/hooks/usePlatform'

/**
 * Obtiene la plataforma del colaborador desde las cookies (servidor)
 * @returns La plataforma del colaborador o 'general' por defecto
 */
export async function getServerPlatform(): Promise<Platform> {
  try {
    const cookieStore = await cookies()
    
    // Intentar leer de múltiples nombres de cookie para compatibilidad
    const cookieNames = ['auth_colaborador', 'colaboradorData', 'colaborador']
    
    for (const cookieName of cookieNames) {
      const cookie = cookieStore.get(cookieName)
      if (cookie?.value) {
        try {
          const colaborador = JSON.parse(cookie.value)
          const platform = colaborador?.plataforma
          
          if (platform === 'moraleja' || platform === 'escolar' || platform === 'general') {
            return platform as Platform
          }
        } catch {
          // Si falla el parseo, continuar con siguiente cookie
          continue
        }
      }
    }
  } catch (error) {
    console.error('[getServerPlatform] Error al obtener plataforma:', error)
  }
  
  // Por defecto, retornar 'general' (puede ver todas las plataformas)
  return 'general'
}

/**
 * Obtiene el colaborador completo desde las cookies (servidor)
 * @returns El colaborador o null
 */
export async function getServerColaborador(): Promise<any | null> {
  try {
    const cookieStore = await cookies()
    
    const cookieNames = ['auth_colaborador', 'colaboradorData', 'colaborador']
    
    for (const cookieName of cookieNames) {
      const cookie = cookieStore.get(cookieName)
      if (cookie?.value) {
        try {
          return JSON.parse(cookie.value)
        } catch {
          continue
        }
      }
    }
  } catch (error) {
    console.error('[getServerColaborador] Error al obtener colaborador:', error)
  }
  
  return null
}

