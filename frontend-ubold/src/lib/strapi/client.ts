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
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(options?.headers),
      ...options,
    })
    
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

