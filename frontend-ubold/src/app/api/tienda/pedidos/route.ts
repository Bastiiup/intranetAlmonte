/**
 * API Route para obtener y crear pedidos sincronizados entre Strapi y WooCommerce
 * Esto evita exponer el token de Strapi en el cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import type { WooCommerceOrder } from '@/lib/woocommerce/types'
import { mapWooCommerceOrderToShipit, validateOrderForShipment, getShipitIdFromOrder } from '@/lib/shipit/utils'
import { getCommuneId } from '@/lib/shipit/communes'
import shipitClient from '@/lib/shipit/client'
import type { ShipitShipmentResponse } from '@/lib/shipit/types'

export const dynamic = 'force-dynamic'

// Cache del endpoint encontrado (optimización: evita búsquedas repetidas)
let cachedPedidoEndpoint: string | null = null

// Función helper para encontrar el endpoint correcto de pedidos en Strapi
async function findPedidoEndpoint(): Promise<string> {
  // Si ya tenemos el endpoint cacheado, usarlo directamente
  if (cachedPedidoEndpoint) {
    return cachedPedidoEndpoint
  }

  const endpoints = ['/api/pedidos', '/api/wo-pedidos', '/api/ecommerce-pedidos']
  
  for (const endpoint of endpoints) {
    try {
      // Verificar rápidamente si el endpoint existe
      await strapiClient.get<any>(`${endpoint}?pagination[pageSize]=1`)
      // Cachear el endpoint encontrado
      cachedPedidoEndpoint = endpoint
      return endpoint
    } catch {
      continue
    }
  }
  
  // Si ninguno funciona, usar el primero por defecto
  cachedPedidoEndpoint = endpoints[0]
  return endpoints[0]
}

export async function GET() {
  try {
    // Usar función helper que cachea el endpoint encontrado
    const endpointUsed = await findPedidoEndpoint()
    const response = await strapiClient.get<any>(`${endpointUsed}?populate=*&pagination[pageSize]=100`)
    
    // Log detallado para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('[API /tienda/pedidos] Respuesta de Strapi:', {
        endpoint: endpointUsed,
        cached: cachedPedidoEndpoint === endpointUsed,
        hasData: !!response.data,
        isArray: Array.isArray(response.data),
        count: Array.isArray(response.data) ? response.data.length : response.data ? 1 : 0,
      })
    }
    
    return NextResponse.json({
      success: true,
      data: response.data || [],
      meta: response.meta || {},
      endpoint: endpointUsed,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /tienda/pedidos] Error al obtener pedidos:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al obtener pedidos',
        data: [],
        meta: {},
      },
      { status: error.status || 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log solo en desarrollo para mejor rendimiento en producción
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Pedidos POST] 📝 Creando pedido:', {
        hasLineItems: !!body.line_items,
        lineItemsCount: body.line_items?.length || 0,
        customerId: body.customer_id,
        paymentMethod: body.payment_method
      })
    }

    // Validar que el pedido tenga line_items
    if (!body.line_items || !Array.isArray(body.line_items) || body.line_items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'El pedido debe tener al menos un producto'
      }, { status: 400 })
    }

    // Preparar datos del pedido para WooCommerce
    const wooCommerceOrderData: any = {
      payment_method: body.payment_method || 'pos',
      payment_method_title: body.payment_method_title || 'Punto de Venta',
      set_paid: body.set_paid !== undefined ? body.set_paid : true,
      status: body.status || 'completed',
      customer_id: body.customer_id || 0,
      billing: body.billing || {
        first_name: 'Cliente',
        last_name: 'POS',
        email: 'pos@escolar.cl',
        phone: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'CL',
      },
      shipping: body.shipping || {
        first_name: '',
        last_name: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'CL',
      },
      line_items: body.line_items.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        ...(item.variation_id && { variation_id: item.variation_id }),
      })),
      ...(body.customer_note && { customer_note: body.customer_note }),
      ...(body.meta_data && Array.isArray(body.meta_data) && { meta_data: body.meta_data }),
    }

    // Crear pedido SOLO en WooCommerce (optimizado para velocidad)
    // Strapi se sincronizará automáticamente vía webhook desde WooCommerce
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Pedidos POST] 🛒 Creando pedido en WooCommerce (Strapi se sincronizará vía webhook)...')
    }
    
    const wooCommerceOrder = await wooCommerceClient.post<WooCommerceOrder>('orders', wooCommerceOrderData)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Pedidos POST] ✅ Pedido creado en WooCommerce:', {
        id: wooCommerceOrder.id,
        status: wooCommerceOrder.status,
        total: wooCommerceOrder.total,
        number: wooCommerceOrder.number
      })
    }

    // Intentar crear envío en Shipit solo si es envío (no retiro en tienda)
    let shipitShipment = null
    let shipitError = null

    // Verificar tipo de entrega desde meta_data
    const deliveryTypeMeta = wooCommerceOrder.meta_data?.find(
      (meta) => meta.key === '_delivery_type'
    )
    const deliveryType = deliveryTypeMeta 
      ? (typeof deliveryTypeMeta.value === 'string' ? deliveryTypeMeta.value : String(deliveryTypeMeta.value))
      : 'pickup'

    // Solo crear envío si es tipo "shipping" (envío a domicilio)
    if (deliveryType === 'shipping') {
      try {
        // Validar que el pedido tenga información de envío
        const validation = validateOrderForShipment(wooCommerceOrder)
      
      if (validation.valid) {
        // Verificar si ya tiene un envío de Shipit
        const existingShipitId = getShipitIdFromOrder(wooCommerceOrder)

        if (!existingShipitId) {
          // Verificar cobertura antes de crear envío (opcional, puede ser lento)
          // Comentado por defecto para no ralentizar la creación del pedido
          // Se puede activar si es necesario:
          /*
          try {
            const communeId = getCommuneId(wooCommerceOrder.shipping.city)
            if (communeId) {
              const coverageResponse = await shipitClient.get('coverage', { commune_id: communeId })
              if (!coverageResponse.available) {
                console.warn('[API Pedidos POST] ⚠️  No hay cobertura de Shipit para esta comuna')
                // Continuar de todas formas, pero registrar la advertencia
              }
            }
          } catch (coverageError) {
            // No fallar si la verificación de cobertura falla
            console.warn('[API Pedidos POST] No se pudo verificar cobertura:', coverageError)
          }
          */

          // Mapear pedido a formato Shipit
          const shipmentData = mapWooCommerceOrderToShipit(wooCommerceOrder, {
            // communeId se obtendrá automáticamente desde la ciudad
            courier: process.env.SHIPIT_DEFAULT_COURIER || 'shippify', // Courier desde env o por defecto
            kind: 0, // Envío normal
            testMode: process.env.NODE_ENV === 'development', // Modo prueba en desarrollo
          })

          // Crear envío en Shipit
          if (process.env.NODE_ENV === 'development') {
            console.log('[API Pedidos POST] 📦 Creando envío en Shipit...')
          }

          shipitShipment = await shipitClient.post<ShipitShipmentResponse>(
            'shipments',
            shipmentData
          )

          // Guardar ID de Shipit en el pedido de WooCommerce
          const currentMetaData = wooCommerceOrder.meta_data || []
          const updatedMetaData = [
            ...currentMetaData.filter(
              (meta) => meta.key !== '_shipit_id' && meta.key !== 'shipit_id'
            ),
            {
              key: '_shipit_id',
              value: String(shipitShipment.id),
            },
          ]

          if (shipitShipment.tracking_number) {
            updatedMetaData.push({
              key: '_shipit_tracking',
              value: shipitShipment.tracking_number,
            })
          }

          // Actualizar pedido en WooCommerce con el ID de Shipit
          await wooCommerceClient.put(`orders/${wooCommerceOrder.id}`, {
            meta_data: updatedMetaData,
          })

          if (process.env.NODE_ENV === 'development') {
            console.log('[API Pedidos POST] ✅ Envío creado en Shipit:', {
              shipitId: shipitShipment.id,
              tracking: shipitShipment.tracking_number,
            })
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[API Pedidos POST] ⚠️  Pedido ya tiene envío de Shipit:', existingShipitId)
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('[API Pedidos POST] ⚠️  Pedido no tiene información suficiente para crear envío:', validation.errors)
        }
      }
      } catch (error: any) {
        // No fallar el pedido si Shipit falla, solo loguear el error
        shipitError = error.message || 'Error al crear envío en Shipit'
        console.error('[API Pedidos POST] ❌ Error al crear envío en Shipit (no crítico):', {
          orderId: wooCommerceOrder.id,
          error: shipitError,
          details: error.details,
        })
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[API Pedidos POST] ℹ️  Pedido es retiro en tienda, no se creará envío en Shipit')
      }
    }

    // Responder inmediatamente - Strapi se sincronizará vía webhook de WooCommerce
    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceOrder,
        shipit: shipitShipment,
      },
      message: 'Pedido creado exitosamente en WooCommerce. Sincronización con Strapi se procesará automáticamente.' + 
        (shipitShipment ? ' Envío creado en Shipit.' : shipitError ? ' No se pudo crear envío en Shipit (no crítico).' : ''),
      ...(shipitError && { shipitWarning: shipitError }),
    }, { status: 200 })

  } catch (error: any) {
    // Siempre loguear errores (son importantes para debugging)
    console.error('[API Pedidos POST] ❌ ERROR al crear pedido:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear el pedido',
      details: error.details
    }, { status: error.status || 500 })
  }
}

