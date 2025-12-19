/**
 * API Route para recibir webhooks de Shipit
 * POST: Recibe notificaciones de cambios de estado de envíos
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ShipitWebhook } from '@/lib/shipit/types'
import wooCommerceClient from '@/lib/woocommerce/client'
import type { WooCommerceOrder } from '@/lib/woocommerce/types'
import { mapShipitStatusToWooCommerce } from '@/lib/shipit/utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/shipit/webhooks
 * Recibe notificaciones de Shipit sobre cambios en los envíos
 * 
 * Este endpoint debe ser configurado en el panel de Shipit
 * para recibir actualizaciones automáticas
 */
export async function POST(request: NextRequest) {
  try {
    const webhook: ShipitWebhook = await request.json()

    console.log('[Webhook] Recibida notificación de Shipit:', {
      event: webhook.event,
      shipmentId: webhook.shipment_id,
      reference: webhook.reference,
      status: webhook.status,
    })

    // Validar que el webhook tenga la información necesaria
    if (!webhook.reference || !webhook.shipment_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Webhook inválido: falta reference o shipment_id',
        },
        { status: 400 }
      )
    }

    // Extraer orderId de la referencia (puede tener prefijo TEST-)
    const orderIdMatch = webhook.reference.match(/^TEST-?(\d+)$|^(\d+)$/)
    const orderId = orderIdMatch
      ? parseInt(orderIdMatch[1] || orderIdMatch[2], 10)
      : parseInt(webhook.reference, 10)

    if (isNaN(orderId)) {
      console.warn('[Webhook] No se pudo extraer orderId de la referencia:', webhook.reference)
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo determinar el ID del pedido desde la referencia',
        },
        { status: 400 }
      )
    }

    // Obtener pedido de WooCommerce
    let order: WooCommerceOrder
    try {
      order = await wooCommerceClient.get<WooCommerceOrder>(`orders/${orderId}`)
    } catch (error: any) {
      if (error.status === 404) {
        console.warn('[Webhook] Pedido no encontrado:', orderId)
        return NextResponse.json(
          {
            success: false,
            error: `Pedido ${orderId} no encontrado en WooCommerce`,
          },
          { status: 404 }
        )
      }
      throw error
    }

    // Actualizar meta_data del pedido con información del webhook
    const currentMetaData = order.meta_data || []
    const updatedMetaData = [
      ...currentMetaData.filter(
        (meta) =>
          meta.key !== '_shipit_id' &&
          meta.key !== 'shipit_id' &&
          meta.key !== '_shipit_tracking' &&
          meta.key !== 'shipit_tracking_number' &&
          meta.key !== '_shipit_status' &&
          meta.key !== 'shipit_status'
      ),
      {
        key: '_shipit_id',
        value: String(webhook.shipment_id),
      },
      {
        key: '_shipit_status',
        value: webhook.status,
      },
    ]

    if (webhook.tracking_number) {
      updatedMetaData.push({
        key: '_shipit_tracking',
        value: webhook.tracking_number,
      })
    }

    // Mapear estado de Shipit a estado de WooCommerce
    const wooCommerceStatus = mapShipitStatusToWooCommerce(webhook.status)

    // Actualizar pedido en WooCommerce
    await wooCommerceClient.put(`orders/${orderId}`, {
      status: wooCommerceStatus,
      meta_data: updatedMetaData,
    })

    console.log('[Webhook] Pedido actualizado exitosamente:', {
      orderId,
      shipitStatus: webhook.status,
      wooCommerceStatus,
    })

    // Responder a Shipit (importante para confirmar recepción)
    return NextResponse.json({
      success: true,
      message: 'Webhook procesado correctamente',
      orderId,
      status: wooCommerceStatus,
    })
  } catch (error: any) {
    console.error('Error al procesar webhook de Shipit:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar webhook',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
