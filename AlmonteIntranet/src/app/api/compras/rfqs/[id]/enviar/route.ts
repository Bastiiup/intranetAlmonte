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
    const resolvedParams = await params
    const { id } = resolvedParams
    
    if (!id) {
      console.error('[API /compras/rfqs/[id]/enviar POST] ❌ ID no proporcionado')
      return NextResponse.json(
        {
          success: false,
          error: 'ID de RFQ no proporcionado',
        },
        { status: 400 }
      )
    }
    
    console.log('[API /compras/rfqs/[id]/enviar POST] Iniciando envío de RFQ:', {
      id,
      idType: typeof id,
      isNumeric: /^\d+$/.test(String(id)),
    })
    
    // El body es opcional - puede venir vacío o con empresaIds
    let empresaIds: number[] | undefined = undefined
    try {
      const contentType = request.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const text = await request.text()
        if (text && text.trim().length > 0) {
          const body = JSON.parse(text)
          empresaIds = body.empresaIds // Array opcional de IDs de empresas
        }
      }
    } catch (bodyError: any) {
      // Si no hay body o está vacío, continuar sin empresaIds (enviar a todas)
      console.log('[API /compras/rfqs/[id]/enviar POST] No se proporcionó body o está vacío, enviando a todas las empresas')
    }
    
    console.log('[API /compras/rfqs/[id]/enviar POST] Enviando RFQ:', {
      rfqId: id,
      empresaIds,
      empresaIdsCount: empresaIds ? empresaIds.length : 'todas',
    })
    
    const result = await sendRFQToProviders(id, empresaIds)
    
    if (!result.success) {
      console.error('[API /compras/rfqs/[id]/enviar POST] ❌ Error al enviar RFQ:', {
        error: result.error,
        rfqId: id,
        empresaIds,
      })
      
      // Si el error es "RFQ no encontrada", devolver 404
      const isNotFound = result.error?.toLowerCase().includes('no encontrada') || 
                        result.error?.toLowerCase().includes('not found')
      
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al enviar RFQ',
        },
        { status: isNotFound ? 404 : 500 }
      )
    }
    
    const exitosos = result.resultados.filter(r => r.success).length
    const total = result.resultados.length
    
    console.log('[API /compras/rfqs/[id]/enviar POST] RFQ enviada exitosamente:', {
      exitosos,
      total,
      resultados: result.resultados,
    })
    
    return NextResponse.json({
      success: true,
      message: `RFQ enviada a ${exitosos} de ${total} proveedor(es)`,
      resultados: result.resultados,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs/[id]/enviar POST] Error:', error)
    console.error('[API /compras/rfqs/[id]/enviar POST] Stack:', error.stack)
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


