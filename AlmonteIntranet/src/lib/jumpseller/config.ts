/**
 * Configuración de JumpSeller API
 * 
 * Lee las variables de entorno y exporta la configuración necesaria
 * para conectarse con la API de JumpSeller.
 * 
 * Documentación: https://developers.jumpseller.com/
 * 
 * IMPORTANTE: JumpSeller usa Basic Authentication con:
 * - Usuario: API Key (Login)
 * - Contraseña: API Secret (Auth Token)
 */

// URL base de la API de JumpSeller
export const JUMPSELLER_API_URL = process.env.JUMPSELLER_API_URL || 'https://api.jumpseller.com'
export const JUMPSELLER_API_BASE = `${JUMPSELLER_API_URL}/v1`

// API Key (Login) de JumpSeller - se usa como usuario en Basic Auth
export const JUMPSELLER_API_KEY = process.env.JUMPSELLER_API_KEY || ''

// API Secret (Auth Token) de JumpSeller - se usa como contraseña en Basic Auth
export const JUMPSELLER_API_SECRET = process.env.JUMPSELLER_API_SECRET || ''

// Validar que las credenciales existan en producción
if (process.env.NODE_ENV === 'production') {
  if (!JUMPSELLER_API_KEY) {
    console.warn('⚠️  JumpSeller API Key (Login) no está configurado. La integración no funcionará correctamente.')
  }
  if (!JUMPSELLER_API_SECRET) {
    console.warn('⚠️  JumpSeller API Secret (Auth Token) no está configurado. La integración no funcionará correctamente.')
  }
}

// Helper para construir URLs completas de la API de JumpSeller
export const getJumpSellerUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  // Asegurar que el path incluya .json si no lo tiene
  const finalPath = cleanPath.endsWith('.json') ? cleanPath : `${cleanPath}.json`
  return `${JUMPSELLER_API_BASE}/${finalPath}`
}

