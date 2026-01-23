import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/compras/rfqs/[id]
 * Obtiene una RFQ específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    let rfq: any = null
    
    // Intentar primero con el endpoint directo
    try {
      // En Strapi v5, populates anidados profundos deben usar '*' en lugar de 'true'
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/rfqs/${id}?populate[empresas]=*&populate[productos]=true&populate[creado_por][populate][persona]=*&populate[cotizaciones_recibidas][populate][empresa]=*&populate[cotizaciones_recibidas][populate][contacto_responsable]=*`
      )
      
      if (response.data) {
        rfq = response.data
      }
    } catch (directError: any) {
      // Si falla, intentar buscar por documentId
      try {
        const isDocumentId = /^[a-zA-Z0-9_-]+$/.test(id) && !/^\d+$/.test(id)
        
        let filterParams: URLSearchParams
        if (isDocumentId) {
          filterParams = new URLSearchParams({
            'filters[documentId][$eq]': id,
            'populate[empresas]': '*',
            'populate[productos]': 'true',
            'populate[creado_por][populate][persona]': '*',
            'populate[cotizaciones_recibidas][populate][empresa]': '*',
            'populate[cotizaciones_recibidas][populate][contacto_responsable]': '*',
          })
        } else {
          filterParams = new URLSearchParams({
            'filters[id][$eq]': id.toString(),
            'populate[empresas]': '*',
            'populate[productos]': 'true',
            'populate[creado_por][populate][persona]': '*',
            'populate[cotizaciones_recibidas][populate][empresa]': '*',
            'populate[cotizaciones_recibidas][populate][contacto_responsable]': '*',
          })
        }
        
        const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/rfqs?${filterParams.toString()}`
        )
        
        if (filterResponse.data) {
          if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
            rfq = filterResponse.data[0]
          } else if (!Array.isArray(filterResponse.data)) {
            rfq = filterResponse.data
          }
        }
      } catch (filterError: any) {
        console.error('[API /compras/rfqs/[id] GET] Error en búsqueda por filtro:', filterError.message)
      }
    }
    
    if (!rfq) {
      return NextResponse.json(
        {
          success: false,
          error: 'RFQ no encontrada',
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: rfq,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs/[id] GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener RFQ',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/compras/rfqs/[id]
 * Actualiza una RFQ
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
    
    if (body.nombre) updateData.data.nombre = body.nombre.trim()
    if (body.descripcion !== undefined) updateData.data.descripcion = body.descripcion?.trim() || null
    if (body.fecha_solicitud) updateData.data.fecha_solicitud = body.fecha_solicitud
    if (body.fecha_vencimiento !== undefined) updateData.data.fecha_vencimiento = body.fecha_vencimiento || null
    if (body.estado) updateData.data.estado = body.estado
    if (body.moneda) updateData.data.moneda = body.moneda
    if (body.notas_internas !== undefined) updateData.data.notas_internas = body.notas_internas?.trim() || null
    if (body.activo !== undefined) updateData.data.activo = body.activo
    
    // Actualizar relaciones
    if (body.empresas && Array.isArray(body.empresas)) {
      updateData.data.empresas = { connect: body.empresas.map((id: any) => Number(id)) }
    }
    if (body.productos && Array.isArray(body.productos)) {
      updateData.data.productos = { connect: body.productos.map((id: any) => Number(id)) }
    }
    
    const response = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
      `/api/rfqs/${id}`,
      updateData
    )
    
    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'RFQ actualizada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs/[id] PUT] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar RFQ',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/compras/rfqs/[id]
 * Elimina (soft delete) una RFQ
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Soft delete: marcar como inactiva
    await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(`/api/rfqs/${id}`, {
      data: {
        activo: false,
      },
    })
    
    return NextResponse.json({
      success: true,
      message: 'RFQ eliminada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs/[id] DELETE] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar RFQ',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

