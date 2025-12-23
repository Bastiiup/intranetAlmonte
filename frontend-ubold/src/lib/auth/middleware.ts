import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '../auth'

/**
 * Verifica si una solicitud tiene un token de autenticación válido
 * @param request La solicitud HTTP
 * @returns El token si existe, null si no
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // Intentar obtener el token del header Authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '')
  }

  // Intentar obtener el token de las cookies
  const cookieToken = request.cookies.get('auth_token')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}

/**
 * Verifica si el usuario está autenticado
 * @param request La solicitud HTTP
 * @returns true si está autenticado, false si no
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = getTokenFromRequest(request)
  
  if (!token) {
    return false
  }

  // Verificar que el token sea válido consultando Strapi
  try {
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_API_URL
    if (!strapiUrl) {
      console.error('[auth/middleware] STRAPI_URL no configurado')
      return false
    }

    const response = await fetch(`${strapiUrl}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    return response.ok
  } catch (error) {
    console.error('[auth/middleware] Error al verificar token:', error)
    return false
  }
}

/**
 * Middleware helper para proteger rutas de API
 * Retorna una respuesta 401 si el usuario no está autenticado
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const authenticated = await isAuthenticated(request)
  
  if (!authenticated) {
    return NextResponse.json(
      { error: 'No autorizado. Debes iniciar sesión para acceder a este recurso.' },
      { status: 401 }
    )
  }

  return null
}

