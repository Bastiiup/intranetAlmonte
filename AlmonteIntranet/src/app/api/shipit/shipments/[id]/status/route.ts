/**
 * API Route para consultar el estado de un envío de Shipit
 * GET: Obtener estado actual del envío
 */

import { NextRequest, NextResponse } from 'next/server'
import shipitClient from '@/lib/shipit/client'
import type { ShipitShipmentStatus } from '@/lib/shipit/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shipit/shipments/[id]/status
 * Obtiene el estado actual de un envío
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const shipmentId = parseInt(id)

    if (isNaN(shipmentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de envío inválido',
        },
        { status: 400 }
      )
    }

    console.log('[API] Consultando estado de envío:', { shipmentId })

    const status = await shipitClient.get<ShipitShipmentStatus>(
      `shipments/${shipmentId}/status`
    )

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error: any) {
    console.error('Error al consultar estado de envío:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al consultar estado',
        status: error.status || 500,
        details: error.details,
      },
      { status: error.status || 500 }
    )
  }
}
