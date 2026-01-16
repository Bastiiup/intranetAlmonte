/**
 * Configuración de WooCommerce API REST
 * 
 * Lee las variables de entorno y exporta la configuración necesaria
 * para conectarse con la API REST de WooCommerce.
 */

// Configuración para WooCommerce Escolar (por defecto)
// Soporta múltiples nombres de variables para compatibilidad
export const WOOCOMMERCE_URL = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR 
  || process.env.WOO_ESCOLAR_URL 
  || process.env.NEXT_PUBLIC_WOOCOMMERCE_URL 
  || 'https://staging.escolar.cl'
export const WOOCOMMERCE_CONSUMER_KEY = process.env.WOO_ESCOLAR_CONSUMER_KEY 
  || process.env.WOOCOMMERCE_CONSUMER_KEY 
  || ''
export const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOO_ESCOLAR_CONSUMER_SECRET 
  || process.env.WOOCOMMERCE_CONSUMER_SECRET 
  || ''

// Configuración para WooCommerce Moraleja
export const WOO_MORALEJA_URL = process.env.NEXT_PUBLIC_WOO_MORALEJA_URL || process.env.WOO_MORALEJA_URL || 'https://staging.moraleja.cl'
export const WOO_MORALEJA_CONSUMER_KEY = process.env.WOO_MORALEJA_CONSUMER_KEY || ''
export const WOO_MORALEJA_CONSUMER_SECRET = process.env.WOO_MORALEJA_CONSUMER_SECRET || ''

// Validar que las credenciales existan en producción
if (process.env.NODE_ENV === 'production' && (!WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET)) {
  console.warn('⚠️  WooCommerce API credentials (Escolar) no están configuradas. El POS no funcionará correctamente.')
}

if (process.env.NODE_ENV === 'production' && (!WOO_MORALEJA_CONSUMER_KEY || !WOO_MORALEJA_CONSUMER_SECRET)) {
  console.warn('⚠️  WooCommerce API credentials (Moraleja) no están configuradas.')
}

// Helper para construir URLs completas de la API REST de WooCommerce
export const getWooCommerceUrl = (path: string, platform?: 'woo_moraleja' | 'woo_escolar'): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const baseUrl = platform === 'woo_moraleja' ? WOO_MORALEJA_URL : WOOCOMMERCE_URL
  return `${baseUrl}/wp-json/wc/v3/${cleanPath}`
}

// Helper para obtener credenciales según la plataforma
export const getWooCommerceCredentials = (platform: 'woo_moraleja' | 'woo_escolar'): { key: string; secret: string } => {
  if (platform === 'woo_moraleja') {
    return {
      key: WOO_MORALEJA_CONSUMER_KEY,
      secret: WOO_MORALEJA_CONSUMER_SECRET,
    }
  }
  return {
    key: WOOCOMMERCE_CONSUMER_KEY,
    secret: WOOCOMMERCE_CONSUMER_SECRET,
  }
}
