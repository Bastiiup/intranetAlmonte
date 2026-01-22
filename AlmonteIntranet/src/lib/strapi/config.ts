/**
 * Configuración de Strapi
 * 
 * Lee las variables de entorno y exporta la configuración necesaria
 * para conectarse con la API de Strapi.
 * 
 * En desarrollo local:
 * - Usa NEXT_PUBLIC_STRAPI_URL_LOCAL si está definida (para Strapi local)
 * - Si no, usa NEXT_PUBLIC_STRAPI_URL (para Strapi de producción/staging)
 * 
 * En producción (Railway):
 * - Siempre usa NEXT_PUBLIC_STRAPI_URL (definida en Railway)
 */

// Detectar si estamos en desarrollo local
const isDevelopment = process.env.NODE_ENV === 'development'

// URL base de Strapi
// En desarrollo: prioriza la URL local si está definida
// En producción: usa la URL de producción (definida en Railway)
const getStrapiApiUrl = (): string => {
  // En desarrollo, primero intentar usar Strapi local
  if (isDevelopment && process.env.NEXT_PUBLIC_STRAPI_URL_LOCAL) {
    return process.env.NEXT_PUBLIC_STRAPI_URL_LOCAL
  }
  
  // Si no hay URL local o estamos en producción, usar la URL de producción
  return process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
}

export const STRAPI_API_URL = getStrapiApiUrl()

// Token de API de Strapi
// En desarrollo: puede usar STRAPI_API_TOKEN_LOCAL para Strapi local
// En producción: usa STRAPI_API_TOKEN (definida en Railway)
const getStrapiApiToken = (): string | undefined => {
  // En desarrollo, primero intentar usar token local
  if (isDevelopment && process.env.STRAPI_API_TOKEN_LOCAL) {
    return process.env.STRAPI_API_TOKEN_LOCAL
  }
  
  // Si no hay token local o estamos en producción, usar el token de producción
  return process.env.STRAPI_API_TOKEN
}

export const STRAPI_API_TOKEN = getStrapiApiToken()

// Log de configuración en desarrollo
if (isDevelopment) {
  console.log('[Strapi Config] 🔧 Configuración de desarrollo:', {
    url: STRAPI_API_URL,
    tieneToken: !!STRAPI_API_TOKEN,
    usandoLocal: !!process.env.NEXT_PUBLIC_STRAPI_URL_LOCAL,
    usandoTokenLocal: !!process.env.STRAPI_API_TOKEN_LOCAL,
  })
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


