/**
 * Configuración de Strapi
 * 
 * Lee las variables de entorno y exporta la configuración necesaria
 * para conectarse con la API de Strapi.
 */

// URL base de Strapi (debe empezar con NEXT_PUBLIC_ para estar disponible en el cliente)
export const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'

// Token de API de Strapi (solo disponible en el servidor)
export const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

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


