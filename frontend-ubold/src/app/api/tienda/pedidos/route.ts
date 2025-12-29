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
    // Intentar primero con populate simple, si falla, intentar sin populate
    let response: any
    try {
      // Primero intentar con populate simple (sin campos específicos que pueden no existir)
      response = await strapiClient.get<any>(
        `/api/pedidos?populate=*&pagination[pageSize]=5000&publicationState=${publicationState}`
      )
    } catch (pubStateError: any) {
      // Si falla con publicationState, intentar sin él
      if (pubStateError.status === 400 || pubStateError.message?.includes('400')) {
        console.warn('[API /tienda/pedidos GET] ⚠️ Error con publicationState, intentando sin él:', pubStateError.message)
        try {
          response = await strapiClient.get<any>(
            `/api/pedidos?populate=*&pagination[pageSize]=5000`
          )
        } catch (populateError: any) {
          // Si también falla con populate, intentar sin populate
          if (populateError.status === 400 || populateError.message?.includes('400')) {
            console.warn('[API /tienda/pedidos GET] ⚠️ Error con populate, intentando sin populate:', populateError.message)
            response = await strapiClient.get<any>(
              `/api/pedidos?pagination[pageSize]=5000&publicationState=${publicationState}`
            )
          } else {
            throw populateError
          }
        }
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ⚠️ DEBUGGING DETALLADO: Imprimir payload recibido
    console.log('═══════════════════════════════════════════════════════')
    console.log('[API Pedidos POST] 📝 Payload recibido del frontend:')
    console.log('═══════════════════════════════════════════════════════')
    console.log(JSON.stringify(body, null, 2))
    console.log('═══════════════════════════════════════════════════════')
    console.log('[API Pedidos POST] Verificaciones del payload recibido:')
    console.log('- body existe?', !!body)
    console.log('- body.data existe?', !!body.data)
    console.log('- body.data.items existe?', !!body.data?.items)
    console.log('- body.data.items es array?', Array.isArray(body.data?.items))
    console.log('- body.data.items.length:', body.data?.items?.length || 0)
    if (body.data?.items && body.data.items.length > 0) {
      console.log('- body.data.items[0]:', JSON.stringify(body.data.items[0], null, 2))
    }
    console.log('═══════════════════════════════════════════════════════')

    // Validar campos obligatorios
    if (!body.data?.numero_pedido) {
      return NextResponse.json({
        success: false,
        error: 'El número de pedido es obligatorio'
      }, { status: 400 })
    }
    
    // ⚠️ VALIDACIÓN CRÍTICA: Verificar que hay items
    const itemsRecibidos = body.data.items || []
    
    if (!body.data.items) {
      console.error('[API Pedidos POST] ❌ ERROR: body.data.items NO existe!')
      console.error('[API Pedidos POST] body.data keys:', Object.keys(body.data || {}))
      return NextResponse.json({
        success: false,
        error: 'El campo "items" es obligatorio y no se encontró en el payload. Verifica que estés enviando items en el payload.'
      }, { status: 400 })
    }
    
    if (!Array.isArray(itemsRecibidos)) {
      console.error('[API Pedidos POST] ❌ ERROR: body.data.items NO es un array!', typeof itemsRecibidos)
      return NextResponse.json({
        success: false,
        error: `El campo "items" debe ser un array, pero se recibió: ${typeof itemsRecibidos}`
      }, { status: 400 })
    }
    
    if (itemsRecibidos.length === 0) {
      console.error('[API Pedidos POST] ❌ ERROR: body.data.items está VACÍO!')
      return NextResponse.json({
        success: false,
        error: 'El pedido debe tener al menos un producto. Agrega productos antes de crear el pedido.'
      }, { status: 400 })
    }
    
    console.log('[API Pedidos POST] ✅ Items recibidos correctamente:', {
      count: itemsRecibidos.length,
      items: itemsRecibidos.map((item: any, index: number) => ({
        index: index + 1,
        nombre: item.nombre || item.name,
        cantidad: item.cantidad || item.quantity,
        precio_unitario: item.precio_unitario || item.price,
        total: item.total,
        producto_id: item.producto_id || item.product_id
      }))
    })
    
    // Validar que cada item tiene los campos obligatorios
    const itemsInvalidos = itemsRecibidos.filter((item: any, index: number) => {
      const tieneNombre = item.nombre || item.name
      const tieneCantidad = (item.cantidad || item.quantity) > 0
      const tienePrecio = (item.precio_unitario || item.price) !== undefined && (item.precio_unitario || item.price) >= 0
      const tieneTotal = (item.total || item.subtotal) !== undefined && (item.total || item.subtotal) >= 0
      
      if (!tieneNombre || !tieneCantidad || !tienePrecio || !tieneTotal) {
        console.error(`[API Pedidos POST] ❌ Item ${index + 1} inválido:`, {
          tieneNombre: !!tieneNombre,
          tieneCantidad,
          tienePrecio,
          tieneTotal,
          item
        })
        return true
      }
      return false
    })
    
    if (itemsInvalidos.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Hay ${itemsInvalidos.length} producto(s) con datos inválidos. Cada producto debe tener: nombre, cantidad > 0, precio_unitario >= 0, y total >= 0.`
      }, { status: 400 })
    }
    
    console.log('[API Pedidos POST] ✅ Validación de items exitosa:', {
      totalItems: itemsRecibidos.length,
      itemsValidos: itemsRecibidos.length - itemsInvalidos.length
    })

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
    const pedidoEndpoint = '/api/pedidos'
    console.log('[API Pedidos POST] Usando endpoint Strapi:', pedidoEndpoint)

    // Crear en Strapi - Los lifecycles (afterCreate) se encargarán de sincronizar con WooCommerce
    console.log('[API Pedidos POST] 📚 Creando pedido en Strapi (los lifecycles sincronizarán con WooCommerce)...')
    
    // Validar y preparar items - asegurar que tengan la estructura correcta para Strapi y WooCommerce
    const itemsPreparados = (body.data.items || []).map((item: any) => {
      const productoId = item.producto_id || item.product_id || item.libro_id || null
      const cantidad = item.cantidad || item.quantity || 1
      const precioUnitario = item.precio_unitario || item.price || 0
      const total = item.total || precioUnitario * cantidad
      
      return {
        producto_id: productoId, // Para Strapi
        product_id: productoId, // Para WooCommerce (Strapi lo usará en el lifecycle)
        sku: item.sku || '',
        nombre: item.nombre || item.name || '',
        cantidad: cantidad,
        quantity: cantidad, // Para WooCommerce
        precio_unitario: precioUnitario,
        price: precioUnitario.toString(), // Para WooCommerce
        total: total,
        item_id: item.item_id || null,
        metadata: item.metadata || null,
      }
    })
    
    // Validar que los items tengan producto_id válido
    const itemsValidos = itemsPreparados.filter((item: any) => item.producto_id && item.producto_id > 0)
    if (itemsPreparados.length > 0 && itemsValidos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Los items deben tener un producto_id válido para sincronizar con WooCommerce'
      }, { status: 400 })
    }
    
    // Preparar fecha_pedido y fecha_creacion
    const fechaPedido = body.data.fecha_pedido || new Date().toISOString()
    const fechaCreacion = body.data.fecha_creacion || body.data.fecha_pedido || new Date().toISOString()
    
    // Preparar información de billing/shipping
    const billingInfo = body.data.billing || (originPlatform !== 'otros' ? {
      first_name: 'Cliente',
      last_name: 'Invitado',
      email: '',
      address_1: '',
      city: '',
      state: '',
      postcode: '',
      country: 'CL',
    } : null)
    
    const shippingInfo = body.data.shipping || (originPlatform !== 'otros' ? {
      first_name: 'Cliente',
      last_name: 'Invitado',
      address_1: '',
      city: '',
      state: '',
      postcode: '',
      country: 'CL',
    } : null)
    
    // Calcular totales desde los items para asegurar consistencia
    const subtotalCalculado = itemsValidos.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
    const impuestos = body.data.impuestos ? parseFloat(body.data.impuestos) : 0
    const envio = body.data.envio ? parseFloat(body.data.envio) : 0
    const descuento = body.data.descuento ? parseFloat(body.data.descuento) : 0
    const totalCalculado = subtotalCalculado + impuestos + envio - descuento
    
    // Usar totales del body si existen, sino usar los calculados
    const totalFinal = body.data.total ? parseFloat(body.data.total) : totalCalculado
    const subtotalFinal = body.data.subtotal ? parseFloat(body.data.subtotal) : subtotalCalculado
    
    console.log('[API Pedidos POST] 💰 Cálculo de totales:', {
      subtotalCalculado,
      subtotalFinal,
      impuestos,
      envio,
      descuento,
      totalCalculado,
      totalFinal,
      itemsCount: itemsValidos.length
    })
    
    // Preparar datos en formato WooCommerce para que Strapi los use directamente
    // Esto ayuda a que el lifecycle hook de Strapi pueda sincronizar correctamente
    const rawWooData = originPlatform !== 'otros' ? {
      payment_method: normalizeMetodoPago(body.data.metodo_pago) || 'bacs',
      payment_method_title: body.data.metodo_pago_titulo || 'Transferencia bancaria directa',
      set_paid: body.data.estado === 'completed' || body.data.estado === 'completado',
      status: body.data.estado ? mapWooStatus(body.data.estado) : 'pending',
      customer_id: 0, // Cliente invitado
      billing: billingInfo,
      shipping: shippingInfo,
      line_items: itemsValidos.map((item: any) => ({
        product_id: item.producto_id || item.product_id,
        quantity: item.cantidad || item.quantity,
        // ⚠️ IMPORTANTE: Especificar el precio para que WooCommerce calcule correctamente
        price: item.precio_unitario ? item.precio_unitario.toString() : undefined,
        // También especificar el subtotal del item
        subtotal: item.total ? item.total.toString() : undefined,
      })),
      customer_note: body.data.nota_cliente || '',
      // ⚠️ CRÍTICO: Especificar todos los totales explícitamente con formato decimal
      // WooCommerce puede calcularlos, pero es mejor especificarlos para evitar discrepancias
      total: totalFinal > 0 ? totalFinal.toFixed(2) : undefined,
      subtotal: subtotalFinal > 0 ? subtotalFinal.toFixed(2) : undefined,
      shipping_total: envio > 0 ? envio.toFixed(2) : '0.00',
      total_tax: impuestos > 0 ? impuestos.toFixed(2) : '0.00',
      discount_total: descuento > 0 ? descuento.toFixed(2) : '0.00',
    } : null
    
    const pedidoData: any = {
      data: {
        numero_pedido: numeroPedido,
        fecha_pedido: fechaPedido,
        fecha_creacion: fechaCreacion, // ⚠️ REQUERIDO por Strapi
        // Strapi espera valores en inglés, mapear de español a inglés
        estado: body.data.estado ? mapWooStatus(body.data.estado) : 'pending',
        total: body.data.total ? parseFloat(body.data.total) : null,
        subtotal: body.data.subtotal ? parseFloat(body.data.subtotal) : null,
        impuestos: body.data.impuestos ? parseFloat(body.data.impuestos) : null,
        envio: body.data.envio ? parseFloat(body.data.envio) : null,
        descuento: body.data.descuento ? parseFloat(body.data.descuento) : null,
        moneda: body.data.moneda || 'CLP',
        origen: normalizeOrigen(body.data.origen),
        cliente: body.data.cliente || null,
        items: itemsValidos.length > 0 ? itemsValidos : itemsPreparados, // Usar items válidos si hay
        billing: billingInfo,
        shipping: shippingInfo,
        metodo_pago: normalizeMetodoPago(body.data.metodo_pago),
        metodo_pago_titulo: body.data.metodo_pago_titulo || null,
        nota_cliente: body.data.nota_cliente || null,
        originPlatform: originPlatform, // ⚠️ REQUERIDO para que Strapi sepa a qué plataforma sincronizar
        // Agregar rawWooData con formato WooCommerce puro para que Strapi lo use directamente
        rawWooData: rawWooData, // ⚠️ Datos en formato WooCommerce para sincronización
      }
    }
    
    // Log detallado del payload que se envía a Strapi
    console.log('═══════════════════════════════════════════════════════')
    console.log('[API Pedidos POST] 📦 Payload que se envía a Strapi:')
    console.log(JSON.stringify(pedidoData, null, 2))
    console.log('Origin Platform:', originPlatform)
    console.log('Items preparados:', itemsPreparados.length, 'items')
    console.log('Items válidos:', itemsValidos.length, 'items')
    console.log('═══════════════════════════════════════════════════════')
    console.log('[API Pedidos POST] 🔍 rawWooData para sincronización:')
    console.log(JSON.stringify(rawWooData, null, 2))
    console.log('═══════════════════════════════════════════════════════')
    
    // Validar que rawWooData tiene line_items
    if (rawWooData && (!rawWooData.line_items || rawWooData.line_items.length === 0)) {
      console.error('[API Pedidos POST] ⚠️ ADVERTENCIA: rawWooData no tiene line_items!')
      console.error('Esto puede causar que el pedido no se sincronice correctamente con WooCommerce')
    }
    
    // Validar que los line_items tienen product_id
    if (rawWooData && rawWooData.line_items) {
      const itemsSinProductId = rawWooData.line_items.filter((item: any) => !item.product_id)
      if (itemsSinProductId.length > 0) {
        console.error('[API Pedidos POST] ⚠️ ADVERTENCIA: Algunos line_items no tienen product_id:', itemsSinProductId)
      }
    }

    let strapiPedido: any
    try {
      strapiPedido = await strapiClient.post<any>(pedidoEndpoint, pedidoData)
    } catch (strapiError: any) {
      console.error('═══════════════════════════════════════════════════════')
      console.error('[API Pedidos POST] ❌ ERROR al crear en Strapi:')
      console.error('Status:', strapiError.status)
      console.error('Message:', strapiError.message)
      console.error('Details:', strapiError.details)
      console.error('Response:', strapiError.response)
      console.error('Payload enviado:', JSON.stringify(pedidoData, null, 2))
      console.error('═══════════════════════════════════════════════════════')
      throw strapiError
    }
    
    const documentId = strapiPedido.data?.documentId || strapiPedido.documentId
    const strapiResponseData = strapiPedido.data || strapiPedido
    
    if (!documentId) {
      console.error('═══════════════════════════════════════════════════════')
      console.error('[API Pedidos POST] ❌ No se pudo obtener el documentId de Strapi')
      console.error('Respuesta completa de Strapi:', JSON.stringify(strapiPedido, null, 2))
      console.error('═══════════════════════════════════════════════════════')
      throw new Error('No se pudo obtener el documentId de Strapi')
    }
    
    // Verificar que originPlatform se guardó correctamente en Strapi
    const originPlatformEnStrapi = strapiResponseData?.attributes?.originPlatform || 
                                   strapiResponseData?.originPlatform ||
                                   strapiResponseData?.data?.originPlatform
    
    console.log('═══════════════════════════════════════════════════════')
    console.log('[API Pedidos POST] ✅ Pedido creado en Strapi:')
    console.log('ID:', strapiResponseData?.id || strapiPedido.id)
    console.log('DocumentId:', documentId)
    console.log('Número de pedido:', numeroPedido)
    console.log('Origin Platform enviado:', originPlatform)
    console.log('Origin Platform en Strapi:', originPlatformEnStrapi)
    console.log('Estado:', strapiResponseData?.attributes?.estado || strapiResponseData?.estado)
    console.log('Items:', strapiResponseData?.attributes?.items?.length || strapiResponseData?.items?.length || 0)
    console.log('═══════════════════════════════════════════════════════')
    
    // Verificar que originPlatform se guardó correctamente
    if (originPlatformEnStrapi !== originPlatform && originPlatform !== 'otros') {
      console.warn('⚠️ ADVERTENCIA: originPlatform no coincide!')
      console.warn('Enviado:', originPlatform)
      console.warn('Guardado en Strapi:', originPlatformEnStrapi)
      console.warn('Esto puede impedir la sincronización con WooCommerce')
    }
    
    console.log('⏳ Esperando que Strapi sincronice con WooCommerce mediante afterCreate lifecycle...')
    console.log('📋 Revisa los logs de Strapi en Railway para ver la sincronización')
    console.log('🔍 Busca estos mensajes en los logs de Strapi:')
    console.log('   - [pedido] 🔍 afterCreate ejecutado')
    console.log('   - [pedido] ✅ Iniciando sincronización a', originPlatform)
    console.log('═══════════════════════════════════════════════════════')

    // Registrar log de creación (asíncrono, no bloquea)
    logActivity(request, {
      accion: 'crear',
      entidad: 'pedido',
      entidadId: documentId,
      descripcion: createLogDescription('crear', 'pedido', numeroPedido, `Pedido #${numeroPedido} desde ${originPlatform} - Strapi sincronizará con WooCommerce automáticamente`),
      datosNuevos: { numero_pedido: numeroPedido, originPlatform, estado: pedidoData.data.estado },
      metadata: { originPlatform, total: pedidoData.data.total, sincronizacionAutomatica: true },
    }).catch(() => {}) // Ignorar errores de logging

    // Si originPlatform es "otros", Strapi no sincronizará con WooCommerce
    if (originPlatform === 'otros') {
      return NextResponse.json({
        success: true,
        data: {
          strapi: strapiPedido.data || strapiPedido,
        },
        message: 'Pedido creado exitosamente en Strapi (originPlatform: otros - no se sincronizará con WooCommerce)'
      })
    }

    // Para otros originPlatform (woo_moraleja, woo_escolar), Strapi sincronizará automáticamente
    // mediante el lifecycle afterCreate. No necesitamos hacer nada más aquí.
    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiPedido.data || strapiPedido,
      },
      message: `Pedido creado exitosamente en Strapi. Strapi sincronizará automáticamente con WooCommerce (${originPlatform}) mediante el lifecycle afterCreate.`
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
