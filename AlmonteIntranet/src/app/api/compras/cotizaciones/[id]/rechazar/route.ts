// Alias para /api/compras/cotizaciones-recibidas/[id]/rechazar
import { NextRequest, NextResponse } from 'next/server'
import { rechazarCotizacion } from '@/lib/services/ordenCompraService'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/compras/cotizaciones/[id]/rechazar
 * Rechaza una cotización recibida (alias de cotizaciones-recibidas/[id]/rechazar)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({})) // Si no hay body, usar objeto vacío
    
    // Aceptar tanto ID numérico como documentId
    const cotizacionId: number | string = /^\d+$/.test(id) ? parseInt(id) : id
    
    const result = await rechazarCotizacion(cotizacionId, body.motivo)
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al rechazar cotización',
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cotización rechazada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/cotizaciones/[id]/rechazar PUT] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al rechazar cotización',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

