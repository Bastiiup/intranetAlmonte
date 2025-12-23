/**
 * Utilidades de autenticación
 * Maneja el almacenamiento y recuperación de datos de autenticación
 * usando tanto cookies (para SSR) como localStorage (para migración)
 */

/**
 * Obtiene el valor de una cookie por nombre
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()?.split(';').shift() || '')
  }
  return null
}

/**
 * Establece una cookie
 */
function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === 'undefined') return
  
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

/**
 * Elimina una cookie
 */
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

/**
 * Obtiene un valor del localStorage (con fallback a cookies)
 */
function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    // Primero intentar localStorage
    const value = localStorage.getItem(key)
    if (value) return value
    
    // Fallback a cookies
    return getCookie(key)
  } catch {
    // Si localStorage falla (modo incógnito), usar cookies
    return getCookie(key)
  }
}

/**
 * Establece un valor en localStorage y cookies
 */
function setStorageItem(key: string, value: string) {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(key, value)
  } catch {
    // Si localStorage falla, solo usar cookies
  }
  
  setCookie(key, value)
}

/**
 * Elimina un valor de localStorage y cookies
 */
function removeStorageItem(key: string) {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignorar errores
  }
  
  deleteCookie(key)
}

/**
 * Sincroniza datos del localStorage a cookies para migración transparente
 * Esto permite que los datos de autenticación almacenados en localStorage
 * se migren automáticamente a cookies para compatibilidad con SSR
 */
export function syncLocalStorageToCookies() {
  // Solo ejecutar en el cliente
  if (typeof window === 'undefined') {
    return
  }

  try {
    // Lista de claves del localStorage que queremos sincronizar a cookies
    const keysToSync = [
      'auth_token',
      'authToken',
      'token',
      'user',
      'userData',
      'colaborador',
      'colaboradorData',
    ]

    keysToSync.forEach((key) => {
      const value = localStorage.getItem(key)
      if (value) {
        // Crear cookie con el mismo valor
        // Expira en 7 días por defecto
        const expires = new Date()
        expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000)
        
        document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
      }
    })
  } catch (error) {
    // Silenciar errores de localStorage/cookies (puede fallar en modo incógnito)
    console.warn('[auth] Error al sincronizar localStorage a cookies:', error)
  }
}

/**
 * Obtiene el token de autenticación
 */
export function getAuthToken(): string | null {
  return getStorageItem('auth_token') || getStorageItem('authToken') || getStorageItem('token')
}

/**
 * Obtiene los datos del colaborador autenticado
 */
export function getAuthColaborador(): any | null {
  const colaboradorStr = getStorageItem('colaborador') || getStorageItem('colaboradorData')
  if (!colaboradorStr) return null
  
  try {
    return JSON.parse(colaboradorStr)
  } catch {
    return null
  }
}

/**
 * Obtiene los datos del usuario autenticado (alias de getAuthColaborador)
 */
export function getAuthUser(): any | null {
  const userStr = getStorageItem('user') || getStorageItem('userData')
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }
  
  // Fallback a colaborador
  return getAuthColaborador()
}

/**
 * Inicia sesión con email y contraseña
 */
export async function login(email: string, password: string): Promise<void> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || errorData.message || 'Error al iniciar sesión')
  }

  const data = await response.json()

  // Guardar token
  if (data.jwt) {
    setStorageItem('auth_token', data.jwt)
  }

  // Guardar colaborador (en ambas claves para compatibilidad)
  if (data.colaborador) {
    const colaboradorStr = JSON.stringify(data.colaborador)
    setStorageItem('colaborador', colaboradorStr)
    setStorageItem('colaboradorData', colaboradorStr) // El middleware busca esta clave
  }

  // Guardar usuario (si existe)
  if (data.usuario) {
    setStorageItem('user', JSON.stringify(data.usuario))
  }
}

/**
 * Limpia todos los datos de autenticación
 */
export function clearAuth(): void {
  const keysToRemove = [
    'auth_token',
    'authToken',
    'token',
    'user',
    'userData',
    'colaborador',
    'colaboradorData',
  ]

  keysToRemove.forEach((key) => {
    removeStorageItem(key)
  })
}
