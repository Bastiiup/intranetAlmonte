// Alias para /api/compras/cotizaciones-recibidas/[id]/aprobar
import { NextRequest, NextResponse } from 'next/server'
import { aprobarCotizacion } from '@/lib/services/ordenCompraService'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/compras/cotizaciones/[id]/aprobar
 * Aprueba una cotización recibida (alias de cotizaciones-recibidas/[id]/aprobar)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Aceptar tanto ID numérico como documentId
    const cotizacionId: number | string = /^\d+$/.test(id) ? parseInt(id) : id
    
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
    console.error('[API /compras/cotizaciones/[id]/aprobar PUT] Error:', error)
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

