import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/compras/cotizaciones-recibidas
 * Lista todas las cotizaciones recibidas con filtros
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '25'
    const rfqId = searchParams.get('rfqId') || searchParams.get('rfq') || ''
    const empresaId = searchParams.get('empresaId') || ''
    const estado = searchParams.get('estado') || ''
    const search = searchParams.get('search') || ''
    
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'createdAt:desc',
      'populate[rfq]': 'true',
      'populate[empresa]': 'true',
      'populate[contacto_responsable]': 'true',
      'populate[orden_compra]': 'true',
      'populate[archivo_pdf]': 'true',
    })
    
    if (rfqId) {
      params.append('filters[rfq][id][$eq]', rfqId)
    }
    
    if (search) {
      params.append('filters[$or][0][numero_cotizacion][$containsi]', search)
      params.append('filters[$or][1][empresa][empresa_nombre][$containsi]', search)
      params.append('filters[$or][2][empresa][nombre][$containsi]', search)
    }
    
    if (empresaId) {
      params.append('filters[empresa][id][$eq]', empresaId)
    }
    
    if (estado) {
      params.append('filters[estado][$eq]', estado)
    }
    
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/cotizaciones-recibidas?${params.toString()}`
    )
    
    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/cotizaciones-recibidas GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener cotizaciones recibidas',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

