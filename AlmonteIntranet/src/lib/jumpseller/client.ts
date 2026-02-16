/**
 * Cliente HTTP para JumpSeller API
 * 
 * Maneja la autenticación y las peticiones a la API de JumpSeller
 * usando API Token.
 * 
 * Documentación: https://developers.jumpseller.com/
 */

import { getJumpSellerUrl, JUMPSELLER_API_KEY, JUMPSELLER_API_SECRET } from './config'
import type { JumpSellerError, JumpSellerOrder, JumpSellerOrderUpdate, JumpSellerOrderListParams } from './types'

// Crear headers de autenticación para JumpSeller
// JumpSeller API usa Basic Auth con:
// - Usuario: API Key (Login)
// - Contraseña: API Secret (Auth Token)
const getAuthHeaders = (): Record<string, string> => {
  if (!JUMPSELLER_API_KEY) {
    throw new Error('JumpSeller API Key (Login) no está configurado')
  }

  if (!JUMPSELLER_API_SECRET) {
    throw new Error('JumpSeller API Secret (Auth Token) no está configurado')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  // JumpSeller usa Basic Auth con API Key como usuario y API Secret como contraseña
  const credsString = `${JUMPSELLER_API_KEY}:${JUMPSELLER_API_SECRET}`
  if (typeof Buffer !== 'undefined') {
    // Node.js
    headers['Authorization'] = `Basic ${Buffer.from(credsString).toString('base64')}`
  } else {
    // Navegador (no debería usarse en el cliente, pero por si acaso)
    headers['Authorization'] = `Basic ${btoa(credsString)}`
  }

  return headers
}

// Manejar respuestas de error
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: JumpSellerError | null = null
    try {
      errorData = await response.json()
    } catch {
      // Si no es JSON, crear error genérico
    }
    const error = new Error(
      errorData?.message || errorData?.error || `HTTP error! status: ${response.status}`
    ) as Error & { status?: number; error?: string; details?: unknown }
    error.status = response.status
    error.error = errorData?.error
    error.details = errorData
    throw error
  }
  return response.json()
}

// Cliente JumpSeller
const jumpsellerClient = {
  /**
   * Obtener lista de pedidos
   */
  async getOrders(params?: JumpSellerOrderListParams): Promise<JumpSellerOrder[]> {
    const url = new URL(getJumpSellerUrl('orders'))
    
    // Agregar parámetros de consulta
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    const data = await handleResponse<any>(response)
    
    // JumpSeller puede devolver la lista directamente o dentro de un objeto
    if (Array.isArray(data)) {
      return data.map(item => item.order || item)
    } else if (data.orders && Array.isArray(data.orders)) {
      return data.orders.map((item: any) => item.order || item)
    } else if (data.order) {
      return [data.order]
    }
    
    return []
  },

  /**
   * Obtener un pedido por ID
   */
  async getOrder(orderId: number): Promise<JumpSellerOrder> {
    const url = getJumpSellerUrl(`orders/${orderId}.json`)
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<JumpSellerOrder>(response)
  },

  /**
   * Crear un nuevo pedido
   */
  async createOrder(orderData: Partial<JumpSellerOrder>): Promise<JumpSellerOrder> {
    const url = getJumpSellerUrl('orders.json')
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ order: orderData }),
    })

    return handleResponse<JumpSellerOrder>(response)
  },

  /**
   * Actualizar un pedido existente
   */
  async updateOrder(orderId: number, orderData: JumpSellerOrderUpdate): Promise<JumpSellerOrder> {
    const url = getJumpSellerUrl(`orders/${orderId}.json`)
    
    // Agregar timeout para evitar que se quede colgado
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ order: orderData }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      return handleResponse<JumpSellerOrder>(response)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Timeout: La petición a JumpSeller tardó más de 30 segundos') as Error & { status?: number }
        timeoutError.status = 504
        throw timeoutError
      }
      throw error
    }
  },

  /**
   * Eliminar un pedido (si está permitido)
   */
  async deleteOrder(orderId: number): Promise<void> {
    const url = getJumpSellerUrl(`orders/${orderId}.json`)
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      await handleResponse(response)
    }
  },
}

export default jumpsellerClient

