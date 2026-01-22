import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { createPOFromCotizacion } from '@/lib/services/ordenCompraService'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/compras/ordenes-compra
 * Lista todas las órdenes de compra con filtros
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '25'
    const estado = searchParams.get('estado') || ''
    const empresaId = searchParams.get('empresaId') || ''
    
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'createdAt:desc',
      'populate[empresa]': 'true',
      'populate[cotizacion_recibida]': 'true',
      'populate[creado_por][populate][persona]': 'true',
      'populate[factura]': 'true',
      'populate[orden_despacho]': 'true',
    })
    
    if (estado) {
      params.append('filters[estado][$eq]', estado)
    }
    
    if (empresaId) {
      params.append('filters[empresa][id][$eq]', empresaId)
    }
    
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/ordenes-compra?${params.toString()}`
    )
    
    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/ordenes-compra GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener órdenes de compra',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/compras/ordenes-compra
 * Crea una nueva Orden de Compra desde una cotización recibida
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cotizacion_recibida_id, creado_por_id } = body
    
    if (!cotizacion_recibida_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de cotización recibida es obligatorio',
        },
        { status: 400 }
      )
    }
    
    const cotizacionId = parseInt(String(cotizacion_recibida_id))
    if (isNaN(cotizacionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de cotización inválido',
        },
        { status: 400 }
      )
    }
    
    const creadoPorId = creado_por_id ? parseInt(String(creado_por_id)) : undefined
    
    const result = await createPOFromCotizacion(cotizacionId, creadoPorId)
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al crear Orden de Compra',
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Orden de Compra creada exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /compras/ordenes-compra POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear Orden de Compra',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

