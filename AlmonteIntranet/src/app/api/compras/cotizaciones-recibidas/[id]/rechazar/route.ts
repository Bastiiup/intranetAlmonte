import { NextRequest, NextResponse } from 'next/server'
import { rechazarCotizacion } from '@/lib/services/ordenCompraService'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/compras/cotizaciones-recibidas/[id]/rechazar
 * Rechaza una cotización recibida
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const cotizacionId = parseInt(id)
    
    if (isNaN(cotizacionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de cotización inválido',
        },
        { status: 400 }
      )
    }
    
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
    console.error('[API /compras/cotizaciones-recibidas/[id]/rechazar PUT] Error:', error)
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


