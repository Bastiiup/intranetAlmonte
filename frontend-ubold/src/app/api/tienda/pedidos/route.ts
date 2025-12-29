import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient, { createWooCommerceClient } from '@/lib/woocommerce/client'
import { logActivity, createLogDescription } from '@/lib/logging'

export const dynamic = 'force-dynamic'

// Función helper para obtener el cliente de WooCommerce según la plataforma
function getWooCommerceClientForPlatform(platform: string) {
  if (platform === 'woo_moraleja') {
    return createWooCommerceClient('woo_moraleja')
  } else if (platform === 'woo_escolar') {
    return createWooCommerceClient('woo_escolar')
  }
  // Por defecto usar escolar
  return createWooCommerceClient('woo_escolar')
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

// Función helper para mapear estado de español (frontend) a inglés (Strapi/WooCommerce)
// Esta función SIEMPRE debe devolver un valor en inglés válido para Strapi
function mapWooStatus(strapiStatus: string): string {
  if (!strapiStatus) {
    console.warn('[mapWooStatus] Estado vacío, usando pending por defecto')
    return 'pending'
  }
  
  const statusLower = String(strapiStatus).toLowerCase().trim()
  
  // Primero verificar si ya es un estado válido en inglés (para Strapi)
  const estadosValidosStrapi = ['auto-draft', 'pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'checkout-draft']
  if (estadosValidosStrapi.includes(statusLower)) {
    console.log('[mapWooStatus] ✅ Estado ya está en inglés válido:', statusLower)
    return statusLower
  }
  
  // Si no es válido en inglés, mapear desde español
  const mapping: Record<string, string> = {
    // Estados en español (del frontend o de Strapi si están mal guardados)
    'pendiente': 'pending',
    'procesando': 'processing',
    'en_espera': 'on-hold',
    'en espera': 'on-hold', // Variante con espacio
    'completado': 'completed',
    'cancelado': 'cancelled',
    'reembolsado': 'refunded',
    'fallido': 'failed',
    // Variantes adicionales
    'onhold': 'on-hold', // Variante sin guión
  }
  
  const mapeado = mapping[statusLower]
  if (!mapeado) {
    console.error('[mapWooStatus] ❌ Estado no reconocido:', strapiStatus, '(normalizado:', statusLower, ')', 'usando pending por defecto')
    return 'pending'
  }
  
  console.log('[mapWooStatus] ✅ Mapeo:', strapiStatus, '->', mapeado)
  return mapeado
}

// Función helper para normalizar origen a valores válidos de Strapi
function normalizeOrigen(origen: string | null | undefined): string | null {
  if (!origen) return null
  
  const origenLower = String(origen).toLowerCase().trim()
  const valoresValidos = ['web', 'checkout', 'rest-api', 'admin', 'mobile', 'directo', 'otro']
  
  // Si ya es válido, devolverlo
  if (valoresValidos.includes(origenLower)) {
    return origenLower
  }
  
  // Mapear variantes comunes
  const mapping: Record<string, string> = {
    'restapi': 'rest-api',
    'rest api': 'rest-api',
    'directo': 'directo',
    'web': 'web',
    'checkout': 'checkout',
    'admin': 'admin',
    'mobile': 'mobile',
    'otro': 'otro',
    'woocommerce': 'web', // WooCommerce orders often come as 'woocommerce'
  }
  
  return mapping[origenLower] || 'web' // Por defecto 'web' si no se reconoce
}

// Función helper para normalizar metodo_pago a valores válidos de Strapi
function normalizeMetodoPago(metodoPago: string | null | undefined): string | null {
  if (!metodoPago) return null
  
  const metodoLower = String(metodoPago).toLowerCase().trim()
  const valoresValidos = ['bacs', 'cheque', 'cod', 'paypal', 'stripe', 'transferencia', 'otro']
  
  // Si ya es válido, devolverlo
  if (valoresValidos.includes(metodoLower)) {
    return metodoLower
  }
  
  // Mapear variantes comunes
  const mapping: Record<string, string> = {
    'tarjeta': 'stripe', // tarjeta → stripe (más común)
    'tarjeta de crédito': 'stripe',
    'tarjeta de debito': 'stripe',
    'credit card': 'stripe',
    'debit card': 'stripe',
    'card': 'stripe',
    'transferencia bancaria': 'transferencia',
    'transfer': 'transferencia',
    'bank transfer': 'transferencia',
    'bacs': 'bacs',
    'cheque': 'cheque',
    'check': 'cheque',
    'cod': 'cod',
    'cash on delivery': 'cod',
    'contra entrega': 'cod',
    'paypal': 'paypal',
    'stripe': 'stripe',
    'otro': 'otro',
    'other': 'otro',
  }
  
  return mapping[metodoLower] || 'bacs' // Por defecto 'bacs' si no se reconoce (consistente con PUT)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeHidden = searchParams.get('includeHidden') === 'true'
    
    // Si includeHidden es true, usar publicationState=preview para incluir drafts (ocultos)
    // Si es false, solo obtener pedidos publicados
    const publicationState = includeHidden ? 'preview' : 'live'
    
    console.log('[API /tienda/pedidos GET] Obteniendo pedidos', { includeHidden, publicationState })
    
    // Obtener TODOS los pedidos de ambas plataformas (woo_moraleja y woo_escolar)
    // Optimizar: usar populate selectivo en lugar de populate=*
    // Intentar primero con publicationState, si falla, intentar sin él
    let response: any
    try {
      response = await strapiClient.get<any>(
        `/api/wo-pedidos?populate[cliente][fields][0]=nombre&populate[items][fields][0]=nombre&populate[items][fields][1]=cantidad&populate[items][fields][2]=precio_unitario&pagination[pageSize]=5000&publicationState=${publicationState}`
      )
    } catch (pubStateError: any) {
      // Si falla con publicationState, intentar sin él
      if (pubStateError.status === 400 || pubStateError.message?.includes('400')) {
        console.warn('[API /tienda/pedidos GET] ⚠️ Error con publicationState, intentando sin él:', pubStateError.message)
        response = await strapiClient.get<any>(
          `/api/wo-pedidos?populate[cliente][fields][0]=nombre&populate[items][fields][0]=nombre&populate[items][fields][1]=cantidad&populate[items][fields][2]=precio_unitario&pagination[pageSize]=5000`
        )
      } else {
        throw pubStateError
      }
    }
    
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
    
    // Contar pedidos por plataforma para logging
    const porPlataforma = items.reduce((acc: any, item: any) => {
      const attrs = item?.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : item
      const platform = data?.originPlatform || data?.externalIds?.originPlatform || 'desconocida'
      acc[platform] = (acc[platform] || 0) + 1
      return acc
    }, {})
    
    console.log('[API GET pedidos] ✅ Items obtenidos:', items.length, 'Por plataforma:', porPlataforma)
    
    // Registrar log de visualización (asíncrono, no bloquea)
    // IMPORTANTE: No esperar ni bloquear la respuesta por el logging
    try {
      logActivity(request, {
        accion: 'ver',
        entidad: 'pedidos',
        descripcion: createLogDescription('ver', 'pedidos', null, `${items.length} pedidos`),
        metadata: { cantidad: items.length, porPlataforma },
      }).catch((err) => {
        // Solo loggear errores de logging, no afectar la respuesta
        console.warn('[API GET pedidos] ⚠️ Error al registrar log (ignorado):', err.message)
      })
    } catch (logError: any) {
      // Si hay error síncrono en logActivity, ignorarlo
      console.warn('[API GET pedidos] ⚠️ Error síncrono al registrar log (ignorado):', logError.message)
    }
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET pedidos] ❌ Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
      stack: error.stack?.substring(0, 500)
    })
    
    // Si es un error 400 de Strapi, devolver un error 400 también
    if (error.status === 400 || error.message?.includes('400')) {
      return NextResponse.json({
        success: false,
        error: `Error al obtener pedidos: ${error.message || 'Bad Request'}`,
        data: []
      }, { status: 400 })
    }
    
    // Para otros errores, devolver 200 con warning (comportamiento anterior)
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar los pedidos: ${error.message}`
    })
  }
}

// Función para generar número de pedido automático
function generateOrderNumber(): string {
  // Formato: PED-YYYYMMDD-HHMMSS-TIMESTAMP
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '') // HHMMSS
  const timestamp = Date.now().toString().slice(-6) // Últimos 6 dígitos del timestamp
  return `PED-${dateStr}-${timeStr}-${timestamp}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Pedidos POST] 📝 Creando pedido:', body)

    // Detectar si viene del POS (formato WooCommerce directo)
    const isPosRequest = body.line_items && !body.data
    
    // Si viene del POS, forzar originPlatform a 'woo_escolar'
    let originPlatform: string
    if (isPosRequest) {
      originPlatform = 'woo_escolar'
      console.log('[API Pedidos POST] 🏪 Detectado pedido desde POS, usando originPlatform: woo_escolar')
    } else {
      // Validar originPlatform para otros casos
      const validPlatforms = ['woo_moraleja', 'woo_escolar', 'otros']
      originPlatform = body.data?.originPlatform || body.data?.origin_platform || 'woo_moraleja'
      if (!validPlatforms.includes(originPlatform)) {
        return NextResponse.json({
          success: false,
          error: `originPlatform debe ser uno de: ${validPlatforms.join(', ')}`
        }, { status: 400 })
      }
    }

    // Normalizar datos según el formato recibido
    let normalizedData: any
    if (isPosRequest) {
      // Convertir formato POS (WooCommerce) a formato Strapi
      normalizedData = {
        numero_pedido: null, // Se generará automáticamente
        fecha_pedido: body.date_created || new Date().toISOString(),
        estado: body.status || 'completed',
        total: body.total ? parseFloat(String(body.total)) : null,
        subtotal: body.subtotal ? parseFloat(String(body.subtotal)) : null,
        impuestos: body.total_tax ? parseFloat(String(body.total_tax)) : null,
        envio: body.shipping_total ? parseFloat(String(body.shipping_total)) : null,
        descuento: body.discount_total ? parseFloat(String(body.discount_total)) : null,
        moneda: body.currency || 'CLP',
        origen: normalizeOrigen(body.created_via || 'directo'),
        cliente: body.customer_id || null,
        items: (body.line_items || []).map((item: any) => ({
          producto_id: item.product_id,
          cantidad: item.quantity || 1,
          nombre: item.name || '',
          precio_unitario: item.price ? parseFloat(String(item.price)) : 0,
          sku: item.sku || '',
        })),
        billing: body.billing || null,
        shipping: body.shipping || null,
        metodo_pago: normalizeMetodoPago(body.payment_method),
        metodo_pago_titulo: body.payment_method_title || null,
        nota_cliente: body.customer_note || null,
        originPlatform: originPlatform,
      }
    } else {
      // Formato Strapi normal
      normalizedData = {
        numero_pedido: body.data?.numero_pedido || null,
        fecha_pedido: body.data?.fecha_pedido || new Date().toISOString(),
        estado: body.data?.estado || 'pending',
        total: body.data?.total ? parseFloat(String(body.data.total)) : null,
        subtotal: body.data?.subtotal ? parseFloat(String(body.data.subtotal)) : null,
        impuestos: body.data?.impuestos ? parseFloat(String(body.data.impuestos)) : null,
        envio: body.data?.envio ? parseFloat(String(body.data.envio)) : null,
        descuento: body.data?.descuento ? parseFloat(String(body.data.descuento)) : null,
        moneda: body.data?.moneda || 'CLP',
        origen: normalizeOrigen(body.data?.origen),
        cliente: body.data?.cliente || null,
        items: body.data?.items || [],
        billing: body.data?.billing || null,
        shipping: body.data?.shipping || null,
        metodo_pago: normalizeMetodoPago(body.data?.metodo_pago),
        metodo_pago_titulo: body.data?.metodo_pago_titulo || null,
        nota_cliente: body.data?.nota_cliente || null,
        originPlatform: originPlatform,
      }
    }

    // Generar número de pedido automáticamente si no viene
    let numeroPedido: string
    if (normalizedData.numero_pedido && String(normalizedData.numero_pedido).trim()) {
      numeroPedido = String(normalizedData.numero_pedido).trim()
      console.log('[API Pedidos POST] ✅ Usando número de pedido proporcionado:', numeroPedido)
    } else {
      numeroPedido = generateOrderNumber()
      console.log('[API Pedidos POST] 🔢 Número de pedido generado automáticamente:', numeroPedido)
    }
    
    const pedidoEndpoint = '/api/wo-pedidos'
    console.log('[API Pedidos POST] Usando endpoint Strapi:', pedidoEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    console.log('[API Pedidos POST] 📚 Creando pedido en Strapi primero...')
    
    const pedidoData: any = {
      data: {
        numero_pedido: numeroPedido,
        fecha_pedido: normalizedData.fecha_pedido,
        // Strapi espera valores en inglés, mapear de español a inglés
        estado: normalizedData.estado ? mapWooStatus(normalizedData.estado) : 'pending',
        total: normalizedData.total,
        subtotal: normalizedData.subtotal,
        impuestos: normalizedData.impuestos,
        envio: normalizedData.envio,
        descuento: normalizedData.descuento,
        moneda: normalizedData.moneda,
        origen: normalizedData.origen,
        cliente: normalizedData.cliente,
        items: normalizedData.items,
        billing: normalizedData.billing,
        shipping: normalizedData.shipping,
        metodo_pago: normalizedData.metodo_pago,
        metodo_pago_titulo: normalizedData.metodo_pago_titulo,
        nota_cliente: normalizedData.nota_cliente,
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

    // Registrar log de creación (asíncrono, no bloquea)
    logActivity(request, {
      accion: 'crear',
      entidad: 'pedido',
      entidadId: documentId,
      descripcion: createLogDescription('crear', 'pedido', numeroPedido, `Pedido #${numeroPedido} desde ${originPlatform}`),
      datosNuevos: { numero_pedido: numeroPedido, originPlatform, estado: pedidoData.data.estado },
      metadata: { originPlatform, total: pedidoData.data.total },
    }).catch(() => {}) // Ignorar errores de logging

    // Si originPlatform es "otros", no crear en WooCommerce
    if (originPlatform === 'otros') {
      // Actualizar log con información de que solo se creó en Strapi
      logActivity(request, {
        accion: 'crear',
        entidad: 'pedido',
        entidadId: documentId,
        descripcion: createLogDescription('crear', 'pedido', numeroPedido, `Pedido #${numeroPedido} creado solo en Strapi (origen: otros)`),
        metadata: { soloStrapi: true, originPlatform },
      }).catch(() => {})
      
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
    
    // Mapear items a formato WooCommerce
    // Si viene del POS, ya tiene line_items en formato WooCommerce
    let lineItems: any[]
    if (isPosRequest) {
      // Usar line_items directamente del POS
      lineItems = (body.line_items || [])
        .map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity || 1,
          ...(item.variation_id && { variation_id: item.variation_id }),
        }))
        .filter((item: any) => item.product_id && !isNaN(Number(item.product_id)))
    } else {
      // Mapear items de Strapi a formato WooCommerce
      lineItems = (normalizedData.items || [])
        .map((item: any) => ({
          product_id: item.producto_id || item.libro_id || item.product_id || null,
          quantity: item.cantidad || 1,
          name: item.nombre || '',
          price: item.precio_unitario || 0,
          sku: item.sku || '',
        }))
        .filter((item: any) => item.product_id && !isNaN(Number(item.product_id)))
    }
    
    // Si no hay items válidos y se requiere crear en WooCommerce, advertir
    if (lineItems.length === 0 && normalizedData.items && normalizedData.items.length > 0) {
      console.warn('[API Pedidos POST] ⚠️ No hay items con product_id válido para WooCommerce')
    }

    const wooCommercePedidoData: any = {
      status: mapWooStatus(normalizedData.estado || 'pending'),
      currency: normalizedData.moneda || 'CLP',
      date_created: normalizedData.fecha_pedido || new Date().toISOString(),
      line_items: lineItems,
      billing: normalizedData.billing || {},
      shipping: normalizedData.shipping || {},
      payment_method: normalizedData.metodo_pago || '',
      payment_method_title: normalizedData.metodo_pago_titulo || '',
      customer_note: normalizedData.nota_cliente || '',
      total: String(normalizedData.total || 0),
      subtotal: String(normalizedData.subtotal || 0),
      total_tax: String(normalizedData.impuestos || 0),
      shipping_total: String(normalizedData.envio || 0),
      discount_total: String(normalizedData.descuento || 0),
    }
    
    // Si viene del POS, incluir meta_data si existe
    if (isPosRequest && body.meta_data && Array.isArray(body.meta_data)) {
      wooCommercePedidoData.meta_data = body.meta_data
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

      // Actualizar Strapi con el wooId y rawWooData
      // IMPORTANTE: Según el schema de Strapi, wooId y rawWooData NO son campos directos
      // Deben ir en externalIds. Sin embargo, algunos schemas pueden tenerlos como campos directos.
      // Usar externalIds que es el formato correcto según el PUT
      const updateData: any = {
        data: {
          // Actualizar numero_pedido con el número de WooCommerce si es diferente
          numero_pedido: wooCommercePedido.number?.toString() || numeroPedido,
          // Guardar datos de WooCommerce en externalIds (formato correcto)
          externalIds: {
            wooCommerce: {
              id: wooCommercePedido.id,
              number: wooCommercePedido.number,
              data: wooCommercePedido, // Guardar datos completos aquí
            },
            originPlatform: originPlatform,
          },
          // Si el schema permite wooId directamente, también actualizarlo
          // (esto depende de cómo esté configurado Strapi)
          wooId: wooCommercePedido.id,
        }
      }

      await strapiClient.put<any>(`${pedidoEndpoint}/${documentId}`, updateData)
      console.log('[API Pedidos POST] ✅ Strapi actualizado con datos de WooCommerce')
      
      // Actualizar log con información de WooCommerce
      logActivity(request, {
        accion: 'sincronizar',
        entidad: 'pedido',
        entidadId: documentId,
        descripcion: createLogDescription('sincronizar', 'pedido', numeroPedido, `Pedido #${numeroPedido} sincronizado con WooCommerce ${originPlatform}`),
        metadata: { wooCommerceId: wooCommercePedido.id, originPlatform },
      }).catch(() => {})
    } catch (wooError: any) {
      console.error('[API Pedidos POST] ⚠️ Error al crear pedido en WooCommerce:', wooError.message)
      
      // Si el error es por credenciales no configuradas, permitir crear solo en Strapi
      const esErrorCredenciales = wooError.message?.includes('credentials are not configured') ||
                                   wooError.message?.includes('no están configuradas')
      
      if (esErrorCredenciales) {
        console.warn('[API Pedidos POST] ⚠️ Credenciales de WooCommerce no configuradas, creando pedido solo en Strapi')
        return NextResponse.json({
          success: true,
          data: {
            strapi: strapiPedido.data || strapiPedido,
          },
          message: 'Pedido creado exitosamente en Strapi (WooCommerce no disponible - credenciales no configuradas)',
          warning: `WooCommerce ${originPlatform} no está configurado. El pedido se creó solo en Strapi.`
        })
      }
      
      // Si falla WooCommerce por otro motivo, decidir si eliminar de Strapi o mantenerlo
      // Por defecto, mantener en Strapi y solo advertir (más permisivo)
      const esErrorIdInvalido = wooError.message?.includes('ID no válido') || 
                                 wooError.message?.includes('no válido') ||
                                 wooError.message?.includes('invalid_id') ||
                                 wooError.details?.code === 'woocommerce_rest_shop_order_invalid_id' ||
                                 wooError.status === 404
      
      if (esErrorIdInvalido) {
        // Si es error de ID inválido (producto no existe), mantener en Strapi
        console.warn('[API Pedidos POST] ⚠️ Error en WooCommerce (ID inválido), manteniendo pedido en Strapi')
        return NextResponse.json({
          success: true,
          data: {
            strapi: strapiPedido.data || strapiPedido,
          },
          message: 'Pedido creado en Strapi (WooCommerce falló - producto no válido)',
          warning: `Error al crear en WooCommerce: ${wooError.message}. El pedido se mantiene en Strapi.`
        })
      }
      
      // Para otros errores, eliminar de Strapi para mantener consistencia
      // (solo si es un error crítico que impide la creación)
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
