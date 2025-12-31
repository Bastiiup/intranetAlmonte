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
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó un token de autenticación' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Obtener el usuario autenticado desde Strapi
    const userResponse = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!userResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Token inválido o expirado' },
        { status: 401 }
      )
    }

    const user = await userResponse.json()

    // Buscar el colaborador vinculado a este usuario
    const colaboradorUrl = `/api/colaboradores?filters[usuario][id][$eq]=${user.id}&populate[persona]=*`
    const colaboradorResponse = await strapiClient.get<any>(colaboradorUrl)

    if (!colaboradorResponse.data || (Array.isArray(colaboradorResponse.data) && colaboradorResponse.data.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'No se encontró un colaborador vinculado a este usuario' },
        { status: 404 }
      )
    }

    const colaboradorRaw = Array.isArray(colaboradorResponse.data) ? colaboradorResponse.data[0] : colaboradorResponse.data
    const colaboradorAttrs = colaboradorRaw.attributes || colaboradorRaw
    const rol = colaboradorAttrs.rol || colaboradorRaw.rol

    // Validar que sea super_admin
    if (rol !== 'super_admin') {
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

