import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/compras/ordenes-compra/[id]
 * Obtiene una Orden de Compra específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/ordenes-compra/${id}?populate[empresa]=true&populate[cotizacion_recibida][populate][rfq]=true&populate[creado_por][populate][persona]=true&populate[factura]=true&populate[orden_despacho]=true`
    )
    
    if (!response.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Orden de Compra no encontrada',
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/ordenes-compra/[id] GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener Orden de Compra',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/compras/ordenes-compra/[id]
 * Actualiza una Orden de Compra
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const updateData: any = {
      data: {},
    }
    
    if (body.fecha_entrega_estimada !== undefined) {
      updateData.data.fecha_entrega_estimada = body.fecha_entrega_estimada || null
    }
    if (body.estado) {
      updateData.data.estado = body.estado
    }
    if (body.notas !== undefined) {
      updateData.data.notas = body.notas?.trim() || null
    }
    if (body.direccion_facturacion) {
      updateData.data.direccion_facturacion = body.direccion_facturacion
    }
    if (body.direccion_despacho) {
      updateData.data.direccion_despacho = body.direccion_despacho
    }
    if (body.activo !== undefined) {
      updateData.data.activo = body.activo
    }
    
    // Manejar subida de factura y orden de despacho
    if (body.factura_id) {
      updateData.data.factura = { connect: [Number(body.factura_id)] }
    }
    if (body.orden_despacho_id) {
      updateData.data.orden_despacho = { connect: [Number(body.orden_despacho_id)] }
    }
    
    const response = await strapiClient.put(`/api/ordenes-compra/${id}`, updateData)
    
    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Orden de Compra actualizada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/ordenes-compra/[id] PUT] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar Orden de Compra',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}


