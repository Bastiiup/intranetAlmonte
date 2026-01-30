/**
 * Tipos para el módulo de Operaciones
 * 
 * Define los tipos para pedidos sincronizados entre WeareCloud y JumpSeller
 */

import type { JumpSellerOrder } from '../jumpseller/types'

/**
 * Pedido de WeareCloud (obtenido vía scraping/microservicio Python)
 */
export type WeareCloudOrder = {
  id: string
  order_number: string
  status: string
  created_at: string
  updated_at: string
  customer: {
    email: string
    name: string
    phone?: string
  }
  items: Array<{
    sku: string
    name: string
    quantity: number
    price: string
  }>
  total: string
  shipping_address?: {
    address: string
    city: string
    state: string
    postcode: string
    country: string
  }
  notes?: string
  // Campos adicionales según lo que devuelva WeareCloud
  [key: string]: any
}

/**
 * Pedido sincronizado (unificado)
 */
export type SincronizedOrder = {
  id: string
  wearecloud_order?: WeareCloudOrder
  jumpseller_order?: JumpSellerOrder
  match_confidence: 'high' | 'medium' | 'low'
  match_reason?: string
  last_synced_at?: string
  sync_status: 'synced' | 'pending' | 'conflict' | 'error'
  sync_errors?: Array<{
    timestamp: string
    message: string
    source: 'wearecloud' | 'jumpseller'
  }>
}

/**
 * Parámetros para sincronizar pedidos
 */
export type SyncOrderParams = {
  wearecloud_order_id?: string
  jumpseller_order_id?: number
  force?: boolean
}

/**
 * Resultado de sincronización
 */
export type SyncResult = {
  success: boolean
  order: SincronizedOrder
  changes?: Array<{
    field: string
    old_value: any
    new_value: any
  }>
  error?: string
}


