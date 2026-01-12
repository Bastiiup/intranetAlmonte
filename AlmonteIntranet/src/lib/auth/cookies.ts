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
  session_token?: string // Token de sesión único para sesión única
  [key: string]: any
}

/**
 * Obtiene el colaborador autenticado desde las cookies y verifica el token de sesión
 * Busca en múltiples nombres de cookie para compatibilidad
 * @param verifySession Si es true, verifica que el token de sesión coincida con Strapi (sesión única)
 * @returns Colaborador encontrado o null si no hay cookies o si el token de sesión no coincide
 */
export async function getColaboradorFromCookies(verifySession: boolean = true): Promise<ColaboradorCookie | null> {
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
              tieneSessionToken: !!colaborador.session_token,
            })
          }

          // Verificar token de sesión si está habilitado
          if (verifySession && colaborador.session_token) {
            const isValidSession = await verifySessionToken(colaborador)
            if (!isValidSession) {
              console.warn(`[Cookies] ❌ Token de sesión inválido para colaborador ${colaborador.email_login}`)
              return null // Sesión inválida, retornar null para forzar logout
            }
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

/**
 * Crea una respuesta que limpia todas las cookies de autenticación
 * Útil para cerrar sesión automáticamente cuando el token de sesión no coincide
 */
export function createLogoutResponse(): NextResponse {
  const response = NextResponse.json(
    { error: 'Tu sesión ha sido cerrada porque se inició sesión desde otro lugar' },
    { status: 401 }
  )

  const cookiesToClear = [
    'auth_token',
    'auth_user',
    'auth_colaborador',
    'colaboradorData',
    'colaborador',
    'user',
  ]

  cookiesToClear.forEach((cookieName) => {
    response.cookies.set(cookieName, '', {
      maxAge: 0,
      path: '/',
    })
  })

  return response
}

/**
 * Verifica que el token de sesión del colaborador coincida con el de Strapi
 * Esto implementa sesión única: si hay un nuevo login, las sesiones anteriores se invalidan
 * @param colaborador Colaborador obtenido de las cookies
 * @returns true si el token de sesión es válido, false si no coincide (sesión inválida)
 */
export async function verifySessionToken(colaborador: ColaboradorCookie): Promise<boolean> {
  try {
    // Si no hay token de sesión en las cookies, no verificar (compatibilidad con sesiones antiguas)
    if (!colaborador.session_token) {
      console.warn('[Cookies] ⚠️ Colaborador no tiene session_token, saltando verificación')
      return true // Permitir acceso para compatibilidad
    }

    // Si no hay ID del colaborador, no se puede verificar
    if (!colaborador.id && !colaborador.documentId) {
      console.warn('[Cookies] ⚠️ Colaborador no tiene ID, no se puede verificar token de sesión')
      return false
    }

    // Obtener el colaborador desde Strapi para verificar el token de sesión
    const strapiClient = (await import('@/lib/strapi/client')).default
    const colaboradorId = colaborador.documentId || colaborador.id

    try {
      const colaboradorStrapi = await strapiClient.get<any>(
        `/api/colaboradores/${colaboradorId}?fields[0]=session_token`
      )

      const colaboradorData = colaboradorStrapi.data?.attributes || colaboradorStrapi.data || colaboradorStrapi
      const sessionTokenStrapi = colaboradorData?.session_token

      // Si no hay token en Strapi, permitir acceso (compatibilidad)
      if (!sessionTokenStrapi) {
        console.warn('[Cookies] ⚠️ Colaborador en Strapi no tiene session_token, saltando verificación')
        return true
      }

      // Verificar que los tokens coincidan
      if (sessionTokenStrapi !== colaborador.session_token) {
        console.warn('[Cookies] ❌ Token de sesión no coincide:', {
          tokenCookie: colaborador.session_token?.substring(0, 8) + '...',
          tokenStrapi: sessionTokenStrapi?.substring(0, 8) + '...',
          email: colaborador.email_login,
        })
        return false // Token no coincide, sesión inválida
      }

      return true // Token coincide, sesión válida
    } catch (error: any) {
      console.error('[Cookies] ❌ Error al verificar token de sesión en Strapi:', error.message)
      // Si hay error al verificar, permitir acceso para no bloquear usuarios (fallback)
      return true
    }
  } catch (error: any) {
    console.error('[Cookies] ❌ Error al verificar token de sesión:', error.message)
    // Si hay error, permitir acceso para no bloquear usuarios (fallback)
    return true
  }
}

