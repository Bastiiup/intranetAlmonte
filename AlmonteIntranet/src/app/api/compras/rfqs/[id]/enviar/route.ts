import { NextRequest, NextResponse } from 'next/server'
import { sendRFQToProviders } from '@/lib/services/rfqService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/compras/rfqs/[id]/enviar
 * Envía RFQ a proveedores por email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const empresaIds = body.empresaIds // Array opcional de IDs de empresas
    
    const result = await sendRFQToProviders(id, empresaIds)
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al enviar RFQ',
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: `RFQ enviada a ${result.resultados.filter(r => r.success).length} proveedor(es)`,
      resultados: result.resultados,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs/[id]/enviar POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al enviar RFQ',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

