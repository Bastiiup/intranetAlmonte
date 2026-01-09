/**
 * API Route para gestionar un envío específico de Shipit
 * GET: Obtener información del envío
 * PUT: Actualizar envío (si está permitido por la API)
 */

import { NextRequest, NextResponse } from 'next/server'
import shipitClient from '@/lib/shipit/client'
import type { ShipitShipmentResponse } from '@/lib/shipit/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shipit/shipments/[id]
 * Obtiene información de un envío específico
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

    console.log('[API] Obteniendo envío de Shipit:', { shipmentId })

    const shipment = await shipitClient.get<ShipitShipmentResponse>(
      `shipments/${shipmentId}`
    )

    return NextResponse.json({
      success: true,
      data: shipment,
    })
  } catch (error: any) {
    console.error('Error al obtener envío de Shipit:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener envío',
        status: error.status || 500,
        details: error.details,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/shipit/shipments/[id]
 * Actualiza un envío (si la API lo permite)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const shipmentId = parseInt(id)
    const body = await request.json()

    if (isNaN(shipmentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de envío inválido',
        },
        { status: 400 }
      )
    }

    console.log('[API] Actualizando envío de Shipit:', { shipmentId })

    const shipment = await shipitClient.put<ShipitShipmentResponse>(
      `shipments/${shipmentId}`,
      body
    )

    return NextResponse.json({
      success: true,
      data: shipment,
    })
  } catch (error: any) {
    console.error('Error al actualizar envío de Shipit:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar envío',
        status: error.status || 500,
        details: error.details,
      },
      { status: error.status || 500 }
    )
  }
}
