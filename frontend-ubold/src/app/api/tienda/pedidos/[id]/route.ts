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
  
  return mapping[metodoLower] || 'bacs' // Por defecto 'bacs' si no se reconoce
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log('[API /tienda/pedidos/[id] GET] Obteniendo pedido:', {
      id,
      esNumerico: !isNaN(parseInt(id)),
    })
    
    // PASO 1: Intentar con filtro si es numérico
    if (!isNaN(parseInt(id))) {
      try {
        const filteredResponse = await strapiClient.get<any>(
          `/api/wo-pedidos?filters[id][$eq]=${id}&populate=*`
        )
        
        let pedido: any
        if (Array.isArray(filteredResponse)) {
          pedido = filteredResponse[0]
        } else if (filteredResponse.data && Array.isArray(filteredResponse.data)) {
          pedido = filteredResponse.data[0]
        } else if (filteredResponse.data) {
          pedido = filteredResponse.data
        } else {
          pedido = filteredResponse
        }
        
        if (pedido && (pedido.id || pedido.documentId)) {
          console.log('[API /tienda/pedidos/[id] GET] ✅ Pedido encontrado con filtro')
          return NextResponse.json({
            success: true,
            data: pedido
          }, { status: 200 })
        }
      } catch (filterError: any) {
        console.warn('[API /tienda/pedidos/[id] GET] ⚠️ Error al obtener con filtro:', filterError.message)
      }
    }
    
    // PASO 2: Buscar en lista completa
    try {
      const allPedidos = await strapiClient.get<any>(
        `/api/wo-pedidos?populate=*&pagination[pageSize]=1000`
      )
      
      let pedidos: any[] = []
      
      if (Array.isArray(allPedidos)) {
        pedidos = allPedidos
      } else if (Array.isArray(allPedidos.data)) {
        pedidos = allPedidos.data
      } else if (allPedidos.data && Array.isArray(allPedidos.data.data)) {
        pedidos = allPedidos.data.data
      } else if (allPedidos.data && !Array.isArray(allPedidos.data)) {
        pedidos = [allPedidos.data]
      }
      
      const pedidoEncontrado = pedidos.find((p: any) => {
        const pedidoReal = p.attributes && Object.keys(p.attributes).length > 0 ? p.attributes : p
        
        const pId = pedidoReal.id?.toString() || p.id?.toString()
        const pDocId = pedidoReal.documentId?.toString() || p.documentId?.toString()
        const idStr = id.toString()
        const idNum = parseInt(idStr)
        
        return (
          pId === idStr ||
          pDocId === idStr ||
          (!isNaN(idNum) && (pedidoReal.id === idNum || p.id === idNum))
        )
      })
      
      if (pedidoEncontrado) {
        console.log('[API /tienda/pedidos/[id] GET] ✅ Pedido encontrado en lista completa')
        return NextResponse.json({
          success: true,
          data: pedidoEncontrado
        }, { status: 200 })
      }
    } catch (listError: any) {
      console.warn('[API /tienda/pedidos/[id] GET] ⚠️ Error al buscar en lista completa:', listError.message)
    }
    
    // PASO 3: Intentar endpoint directo
    try {
      const response = await strapiClient.get<any>(`/api/wo-pedidos/${id}?populate=*`)
      
      let pedido: any
      if (response.data) {
        pedido = response.data
      } else {
        pedido = response
      }
      
      if (pedido) {
        console.log('[API /tienda/pedidos/[id] GET] ✅ Pedido encontrado con endpoint directo')
        return NextResponse.json({
          success: true,
          data: pedido
        }, { status: 200 })
      }
    } catch (directError: any) {
      console.error('[API /tienda/pedidos/[id] GET] ❌ Error al obtener pedido:', directError.message)
    }
    
    return NextResponse.json({
      success: false,
      error: 'Pedido no encontrado',
    }, { status: 404 })
    
  } catch (error: any) {
    console.error('[API /tienda/pedidos/[id] GET] ❌ Error general:', error.message)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener pedido',
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Pedidos DELETE] 🗑️ Eliminando pedido:', id)

    const pedidoEndpoint = '/api/wo-pedidos'
    
    // Primero obtener el pedido de Strapi para obtener el documentId y wooId
    let documentId: string | null = null
    let wooId: number | null = null
    let originPlatform: string = 'woo_moraleja'
    
    try {
      const pedidoResponse = await strapiClient.get<any>(`${pedidoEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let pedidos: any[] = []
      if (Array.isArray(pedidoResponse)) {
        pedidos = pedidoResponse
      } else if (pedidoResponse.data && Array.isArray(pedidoResponse.data)) {
        pedidos = pedidoResponse.data
      } else if (pedidoResponse.data) {
        pedidos = [pedidoResponse.data]
      }
      const pedidoStrapi = pedidos[0]
      documentId = pedidoStrapi?.documentId || pedidoStrapi?.data?.documentId || id
      // Leer campos usando camelCase como en el schema de Strapi
      const attrs = pedidoStrapi?.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : pedidoStrapi
      wooId = data?.wooId || pedidoStrapi?.wooId || null
      originPlatform = data?.originPlatform || pedidoStrapi?.originPlatform || 'woo_moraleja'
    } catch (error: any) {
      console.warn('[API Pedidos DELETE] ⚠️ No se pudo obtener pedido de Strapi:', error.message)
      documentId = id
    }

    // Eliminar en WooCommerce primero si tenemos el ID (solo si no es "otros")
    let wooCommerceDeleted = false
    if (wooId && originPlatform !== 'otros') {
      try {
        const wcClient = getWooCommerceClientForPlatform(originPlatform)
        console.log('[API Pedidos DELETE] 🛒 Eliminando pedido en WooCommerce:', wooId)
        await wcClient.delete<any>(`orders/${wooId}`, true)
        wooCommerceDeleted = true
        console.log('[API Pedidos DELETE] ✅ Pedido eliminado en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Pedidos DELETE] ⚠️ Error al eliminar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Eliminar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${pedidoEndpoint}/${documentId}` : `${pedidoEndpoint}/${id}`
    console.log('[API Pedidos DELETE] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    let strapiResponse: any = null
    try {
      strapiResponse = await strapiClient.delete<any>(strapiEndpoint)
      console.log('[API Pedidos DELETE] ✅ Pedido eliminado en Strapi')
    } catch (deleteError: any) {
      // Ignorar errores si la respuesta no es JSON válido (puede ser 204 No Content)
      if (deleteError.message && !deleteError.message.includes('JSON') && !deleteError.message.includes('Unexpected end')) {
        throw deleteError
      } else {
        console.log('[API Pedidos DELETE] ✅ Pedido eliminado en Strapi (respuesta no JSON, probablemente exitosa)')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido eliminado exitosamente' + (wooCommerceDeleted ? ' en WooCommerce y Strapi' : ' en Strapi'),
      data: strapiResponse || { deleted: true }
    })

  } catch (error: any) {
    console.error('[API Pedidos DELETE] ❌ ERROR al eliminar pedido:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar el pedido',
      details: error.details
    }, { status: error.status || 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    console.log('[API Pedidos PUT] ✏️ Actualizando pedido:', id, body)

    const pedidoEndpoint = '/api/wo-pedidos'
    
    // Primero obtener el pedido de Strapi para obtener el documentId y wooId
    let cuponStrapi: any
    let documentId: string | null = null
    let wooId: number | null = null
    let originPlatform: string = 'woo_moraleja'
    
    try {
      const pedidoResponse = await strapiClient.get<any>(`${pedidoEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let pedidos: any[] = []
      if (Array.isArray(pedidoResponse)) {
        pedidos = pedidoResponse
      } else if (pedidoResponse.data && Array.isArray(pedidoResponse.data)) {
        pedidos = pedidoResponse.data
      } else if (pedidoResponse.data) {
        pedidos = [pedidoResponse.data]
      }
      cuponStrapi = pedidos[0]
      documentId = cuponStrapi?.documentId || cuponStrapi?.data?.documentId || id
      // Leer campos usando camelCase como en el schema de Strapi
      const attrs = cuponStrapi?.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : cuponStrapi
      wooId = data?.wooId || cuponStrapi?.wooId || null
      originPlatform = body.data.originPlatform || body.data.origin_platform || data?.originPlatform || cuponStrapi?.originPlatform || 'woo_moraleja'
    } catch (error: any) {
      console.warn('[API Pedidos PUT] ⚠️ No se pudo obtener pedido de Strapi:', error.message)
      documentId = id
    }

    // Validar originPlatform
    const validPlatforms = ['woo_moraleja', 'woo_escolar', 'otros']
    const platformToValidate = body.data.originPlatform || body.data.origin_platform
    if (platformToValidate && !validPlatforms.includes(platformToValidate)) {
      return NextResponse.json({
        success: false,
        error: `originPlatform debe ser uno de: ${validPlatforms.join(', ')}`
      }, { status: 400 })
    }

    // Actualizar en WooCommerce primero si tenemos el ID y no es "otros"
    let wooCommercePedido = null
    let wooCommercePedidoData: any = {}
    if (wooId && originPlatform !== 'otros') {
      try {
        const wcClient = getWooCommerceClientForPlatform(originPlatform)
        console.log('[API Pedidos PUT] 🛒 Actualizando pedido en WooCommerce:', wooId)
        
        wooCommercePedidoData = {}
        
        if (body.data.estado !== undefined) {
          const estadoMapeado = mapWooStatus(body.data.estado)
          console.log('[API Pedidos PUT] Mapeando estado:', { 
            original: body.data.estado, 
            mapeado: estadoMapeado 
          })
          wooCommercePedidoData.status = estadoMapeado
        }
        if (body.data.items !== undefined) {
          wooCommercePedidoData.line_items = (body.data.items || []).map((item: any) => ({
            product_id: item.producto_id || item.libro_id || null,
            quantity: item.cantidad || 1,
            name: item.nombre || '',
            price: item.precio_unitario || 0,
            sku: item.sku || '',
          })).filter((item: any) => item.product_id)
        }
        if (body.data.billing !== undefined) {
          wooCommercePedidoData.billing = body.data.billing
        }
        if (body.data.shipping !== undefined) {
          wooCommercePedidoData.shipping = body.data.shipping
        }
        if (body.data.metodo_pago !== undefined) {
          wooCommercePedidoData.payment_method = body.data.metodo_pago
        }
        if (body.data.metodo_pago_titulo !== undefined) {
          wooCommercePedidoData.payment_method_title = body.data.metodo_pago_titulo
        }
        if (body.data.nota_cliente !== undefined) {
          wooCommercePedidoData.customer_note = body.data.nota_cliente
        }
        if (body.data.total !== undefined) {
          wooCommercePedidoData.total = String(body.data.total)
        }

        wooCommercePedido = await wcClient.put<any>(
          `orders/${wooId}`,
          wooCommercePedidoData
        )
        console.log('[API Pedidos PUT] ✅ Pedido actualizado en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Pedidos PUT] ⚠️ Error al actualizar en WooCommerce:', {
          message: wooError.message,
          status: wooError.status,
          details: wooError.details,
          estadoEnviado: wooCommercePedidoData?.status,
          estadoOriginal: body.data.estado,
        })
        // Si el error es crítico (validación de estado), lanzarlo para que se muestre al usuario
        if (wooError.message && (wooError.message.includes('status must be one of') || wooError.message.includes('estado must be one of'))) {
          const estadoMapeado = mapWooStatus(body.data.estado)
          throw new Error(`Error al actualizar el estado: El estado "${body.data.estado}" (mapeado a "${estadoMapeado}") no es válido en WooCommerce. Estados válidos: pending, processing, on-hold, completed, cancelled, refunded, failed`)
        }
        // Para otros errores, lanzar el error para que se muestre al usuario
        throw new Error(`Error al actualizar pedido en WooCommerce: ${wooError.message || 'Error desconocido'}`)
      }
    }

    // Actualizar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${pedidoEndpoint}/${documentId}` : `${pedidoEndpoint}/${id}`
    console.log('[API Pedidos PUT] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    const pedidoData: any = {
      data: {}
    }

    // CORRECCIÓN: Si solo se actualiza el estado, verificar y corregir valores inválidos en otros campos
    // Esto evita errores de validación cuando el pedido tiene valores inválidos (ej: origen con mayúsculas)
    const soloActualizandoEstado = body.data.estado !== undefined && 
      Object.keys(body.data).filter(k => k !== 'estado' && body.data[k] !== undefined).length === 0
    
    if (soloActualizandoEstado) {
      // Obtener el pedido completo para verificar valores inválidos
      try {
        const pedidoCompleto = cuponStrapi || (await strapiClient.get<any>(`${pedidoEndpoint}/${documentId || id}?populate=*`))
        const attrs = pedidoCompleto?.attributes || {}
        const pedidoDataCompleto = (attrs && Object.keys(attrs).length > 0) ? attrs : pedidoCompleto
        
        // Si el pedido tiene origen inválido, corregirlo
        if (pedidoDataCompleto?.origen) {
          const origenNormalizado = normalizeOrigen(pedidoDataCompleto.origen)
          if (origenNormalizado && origenNormalizado !== pedidoDataCompleto.origen) {
            console.log(`[API Pedidos PUT] 🔧 Corrigiendo origen inválido: "${pedidoDataCompleto.origen}" → "${origenNormalizado}"`)
            pedidoData.data.origen = origenNormalizado
          }
        }
        
        // Si el pedido tiene metodo_pago inválido, corregirlo
        if (pedidoDataCompleto?.metodo_pago) {
          const metodoPagoNormalizado = normalizeMetodoPago(pedidoDataCompleto.metodo_pago)
          if (metodoPagoNormalizado && metodoPagoNormalizado !== pedidoDataCompleto.metodo_pago) {
            console.log(`[API Pedidos PUT] 🔧 Corrigiendo metodo_pago inválido: "${pedidoDataCompleto.metodo_pago}" → "${metodoPagoNormalizado}"`)
            pedidoData.data.metodo_pago = metodoPagoNormalizado
          }
        }
      } catch (error) {
        console.warn('[API Pedidos PUT] ⚠️ No se pudo verificar valores inválidos del pedido:', error)
      }
    }

    // Solo agregar campos que realmente se están actualizando (que están en body.data)
    if (body.data.numero_pedido !== undefined) pedidoData.data.numero_pedido = body.data.numero_pedido?.toString().trim() || null
    if (body.data.fecha_pedido !== undefined) pedidoData.data.fecha_pedido = body.data.fecha_pedido || null
    // Strapi espera valores en inglés (pending, processing, on-hold, completed, cancelled, refunded, failed, auto-draft, checkout-draft)
    // El frontend envía el estado en español, así que lo mapeamos a inglés
    if (body.data.estado !== undefined && body.data.estado !== null) {
      const estadoRecibido = String(body.data.estado).trim()
      console.log('[API Pedidos PUT] 🔍 Estado recibido del frontend:', estadoRecibido, typeof body.data.estado)
      
      // SIEMPRE mapear el estado, incluso si ya está en inglés
      const estadoMapeadoParaStrapi = mapWooStatus(estadoRecibido)
      console.log('[API Pedidos PUT] ✅ Estado mapeado para Strapi:', estadoMapeadoParaStrapi, '(desde:', estadoRecibido, ')')
      
      // Validar que el estado mapeado sea válido para Strapi
      const estadosValidosStrapi = ['auto-draft', 'pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'checkout-draft']
      if (!estadosValidosStrapi.includes(estadoMapeadoParaStrapi)) {
        console.error('[API Pedidos PUT] ❌ Estado mapeado no válido para Strapi:', estadoMapeadoParaStrapi)
        throw new Error(`Estado "${estadoRecibido}" (mapeado a "${estadoMapeadoParaStrapi}") no es válido. Estados válidos: ${estadosValidosStrapi.join(', ')}`)
      }
      
      pedidoData.data.estado = estadoMapeadoParaStrapi
      console.log('[API Pedidos PUT] 📤 Estado FINAL que se enviará a Strapi:', pedidoData.data.estado)
    }
    if (body.data.total !== undefined) pedidoData.data.total = body.data.total != null ? parseFloat(String(body.data.total)) : null
    if (body.data.subtotal !== undefined) pedidoData.data.subtotal = body.data.subtotal != null ? parseFloat(String(body.data.subtotal)) : null
    if (body.data.impuestos !== undefined) pedidoData.data.impuestos = body.data.impuestos != null ? parseFloat(String(body.data.impuestos)) : null
    if (body.data.envio !== undefined) pedidoData.data.envio = body.data.envio != null ? parseFloat(String(body.data.envio)) : null
    if (body.data.descuento !== undefined) pedidoData.data.descuento = body.data.descuento != null ? parseFloat(String(body.data.descuento)) : null
    if (body.data.moneda !== undefined) pedidoData.data.moneda = body.data.moneda || null
    // CORRECCIÓN: Normalizar origen a valores válidos de Strapi
    if (body.data.origen !== undefined) {
      pedidoData.data.origen = normalizeOrigen(body.data.origen)
    }
    if (body.data.cliente !== undefined) pedidoData.data.cliente = body.data.cliente || null
    // IMPORTANTE: Solo actualizar items si se envían explícitamente Y tienen product_id válido
    // Si solo estamos actualizando el estado, NO enviar items para evitar que el hook 
    // afterUpdate de Strapi intente sincronizar con WooCommerce y falle
    // (soloActualizandoEstado ya se calculó arriba)
    
    if (body.data.items !== undefined && !soloActualizandoEstado) {
      // Validar que los items tengan product_id válido antes de enviarlos
      const itemsValidos = Array.isArray(body.data.items) 
        ? body.data.items.filter((item: any) => item.producto_id || item.product_id || item.libro_id)
        : []
      if (itemsValidos.length > 0 || body.data.items.length === 0) {
        pedidoData.data.items = body.data.items
      } else {
        console.warn('[API Pedidos PUT] ⚠️ Items sin product_id válido, no se actualizarán los items')
      }
    } else if (soloActualizandoEstado) {
      console.log('[API Pedidos PUT] ℹ️ Solo actualizando estado, no se enviarán items para evitar error en hook afterUpdate de Strapi')
    }
    if (body.data.billing !== undefined) pedidoData.data.billing = body.data.billing || null
    if (body.data.shipping !== undefined) pedidoData.data.shipping = body.data.shipping || null
    // CORRECCIÓN: Normalizar metodo_pago a valores válidos de Strapi
    if (body.data.metodo_pago !== undefined) {
      pedidoData.data.metodo_pago = normalizeMetodoPago(body.data.metodo_pago)
    }
    if (body.data.metodo_pago_titulo !== undefined) pedidoData.data.metodo_pago_titulo = body.data.metodo_pago_titulo || null
    if (body.data.nota_cliente !== undefined) pedidoData.data.nota_cliente = body.data.nota_cliente || null
    
    // Actualizar campos usando camelCase como en el schema de Strapi
    // Solo actualizar externalIds si se actualizó en WooCommerce
    // NO enviar wooId, rawWooData directamente - no son campos del schema principal
    if (wooCommercePedido) {
      pedidoData.data.externalIds = {
        wooCommerce: {
          id: wooCommercePedido.id,
          number: wooCommercePedido.number,
        },
        originPlatform: originPlatform,
      }
    }
    
    // Solo actualizar originPlatform si se proporcionó explícitamente en body.data
    // No usar el valor por defecto para evitar sobrescribir datos existentes
    if (body.data.originPlatform !== undefined || body.data.origin_platform !== undefined) {
      const platformToSave = body.data.originPlatform || body.data.origin_platform
      if (platformToSave) {
        pedidoData.data.originPlatform = platformToSave
      }
    }
    
    // Verificar que hay datos para actualizar
    if (Object.keys(pedidoData.data).length === 0) {
      console.warn('[API Pedidos PUT] ⚠️ No hay campos para actualizar en Strapi')
      return NextResponse.json({
        success: true,
        message: 'No hay campos para actualizar',
        data: { woocommerce: wooCommercePedido }
      })
    }
    
    // Log de depuración antes de enviar
    console.log('[API Pedidos PUT] Datos a enviar a Strapi:', JSON.stringify(pedidoData, null, 2))

    try {
      const strapiResponse = await strapiClient.put<any>(strapiEndpoint, pedidoData)
      console.log('[API Pedidos PUT] ✅ Pedido actualizado en Strapi')
      
      return NextResponse.json({
        success: true,
        data: {
          woocommerce: wooCommercePedido,
          strapi: strapiResponse.data || strapiResponse,
        },
        message: 'Pedido actualizado exitosamente' + (wooCommercePedido ? ' en WooCommerce y Strapi' : ' en Strapi')
      })
    } catch (strapiError: any) {
      console.error('[API Pedidos PUT] ❌ Error al actualizar en Strapi:', {
        message: strapiError.message,
        status: strapiError.status,
        details: strapiError.details,
        endpoint: strapiEndpoint,
        dataEnviada: pedidoData
      })
      
      // Si WooCommerce se actualizó pero Strapi falló, aún retornar éxito parcial
      if (wooCommercePedido) {
        console.warn('[API Pedidos PUT] ⚠️ WooCommerce actualizado pero Strapi falló')
        return NextResponse.json({
          success: true,
          warning: 'Pedido actualizado en WooCommerce pero falló en Strapi',
          data: {
            woocommerce: wooCommercePedido,
            strapiError: strapiError.message
          }
        }, { status: 207 }) // 207 Multi-Status
      }
      
      // Si ambos fallaron, lanzar el error
      throw strapiError
    }

  } catch (error: any) {
    console.error('[API Pedidos PUT] ❌ ERROR al actualizar pedido:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar el pedido',
      details: error.details
    }, { status: error.status || 500 })
  }
}

