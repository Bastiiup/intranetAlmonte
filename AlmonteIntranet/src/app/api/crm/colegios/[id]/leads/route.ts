/**
 * API Route para obtener leads relacionados con un colegio
 * GET /api/crm/colegios/[id]/leads
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crm/colegios/[id]/leads
 * Obtiene los leads relacionados con un colegio
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '20'

    console.log('[API /crm/colegios/[id]/leads GET] Buscando leads para colegio:', id)

    const colegioId = typeof id === 'string' ? parseInt(id) : id

    if (isNaN(colegioId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de colegio inválido',
        },
        { status: 400 }
      )
    }

    const paramsObj = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'fecha_creacion:desc',
      'populate[relacionado_con_colegio]': 'true',
      'populate[relacionado_con_persona]': 'true',
      'populate[asignado_a]': 'true',
      'filters[relacionado_con_colegio][id][$eq]': colegioId.toString(),
    })

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/leads?${paramsObj.toString()}`
    )

    const leads = Array.isArray(response.data) ? response.data : [response.data]

    return NextResponse.json({
      success: true,
      data: leads,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios/[id]/leads GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener leads del colegio',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
