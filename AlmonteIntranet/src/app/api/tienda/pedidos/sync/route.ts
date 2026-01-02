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

// Función para sincronizar pedidos de una plataforma
async function syncOrdersFromPlatform(platform: 'woo_moraleja' | 'woo_escolar') {
  const wcClient = createWooCommerceClient(platform)
  const results = {
    platform,
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    console.log(`[Sync ${platform}] 🔄 Obteniendo pedidos de WooCommerce...`)
    
    // Obtener todos los pedidos de WooCommerce con paginación
    let allOrders: any[] = []
    let page = 1
    const perPage = 100
    let hasMore = true

    while (hasMore) {
      const wooOrdersResponse = await wcClient.get<any>('orders', {
        per_page: perPage,
        page: page,
        orderby: 'date',
        order: 'desc',
      })

      // Manejar diferentes formatos de respuesta de WooCommerce
      let orders: any[] = []
      if (Array.isArray(wooOrdersResponse)) {
        orders = wooOrdersResponse
      } else if (wooOrdersResponse && typeof wooOrdersResponse === 'object' && 'data' in wooOrdersResponse) {
        orders = Array.isArray(wooOrdersResponse.data) ? wooOrdersResponse.data : []
      }
      
      if (orders.length === 0) {
        hasMore = false
      } else {
        allOrders = allOrders.concat(orders)
        // Si obtenemos menos de perPage, significa que no hay más páginas
        if (orders.length < perPage) {
          hasMore = false
        } else {
          page++
        }
      }
    }

    results.total = allOrders.length
    console.log(`[Sync ${platform}] ✅ Obtenidos ${allOrders.length} pedidos de WooCommerce`)

    // Obtener solo los campos necesarios de Strapi (sin populate completo para optimizar)
    const strapiResponse = await strapiClient.get<any>(
      `/api/pedidos?fields[0]=numero_pedido&fields[1]=woocommerce_id&fields[2]=originPlatform&fields[3]=externalIds&pagination[pageSize]=5000&publicationState=preview`
    )
    let strapiItems: any[] = []
    if (Array.isArray(strapiResponse)) {
      strapiItems = strapiResponse
    } else if (strapiResponse.data && Array.isArray(strapiResponse.data)) {
      strapiItems = strapiResponse.data
    }

    // Crear un mapa de pedidos existentes por número de pedido y wooId
    const existingOrders = new Map<string, any>()
    strapiItems.forEach((item: any) => {
      const attrs = item?.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : item
      const numeroPedido = data?.numero_pedido || data?.numeroPedido
      const woocommerceId = data?.woocommerce_id || data?.woocommerceId
      const itemPlatform = data?.originPlatform || data?.externalIds?.originPlatform
      
      // Solo considerar pedidos de esta plataforma
      if (itemPlatform === platform) {
        if (numeroPedido) {
          existingOrders.set(`numero_${numeroPedido}`, item)
        }
        if (woocommerceId) {
          existingOrders.set(`woo_${woocommerceId}`, item)
        }
      }
    })

    console.log(`[Sync ${platform}] 📊 Pedidos existentes en Strapi para ${platform}: ${existingOrders.size / 2}`)

    // Función helper para preparar datos del pedido
    const prepareOrderData = (wooOrder: any, orderNumber: string, woocommerceId: number) => ({
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
        woocommerce_id: woocommerceId,
        rawWooData: wooOrder,
        externalIds: {
          wooCommerce: {
            id: woocommerceId,
            number: orderNumber,
          },
          originPlatform: platform,
        },
      },
    })

    // Procesar pedidos en lotes para mejor rendimiento
    const batchSize = 10
    for (let i = 0; i < allOrders.length; i += batchSize) {
      const batch = allOrders.slice(i, i + batchSize)
      const batchPromises = batch.map(async (wooOrder) => {
        try {
          const orderNumber = String(wooOrder.number || wooOrder.id)
          const woocommerceId = wooOrder.id

          // Verificar si el pedido ya existe
          const existingByNumber = existingOrders.get(`numero_${orderNumber}`)
          const existingByWooCommerceId = existingOrders.get(`woo_${woocommerceId}`)
          const existing = existingByNumber || existingByWooCommerceId

          if (existing) {
            // Actualizar pedido existente
            const attrs = existing?.attributes || {}
            const data = (attrs && Object.keys(attrs).length > 0) ? attrs : existing
            const documentId = existing.documentId || existing.id

            const updateData = prepareOrderData(wooOrder, orderNumber, woocommerceId)
            await strapiClient.put<any>(`/api/pedidos/${documentId}`, updateData)
            results.updated++
            return { success: true, orderNumber, action: 'updated' }
          } else {
            // Crear nuevo pedido
            const createData = prepareOrderData(wooOrder, orderNumber, woocommerceId)
            await strapiClient.post<any>('/api/pedidos', createData)
            results.created++
            return { success: true, orderNumber, action: 'created' }
          }
        } catch (error: any) {
          const errorMsg = `Error procesando pedido #${wooOrder.number || wooOrder.id}: ${error.message}`
          results.errors.push(errorMsg)
          results.skipped++
          return { success: false, orderNumber: wooOrder.number || wooOrder.id, error: errorMsg }
        }
      })

      // Ejecutar lote en paralelo
      const batchResults = await Promise.allSettled(batchPromises)
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.success) {
          // Log solo cada 10 pedidos para no saturar
          if (idx === 0) {
            console.log(`[Sync ${platform}] 📦 Procesando lote ${Math.floor(i / batchSize) + 1}...`)
          }
        }
      })
    }

    console.log(`[Sync ${platform}] ✅ Sincronización completada:`, results)
    return results
  } catch (error: any) {
    console.error(`[Sync ${platform}] ❌ Error general:`, error.message)
    results.errors.push(`Error general: ${error.message}`)
    return results
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const platforms = body.platforms || ['woo_moraleja', 'woo_escolar']
    
    console.log('[Sync Pedidos] 🚀 Iniciando sincronización desde WooCommerce...')

    const results = []
    
    for (const platform of platforms) {
      if (platform === 'woo_moraleja' || platform === 'woo_escolar') {
        const result = await syncOrdersFromPlatform(platform)
        results.push(result)
      }
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0)
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0)
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    return NextResponse.json({
      success: true,
      message: `Sincronización completada: ${totalCreated} creados, ${totalUpdated} actualizados, ${totalSkipped} omitidos`,
      results,
      summary: {
        totalCreated,
        totalUpdated,
        totalSkipped,
        totalErrors,
      },
    })
  } catch (error: any) {
    console.error('[Sync Pedidos] ❌ Error:', error.message)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al sincronizar pedidos',
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Sincronización automática al hacer GET (para facilitar el uso)
    const platforms: ('woo_moraleja' | 'woo_escolar')[] = ['woo_moraleja', 'woo_escolar']
    
    console.log('[Sync Pedidos GET] 🚀 Iniciando sincronización desde WooCommerce...')

    const results = []
    
    for (const platform of platforms) {
      const result = await syncOrdersFromPlatform(platform)
      results.push(result)
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0)
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0)
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    return NextResponse.json({
      success: true,
      message: `Sincronización completada: ${totalCreated} creados, ${totalUpdated} actualizados, ${totalSkipped} omitidos`,
      results,
      summary: {
        totalCreated,
        totalUpdated,
        totalSkipped,
        totalErrors,
      },
    })
  } catch (error: any) {
    console.error('[Sync Pedidos GET] ❌ Error:', error.message)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al sincronizar pedidos',
    }, { status: 500 })
  }
}

