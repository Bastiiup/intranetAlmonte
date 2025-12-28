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
    
    // PASO 1: Intentar con filtro por documentId primero (más común)
    try {
      const filteredResponse = await strapiClient.get<any>(
        `/api/pedidos?filters[documentId][$eq]=${id}&populate=*`
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
        console.log('[API /tienda/pedidos/[id] GET] ✅ Pedido encontrado con filtro por documentId')
        return NextResponse.json({
          success: true,
          data: pedido
        }, { status: 200 })
      }
    } catch (filterError: any) {
      // Si el error es 500, puede ser que el campo documentId no exista en el filtro, continuar con otros métodos
      if (filterError.status !== 500) {
        console.warn('[API /tienda/pedidos/[id] GET] ⚠️ Error al obtener con filtro por documentId:', filterError.message)
      }
    }
    
    // PASO 1b: Intentar con filtro por numero_pedido si es numérico o string
    try {
      const filteredResponse = await strapiClient.get<any>(
        `/api/pedidos?filters[numero_pedido][$eq]=${id}&populate=*`
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
        console.log('[API /tienda/pedidos/[id] GET] ✅ Pedido encontrado con filtro por numero_pedido')
        return NextResponse.json({
          success: true,
          data: pedido
        }, { status: 200 })
      }
    } catch (filterError: any) {
      if (filterError.status !== 500) {
        console.warn('[API /tienda/pedidos/[id] GET] ⚠️ Error al obtener con filtro por numero_pedido:', filterError.message)
      }
    }
    
    // PASO 1c: Intentar con filtro por woocommerce_id si es numérico
    if (!isNaN(parseInt(id))) {
      try {
        const filteredResponse = await strapiClient.get<any>(
          `/api/pedidos?filters[woocommerce_id][$eq]=${id}&populate=*`
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
          console.log('[API /tienda/pedidos/[id] GET] ✅ Pedido encontrado con filtro por woocommerce_id')
          return NextResponse.json({
            success: true,
            data: pedido
          }, { status: 200 })
        }
      } catch (filterError: any) {
        if (filterError.status !== 500) {
          console.warn('[API /tienda/pedidos/[id] GET] ⚠️ Error al obtener con filtro por woocommerce_id:', filterError.message)
        }
      }
    }
    
    // PASO 2: Buscar en lista completa
    try {
      const allPedidos = await strapiClient.get<any>(
        `/api/pedidos?populate=*&pagination[pageSize]=1000`
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
        const pWooId = pedidoReal.wooId?.toString() || pedidoReal.woo_id?.toString()
        const pNumeroPedido = pedidoReal.numero_pedido?.toString() || pedidoReal.numeroPedido?.toString()
        const idStr = id.toString()
        const idNum = parseInt(idStr)
        
        return (
          pId === idStr ||
          pDocId === idStr ||
          pWooId === idStr ||
          pNumeroPedido === idStr ||
          (!isNaN(idNum) && (
            pedidoReal.id === idNum || 
            p.id === idNum ||
            pedidoReal.wooId === idNum ||
            parseInt(pNumeroPedido || '0') === idNum
          ))
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
      const response = await strapiClient.get<any>(
        `/api/pedidos/${id}?populate=*`
      )
      
      let pedido: any
      if (response.data) {
        pedido = response.data
      } else {
        pedido = response
      }
      
      if (pedido) {
        console.log('[API /tienda/pedidos/[id] GET] ✅ Pedido encontrado con endpoint directo')
        
        // Registrar log de visualización
        const attrs = pedido.attributes || {}
        const data = (attrs && Object.keys(attrs).length > 0) ? attrs : pedido
        const numeroPedido = data.numero_pedido || data.woocommerce_id || id
        
        logActivity(request, {
          accion: 'ver',
          entidad: 'pedido',
          entidadId: id,
          descripcion: createLogDescription('ver', 'pedido', numeroPedido),
        }).catch(() => {})
        
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

    const pedidoEndpoint = '/api/pedidos'
    
    // Primero obtener el pedido de Strapi para obtener el documentId y woocommerce_id
    let documentId: string | null = null
    let woocommerceId: number | null = null
    let originPlatform: string = 'woo_moraleja'
    let pedidoStrapi: any = null // Declarar pedidoStrapi antes de usarlo
    
    // Intentar obtener el pedido - si el ID parece ser un documentId (string), usar endpoint directo
    // Si es numérico, intentar con filtro primero
    const isDocumentId = typeof id === 'string' && !/^\d+$/.test(id)
    
    if (isDocumentId) {
      // Si es documentId, usar endpoint directo
      try {
        const directResponse = await strapiClient.get<any>(
          `${pedidoEndpoint}/${id}?populate=*`
        )
        pedidoStrapi = directResponse.data || directResponse
        documentId = pedidoStrapi?.documentId || pedidoStrapi?.id || id
        const attrs = pedidoStrapi?.attributes || {}
        const data = (attrs && Object.keys(attrs).length > 0) ? attrs : pedidoStrapi
        woocommerceId = data?.woocommerce_id || pedidoStrapi?.woocommerce_id || null
        originPlatform = data?.originPlatform || pedidoStrapi?.originPlatform || 'woo_moraleja'
      } catch (directError: any) {
        console.warn('[API Pedidos DELETE] ⚠️ Error al obtener pedido con endpoint directo:', directError.message)
      }
    } else {
      // Si es numérico, intentar con filtro
      try {
        const pedidoResponse = await strapiClient.get<any>(
          `${pedidoEndpoint}?filters[documentId][$eq]=${id}&populate=*`
        )
        let pedidos: any[] = []
        if (Array.isArray(pedidoResponse)) {
          pedidos = pedidoResponse
        } else if (pedidoResponse.data && Array.isArray(pedidoResponse.data)) {
          pedidos = pedidoResponse.data
        } else if (pedidoResponse.data) {
          pedidos = [pedidoResponse.data]
        }
        pedidoStrapi = pedidos[0]
        if (pedidoStrapi) {
          documentId = pedidoStrapi?.documentId || pedidoStrapi?.id || id
          const attrs = pedidoStrapi?.attributes || {}
          const data = (attrs && Object.keys(attrs).length > 0) ? attrs : pedidoStrapi
          woocommerceId = data?.woocommerce_id || pedidoStrapi?.woocommerce_id || null
          originPlatform = data?.originPlatform || pedidoStrapi?.originPlatform || 'woo_moraleja'
        }
      } catch (filterError: any) {
        console.warn('[API Pedidos DELETE] ⚠️ Error al obtener pedido con filtro:', filterError.message)
      }
    }
    
    // Si aún no tenemos documentId, usar el id recibido
    if (!documentId) {
      documentId = id
    }

    // Eliminar en WooCommerce primero si tenemos el ID (solo si no es "otros")
    let wooCommerceDeleted = false
    if (woocommerceId && originPlatform !== 'otros') {
      try {
        const wcClient = getWooCommerceClientForPlatform(originPlatform)
        console.log('[API Pedidos DELETE] 🛒 Eliminando pedido en WooCommerce:', woocommerceId)
        await wcClient.delete<any>(`orders/${woocommerceId}`, true)
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

    // Registrar log de eliminación
    const attrs = pedidoStrapi?.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : pedidoStrapi
    const numeroPedido = data?.numero_pedido || data?.woocommerce_id || id
    
    logActivity(request, {
      accion: 'eliminar',
      entidad: 'pedido',
      entidadId: documentId || id,
      descripcion: createLogDescription('eliminar', 'pedido', numeroPedido, `Pedido #${numeroPedido} eliminado${wooCommerceDeleted ? ' de WooCommerce y Strapi' : ' de Strapi'}`),
      datosAnteriores: pedidoStrapi ? { numero_pedido: numeroPedido, originPlatform } : undefined,
      metadata: { wooCommerceDeleted, originPlatform },
    }).catch(() => {})

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

    const pedidoEndpoint = '/api/pedidos'
    
    // Primero obtener el pedido de Strapi para obtener el documentId y woocommerce_id
    // Usar la misma lógica que GET para encontrar el pedido
    let cuponStrapi: any
    let documentId: string | null = null
    let woocommerceId: number | null = null
    let originPlatform: string = 'woo_moraleja'
    
    // PASO 1: Si el ID parece ser un documentId (string no numérico), intentar endpoint directo primero
    const isDocumentIdFormat = typeof id === 'string' && !/^\d+$/.test(id)
    
    if (isDocumentIdFormat) {
      try {
        const directResponse = await strapiClient.get<any>(
          `${pedidoEndpoint}/${id}?populate=*`
        )
        cuponStrapi = directResponse.data || directResponse
        if (cuponStrapi && (cuponStrapi.id || cuponStrapi.documentId)) {
          documentId = cuponStrapi.documentId || cuponStrapi.id || id
          console.log('[API Pedidos PUT] ✅ Pedido encontrado con endpoint directo (documentId)')
        }
      } catch (directError: any) {
        // Continuar con otros métodos si falla
        console.log('[API Pedidos PUT] ℹ️ No se encontró con endpoint directo, intentando filtros...')
      }
    }
    
    // PASO 2: Intentar con filtro por documentId (si no se encontró en paso 1)
    if (!cuponStrapi) {
      try {
        const filteredResponse = await strapiClient.get<any>(
          `${pedidoEndpoint}?filters[documentId][$eq]=${id}&populate=*`
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
        cuponStrapi = pedido
        documentId = pedido.documentId || pedido.id || id
        console.log('[API Pedidos PUT] ✅ Pedido encontrado con filtro por documentId')
      }
    } catch (filterError: any) {
      if (filterError.status !== 500) {
        console.warn('[API Pedidos PUT] ⚠️ Error al obtener con filtro por documentId:', filterError.message)
      }
    }
    
    // PASO 2: Si no se encontró, intentar con filtro por numero_pedido
    if (!cuponStrapi) {
      try {
        const filteredResponse = await strapiClient.get<any>(
          `${pedidoEndpoint}?filters[numero_pedido][$eq]=${id}&populate=*`
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
          cuponStrapi = pedido
          documentId = pedido.documentId || pedido.id || id
          console.log('[API Pedidos PUT] ✅ Pedido encontrado con filtro por numero_pedido')
        }
      } catch (filterError: any) {
        if (filterError.status !== 500) {
          console.warn('[API Pedidos PUT] ⚠️ Error al obtener con filtro por numero_pedido:', filterError.message)
        }
      }
    }
    
    // PASO 3: Si es numérico y aún no se encontró, intentar con filtro por woocommerce_id
    if (!cuponStrapi && !isNaN(parseInt(id))) {
      try {
        const filteredResponse = await strapiClient.get<any>(
          `${pedidoEndpoint}?filters[woocommerce_id][$eq]=${id}&populate=*`
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
          cuponStrapi = pedido
          documentId = pedido.documentId || pedido.id || id
          console.log('[API Pedidos PUT] ✅ Pedido encontrado con filtro por woocommerce_id')
        }
      } catch (filterError: any) {
        if (filterError.status !== 500) {
          console.warn('[API Pedidos PUT] ⚠️ Error al obtener con filtro por woocommerce_id:', filterError.message)
        }
      }
    }
    
    // PASO 4: Si es numérico y aún no se encontró, intentar buscar por ID numérico
    if (!cuponStrapi && !isNaN(parseInt(id))) {
      try {
        const filteredResponse = await strapiClient.get<any>(
          `${pedidoEndpoint}?filters[id][$eq]=${id}&populate=*`
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
          cuponStrapi = pedido
          documentId = pedido.documentId || pedido.id || id
          console.log('[API Pedidos PUT] ✅ Pedido encontrado con filtro por ID numérico')
        }
      } catch (filterError: any) {
        if (filterError.status !== 500) {
          console.warn('[API Pedidos PUT] ⚠️ Error al obtener con filtro por ID numérico:', filterError.message)
        }
      }
    }
    
    // PASO 5: Si aún no se encontró, intentar endpoint directo (puede ser documentId)
    if (!cuponStrapi) {
      try {
        const directResponse = await strapiClient.get<any>(
          `${pedidoEndpoint}/${id}?populate=*`
        )
        cuponStrapi = directResponse.data || directResponse
        if (cuponStrapi && (cuponStrapi.id || cuponStrapi.documentId)) {
          documentId = cuponStrapi.documentId || cuponStrapi.id || id
          console.log('[API Pedidos PUT] ✅ Pedido encontrado con endpoint directo')
        }
      } catch (directError: any) {
        // No mostrar warning aquí - es el último intento
        console.log('[API Pedidos PUT] ℹ️ No se encontró con endpoint directo')
      }
    }
    
    // Si aún no tenemos documentId, el pedido no existe
    if (!documentId || !cuponStrapi) {
      return NextResponse.json({
        success: false,
        error: `Pedido no encontrado con ID: ${id}. Verifica que el pedido exista en Strapi.`
      }, { status: 404 })
    }
    
    // Leer campos usando camelCase como en el schema de Strapi (si tenemos cuponStrapi)
    if (cuponStrapi) {
      const attrs = cuponStrapi?.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : cuponStrapi
      woocommerceId = data?.woocommerce_id || cuponStrapi?.woocommerce_id || null
      
      // CORRECCIÓN: Buscar originPlatform en todos los lugares posibles
      // Puede estar en: data.originPlatform, externalIds.originPlatform, o en el objeto raíz
      const originPlatformFromData = data?.originPlatform || cuponStrapi?.originPlatform
      const originPlatformFromExternalIds = data?.externalIds?.originPlatform || cuponStrapi?.externalIds?.originPlatform
      originPlatform = body.data.originPlatform || 
                      body.data.origin_platform || 
                      originPlatformFromData || 
                      originPlatformFromExternalIds || 
                      'woo_moraleja'
      
      console.log('[API Pedidos PUT] 🔍 originPlatform detectado:', {
        fromBody: body.data.originPlatform || body.data.origin_platform,
        fromData: originPlatformFromData,
        fromExternalIds: originPlatformFromExternalIds,
        final: originPlatform,
        woocommerceId
      })
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

    // NOTA: Ya no actualizamos directamente en WooCommerce
    // Strapi se encargará de sincronizar mediante el lifecycle afterUpdate
    console.log('[API Pedidos PUT] 📝 Actualizando pedido en Strapi (los lifecycles sincronizarán con WooCommerce)...')
    console.log('Origin Platform:', originPlatform)
    console.log('WooCommerce ID:', woocommerceId)

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
      // Ya tenemos cuponStrapi, no necesitamos hacer otra petición
      try {
        const pedidoCompleto = cuponStrapi
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
    
    // Solo actualizar originPlatform si se proporcionó explícitamente en body.data
    // No usar el valor por defecto para evitar sobrescribir datos existentes
    if (body.data.originPlatform !== undefined || body.data.origin_platform !== undefined) {
      const platformToSave = body.data.originPlatform || body.data.origin_platform
      if (platformToSave) {
        pedidoData.data.originPlatform = platformToSave
      }
    }
    
    // Log detallado del payload que se envía a Strapi
    console.log('═══════════════════════════════════════════════════════')
    console.log('[API Pedidos PUT] 📦 Payload que se envía a Strapi:')
    console.log(JSON.stringify(pedidoData, null, 2))
    console.log('Origin Platform:', originPlatform)
    console.log('═══════════════════════════════════════════════════════')
    
    // NOTA: Los campos originPlatform, externalIds están en camelCase que es correcto para Strapi
    // El warning del cliente de Strapi es solo informativo - Strapi acepta camelCase
    
    // Verificar que hay datos para actualizar
    if (Object.keys(pedidoData.data).length === 0) {
      console.warn('[API Pedidos PUT] ⚠️ No hay campos para actualizar en Strapi')
      return NextResponse.json({
        success: true,
        message: 'No hay campos para actualizar',
        data: {}
      })
    }
    
    // Log de depuración antes de enviar
    console.log('[API Pedidos PUT] Datos a enviar a Strapi:', JSON.stringify(pedidoData, null, 2))

    try {
      // Guardar datos anteriores para el log
      const attrsAnteriores = cuponStrapi?.attributes || {}
      const datosAnteriores = (attrsAnteriores && Object.keys(attrsAnteriores).length > 0) ? attrsAnteriores : cuponStrapi
      const numeroPedido = datosAnteriores?.numero_pedido || datosAnteriores?.woocommerce_id || id
      
      let strapiResponse: any
      try {
        strapiResponse = await strapiClient.put<any>(strapiEndpoint, pedidoData)
      } catch (strapiError: any) {
        console.error('═══════════════════════════════════════════════════════')
        console.error('[API Pedidos PUT] ❌ ERROR al actualizar en Strapi:')
        console.error('Status:', strapiError.status)
        console.error('Message:', strapiError.message)
        console.error('Details:', strapiError.details)
        console.error('Response:', strapiError.response)
        console.error('Payload enviado:', JSON.stringify(pedidoData, null, 2))
        console.error('Endpoint:', strapiEndpoint)
        console.error('═══════════════════════════════════════════════════════')
        throw strapiError
      }
      
      const strapiResponseData = strapiResponse.data || strapiResponse
      const originPlatformEnStrapi = strapiResponseData?.attributes?.originPlatform || 
                                     strapiResponseData?.originPlatform ||
                                     strapiResponseData?.data?.originPlatform
      
      console.log('═══════════════════════════════════════════════════════')
      console.log('[API Pedidos PUT] ✅ Pedido actualizado en Strapi')
      console.log('DocumentId:', documentId || id)
      console.log('Origin Platform enviado:', originPlatform)
      console.log('Origin Platform en Strapi:', originPlatformEnStrapi)
      console.log('Estado actualizado:', pedidoData.data.estado || 'N/A')
      console.log('═══════════════════════════════════════════════════════')
      
      // Verificar que originPlatform se guardó correctamente
      if (originPlatformEnStrapi !== originPlatform && originPlatform !== 'otros') {
        console.warn('⚠️ ADVERTENCIA: originPlatform no coincide!')
        console.warn('Enviado:', originPlatform)
        console.warn('Guardado en Strapi:', originPlatformEnStrapi)
        console.warn('Esto puede impedir la sincronización con WooCommerce')
      }
      
      console.log('⏳ Esperando que Strapi sincronice con WooCommerce mediante afterUpdate lifecycle...')
      console.log('📋 Revisa los logs de Strapi en Railway para ver la sincronización')
      console.log('🔍 Busca estos mensajes en los logs de Strapi:')
      console.log('   - [pedido] 🔍 afterUpdate ejecutado')
      console.log('   - [pedido] ✅ Iniciando actualización en', originPlatform)
      console.log('═══════════════════════════════════════════════════════')
      
      // Determinar tipo de acción para el log
      let accion: 'actualizar' | 'cambiar_estado' | 'ocultar' | 'mostrar' = 'actualizar'
      let descripcionDetalle = ''
      
      if (body.data.publishedAt === null) {
        accion = 'ocultar'
        descripcionDetalle = 'Pedido ocultado'
      } else if (body.data.publishedAt !== undefined && body.data.publishedAt !== null) {
        accion = 'mostrar'
        descripcionDetalle = 'Pedido mostrado'
      } else if (body.data.estado !== undefined) {
        accion = 'cambiar_estado'
        const estadoAnterior = datosAnteriores?.estado || 'desconocido'
        const estadoNuevo = pedidoData.data.estado || body.data.estado
        descripcionDetalle = `Estado: ${estadoAnterior} → ${estadoNuevo} - Strapi sincronizará con WooCommerce automáticamente`
      } else {
        descripcionDetalle = 'Datos actualizados - Strapi sincronizará con WooCommerce automáticamente'
      }
      
      // Registrar log de actualización
      logActivity(request, {
        accion,
        entidad: 'pedido',
        entidadId: documentId || id,
        descripcion: createLogDescription(accion, 'pedido', numeroPedido, descripcionDetalle),
        datosAnteriores: datosAnteriores ? { estado: datosAnteriores.estado, publishedAt: datosAnteriores.publishedAt } : undefined,
        datosNuevos: pedidoData.data,
        metadata: { originPlatform, sincronizacionAutomatica: true },
      }).catch(() => {})
      
      return NextResponse.json({
        success: true,
        data: {
          strapi: strapiResponse.data || strapiResponse,
        },
        message: `Pedido actualizado exitosamente en Strapi. Strapi sincronizará automáticamente con WooCommerce (${originPlatform}) mediante el lifecycle afterUpdate.`
      })
    } catch (strapiError: any) {
      console.error('[API Pedidos PUT] ❌ Error al actualizar en Strapi:', {
        message: strapiError.message,
        status: strapiError.status,
        details: strapiError.details,
        endpoint: strapiEndpoint,
        dataEnviada: pedidoData
      })
      
      // Si Strapi falló, lanzar el error
      
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

