import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/compras/cotizaciones-recibidas/[id]
 * Obtiene una cotización recibida específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/cotizaciones-recibidas/${id}?populate[rfq]=true&populate[empresa]=true&populate[contacto_responsable]=true&populate[orden_compra]=true&populate[archivo_pdf]=true`
    )
    
    if (!response.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización recibida no encontrada',
        },
        { status: 404 }
      )
    }
    
    // Normalizar la cotización para asegurar campos consistentes
    const cotizacionData = response.data
    const cotizacionAttrs = cotizacionData.attributes || cotizacionData
    
    // Normalizar nombres de campos: precio_total -> monto_total (para compatibilidad con frontend)
    const cotizacionNormalizada = {
      ...cotizacionData,
      id: cotizacionData.id,
      documentId: cotizacionData.documentId,
      attributes: {
        ...cotizacionAttrs,
        precio_total: cotizacionAttrs.precio_total,
        precio_unitario: cotizacionAttrs.precio_unitario,
        monto_total: cotizacionAttrs.precio_total || cotizacionAttrs.monto_total,
        monto_unitario: cotizacionAttrs.precio_unitario || cotizacionAttrs.monto_unitario,
      },
      precio_total: cotizacionAttrs.precio_total,
      precio_unitario: cotizacionAttrs.precio_unitario,
      monto_total: cotizacionAttrs.precio_total || cotizacionAttrs.monto_total,
      monto_unitario: cotizacionAttrs.precio_unitario || cotizacionAttrs.monto_unitario,
    }
    
    return NextResponse.json({
      success: true,
      data: cotizacionNormalizada,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/cotizaciones-recibidas/[id] GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener cotización recibida',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}


