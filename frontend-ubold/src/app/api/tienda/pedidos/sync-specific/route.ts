import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { createWooCommerceClient } from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para mapear estado de WooCommerce a estado de Strapi
function mapWooStatus(wooStatus: string): string {
  const statusLower = wooStatus.toLowerCase().trim()
  const mapping: Record<string, string> = {
    'pending': 'pending',
    'processing': 'processing',
    'on-hold': 'on-hold',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'refunded': 'refunded',
    'failed': 'failed',
    'auto-draft': 'auto-draft',
    'checkout-draft': 'checkout-draft',
  }
  
  return mapping[statusLower] || 'pending'
}

// Función helper para mapear origen de WooCommerce a Strapi
function mapOrigen(createdVia: string): string {
  const origenLower = String(createdVia || '').toLowerCase().trim()
  const mapping: Record<string, string> = {
    'rest api': 'rest-api',
    'admin': 'admin',
    'checkout': 'checkout',
    'web': 'web',
    'mobile': 'mobile',
    'directo': 'directo',
    'direct': 'directo',
    'unknown': 'otro',
  }
  
  return mapping[origenLower] || 'otro'
}

// Función helper para mapear método de pago
function mapMetodoPago(paymentMethod: string): string {
  const metodoLower = String(paymentMethod || '').toLowerCase().trim()
  const mapping: Record<string, string> = {
    'bacs': 'bacs',
    'cheque': 'cheque',
    'cod': 'cod',
    'paypal': 'paypal',
    'stripe': 'stripe',
    'transferencia': 'transferencia',
    'bank_transfer': 'transferencia',
    'other': 'otro',
  }
  
  return mapping[metodoLower] || 'otro'
}

// Función para buscar un pedido por número en WooCommerce
async function buscarPedidoEnWooCommerce(orderNumber: string, platform: 'woo_moraleja' | 'woo_escolar') {
  const wcClient = createWooCommerceClient(platform)
  
  try {
    // Intentar buscar por número de pedido
    const orders = await wcClient.get<any>('orders', {
      search: orderNumber,
      per_page: 100,
    })
    
    let ordersArray: any[] = []
    if (Array.isArray(orders)) {
      ordersArray = orders
    } else if (orders?.data && Array.isArray(orders.data)) {
      ordersArray = orders.data
    }
    
    // Buscar el pedido que coincida exactamente con el número
    const pedido = ordersArray.find((o: any) => 
      String(o.number) === String(orderNumber) || String(o.id) === String(orderNumber)
    )
    
    return pedido || null
  } catch (error: any) {
    console.error(`[Sync Specific] Error buscando pedido #${orderNumber} en ${platform}:`, error.message)
    return null
  }
}

// Función para sincronizar un pedido específico
async function sincronizarPedidoEspecifico(orderNumber: string, platform: 'woo_moraleja' | 'woo_escolar') {
  console.log(`[Sync Specific] 🔍 Buscando pedido #${orderNumber} en ${platform}...`)
  
  // Buscar en WooCommerce
  const wooOrder = await buscarPedidoEnWooCommerce(orderNumber, platform)
  
  if (!wooOrder) {
    return {
      success: false,
      orderNumber,
      platform,
      error: `Pedido #${orderNumber} no encontrado en WooCommerce ${platform}`,
    }
  }
  
  console.log(`[Sync Specific] ✅ Pedido #${orderNumber} encontrado en WooCommerce:`, {
    id: wooOrder.id,
    number: wooOrder.number,
    status: wooOrder.status,
  })
  
  // Verificar si ya existe en Strapi
  const orderNumberStr = String(wooOrder.number || wooOrder.id)
  const wooId = wooOrder.id
  
  try {
    // Buscar en Strapi por número de pedido y plataforma
    const strapiResponse = await strapiClient.get<any>(
      `/api/wo-pedidos?filters[$or][0][numero_pedido][$eq]=${orderNumberStr}&filters[$or][1][wooId][$eq]=${wooId}&populate=*&publicationState=preview`
    )
    
    let strapiItems: any[] = []
    if (Array.isArray(strapiResponse)) {
      strapiItems = strapiResponse
    } else if (strapiResponse.data && Array.isArray(strapiResponse.data)) {
      strapiItems = strapiResponse.data
    }
    
    // Filtrar por plataforma
    const existingPedido = strapiItems.find((item: any) => {
      const attrs = item?.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : item
      const itemPlatform = data?.originPlatform || data?.externalIds?.originPlatform
      return itemPlatform === platform
    })
    
    // Preparar datos del pedido
    const prepareOrderData = (wooOrder: any, orderNumber: string, wooId: number) => ({
      data: {
        numero_pedido: orderNumber,
        fecha_pedido: wooOrder.date_created || wooOrder.date_created_gmt,
        estado: mapWooStatus(wooOrder.status),
        total: parseFloat(wooOrder.total || 0),
        subtotal: parseFloat(wooOrder.subtotal || 0),
        impuestos: parseFloat(wooOrder.total_tax || 0),
        envio: parseFloat(wooOrder.shipping_total || 0),
        descuento: parseFloat(wooOrder.discount_total || 0),
        moneda: wooOrder.currency || 'CLP',
        origen: mapOrigen(wooOrder.created_via),
        metodo_pago: mapMetodoPago(wooOrder.payment_method),
        metodo_pago_titulo: wooOrder.payment_method_title || null,
        nota_cliente: wooOrder.customer_note || null,
        billing: wooOrder.billing || null,
        shipping: wooOrder.shipping || null,
        items: (wooOrder.line_items || []).map((item: any) => ({
          item_id: item.id,
          producto_id: item.product_id,
          sku: item.sku || '',
          nombre: item.name || '',
          cantidad: item.quantity || 1,
          precio_unitario: parseFloat(item.price || 0),
          total: parseFloat(item.total || 0),
          metadata: item.meta_data || null,
        })),
        originPlatform: platform,
        wooId: wooId,
        rawWooData: wooOrder,
        externalIds: {
          wooCommerce: {
            id: wooId,
            number: orderNumber,
          },
          originPlatform: platform,
        },
      },
    })
    
    if (existingPedido) {
      // Actualizar pedido existente
      const attrs = existingPedido?.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : existingPedido
      const documentId = existingPedido.documentId || existingPedido.id
      
      const updateData = prepareOrderData(wooOrder, orderNumberStr, wooId)
      await strapiClient.put<any>(`/api/wo-pedidos/${documentId}`, updateData)
      
      console.log(`[Sync Specific] ✅ Pedido #${orderNumber} actualizado en Strapi`)
      
      return {
        success: true,
        orderNumber,
        platform,
        action: 'updated',
        documentId,
      }
    } else {
      // Crear nuevo pedido
      const createData = prepareOrderData(wooOrder, orderNumberStr, wooId)
      const response = await strapiClient.post<any>('/api/wo-pedidos', createData)
      const documentId = response.data?.documentId || response.documentId
      
      console.log(`[Sync Specific] ✅ Pedido #${orderNumber} creado en Strapi`)
      
      return {
        success: true,
        orderNumber,
        platform,
        action: 'created',
        documentId,
      }
    }
  } catch (error: any) {
    console.error(`[Sync Specific] ❌ Error sincronizando pedido #${orderNumber}:`, error.message)
    return {
      success: false,
      orderNumber,
      platform,
      error: error.message || 'Error desconocido',
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const orderNumbers = body.orderNumbers || []
    const platforms = body.platforms || ['woo_moraleja', 'woo_escolar']
    
    if (!Array.isArray(orderNumbers) || orderNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'orderNumbers debe ser un array con al menos un número de pedido',
      }, { status: 400 })
    }
    
    console.log('[Sync Specific] 🚀 Iniciando sincronización de pedidos específicos:', orderNumbers)
    
    const results = []
    
    // Intentar sincronizar cada pedido en ambas plataformas
    for (const orderNumber of orderNumbers) {
      for (const platform of platforms) {
        if (platform === 'woo_moraleja' || platform === 'woo_escolar') {
          const result = await sincronizarPedidoEspecifico(String(orderNumber), platform)
          results.push(result)
          
          // Si encontramos el pedido en una plataforma, no buscar en la otra
          if (result.success) {
            break
          }
        }
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length
    
    return NextResponse.json({
      success: true,
      message: `Sincronización completada: ${successCount} exitosos, ${errorCount} con errores`,
      results,
      summary: {
        total: orderNumbers.length,
        success: successCount,
        errors: errorCount,
      },
    })
  } catch (error: any) {
    console.error('[Sync Specific] ❌ Error:', error.message)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al sincronizar pedidos específicos',
    }, { status: 500 })
  }
}

