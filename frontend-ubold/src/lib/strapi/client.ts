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
  console.log('[Strapi Client] Response status:', response.status)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Strapi Client] ❌ Error response:', errorText)
    
    let errorData
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { message: errorText }
    }
    
    const error: any = new Error(
      errorData.error?.message || 
      errorData.message || 
      `HTTP error! status: ${response.status}`
    )
    error.status = response.status
    error.details = errorData.error?.details || errorData.details
    throw error
  }

  const data = await response.json()
  
  // CRÍTICO: NO transformar las keys aquí
  // Retornar los datos tal cual vienen de Strapi
  return data
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
      // Convertir headers a objeto para poder acceder a las propiedades
      const headersObj = headers instanceof Headers 
        ? Object.fromEntries(headers.entries())
        : Array.isArray(headers)
        ? Object.fromEntries(headers)
        : headers as Record<string, string>
      
      console.log('[Strapi Client GET] Petición:', {
        url,
        path,
        tieneToken: !!STRAPI_API_TOKEN,
        tieneAuthHeader: !!headersObj['Authorization'],
        headersKeys: Object.keys(headersObj),
      })
    }
    
    // Crear un AbortController para timeout (25 segundos para operaciones de lectura)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 segundos
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        ...options,
      })
      
      clearTimeout(timeoutId)
      
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
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Timeout: La petición a Strapi tardó más de 25 segundos') as Error & { status?: number }
        timeoutError.status = 504
        throw timeoutError
      }
      throw error
    }
  },

  /**
   * Realiza una petición POST
   * @param path - Ruta de la API
   * @param data - Datos a enviar
   * @param options - Opciones adicionales de fetch
   */
  async post<T>(path: string, data?: unknown, options?: RequestInit): Promise<T> {
    const url = getStrapiUrl(path)
    
    // LOG para debug - verificar keys antes de enviar
    if (data && typeof data === 'object') {
      const dataObj = data as any
      if (dataObj.data) {
        const keys = Object.keys(dataObj.data)
        // Verificar solo keys que tienen mayúsculas en medio (no camelCase válido)
        // camelCase válido: originPlatform, externalIds, wooId (primera letra minúscula, resto camelCase)
        // Problemático: OriginPlatform, EXTERNAL_IDS, WooId (mayúscula al inicio o todo mayúsculas)
        const problematicKeys = keys.filter(k => {
          // Ignorar camelCase válido (primera letra minúscula)
          if (k[0] === k[0].toLowerCase()) {
            return false // Es camelCase válido
          }
          // Detectar si tiene mayúsculas al inicio o todo mayúsculas
          return k !== k.toLowerCase() && (k[0] === k[0].toUpperCase() || k === k.toUpperCase())
        })
        
        if (problematicKeys.length > 0) {
          console.warn('[Strapi POST] ⚠️ ADVERTENCIA: Keys con formato problemático (no camelCase):', problematicKeys)
          console.warn('[Strapi POST] ℹ️  Nota: camelCase válido (ej: originPlatform, externalIds) es aceptado por Strapi')
        }
      }
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(options?.headers),
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
        ...options,
      })
      
      clearTimeout(timeoutId)
      return handleResponse<T>(response)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Timeout: La petición a Strapi tardó más de 60 segundos') as Error & { status?: number }
        timeoutError.status = 504
        throw timeoutError
      }
      throw error
    }
  },

  /**
   * Realiza una petición PUT
   * @param path - Ruta de la API
   * @param data - Datos a enviar
   * @param options - Opciones adicionales de fetch
   */
  async put<T>(path: string, data?: unknown, options?: RequestInit): Promise<T> {
    const url = getStrapiUrl(path)
    
    // LOG para debug - verificar keys antes de enviar
    // NOTA: Strapi acepta camelCase (ej: originPlatform, externalIds) - el warning es solo informativo
    if (data && typeof data === 'object') {
      const dataObj = data as any
      if (dataObj.data) {
        const keys = Object.keys(dataObj.data)
        // Verificar solo keys que tienen mayúsculas en medio (no camelCase válido)
        // camelCase válido: originPlatform, externalIds, wooId (primera letra minúscula, resto camelCase)
        // Problemático: OriginPlatform, EXTERNAL_IDS, WooId (mayúscula al inicio o todo mayúsculas)
        const problematicKeys = keys.filter(k => {
          // Ignorar camelCase válido (primera letra minúscula)
          if (k[0] === k[0].toLowerCase()) {
            return false // Es camelCase válido
          }
          // Detectar si tiene mayúsculas al inicio o todo mayúsculas
          return k !== k.toLowerCase() && (k[0] === k[0].toUpperCase() || k === k.toUpperCase())
        })
        
        if (problematicKeys.length > 0) {
          console.warn('[Strapi PUT] ⚠️ ADVERTENCIA: Keys con formato problemático (no camelCase):', problematicKeys)
          console.warn('[Strapi PUT] ℹ️  Nota: camelCase válido (ej: originPlatform, externalIds) es aceptado por Strapi')
        }
      }
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(options?.headers),
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
        ...options,
      })
      
      clearTimeout(timeoutId)
      
      // Log respuesta antes de manejar errores
      if (!response.ok) {
        console.error('[Strapi Client PUT] ❌ Error en respuesta:', {
          url,
          status: response.status,
          statusText: response.statusText,
        })
      }
      
      return handleResponse<T>(response)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Timeout: La petición a Strapi tardó más de 60 segundos') as Error & { status?: number }
        timeoutError.status = 504
        throw timeoutError
      }
      throw error
    }
  },

  /**
   * Realiza una petición DELETE
   * @param path - Ruta de la API
   * @param options - Opciones adicionales de fetch
   */
  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    const url = getStrapiUrl(path)
    
    // Crear un AbortController para timeout (20 segundos para operaciones de escritura)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 segundos
    
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(options?.headers),
        signal: controller.signal,
        ...options,
      })
      
      clearTimeout(timeoutId)
      
      // Log respuesta antes de manejar errores
      if (!response.ok) {
        console.error('[Strapi Client DELETE] ❌ Error en respuesta:', {
          url,
          status: response.status,
          statusText: response.statusText,
        })
      }
      
      return handleResponse<T>(response)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Timeout: La petición a Strapi tardó más de 20 segundos') as Error & { status?: number }
        timeoutError.status = 504
        throw timeoutError
      }
      throw error
    }
  },
}

export default strapiClient



