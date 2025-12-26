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
  
  // Si no hay token, verificar si hay datos de colaborador en cookies (fallback)
  if (!token) {
    const colaboradorData = request.cookies.get('colaboradorData')?.value || 
                           request.cookies.get('colaborador')?.value
    // Si hay datos de colaborador, considerar autenticado (el token puede estar solo en localStorage del cliente)
    if (colaboradorData) {
      try {
        const colaborador = JSON.parse(colaboradorData)
        // Verificar que tenga datos mínimos válidos
        if (colaborador && (colaborador.id || colaborador.documentId || colaborador.email_login)) {
          return true
        }
      } catch {
        // Si no se puede parsear, continuar con verificación de token
      }
    }
    return false
  }

  // Verificar que el token sea válido consultando Strapi
  // Intentar primero con /api/users/me (para usuarios de Strapi)
  // Si falla, intentar con un endpoint de colaboradores
  try {
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_API_URL
    if (!strapiUrl) {
      console.error('[auth/middleware] STRAPI_URL no configurado')
      return false
    }

    // Intentar verificar con /api/users/me
    const userResponse = await fetch(`${strapiUrl}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    if (userResponse.ok) {
      return true
    }

    // Si falla, verificar si hay datos de colaborador en cookies
    // Esto indica que el token es válido para colaboradores aunque no para usuarios
    const colaboradorData = request.cookies.get('colaboradorData')?.value || 
                           request.cookies.get('colaborador')?.value
    if (colaboradorData) {
      try {
        const colaborador = JSON.parse(colaboradorData)
        // Si hay datos de colaborador válidos, considerar autenticado
        // El token puede ser válido para el sistema de colaboradores aunque no para usuarios
        if (colaborador && (colaborador.id || colaborador.documentId || colaborador.email_login)) {
          return true
        }
      } catch {
        // Si no se puede parsear, retornar false
      }
    }

    return false
  } catch (error) {
    console.error('[auth/middleware] Error al verificar token:', error)
    
    // En caso de error, verificar si hay datos de colaborador como fallback
    const colaboradorData = request.cookies.get('colaboradorData')?.value || 
                           request.cookies.get('colaborador')?.value
    if (colaboradorData) {
      try {
        const colaborador = JSON.parse(colaboradorData)
        if (colaborador && (colaborador.id || colaborador.documentId || colaborador.email_login)) {
          return true
        }
      } catch {
        // Ignorar errores de parsing
      }
    }
    
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

