/**
 * API Route para sincronizar un pedido específico desde WeareCloud
 * 
 * Endpoint:
 * - POST: Sincronizar un pedido específico desde WeareCloud
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncOrder } from '@/lib/operaciones/services'

export const dynamic = 'force-dynamic'

/**
 * POST - Sincronizar pedido desde WeareCloud
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json().catch(() => ({}))
    const force = body.force === true

    // El ID puede ser de WeareCloud o JumpSeller
    const isJumpSellerId = !isNaN(Number(id))
    
    const syncResult = await syncOrder({
      jumpseller_order_id: isJumpSellerId ? Number(id) : undefined,
      wearecloud_order_id: !isJumpSellerId ? id : undefined,
      force
    })

    if (!syncResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: syncResult.error || 'No se pudo sincronizar el pedido',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido sincronizado exitosamente',
      data: syncResult.order,
      changes: syncResult.changes
    })
  } catch (error: any) {
    console.error('Error al sincronizar pedido:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al sincronizar pedido',
      },
      { status: error.status || 500 }
    )
  }
}


