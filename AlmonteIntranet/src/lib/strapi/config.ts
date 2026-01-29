/**
 * Configuración de Strapi
 * 
 * Lee las variables de entorno y exporta la configuración necesaria
 * para conectarse con la API de Strapi.
 */

// URL base de Strapi (debe empezar con NEXT_PUBLIC_ para estar disponible en el cliente)
export const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi-pruebas-production.up.railway.app'

// Token de API de Strapi (solo disponible en el servidor)
export const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

// Log en desarrollo para verificar configuración
if (process.env.NODE_ENV !== 'production') {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi-pruebas-production.up.railway.app'
  console.log('[Strapi Config] 🔍 Configuración:', {
    url: strapiUrl,
    urlFromEnv: process.env.NEXT_PUBLIC_STRAPI_URL || 'NO DEFINIDO (usando default)',
    tieneToken: !!STRAPI_API_TOKEN,
    tokenLength: STRAPI_API_TOKEN?.length || 0,
    tokenPreview: STRAPI_API_TOKEN ? `${STRAPI_API_TOKEN.substring(0, 20)}...` : 'NO CONFIGURADO',
    nodeEnv: process.env.NODE_ENV,
  })
  // Verificar que la URL no sea la antigua
  if (strapiUrl.includes('strapi.moraleja.cl')) {
    console.error('[Strapi Config] ⚠️ ADVERTENCIA: Estás usando la URL antigua de Strapi!')
    console.error('[Strapi Config] Actualiza NEXT_PUBLIC_STRAPI_URL en .env.local')
  }
}

// Validar que el token exista en producción
if (process.env.NODE_ENV === 'production' && !STRAPI_API_TOKEN) {
  console.warn('⚠️  STRAPI_API_TOKEN no está configurado. Algunas peticiones pueden fallar.')
}

// Helper para construir URLs completas
export const getStrapiUrl = (path: string): string => {
  // Remover barra inicial si existe para evitar dobles barras
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${STRAPI_API_URL}/${cleanPath}`
}


