/**
 * Utilidades centralizadas para manejo de cookies de autenticación
 * Evita duplicación de código en múltiples endpoints
 */

import { cookies } from 'next/headers'

const COOKIE_NAMES = {
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  AUTH_COLABORADOR: 'auth_colaborador',
  COLABORADOR_DATA: 'colaboradorData',
  COLABORADOR: 'colaborador',
} as const

export interface ColaboradorCookie {
  id?: number | string
  documentId?: string | number
  email_login: string
  rol?: string
  activo: boolean
  persona?: any
  [key: string]: any
}

/**
 * Obtiene el colaborador autenticado desde las cookies
 * Busca en múltiples nombres de cookie para compatibilidad
 * @returns Colaborador encontrado o null si no hay cookies
 */
export async function getColaboradorFromCookies(): Promise<ColaboradorCookie | null> {
  try {
    const cookieStore = await cookies()
    
    // Buscar en orden de prioridad: auth_colaborador, colaboradorData, colaborador
    const cookieNames = [
      COOKIE_NAMES.AUTH_COLABORADOR,
      COOKIE_NAMES.COLABORADOR_DATA,
      COOKIE_NAMES.COLABORADOR,
    ]
    
    // Log de debugging: verificar qué cookies están disponibles
    const availableCookies: string[] = []
    cookieStore.getAll().forEach(cookie => {
      if (cookieNames.includes(cookie.name as any)) {
        availableCookies.push(cookie.name)
      }
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Cookies] 🔍 Cookies disponibles:', {
        todasLasCookies: cookieStore.getAll().map(c => c.name).join(', '),
        cookiesRelevantes: availableCookies,
        buscandoEn: cookieNames,
      })
    }
    
    for (const cookieName of cookieNames) {
      const colaboradorStr = cookieStore.get(cookieName)?.value
      if (colaboradorStr) {
        try {
          const colaborador = JSON.parse(colaboradorStr) as ColaboradorCookie
          
          // Asegurar que tenga id y documentId si están disponibles
          if (colaborador && !colaborador.documentId && colaborador.id) {
            colaborador.documentId = colaborador.id
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`[Cookies] ✅ Colaborador obtenido de cookie ${cookieName}:`, {
              id: colaborador.id,
              documentId: colaborador.documentId,
              email: colaborador.email_login,
              tienePersona: !!colaborador.persona,
              personaRut: colaborador.persona?.rut || 'NO RUT',
            })
          }
          
          return colaborador
        } catch (parseError) {
          console.warn(`[Cookies] ⚠️ Error al parsear cookie ${cookieName}:`, parseError)
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[Cookies] Valor de cookie (primeros 200 chars):`, colaboradorStr.substring(0, 200))
          }
          continue
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Cookies] ⚠️ No se encontró colaborador en ninguna cookie')
    }
    
    return null
  } catch (error) {
    console.error('[Cookies] ❌ Error al obtener colaborador de cookies:', error)
    return null
  }
}

/**
 * Obtiene el token de autenticación desde las cookies
 * @returns Token JWT o null si no hay cookie
 */
export async function getAuthTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(COOKIE_NAMES.AUTH_TOKEN)?.value || null
  } catch (error) {
    console.error('[Cookies] ❌ Error al obtener token de cookies:', error)
    return null
  }
}

