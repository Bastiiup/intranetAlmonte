/**
 * Tipos TypeScript para Shipit API
 */

// Tipos de envío
export type ShipitShipmentKind = 0 | 1 | 2 // 0: normal, 1: express, 2: same_day
export type ShipitPlatform = 2 // 2: WooCommerce
export type ShipitDeliveryKind = 'home_delivery' | 'pickup' | 'warehouse'

// Dimensiones del paquete
export type ShipitSizes = {
  width: number  // cm
  height: number // cm
  length: number // cm
  weight: number // kg
}

// Información del destinatario
export type ShipitDestiny = {
  street: string
  number: string
  complement?: string
  commune_id: number
  commune_name: string
  full_name: string
  email: string
  phone: string
  kind: ShipitDeliveryKind
}

// Información del seguro
export type ShipitInsurance = {
  ticket_amount: number
  ticket_number?: string
  price: number
  detail?: string | null
  extra: boolean
}

// Información del courier
export type ShipitCourier = {
  client: string // ej: "shippify", "chilexpress", etc.
}

// Datos para crear un envío
export type ShipitCreateShipment = {
  shipment: {
    kind: ShipitShipmentKind
    platform: ShipitPlatform
    reference: string // ID del pedido WooCommerce (puede tener prefijo "TEST-")
    items: number
    sizes: ShipitSizes
    courier: ShipitCourier
    destiny: ShipitDestiny
    insurance: ShipitInsurance
  }
}

// Respuesta al crear un envío
export type ShipitShipmentResponse = {
  id: number
  reference: string
  tracking_number?: string
  status: string
  courier: {
    name: string
    client: string
  }
  destiny: ShipitDestiny
  sizes: ShipitSizes
  created_at: string
  updated_at: string
  tracking_url?: string
}

// Estado de un envío
export type ShipitShipmentStatus = {
  id: number
  status: string
  status_detail?: string
  tracking_number?: string
  courier?: {
    name: string
    client: string
  }
  updated_at: string
  events?: Array<{
    date: string
    status: string
    description: string
  }>
}

// Webhook de Shipit
export type ShipitWebhook = {
  event: string // ej: "shipment.status_changed", "shipment.delivered"
  shipment_id: number
  reference: string
  status: string
  status_detail?: string
  tracking_number?: string
  timestamp: string
  data?: Record<string, any>
}

// Cobertura de servicio
export type ShipitCoverage = {
  commune_id: number
  commune_name: string
  available: boolean
  couriers?: Array<{
    name: string
    client: string
    available: boolean
  }>
}

// Cotización/Tarifa de envío
export type ShipitRate = {
  courier: {
    name: string
    client: string
  }
  price: number
  estimated_days?: number
  available: boolean
  kind: 0 | 1 | 2
}

// Error de Shipit
export type ShipitError = {
  error: string
  message: string
  details?: Record<string, any>
}
