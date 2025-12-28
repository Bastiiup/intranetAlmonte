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
    const pedidoEndpoint = '/api/pedidos'
    console.log('[API Pedidos POST] Usando endpoint Strapi:', pedidoEndpoint)

    // Crear en Strapi - Los lifecycles (afterCreate) se encargarán de sincronizar con WooCommerce
    console.log('[API Pedidos POST] 📚 Creando pedido en Strapi (los lifecycles sincronizarán con WooCommerce)...')
    
    // Validar y preparar items - asegurar que tengan la estructura correcta
    const itemsPreparados = (body.data.items || []).map((item: any) => ({
      producto_id: item.producto_id || item.product_id || item.libro_id || null,
      sku: item.sku || '',
      nombre: item.nombre || item.name || '',
      cantidad: item.cantidad || item.quantity || 1,
      precio_unitario: item.precio_unitario || item.price || 0,
      total: item.total || (item.precio_unitario || item.price) * (item.cantidad || item.quantity || 1),
      item_id: item.item_id || null,
      metadata: item.metadata || null,
    }))
    
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
        origen: normalizeOrigen(body.data.origen),
        cliente: body.data.cliente || null,
        items: itemsPreparados,
        billing: body.data.billing || null,
        shipping: body.data.shipping || null,
        metodo_pago: normalizeMetodoPago(body.data.metodo_pago),
        metodo_pago_titulo: body.data.metodo_pago_titulo || null,
        nota_cliente: body.data.nota_cliente || null,
        originPlatform: originPlatform, // ⚠️ REQUERIDO para que Strapi sepa a qué plataforma sincronizar
      }
    }
    
    // Log detallado del payload que se envía a Strapi
    console.log('═══════════════════════════════════════════════════════')
    console.log('[API Pedidos POST] 📦 Payload que se envía a Strapi:')
    console.log(JSON.stringify(pedidoData, null, 2))
    console.log('Origin Platform:', originPlatform)
    console.log('Items preparados:', itemsPreparados.length, 'items')
    console.log('═══════════════════════════════════════════════════════')

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
