/**
 * Configuración de WooCommerce API REST
 * 
 * Lee las variables de entorno y exporta la configuración necesaria
 * para conectarse con la API REST de WooCommerce.
 */

// URL base de WooCommerce (debe empezar con NEXT_PUBLIC_ para estar disponible en el cliente)
export const WOOCOMMERCE_URL = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || 'https://staging.escolar.cl'

// Credenciales de API de WooCommerce (solo disponibles en el servidor)
export const WOOCOMMERCE_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || ''
export const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || ''

// Validar que las credenciales existan en producción
if (process.env.NODE_ENV === 'production' && (!WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET)) {
  console.warn('⚠️  WooCommerce API credentials no están configuradas. El POS no funcionará correctamente.')
}

// Helper para construir URLs completas de la API REST de WooCommerce
export const getWooCommerceUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${WOOCOMMERCE_URL}/wp-json/wc/v3/${cleanPath}`
}
