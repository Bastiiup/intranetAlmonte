/**
 * API Route para gestionar envíos de Shipit
 * GET: Listar envíos
 * POST: Crear nuevo envío desde pedido de WooCommerce
 */

import { NextRequest, NextResponse } from 'next/server'
import shipitClient from '@/lib/shipit/client'
import type { ShipitCreateShipment, ShipitShipmentResponse } from '@/lib/shipit/types'
import { mapWooCommerceOrderToShipit, validateOrderForShipment, getShipitIdFromOrder } from '@/lib/shipit/utils'
import wooCommerceClient from '@/lib/woocommerce/client'
import type { WooCommerceOrder } from '@/lib/woocommerce/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shipit/shipments
 * Lista envíos de Shipit (opcional: filtrar por referencia)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reference = searchParams.get('reference')

    // Si hay referencia, buscar envío específico
    if (reference) {
      const shipments = await shipitClient.get<ShipitShipmentResponse[]>(
        'shipments',
        { reference }
      )
      return NextResponse.json({
        success: true,
        data: shipments,
      })
    }

    // Listar todos los envíos (puede requerir paginación)
    const shipments = await shipitClient.get<ShipitShipmentResponse[]>(
      'shipments'
    )

    return NextResponse.json({
      success: true,
      data: shipments,
    })
  } catch (error: any) {
    console.error('Error al obtener envíos de Shipit:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener envíos',
        status: error.status || 500,
        details: error.details,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/shipit/shipments
 * Crea un nuevo envío en Shipit desde un pedido de WooCommerce
 * 
 * Body:
 * {
 *   orderId: number,           // ID del pedido WooCommerce
 *   communeId?: number,         // ID de comuna (requerido si no está en el pedido)
 *   courier?: string,           // Courier preferido (default: "shippify")
 *   kind?: 0 | 1 | 2,          // Tipo de envío (0: normal, 1: express, 2: same_day)
 *   testMode?: boolean          // Usar prefijo TEST- en la referencia
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, communeId, courier, kind, testMode } = body

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'orderId es requerido',
        },
        { status: 400 }
      )
    }

    // Obtener pedido de WooCommerce
    const order = await wooCommerceClient.get<WooCommerceOrder>(
      `orders/${orderId}`
    )

    // Validar que el pedido tenga la información necesaria
    const validation = validateOrderForShipment(order)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'El pedido no tiene la información necesaria para crear un envío',
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    // Verificar si ya tiene un envío de Shipit
    const existingShipitId = getShipitIdFromOrder(order)

    if (existingShipitId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Este pedido ya tiene un envío de Shipit asociado',
          shipitId: existingShipitId,
        },
        { status: 400 }
      )
    }

    // Validar communeId si no se proporciona
    if (!communeId && !order.shipping.city) {
      return NextResponse.json(
        {
          success: false,
          error: 'communeId es requerido. La comuna debe ser mapeada a un ID numérico.',
        },
        { status: 400 }
      )
    }

    // Mapear pedido WooCommerce a formato Shipit
    const shipmentData = mapWooCommerceOrderToShipit(order, {
      communeId,
      courier,
      kind,
      testMode,
    })

    console.log('[API] Creando envío en Shipit:', {
      orderId,
      reference: shipmentData.shipment.reference,
      testMode,
    })

    // Crear envío en Shipit
    const shipment = await shipitClient.post<ShipitShipmentResponse>(
      'shipments',
      shipmentData
    )

    // Guardar ID de Shipit en el pedido de WooCommerce
    const currentMetaData = order.meta_data || []
    const updatedMetaData = [
      ...currentMetaData.filter(
        (meta) => meta.key !== '_shipit_id' && meta.key !== 'shipit_id'
      ),
      {
        key: '_shipit_id',
        value: String(shipment.id),
      },
    ]

    if (shipment.tracking_number) {
      updatedMetaData.push({
        key: '_shipit_tracking',
        value: shipment.tracking_number,
      })
    }

    // Actualizar pedido en WooCommerce
    await wooCommerceClient.put(`orders/${orderId}`, {
      meta_data: updatedMetaData,
    })

    console.log('[API] Envío creado exitosamente:', {
      orderId,
      shipitId: shipment.id,
      tracking: shipment.tracking_number,
    })

    return NextResponse.json({
      success: true,
      data: shipment,
      orderId,
    })
  } catch (error: any) {
    console.error('Error al crear envío en Shipit:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear envío',
        status: error.status || 500,
        details: error.details,
      },
      { status: error.status || 500 }
    )
  }
}
