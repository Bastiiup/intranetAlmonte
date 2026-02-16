import { NextRequest, NextResponse } from 'next/server'
import { aprobarCotizacion } from '@/lib/services/ordenCompraService'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/compras/cotizaciones-recibidas/[id]/aprobar
 * Aprueba una cotización recibida
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    
    const result = await aprobarCotizacion(cotizacionId)
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al aprobar cotización',
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cotización aprobada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/cotizaciones-recibidas/[id]/aprobar PUT] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al aprobar cotización',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}


