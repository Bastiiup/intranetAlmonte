/**
 * Servicios para el módulo de Operaciones
 * 
 * Lógica de negocio para sincronización y gestión de pedidos
 */

import jumpsellerClient from '../jumpseller/client'
import type { WeareCloudOrder, SyncOrderParams, SyncResult, SincronizedOrder } from './types'
import { matchOrders, createSincronizedOrder } from './matcher'

/**
 * URL del microservicio Python de WeareCloud
 * 
 * NOTA: Las credenciales de WeareCloud (username/password) NO deben estar aquí.
 * Solo deben estar en el microservicio Python que hace el scraping.
 */
const WEARECLOUD_SERVICE_URL = process.env.WEARECLOUD_SERVICE_URL || 'http://localhost:8000'
const WEARECLOUD_SERVICE_API_KEY = process.env.WEARECLOUD_SERVICE_API_KEY || ''

// URL de WeareCloud (solo para referencia, no se usa directamente)
export const WEARECLOUD_URL = process.env.WEARECLOUD_URL || 'https://ecommerce.wareclouds.app'

/**
 * Obtener pedidos de WeareCloud vía microservicio Python
 */
export async function getWeareCloudOrders(): Promise<WeareCloudOrder[]> {
  try {
    console.log(`🔗 Conectando con microservicio WeareCloud en: ${WEARECLOUD_SERVICE_URL}`)
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Agregar API Key si está configurada (el microservicio espera X-API-Key)
    if (WEARECLOUD_SERVICE_API_KEY) {
      headers['X-API-Key'] = WEARECLOUD_SERVICE_API_KEY
      console.log('🔑 API Key configurada')
    } else {
      console.log('⚠️ API Key no configurada (puede ser necesario para producción)')
    }
    
    const url = `${WEARECLOUD_SERVICE_URL}/api/wearecloud/pedidos`
    console.log(`📡 Haciendo request a: ${url}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    console.log(`📥 Respuesta recibida: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Error en respuesta: ${errorText}`)
      throw new Error(`Error al obtener pedidos de WeareCloud: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`📦 Datos recibidos:`, JSON.stringify(data).substring(0, 200))
    
    const rawOrders = data.orders || data || []
    console.log(`✅ Pedidos encontrados en respuesta: ${rawOrders.length}`)
    
    if (!Array.isArray(rawOrders)) {
      console.warn('⚠️ La respuesta no es un array:', typeof rawOrders)
      return []
    }
    
    // Mapear los datos del microservicio al formato esperado
    const mappedOrders = rawOrders.map((order: any) => ({
      id: order.warecloud_id || order.pedido_ecommerce || `wc-${Date.now()}`,
      order_number: order.pedido_ecommerce || order.warecloud_id || '',
      status: order.estado || 'unknown',
      created_at: order.fecha_creacion || new Date().toISOString(),
      updated_at: order.fecha_actualizacion || new Date().toISOString(),
      customer: order.cliente ? {
        email: order.cliente.email || '',
        name: order.cliente.name || order.cliente.nombre || '',
        phone: order.cliente.phone || order.cliente.telefono || ''
      } : {
        email: '',
        name: ''
      },
      items: order.items || [],
      total: order.total || '0',
      shipping_address: order.direccion_envio,
      notes: order.notes || order.notas,
      // Campos originales del microservicio
      warecloud_id: order.warecloud_id,
      url: order.url || (order.warecloud_id ? `${WEARECLOUD_URL}/orders/${order.warecloud_id}` : null),
      pedido_ecommerce: order.pedido_ecommerce
    }))
    
    console.log(`✅ Pedidos mapeados: ${mappedOrders.length}`)
    return mappedOrders
  } catch (error: any) {
    console.error('❌ Error al obtener pedidos de WeareCloud:', error)
    console.error('Stack:', error.stack)
    // En lugar de lanzar error, devolver array vacío para que el matching continúe
    // con solo los pedidos de JumpSeller
    return []
  }
}

/**
 * Obtener un pedido específico de WeareCloud
 */
export async function getWeareCloudOrder(orderId: string): Promise<WeareCloudOrder> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Agregar API Key si está configurada (el microservicio espera X-API-Key)
    if (WEARECLOUD_SERVICE_API_KEY) {
      headers['X-API-Key'] = WEARECLOUD_SERVICE_API_KEY
    }
    
    const response = await fetch(`${WEARECLOUD_SERVICE_URL}/api/wearecloud/pedidos/${orderId}`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new Error(`Error al obtener pedido de WeareCloud: ${response.statusText}`)
    }

    const data = await response.json()
    return data.order || data
  } catch (error: any) {
    console.error('Error al obtener pedido de WeareCloud:', error)
    throw new Error(`No se pudo obtener el pedido de WeareCloud: ${error.message}`)
  }
}

/**
 * Hacer matching entre pedidos de WeareCloud y JumpSeller
 * Solo hace matching, no sincroniza automáticamente
 */
export async function syncOrders(): Promise<SincronizedOrder[]> {
  try {
    console.log('🔄 Iniciando matching de pedidos...')
    
    // Obtener pedidos de ambas fuentes
    const [wearecloudOrders, jumpsellerOrders] = await Promise.all([
      getWeareCloudOrders().catch(err => {
        console.error('⚠️ Error obteniendo pedidos de WeareCloud:', err)
        return []
      }),
      jumpsellerClient.getOrders({ per_page: 100 }).catch(err => {
        console.error('⚠️ Error obteniendo pedidos de JumpSeller:', err)
        return []
      })
    ])

    console.log(`📦 Pedidos obtenidos: WeareCloud=${wearecloudOrders.length}, JumpSeller=${jumpsellerOrders.length}`)

    // Hacer matching - mostrar TODOS los pedidos, incluso sin match
    const syncedOrders: SincronizedOrder[] = []
    const matchedJsOrderIds = new Set<number>()

    // Primero: buscar matches para pedidos de WeareCloud
    for (const wcOrder of wearecloudOrders) {
      // Buscar el mejor match en JumpSeller (incluyendo low confidence)
      let bestMatch: { order: any; matchInfo: any } | null = null
      let bestScore = 0

      for (const jsOrder of jumpsellerOrders) {
        const matchResult = matchOrders(wcOrder, jsOrder)
        const score = matchResult.confidence === 'high' ? 3 : matchResult.confidence === 'medium' ? 2 : 1
        
        if (score > bestScore) {
          bestScore = score
          bestMatch = { order: jsOrder, matchInfo: matchResult }
        }
      }

      if (bestMatch && bestMatch.matchInfo.confidence !== 'low') {
        // Match encontrado
        matchedJsOrderIds.add(bestMatch.order.id)
        syncedOrders.push(createSincronizedOrder(wcOrder, bestMatch.order, bestMatch.matchInfo))
      } else {
        // Pedido de WeareCloud sin match en JumpSeller
        syncedOrders.push(createSincronizedOrder(wcOrder, undefined, {
          confidence: 'low',
          reason: 'No se encontró match en JumpSeller'
        }))
      }
    }

    // Segundo: agregar pedidos de JumpSeller sin match
    for (const jsOrder of jumpsellerOrders) {
      if (!matchedJsOrderIds.has(jsOrder.id)) {
        syncedOrders.push(createSincronizedOrder(undefined, jsOrder, {
          confidence: 'low',
          reason: 'No se encontró match en WeareCloud'
        }))
      }
    }

    console.log(`✅ Matching completado: ${syncedOrders.length} pedidos procesados`)
    return syncedOrders
  } catch (error: any) {
    console.error('❌ Error al hacer matching de pedidos:', error)
    throw error
  }
}

/**
 * Sincronizar un pedido específico
 */
export async function syncOrder(params: SyncOrderParams): Promise<SyncResult> {
  try {
    let wearecloudOrder: WeareCloudOrder | undefined
    let jumpsellerOrder = params.jumpseller_order_id 
      ? await jumpsellerClient.getOrder(params.jumpseller_order_id)
      : undefined

    if (params.wearecloud_order_id) {
      wearecloudOrder = await getWeareCloudOrder(params.wearecloud_order_id)
      
      // Si no hay jumpseller_order_id, buscar match
      if (!jumpsellerOrder) {
        const jsOrders = await jumpsellerClient.getOrders({ per_page: 50 })
        const match = jsOrders.find(jsOrder => {
          const matchResult = matchOrders(wearecloudOrder!, jsOrder)
          return matchResult.confidence === 'high' || matchResult.confidence === 'medium'
        })
        if (match) {
          jumpsellerOrder = match
        }
      }
    }

    const matchInfo = wearecloudOrder && jumpsellerOrder
      ? matchOrders(wearecloudOrder, jumpsellerOrder)
      : undefined

    const syncedOrder = createSincronizedOrder(wearecloudOrder, jumpsellerOrder, matchInfo)

    return {
      success: true,
      order: syncedOrder
    }
  } catch (error: any) {
    console.error('Error al sincronizar pedido:', error)
    return {
      success: false,
      order: createSincronizedOrder(),
      error: error.message
    }
  }
}

/**
 * Actualizar pedido en JumpSeller
 */
export async function updateJumpSellerOrder(
  orderId: number,
  updates: {
    status?: string
    customer_note?: string
    internal_note?: string
    shipping_method?: string
    shipping_method_title?: string
  }
): Promise<SyncResult> {
  try {
    const updatedOrder = await jumpsellerClient.updateOrder(orderId, updates)

    return {
      success: true,
      order: createSincronizedOrder(undefined, updatedOrder),
      changes: Object.keys(updates).map(key => ({
        field: key,
        old_value: undefined, // Podríamos obtener el valor anterior si es necesario
        new_value: updates[key as keyof typeof updates]
      }))
    }
  } catch (error: any) {
    console.error('Error al actualizar pedido en JumpSeller:', error)
    return {
      success: false,
      order: createSincronizedOrder(),
      error: error.message
    }
  }
}

