/**
 * Tipos TypeScript para JumpSeller API
 * 
 * Basado en la documentación oficial de JumpSeller API
 */

export type JumpSellerError = {
  error?: string
  message?: string
  errors?: Array<{
    field: string
    message: string
  }>
}

export type JumpSellerOrder = {
  id: number
  order_number: string
  status: string
  created_at: string
  updated_at: string
  currency: string
  subtotal: string
  total: string
  total_tax: string
  shipping_total: string
  discount_total: string
  customer: {
    id: number
    email: string
    first_name: string
    last_name: string
    phone?: string
  }
  billing_address: {
    first_name: string
    last_name: string
    company?: string
    address_1: string
    address_2?: string
    city: string
    state: string
    postcode: string
    country: string
    email: string
    phone?: string
  }
  shipping_address: {
    first_name: string
    last_name: string
    company?: string
    address_1: string
    address_2?: string
    city: string
    state: string
    postcode: string
    country: string
  }
  line_items: Array<{
    id: number
    product_id: number
    variant_id?: number
    name: string
    sku: string
    quantity: number
    price: string
    total: string
  }>
  payment_method?: string
  payment_method_title?: string
  shipping_method?: string
  shipping_method_title?: string
  customer_note?: string
  internal_note?: string
  meta_data?: Array<{
    key: string
    value: string
  }>
}

export type JumpSellerOrderUpdate = {
  status?: string
  customer_note?: string
  internal_note?: string
  shipping_method?: string
  shipping_method_title?: string
  line_items?: Array<{
    id?: number
    product_id: number
    variant_id?: number
    quantity: number
  }>
  meta_data?: Array<{
    key: string
    value: string
  }>
}

export type JumpSellerOrderListParams = {
  page?: number
  per_page?: number
  status?: string
  customer_id?: number
  created_at_min?: string
  created_at_max?: string
  updated_at_min?: string
  updated_at_max?: string
}


