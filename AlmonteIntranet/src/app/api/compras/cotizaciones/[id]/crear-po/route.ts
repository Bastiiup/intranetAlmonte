import { NextRequest, NextResponse } from 'next/server'
import { createPOFromCotizacion } from '@/lib/services/ordenCompraService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/compras/cotizaciones/[id]/crear-po
 * Crea una Orden de Compra desde una cotización recibida
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const cotizacionId = parseInt(String(id))
    if (isNaN(cotizacionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de cotización inválido',
        },
        { status: 400 }
      )
    }
    
    const creadoPorId = body.creado_por_id ? parseInt(String(body.creado_por_id)) : undefined
    
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
    console.error('[API /compras/cotizaciones/[id]/crear-po POST] Error:', error)
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


