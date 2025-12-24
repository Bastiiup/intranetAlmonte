import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { requireAuth } from '@/lib/auth/middleware'
import { getStrapiUrl } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

/**
 * PUT - Actualizar contraseña de un colaborador
 * Requiere autenticación y permisos de administrador
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar autenticación
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Obtener el token del usuario autenticado
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No se proporcionó un token de autenticación' },
        { status: 401 }
      )
    }

    // Actualizar la contraseña del colaborador en Strapi
    // Nota: Esto requiere que Strapi tenga un endpoint para actualizar contraseñas
    // o que el campo password sea actualizable directamente
    const strapiUrl = getStrapiUrl(`/api/colaboradores/${id}`)
    
    const updateResponse = await fetch(strapiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          password: password, // Strapi debería hashear esto automáticamente
        },
      }),
    })

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({}))
      console.error('[API /colaboradores/[id]/password] Error al actualizar contraseña:', {
        status: updateResponse.status,
        error: errorData,
      })
      
      return NextResponse.json(
        { 
          error: errorData.error?.message || errorData.message || 'Error al actualizar la contraseña',
          details: errorData,
        },
        { status: updateResponse.status }
      )
    }

    const data = await updateResponse.json()

    return NextResponse.json(
      { 
        message: 'Contraseña actualizada exitosamente',
        success: true,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[API /colaboradores/[id]/password] Error:', {
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      {
        error: error.message || 'Error al actualizar la contraseña',
        details: error.details || {},
      },
      { status: error.status || 500 }
    )
  }
}


