/**
 * Utilidades para mapeo de datos entre WooCommerce y Shipit
 */

import type { WooCommerceOrder } from '../woocommerce/types'
import type { ShipitCreateShipment, ShipitDestiny, ShipitSizes } from './types'
import { getCommuneId } from './communes'
import wooCommerceClient from '../woocommerce/client'

/**
 * Mapea un pedido de WooCommerce a un envío de Shipit
 */
export function mapWooCommerceOrderToShipit(
  order: WooCommerceOrder,
  options?: {
    communeId?: number
    courier?: string
    kind?: 0 | 1 | 2
    testMode?: boolean
  }
): ShipitCreateShipment {
  // Extraer número de dirección si está en address_1
  // Formato común: "Calle 123" o "Calle #123"
  const addressParts = order.shipping.address_1.match(/(.+?)\s*(?:#|N°|Nº)?\s*(\d+)?/i)
  const street = addressParts ? addressParts[1].trim() : order.shipping.address_1
  const number = addressParts && addressParts[2] ? addressParts[2] : ''

  // Calcular dimensiones y peso totales del pedido
  // Usa valores por defecto razonables
  // TODO: Mejorar para consultar productos y obtener dimensiones reales
  const sizes = calculateOrderSizes(order)

  // Construir referencia (usar prefijo TEST- si está en modo prueba)
  const reference = options?.testMode 
    ? `TEST-${order.id}` 
    : String(order.id)

  // Obtener commune_id desde el nombre de la ciudad
  let communeId = options?.communeId
  if (!communeId && order.shipping.city) {
    communeId = getCommuneId(order.shipping.city) || undefined
  }

  // Mapear destinatario
  const destiny: ShipitDestiny = {
    street: street || order.shipping.address_1,
    number: number,
    complement: order.shipping.address_2 || '',
    commune_id: communeId || 0, // Si no se encuentra, usar 0 (requerirá corrección manual)
    commune_name: order.shipping.city || '',
    full_name: `${order.shipping.first_name || ''} ${order.shipping.last_name || ''}`.trim() || 
               `${order.billing.first_name || ''} ${order.billing.last_name || ''}`.trim(),
    email: order.billing.email || '',
    phone: order.billing.phone || '',
    kind: 'home_delivery',
  }

  return {
    shipment: {
      kind: options?.kind || 0, // 0: normal
      platform: 2, // WooCommerce
      reference: reference,
      items: order.line_items?.length || 1,
      sizes: sizes,
      courier: {
        client: options?.courier || 'shippify', // Courier por defecto
      },
      destiny: destiny,
      insurance: {
        ticket_amount: parseFloat(order.total) || 0,
        ticket_number: order.transaction_id || '',
        price: 0,
        detail: null,
        extra: false,
      },
    },
  }
}

/**
 * Calcula las dimensiones y peso totales de un pedido (versión async mejorada)
 * Consulta productos individuales para obtener dimensiones reales
 * Nota: Esta función es async pero no se usa actualmente para mantener compatibilidad
 */
export async function calculateOrderSizesAsync(order: WooCommerceOrder): Promise<ShipitSizes> {
  // Valores por defecto (paquete pequeño)
  let totalWeight = 0.5 // kg
  let maxLength = 20 // cm
  let maxWidth = 20 // cm
  let maxHeight = 10 // cm
  let totalVolume = 0 // cm³

  // Intentar obtener dimensiones reales de los productos
  if (order.line_items && order.line_items.length > 0) {
    try {
      // Consultar productos para obtener dimensiones y peso
      const productPromises = order.line_items.map(async (item) => {
        try {
          const product = await wooCommerceClient.get(`products/${item.product_id}`) as any
          const weight = parseFloat(product?.weight || '0')
          const length = parseFloat(product?.dimensions?.length || '0')
          const width = parseFloat(product?.dimensions?.width || '0')
          const height = parseFloat(product?.dimensions?.height || '0')

          return {
            weight: weight * item.quantity,
            length,
            width,
            height,
            volume: length * width * height * item.quantity,
            quantity: item.quantity,
          }
        } catch {
          // Si falla obtener el producto, retornar valores por defecto
          return {
            weight: 0.1 * item.quantity,
            length: 20,
            width: 20,
            height: 10,
            volume: 20 * 20 * 10 * item.quantity,
            quantity: item.quantity,
          }
        }
      })

      const productData = await Promise.all(productPromises)

      // Calcular totales
      totalWeight = productData.reduce((sum, p) => sum + p.weight, 0)
      totalVolume = productData.reduce((sum, p) => sum + p.volume, 0)

      // Calcular dimensiones máximas (usar el producto más grande como base)
      const maxProduct = productData.reduce((max, p) => {
        const maxVolume = max.length * max.width * max.height
        const pVolume = p.length * p.width * p.height
        return pVolume > maxVolume ? p : max
      }, productData[0] || { length: 20, width: 20, height: 10 })

      maxLength = maxProduct.length || 20
      maxWidth = maxProduct.width || 20
      maxHeight = maxProduct.height || 10

      // Si hay múltiples productos, ajustar dimensiones para acomodar todo
      if (productData.length > 1) {
        // Aproximación: aumentar dimensiones según cantidad de productos
        const productCount = productData.reduce((sum, p) => sum + p.quantity, 0)
        if (productCount > 1) {
          // Aumentar altura proporcionalmente (asumiendo apilamiento)
          maxHeight = Math.min(maxHeight * Math.ceil(productCount / 2), 50) // Máximo 50 cm
        }
      }
    } catch (error) {
      // Si falla, usar valores por defecto
      console.warn('[Shipit Utils] Error al calcular dimensiones desde productos, usando valores por defecto:', error)
    }
  }

  return {
    width: Math.max(maxWidth, 10), // Mínimo 10 cm
    height: Math.max(maxHeight, 5), // Mínimo 5 cm
    length: Math.max(maxLength, 10), // Mínimo 10 cm
    weight: Math.max(totalWeight, 0.1), // Mínimo 0.1 kg
  }
}

/**
 * Calcula las dimensiones y peso totales de un pedido (versión síncrona)
 * Usa valores por defecto razonables
 * TODO: Mejorar para consultar productos de forma asíncrona cuando sea posible
 */
function calculateOrderSizes(order: WooCommerceOrder): ShipitSizes {
  // Valores por defecto (paquete pequeño)
  // En el futuro se puede mejorar consultando los productos individuales
  return {
    width: 20, // cm
    height: 10, // cm
    length: 20, // cm
    weight: 0.5, // kg
  }
}

/**
 * Extrae el ID de Shipit desde los meta_data de un pedido WooCommerce
 */
export function getShipitIdFromOrder(order: WooCommerceOrder): number | null {
  const shipitMeta = order.meta_data?.find(
    (meta) => meta.key === '_shipit_id' || meta.key === 'shipit_id'
  )
  if (!shipitMeta) return null
  const value = typeof shipitMeta.value === 'string' ? shipitMeta.value : String(shipitMeta.value)
  return parseInt(value, 10) || null
}

/**
 * Extrae el tracking number de Shipit desde los meta_data de un pedido
 */
export function getShipitTrackingFromOrder(order: WooCommerceOrder): string | null {
  const trackingMeta = order.meta_data?.find(
    (meta) => meta.key === '_shipit_tracking' || meta.key === 'shipit_tracking_number'
  )
  if (!trackingMeta) return null
  return typeof trackingMeta.value === 'string' ? trackingMeta.value : String(trackingMeta.value)
}

/**
 * Mapea el estado de Shipit al estado de WooCommerce
 */
export function mapShipitStatusToWooCommerce(shipitStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'processing',
    'in_transit': 'shipped',
    'delivered': 'completed',
    'failed': 'failed',
    'returned': 'refunded',
  }
  return statusMap[shipitStatus.toLowerCase()] || 'processing'
}

/**
 * Valida que un pedido tenga la información necesaria para crear un envío
 */
export function validateOrderForShipment(order: WooCommerceOrder): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!order.shipping.address_1) {
    errors.push('La dirección de envío es requerida')
  }

  if (!order.shipping.city) {
    errors.push('La ciudad de envío es requerida')
  } else {
    // Verificar que la comuna esté en el mapeo
    const communeId = getCommuneId(order.shipping.city)
    if (!communeId) {
      errors.push(`La comuna "${order.shipping.city}" no está en el mapeo. Se requiere commune_id.`)
    }
  }

  if (!order.billing.email) {
    errors.push('El email del destinatario es requerido')
  }

  if (!order.billing.phone) {
    errors.push('El teléfono del destinatario es requerido')
  }

  if (!order.shipping.first_name && !order.billing.first_name) {
    errors.push('El nombre del destinatario es requerido')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
