/**
 * Configuración de Strapi
 * 
 * Lee las variables de entorno y exporta la configuración necesaria
 * para conectarse con la API de Strapi.
 * 
 * Prioridad de configuración:
 * 1. Si STRAPI_FORCE_REMOTE=true, siempre usa remoto (incluso en desarrollo)
 * 2. Si NEXT_PUBLIC_STRAPI_URL_LOCAL está definida Y no se fuerza remoto, usa local
 * 3. Si no, usa NEXT_PUBLIC_STRAPI_URL (remoto)
 * 
 * En producción (Railway):
 * - Siempre usa NEXT_PUBLIC_STRAPI_URL (definida en Railway)
 */

// Detectar si estamos en desarrollo local
const isDevelopment = process.env.NODE_ENV === 'development'

// Verificar si se fuerza el uso del remoto
const forceRemote = process.env.STRAPI_FORCE_REMOTE === 'true' || process.env.STRAPI_FORCE_REMOTE === '1'

// Normalizar URL: sin barra final para evitar dobles barras (//api/...)
const normalizeBaseUrl = (url: string): string => (url || '').replace(/\/+$/, '')

// URL base de Strapi (siempre sin barra final)
const getStrapiApiUrl = (): string => {
  let url: string
  if (forceRemote) {
    url = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
  } else if (isDevelopment && process.env.NEXT_PUBLIC_STRAPI_URL_LOCAL) {
    url = process.env.NEXT_PUBLIC_STRAPI_URL_LOCAL
  } else {
    url = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
  }
  return normalizeBaseUrl(url)
}

export const STRAPI_API_URL = getStrapiApiUrl()

// Token de API de Strapi
const getStrapiApiToken = (): string | undefined => {
  // Si se fuerza remoto, siempre usar token remoto
  if (forceRemote) {
    return process.env.STRAPI_API_TOKEN
  }
  
  // En desarrollo, usar token local solo si está explícitamente configurado
  if (isDevelopment && process.env.STRAPI_API_TOKEN_LOCAL) {
    return process.env.STRAPI_API_TOKEN_LOCAL
  }
  
  // Por defecto, usar el token remoto
  return process.env.STRAPI_API_TOKEN
}

export const STRAPI_API_TOKEN = getStrapiApiToken()

// Log de configuración en desarrollo
if (isDevelopment) {
  console.log('[Strapi Config] 🔧 Configuración de desarrollo:', {
    url: STRAPI_API_URL,
    tieneToken: !!STRAPI_API_TOKEN,
    forceRemote,
    usandoLocal: !forceRemote && !!process.env.NEXT_PUBLIC_STRAPI_URL_LOCAL,
    usandoTokenLocal: !forceRemote && !!process.env.STRAPI_API_TOKEN_LOCAL,
    urlSource: forceRemote 
      ? 'FORCED_REMOTE' 
      : (process.env.NEXT_PUBLIC_STRAPI_URL_LOCAL ? 'LOCAL' : 'REMOTE'),
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


