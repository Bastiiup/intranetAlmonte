/**
 * Cliente HTTP para Strapi
 * 
 * Proporciona métodos convenientes para hacer peticiones a la API de Strapi
 * con autenticación y manejo de errores incluidos.
 */

import { getStrapiUrl, STRAPI_API_TOKEN } from './config'
import type { StrapiError, StrapiResponse } from './types'

// Opciones por defecto para las peticiones
const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
}

// Construir headers con autenticación si el token está disponible
const getHeaders = (customHeaders?: HeadersInit): HeadersInit => {
  const headers: Record<string, string> = { ...defaultHeaders }
  
  // Agregar headers personalizados si existen
  if (customHeaders) {
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((value, key) => {
        headers[key] = value
      })
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, value]) => {
        headers[key] = value
      })
    } else {
      Object.assign(headers, customHeaders)
    }
  }
  
  // Agregar token de autenticación si está disponible (solo en servidor)
  if (STRAPI_API_TOKEN) {
    headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`
    // Log solo en desarrollo o si hay problema
    if (process.env.NODE_ENV !== 'production' || !STRAPI_API_TOKEN) {
      console.log('[Strapi Client] Token configurado:', {
        tieneToken: !!STRAPI_API_TOKEN,
        tokenLength: STRAPI_API_TOKEN?.length,
        tokenPreview: STRAPI_API_TOKEN ? `${STRAPI_API_TOKEN.substring(0, 10)}...` : 'NO CONFIGURADO'
      })
    }
  } else {
    console.warn('[Strapi Client] ⚠️ STRAPI_API_TOKEN no está disponible en getHeaders()')
  }
  
  return headers
}

// Manejar errores de respuesta
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: StrapiError | null = null
    
    try {
      errorData = await response.json()
    } catch {
      // Si no se puede parsear como JSON, crear un error genérico
    }
    
    const error = new Error(
      errorData?.error?.message || `HTTP error! status: ${response.status}`
    ) as Error & { status?: number; details?: unknown }
    
    error.status = response.status
    error.details = errorData?.error?.details
    
    throw error
  }
  
  return response.json()
}

// Cliente de Strapi
const strapiClient = {
  /**
   * Realiza una petición GET
   * @param path - Ruta de la API (ej: '/api/productos' o 'api/productos')
   * @param options - Opciones adicionales de fetch
   */
  async get<T>(path: string, options?: RequestInit): Promise<T> {
    const url = getStrapiUrl(path)
    const headers = getHeaders(options?.headers)
    
    // Logs detallados para debugging (solo en desarrollo o si hay error)
    if (process.env.NODE_ENV !== 'production' || !STRAPI_API_TOKEN) {
      console.log('[Strapi Client GET] Petición:', {
        url,
        path,
        tieneToken: !!STRAPI_API_TOKEN,
        tieneAuthHeader: !!headers['Authorization'],
        headersKeys: Object.keys(headers),
      })
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      ...options,
    })
    
    // Log respuesta antes de manejar errores
    if (!response.ok) {
      console.error('[Strapi Client GET] ❌ Error en respuesta:', {
        url,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        tieneToken: !!STRAPI_API_TOKEN,
      })
    }
    
    return handleResponse<T>(response)
  },

  /**
   * Realiza una petición POST
   * @param path - Ruta de la API
   * @param data - Datos a enviar
   * @param options - Opciones adicionales de fetch
   */
  async post<T>(path: string, data?: unknown, options?: RequestInit): Promise<T> {
    const url = getStrapiUrl(path)
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(options?.headers),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
    
    return handleResponse<T>(response)
  },

  /**
   * Realiza una petición PUT
   * @param path - Ruta de la API
   * @param data - Datos a enviar
   * @param options - Opciones adicionales de fetch
   */
  async put<T>(path: string, data?: unknown, options?: RequestInit): Promise<T> {
    const url = getStrapiUrl(path)
    const response = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(options?.headers),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
    
    return handleResponse<T>(response)
  },

  /**
   * Realiza una petición DELETE
   * @param path - Ruta de la API
   * @param options - Opciones adicionales de fetch
   */
  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    const url = getStrapiUrl(path)
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(options?.headers),
      ...options,
    })
    
    return handleResponse<T>(response)
  },
}

export default strapiClient

