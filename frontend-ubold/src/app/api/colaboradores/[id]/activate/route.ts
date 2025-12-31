import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol?: string
  activo: boolean
  persona?: any
}

/**
 * POST /api/colaboradores/[id]/activate
 * Activa un colaborador (solo para super_admin)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validar que el usuario actual sea super_admin
    // Usar el endpoint /api/colaboradores/me que ya maneja la autenticación correctamente
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[API /colaboradores/[id]/activate] No se proporcionó token de autenticación')
      return NextResponse.json(
        { success: false, error: 'No se proporcionó un token de autenticación' },
        { status: 401 }
      )
    }

    console.log('[API /colaboradores/[id]/activate] Validando usuario autenticado...')

    // Obtener los datos del colaborador autenticado usando el endpoint interno
    const baseUrl = request.headers.get('host') 
      ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    const meResponse = await fetch(`${baseUrl}/api/colaboradores/me`, {
      headers: {
        'Authorization': authHeader,
      },
    })

    if (!meResponse.ok) {
      const errorData = await meResponse.json().catch(() => ({}))
      console.error('[API /colaboradores/[id]/activate] Error al validar colaborador:', {
        status: meResponse.status,
        error: errorData.error || 'Error desconocido',
      })
      
      if (meResponse.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Token inválido o expirado. Por favor, cierra sesión y vuelve a iniciar sesión.' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: errorData.error || 'Error al validar usuario autenticado' },
        { status: meResponse.status }
      )
    }

    const meData = await meResponse.json()
    const colaboradorAutenticado = meData.colaborador

    if (!colaboradorAutenticado) {
      return NextResponse.json(
        { success: false, error: 'No se encontró un colaborador vinculado a este usuario' },
        { status: 404 }
      )
    }

    // Validar que sea super_admin
    if (colaboradorAutenticado.rol !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Solo los usuarios con rol super_admin pueden activar colaboradores' },
        { status: 403 }
      )
    }

    console.log('[API /colaboradores/[id]/activate] Activando colaborador:', id)

    // Actualizar el colaborador para activarlo
    const colaboradorData: any = {
      data: {
        activo: true,
      },
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      `/api/colaboradores/${id}`,
      colaboradorData
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colaborador activado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/[id]/activate] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al activar colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

