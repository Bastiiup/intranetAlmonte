/**
 * Tipos TypeScript para WooCommerce API
 */

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
  meta_data?: Array<{
    id: number
    key: string
    value: string | number
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
    sku: string
    price: string
    meta_data?: Array<{
      id: number
      key: string
      value: string | number
    }>
  }>
  tax_lines?: Array<{
    id: number
    rate_code: string
    rate_id: number
    label: string
    compound: boolean
    tax_total: string
    shipping_tax_total: string
  }>
  shipping_lines?: Array<{
    id: number
    method_title: string
    method_id: string
    total: string
    total_tax: string
  }>
  fee_lines?: Array<{
    id: number
    name: string
    tax_class: string
    tax_status: string
    total: string
    total_tax: string
  }>
  coupon_lines?: Array<{
    id: number
    code: string
    discount: string
    discount_tax: string
  }>
  refunds?: Array<{
    id: number
    reason: string
    total: string
  }>
  _links?: {
    self: Array<{ href: string }>
    collection: Array<{ href: string }>
  }
}

// Tipo para items del carrito en el POS
export type CartItem = {
  product: WooCommerceProduct
  quantity: number
  subtotal: number
  total: number
}




