/**
 * Barrel file para exportar todo lo relacionado con WooCommerce
 */

import wooCommerceClient from './client'
import { WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY, WOOCOMMERCE_CONSUMER_SECRET, getWooCommerceUrl } from './config'
export type { WooCommerceProduct, WooCommerceOrder, CartItem } from './types'

export { wooCommerceClient, WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY, WOOCOMMERCE_CONSUMER_SECRET, getWooCommerceUrl }


