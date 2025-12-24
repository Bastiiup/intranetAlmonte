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
import strapiClient from '@/lib/strapi/client'

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

    // Intentar obtener pedido de WooCommerce primero
    let order: WooCommerceOrder | null = null
    let isStrapiOrder = false
    
    try {
      order = await wooCommerceClient.get<WooCommerceOrder>(
        `orders/${orderId}`
      )
    } catch (error: any) {
      // Si no se encuentra en WooCommerce, intentar obtener de Strapi
      if (error.status === 404) {
        console.log('[API Shipit] Pedido no encontrado en WooCommerce, buscando en Strapi...')
        try {
          // Buscar en Strapi por numero_pedido o wooId
          const strapiResponse = await strapiClient.get<any>(
            `/api/wo-pedidos?filters[$or][0][numero_pedido][$eq]=${orderId}&filters[$or][1][wooId][$eq]=${orderId}&populate=*`
          )
          
          const strapiPedidos = strapiResponse.data || (Array.isArray(strapiResponse) ? strapiResponse : [])
          const strapiPedido = Array.isArray(strapiPedidos) ? strapiPedidos[0] : strapiPedidos
          
          if (strapiPedido) {
            const attrs = strapiPedido.attributes || strapiPedido
            // Mapear pedido de Strapi a formato WooCommerce
            order = {
              id: parseInt(String(attrs.wooId || attrs.numero_pedido || orderId), 10),
              number: String(attrs.numero_pedido || attrs.wooId || orderId),
              status: attrs.estado || 'pending',
              total: String(attrs.total || 0),
              shipping: attrs.shipping || {
                address_1: attrs.direccion_envio || '',
                city: attrs.ciudad_envio || attrs.comuna_envio || '',
                first_name: attrs.cliente?.nombre?.split(' ')[0] || '',
                last_name: attrs.cliente?.nombre?.split(' ').slice(1).join(' ') || '',
              },
              billing: attrs.billing || {
                first_name: attrs.cliente?.nombre?.split(' ')[0] || '',
                last_name: attrs.cliente?.nombre?.split(' ').slice(1).join(' ') || '',
                email: attrs.cliente?.email || '',
                phone: attrs.cliente?.telefono || '',
              },
              line_items: (attrs.items || []).map((item: any) => ({
                id: item.id,
                product_id: item.producto_id || item.id,
                name: item.nombre || 'Producto',
                quantity: item.cantidad || 1,
                price: String(item.precio_unitario || 0),
              })),
              meta_data: attrs.rawWooData?.meta_data || [],
            } as WooCommerceOrder
            isStrapiOrder = true
            console.log('[API Shipit] Pedido obtenido de Strapi:', order.id)
          } else {
            throw new Error('Pedido no encontrado en Strapi ni en WooCommerce')
          }
        } catch (strapiError: any) {
          console.error('[API Shipit] Error al obtener pedido de Strapi:', strapiError)
          return NextResponse.json(
            {
              success: false,
              error: `Pedido ${orderId} no encontrado en WooCommerce ni en Strapi`,
            },
            { status: 404 }
          )
        }
      } else {
        throw error
      }
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener el pedido',
        },
        { status: 404 }
      )
    }

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

    // Guardar ID de Shipit en el pedido (WooCommerce o Strapi)
    if (isStrapiOrder) {
      // Actualizar en Strapi
      try {
        // Buscar el pedido en Strapi para obtener su documentId
        const strapiResponse = await strapiClient.get<any>(
          `/api/wo-pedidos?filters[$or][0][numero_pedido][$eq]=${orderId}&filters[$or][1][wooId][$eq]=${orderId}`
        )
        const strapiPedidos = strapiResponse.data || (Array.isArray(strapiResponse) ? strapiResponse : [])
        const strapiPedido = Array.isArray(strapiPedidos) ? strapiPedidos[0] : strapiPedidos
        
        if (strapiPedido) {
          const documentId = strapiPedido.documentId || strapiPedido.id
          await strapiClient.put(`/api/wo-pedidos/${documentId}`, {
            data: {
              shipit_id: String(shipment.id),
              shipit_tracking: shipment.tracking_number || null,
            },
          })
          console.log('[API Shipit] Envío guardado en Strapi:', documentId)
        }
      } catch (strapiError: any) {
        console.error('[API Shipit] Error al actualizar pedido en Strapi:', strapiError)
        // Continuar aunque falle la actualización en Strapi
      }
    } else {
      // Actualizar en WooCommerce
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

      await wooCommerceClient.put(`orders/${orderId}`, {
        meta_data: updatedMetaData,
      })
    }

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
