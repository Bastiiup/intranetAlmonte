import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para obtener el cliente de WooCommerce según la plataforma
function getWooCommerceClientForPlatform(platform: string) {
  // Por ahora usamos el cliente por defecto
  // TODO: Implementar lógica para seleccionar cliente según platform (woo_moraleja, woo_escolar)
  // Si hay variables de entorno separadas, crear clientes diferentes aquí
  return wooCommerceClient
}

// Función helper para mapear estado de WooCommerce a estado de Strapi
function mapEstado(wooStatus: string): string {
  const mapping: Record<string, string> = {
    'pending': 'pendiente',
    'processing': 'procesando',
    'on-hold': 'en_espera',
    'completed': 'completado',
    'cancelled': 'cancelado',
    'refunded': 'reembolsado',
    'failed': 'fallido',
  }
  
  return mapping[wooStatus.toLowerCase()] || 'pendiente'
}

// Función helper para mapear estado de Strapi a estado de WooCommerce
function mapWooStatus(strapiStatus: string): string {
  const statusLower = strapiStatus.toLowerCase().trim()
  const mapping: Record<string, string> = {
    'pendiente': 'pending',
    'procesando': 'processing',
    'en_espera': 'on-hold',
    'completado': 'completed',
    'cancelado': 'cancelled',
    'reembolsado': 'refunded',
    'fallido': 'failed',
    // También aceptar estados en inglés directamente (por si acaso)
    'pending': 'pending',
    'processing': 'processing',
    'on-hold': 'on-hold',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'refunded': 'refunded',
    'failed': 'failed',
  }
  
  const mapeado = mapping[statusLower]
  if (!mapeado) {
    console.warn('[mapWooStatus] Estado no reconocido:', strapiStatus, 'usando pending por defecto')
    return 'pending'
  }
  
  return mapeado
}

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/wo-pedidos?populate=*&pagination[pageSize]=1000')
    
    let items: any[] = []
    if (Array.isArray(response)) {
      items = response
    } else if (response.data && Array.isArray(response.data)) {
      items = response.data
    } else if (response.data) {
      items = [response.data]
    } else {
      items = [response]
    }
    
    console.log('[API GET pedidos] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET pedidos] ❌ Error:', error.message)
    
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar los pedidos: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Pedidos POST] 📝 Creando pedido:', body)

    // Validar campos obligatorios
    if (!body.data?.numero_pedido) {
      return NextResponse.json({
        success: false,
        error: 'El número de pedido es obligatorio'
      }, { status: 400 })
    }

    // Validar originPlatform
    const validPlatforms = ['woo_moraleja', 'woo_escolar', 'otros']
    const originPlatform = body.data.originPlatform || body.data.origin_platform || 'woo_moraleja'
    if (!validPlatforms.includes(originPlatform)) {
      return NextResponse.json({
        success: false,
        error: `originPlatform debe ser uno de: ${validPlatforms.join(', ')}`
      }, { status: 400 })
    }

    const numeroPedido = body.data.numero_pedido.trim()
    const pedidoEndpoint = '/api/wo-pedidos'
    console.log('[API Pedidos POST] Usando endpoint Strapi:', pedidoEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    console.log('[API Pedidos POST] 📚 Creando pedido en Strapi primero...')
    
    const pedidoData: any = {
      data: {
        numero_pedido: numeroPedido,
        fecha_pedido: body.data.fecha_pedido || new Date().toISOString(),
        // Strapi espera valores en inglés, mapear de español a inglés
        estado: body.data.estado ? mapWooStatus(body.data.estado) : 'pending',
        total: body.data.total ? parseFloat(body.data.total) : null,
        subtotal: body.data.subtotal ? parseFloat(body.data.subtotal) : null,
        impuestos: body.data.impuestos ? parseFloat(body.data.impuestos) : null,
        envio: body.data.envio ? parseFloat(body.data.envio) : null,
        descuento: body.data.descuento ? parseFloat(body.data.descuento) : null,
        moneda: body.data.moneda || 'CLP',
        origen: body.data.origen || 'woocommerce',
        cliente: body.data.cliente || null,
        items: body.data.items || [],
        billing: body.data.billing || null,
        shipping: body.data.shipping || null,
        metodo_pago: body.data.metodo_pago || null,
        metodo_pago_titulo: body.data.metodo_pago_titulo || null,
        nota_cliente: body.data.nota_cliente || null,
        originPlatform: originPlatform,
      }
    }

    const strapiPedido = await strapiClient.post<any>(pedidoEndpoint, pedidoData)
    const documentId = strapiPedido.data?.documentId || strapiPedido.documentId
    
    if (!documentId) {
      throw new Error('No se pudo obtener el documentId de Strapi')
    }
    
    console.log('[API Pedidos POST] ✅ Pedido creado en Strapi:', {
      id: strapiPedido.data?.id || strapiPedido.id,
      documentId: documentId
    })

    // Si originPlatform es "otros", no crear en WooCommerce
    if (originPlatform === 'otros') {
      return NextResponse.json({
        success: true,
        data: {
          strapi: strapiPedido.data || strapiPedido,
        },
        message: 'Pedido creado exitosamente en Strapi'
      })
    }

    // Crear pedido en WooCommerce
    const wcClient = getWooCommerceClientForPlatform(originPlatform)
    console.log('[API Pedidos POST] 🛒 Creando pedido en WooCommerce...')
    
    // Mapear items de Strapi a formato WooCommerce
    const lineItems = (body.data.items || []).map((item: any) => ({
      product_id: item.producto_id || item.libro_id || null,
      quantity: item.cantidad || 1,
      name: item.nombre || '',
      price: item.precio_unitario || 0,
      sku: item.sku || '',
    })).filter((item: any) => item.product_id)

    const wooCommercePedidoData: any = {
      status: mapWooStatus(body.data.estado || 'pendiente'),
      currency: body.data.moneda || 'CLP',
      date_created: body.data.fecha_pedido || new Date().toISOString(),
      line_items: lineItems,
      billing: body.data.billing || {},
      shipping: body.data.shipping || {},
      payment_method: body.data.metodo_pago || '',
      payment_method_title: body.data.metodo_pago_titulo || '',
      customer_note: body.data.nota_cliente || '',
      total: String(body.data.total || 0),
      subtotal: String(body.data.subtotal || 0),
      total_tax: String(body.data.impuestos || 0),
      shipping_total: String(body.data.envio || 0),
      discount_total: String(body.data.descuento || 0),
    }

    // Crear pedido en WooCommerce
    let wooCommercePedido = null
    try {
      const wooResponse = await wcClient.post<any>('orders', wooCommercePedidoData)
      
      wooCommercePedido = wooResponse?.data || wooResponse
      
      console.log('[API Pedidos POST] ✅ Pedido creado en WooCommerce:', {
        id: wooCommercePedido?.id,
        number: wooCommercePedido?.number,
      })

      if (!wooCommercePedido || !wooCommercePedido.id) {
        throw new Error('La respuesta de WooCommerce no contiene un pedido válido')
      }

      // Actualizar Strapi con el wooId y rawWooData (usar camelCase como en el schema)
      const updateData: any = {
        data: {
          wooId: wooCommercePedido.id,
          rawWooData: wooCommercePedido,
          externalIds: {
            wooCommerce: {
              id: wooCommercePedido.id,
              number: wooCommercePedido.number,
            },
            originPlatform: originPlatform,
          }
        }
      }

      await strapiClient.put<any>(`${pedidoEndpoint}/${documentId}`, updateData)
      console.log('[API Pedidos POST] ✅ Strapi actualizado con datos de WooCommerce')
    } catch (wooError: any) {
      console.error('[API Pedidos POST] ⚠️ Error al crear pedido en WooCommerce:', wooError.message)
      
      // Si falla WooCommerce, eliminar de Strapi para mantener consistencia
      try {
        const deleteResponse = await strapiClient.delete<any>(`${pedidoEndpoint}/${documentId}`)
        console.log('[API Pedidos POST] 🗑️ Pedido eliminado de Strapi debido a error en WooCommerce')
      } catch (deleteError: any) {
        // Ignorar errores de eliminación si la respuesta no es JSON válido (puede ser 204 No Content)
        if (deleteError.message && !deleteError.message.includes('JSON')) {
          console.error('[API Pedidos POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
        } else {
          console.log('[API Pedidos POST] 🗑️ Pedido eliminado de Strapi (respuesta no JSON, probablemente exitosa)')
        }
      }
      
      throw new Error(`Error al crear pedido en WooCommerce: ${wooError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommercePedido,
        strapi: strapiPedido.data || strapiPedido,
      },
      message: 'Pedido creado exitosamente en Strapi y WooCommerce'
    })

  } catch (error: any) {
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
