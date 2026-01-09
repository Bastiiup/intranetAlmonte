/**
 * Cliente HTTP para Shipit API
 * 
 * Maneja la autenticación y las peticiones a la API de Shipit
 * usando Token de Acceso.
 */

import { getShipitUrl, SHIPIT_API_TOKEN, SHIPIT_API_EMAIL } from './config'
import type { ShipitError } from './types'

// Crear headers de autenticación para Shipit
// Según la documentación oficial: https://developers.shipit.cl/
// Shipit API v4 requiere:
// - X-Shipit-Email: Email de la cuenta de Shipit
// - X-Shipit-Access-Token: Token de acceso
// - Accept: application/vnd.shipit.v2 (o v4 según la versión)
const getAuthHeaders = (): Record<string, string> => {
  if (!SHIPIT_API_TOKEN) {
    throw new Error('Shipit API token no está configurado')
  }

  if (!SHIPIT_API_EMAIL) {
    console.warn('⚠️  SHIPIT_API_EMAIL no está configurado. La autenticación puede fallar.')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.shipit.v4', // Aceptar respuesta v4
    'X-Shipit-Access-Token': SHIPIT_API_TOKEN,
  }

  // Email es requerido para autenticación
  if (SHIPIT_API_EMAIL) {
    headers['X-Shipit-Email'] = SHIPIT_API_EMAIL
  }

  return headers
}

// Manejar respuestas de error
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ShipitError | null = null
    try {
      errorData = await response.json()
    } catch {
      // Si no es JSON, crear error genérico
    }
    const error = new Error(
      errorData?.message || `HTTP error! status: ${response.status}`
    ) as Error & { status?: number; error?: string; details?: unknown }
    error.status = response.status
    error.error = errorData?.error
    error.details = errorData
    throw error
  }
  return response.json()
}

// Cliente Shipit
const shipitClient = {
  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(getShipitUrl(path))
    
    // Agregar parámetros de consulta
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<T>(response)
  },

  async post<T>(path: string, data: any): Promise<T> {
    const url = getShipitUrl(path)
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })

    return handleResponse<T>(response)
  },

  async put<T>(path: string, data: any): Promise<T> {
    const url = getShipitUrl(path)
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })

    return handleResponse<T>(response)
  },

  async delete<T>(path: string): Promise<T> {
    const url = getShipitUrl(path)
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    return handleResponse<T>(response)
  },
}

export default shipitClient
