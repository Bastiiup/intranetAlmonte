/**
 * Cliente HTTP para WooCommerce REST API
 * 
 * Maneja la autenticación y las peticiones a la API REST de WooCommerce
 * usando Consumer Key y Consumer Secret con autenticación básica HTTP.
 */

import { getWooCommerceUrl, WOOCOMMERCE_CONSUMER_KEY, WOOCOMMERCE_CONSUMER_SECRET } from './config'

// Tipos para respuestas de WooCommerce
export type WooCommerceError = {
  code: string
  message: string
  data?: {
    status: number
  }
}

export type WooCommerceProduct = {
  id: number
  name: string
  slug: string
  permalink: string
  type: string
  status: string
  featured: boolean
  catalog_visibility: string
  description: string
  short_description: string
  sku: string
  price: string
  regular_price: string
  sale_price: string
  on_sale: boolean
  purchasable: boolean
  total_sales: number
  virtual: boolean
  downloadable: boolean
  manage_stock: boolean
  stock_quantity: number | null
  stock_status: 'instock' | 'outofstock' | 'onbackorder'
  backorders: string
  backorders_allowed: boolean
  backordered: boolean
  sold_individually: boolean
  weight: string
  dimensions: {
    length: string
    width: string
    height: string
  }
  shipping_required: boolean
  shipping_taxable: boolean
  shipping_class: string
  shipping_class_id: number
  reviews_allowed: boolean
  average_rating: string
  rating_count: number
  related_ids: number[]
  upsell_ids: number[]
  cross_sell_ids: number[]
  parent_id: number
  purchase_note: string
  categories: Array<{
    id: number
    name: string
    slug: string
  }>
  tags: Array<{
    id: number
    name: string
    slug: string
  }>
  images: Array<{
    id: number
    src: string
    name: string
    alt: string
  }>
  attributes: Array<{
    id: number
    name: string
    slug: string
    position: number
    visible: boolean
    variation: boolean
    options: string[]
  }>
  default_attributes: Array<{
    id: number
    name: string
    option: string
  }>
  variations: number[]
  grouped_products: number[]
  menu_order: number
  meta_data: Array<{
    id: number
    key: string
    value: string
  }>
  date_created: string
  date_created_gmt: string
  date_modified: string
  date_modified_gmt: string
  _links: {
    self: Array<{ href: string }>
    collection: Array<{ href: string }>
  }
}

export type WooCommerceOrder = {
  id: number
  parent_id: number
  status: string
  currency: string
  date_created: string
  date_modified: string
  discount_total: string
  discount_tax: string
  shipping_total: string
  shipping_tax: string
  cart_tax: string
  total: string
  total_tax: string
  customer_id: number
  order_key: string
  billing: {
    first_name: string
    last_name: string
    company: string
    address_1: string
    address_2: string
    city: string
    state: string
    postcode: string
    country: string
    email: string
    phone: string
  }
  shipping: {
    first_name: string
    last_name: string
    company: string
    address_1: string
    address_2: string
    city: string
    state: string
    postcode: string
    country: string
  }
  payment_method: string
  payment_method_title: string
  transaction_id: string
  customer_ip_address: string
  customer_user_agent: string
  created_via: string
  customer_note: string
  date_completed: string | null
  date_paid: string | null
  cart_hash: string
  number: string
  meta_data: Array<{
    id: number
    key: string
    value: string
  }>
  line_items: Array<{
    id: number
    name: string
    product_id: number
    variation_id: number
    quantity: number
    tax_class: string
    subtotal: string
    subtotal_tax: string
    total: string
    total_tax: string
    taxes: Array<{
      id: number
      total: string
      subtotal: string
    }>
    meta_data: Array<{
      id: number
      key: string
      value: string
    }>
    sku: string
    price: string
  }>
  tax_lines: Array<{
    id: number
    rate_code: string
    rate_id: number
    label: string
    compound: boolean
    tax_total: string
    shipping_tax_total: string
    meta_data: Array<{
      id: number
      key: string
      value: string
    }>
  }>
  shipping_lines: Array<{
    id: number
    method_title: string
    method_id: string
    instance_id: string
    total: string
    total_tax: string
    taxes: Array<{
      id: number
      total: string
      subtotal: string
    }>
    meta_data: Array<{
      id: number
      key: string
      value: string
    }>
  }>
  fee_lines: Array<{
    id: number
    name: string
    tax_class: string
    tax_status: string
    total: string
    total_tax: string
    taxes: Array<{
      id: number
      total: string
      subtotal: string
    }>
    meta_data: Array<{
      id: number
      key: string
      value: string
    }>
  }>
  coupon_lines: Array<{
    id: number
    code: string
    discount: string
    discount_tax: string
    meta_data: Array<{
      id: number
      key: string
      value: string
    }>
  }>
  refunds: Array<{
    id: number
    reason: string
    total: string
  }>
  _links: {
    self: Array<{ href: string }>
    collection: Array<{ href: string }>
  }
}

// Crear credenciales básicas para autenticación HTTP
const getAuthHeader = (): string => {
  if (!WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
    throw new Error('WooCommerce API credentials are not configured')
  }
  // WooCommerce usa Basic Auth con Consumer Key como usuario y Consumer Secret como contraseña
  // Usar btoa para codificar en base64 (disponible en navegador y Node.js)
  const credentials = `${WOOCOMMERCE_CONSUMER_KEY}:${WOOCOMMERCE_CONSUMER_SECRET}`
  if (typeof Buffer !== 'undefined') {
    // Node.js
    return `Basic ${Buffer.from(credentials).toString('base64')}`
  } else {
    // Navegador
    return `Basic ${btoa(credentials)}`
  }
}

// Manejar respuestas de error
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: WooCommerceError | null = null
    try {
      errorData = await response.json()
    } catch {
      // Si no es JSON, crear error genérico
    }
    const error = new Error(
      errorData?.message || `HTTP error! status: ${response.status}`
    ) as Error & { status?: number; code?: string; details?: unknown }
    error.status = response.status
    error.code = errorData?.code
    error.details = errorData
    throw error
  }
  return response.json()
}

// Cliente WooCommerce
const wooCommerceClient = {
  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(getWooCommerceUrl(path))
    
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
    })

    return handleResponse<T>(response)
  },

  async post<T>(path: string, data: any): Promise<T> {
    const url = getWooCommerceUrl(path)
    
    // Agregar timeout para evitar que se quede colgado
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader(),
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      return handleResponse<T>(response)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Timeout: La petición a WooCommerce tardó más de 30 segundos') as Error & { status?: number }
        timeoutError.status = 504
        throw timeoutError
      }
      throw error
    }
  },

  async put<T>(path: string, data: any): Promise<T> {
    const url = getWooCommerceUrl(path)
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify(data),
    })

    return handleResponse<T>(response)
  },

  async delete<T>(path: string, force = false): Promise<T> {
    const url = new URL(getWooCommerceUrl(path))
    if (force) {
      url.searchParams.append('force', 'true')
    }

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
    })

    return handleResponse<T>(response)
  },
}

export default wooCommerceClient

