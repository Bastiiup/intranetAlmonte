import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { getColaboradorFromCookies } from '@/lib/auth/cookies'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/logout
 * Cierra la sesión del usuario y limpia el token de sesión en Strapi
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener colaborador de las cookies
    const colaborador = await getColaboradorFromCookies(false) // No verificar sesión para logout

    if (colaborador && (colaborador.id || colaborador.documentId)) {
      const colaboradorId = colaborador.documentId || colaborador.id

      // Limpiar token de sesión en Strapi
      try {
        await strapiClient.put(`/api/colaboradores/${colaboradorId}`, {
          data: {
            session_token: null, // Limpiar token de sesión
          },
        })
        console.log('[API /auth/logout] ✅ Token de sesión limpiado en Strapi')
      } catch (error: any) {
        console.warn('[API /auth/logout] ⚠️ No se pudo limpiar token de sesión en Strapi:', error.message)
        // Continuar aunque falle, las cookies se limpiarán de todas formas
      }
    }

    // Crear respuesta y limpiar cookies
    const response = NextResponse.json(
      { message: 'Logout exitoso' },
      { status: 200 }
    )

    // Limpiar todas las cookies de autenticación
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
  } catch (error: any) {
    console.error('[API /auth/logout] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}

