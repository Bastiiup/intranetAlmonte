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
 * Activa un colaborador cambiando el campo activo de false a true
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('[API /colaboradores/[id]/activate] Activando colaborador:', id)

    // Simplemente actualizar el campo activo a true
    const colaboradorData: any = {
      data: {
        activo: true,
      },
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      `/api/colaboradores/${id}`,
      colaboradorData
    )

    console.log('[API /colaboradores/[id]/activate] ✅ Colaborador activado exitosamente')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colaborador activado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/[id]/activate] ❌ Error:', {
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

