/**
 * Configuración de Shipit API
 * 
 * Lee las variables de entorno y exporta la configuración necesaria
 * para conectarse con la API de Shipit.
 */

// URL base de la API de Shipit
export const SHIPIT_API_URL = process.env.SHIPIT_API_URL || 'https://api.shipit.cl/v4'

// Token de acceso de Shipit (solo disponible en el servidor)
export const SHIPIT_API_TOKEN = process.env.SHIPIT_API_TOKEN || ''

// Email asociado a la cuenta de Shipit (requerido para autenticación)
// Este es el email con el que te registraste en Shipit
export const SHIPIT_API_EMAIL = process.env.SHIPIT_API_EMAIL || ''

// Validar que las credenciales existan en producción
if (process.env.NODE_ENV === 'production') {
  if (!SHIPIT_API_TOKEN) {
    console.warn('⚠️  Shipit API token no está configurado. La integración no funcionará correctamente.')
  }
  if (!SHIPIT_API_EMAIL) {
    console.warn('⚠️  SHIPIT_API_EMAIL no está configurado. La autenticación puede fallar.')
  }
}

// Helper para construir URLs completas de la API de Shipit
export const getShipitUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${SHIPIT_API_URL}/${cleanPath}`
}
