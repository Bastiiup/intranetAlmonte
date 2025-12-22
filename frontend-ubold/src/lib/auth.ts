/**
 * Utilidades para manejo de autenticación
 * 
 * Almacena el JWT token en cookies (para middleware) y localStorage (para compatibilidad)
 * y proporciona funciones para login, logout y verificación de sesión
 */

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_KEY = 'auth_user'
const AUTH_COLABORADOR_KEY = 'auth_colaborador'

// Nombres de cookies (mismo nombre para compatibilidad)
const AUTH_TOKEN_COOKIE = 'auth_token'
const AUTH_USER_COOKIE = 'auth_user'
const AUTH_COLABORADOR_COOKIE = 'auth_colaborador'

// Duración de cookies: 30 días (mismo que "mantener sesión")
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 días en segundos

export interface AuthUser {
  id: number
  email: string
  username: string
}

export interface AuthColaborador {
  id: number
  email_login: string
  rol?: 'super_admin' | 'encargado_adquisiciones' | 'supervisor' | 'soporte'
  activo: boolean
  persona?: any
  empresa?: any
  [key: string]: any
}

export interface AuthResponse {
  jwt: string
  usuario: AuthUser
  colaborador?: AuthColaborador | null
}

/**
 * Establece una cookie de forma segura
 */
function setCookie(name: string, value: string, maxAge: number = COOKIE_MAX_AGE): void {
  if (typeof document === 'undefined') return
  // Usar SameSite=Strict y Secure en producción para mejor seguridad
  const isProduction = process.env.NODE_ENV === 'production'
  const secure = isProduction ? '; Secure' : ''
  const sameSite = '; SameSite=Strict'
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}${secure}${sameSite}`
}

/**
 * Elimina una cookie
 */
function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

/**
 * Lee una cookie
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length))
    }
  }
  return null
}

/**
 * Guarda los datos de autenticación en cookies Y localStorage (compatibilidad)
 */
export function setAuth(authData: AuthResponse): void {
  if (typeof window === 'undefined') return

  // Guardar en localStorage (mantener compatibilidad con código existente)
  localStorage.setItem(AUTH_TOKEN_KEY, authData.jwt)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authData.usuario))
  if (authData.colaborador) {
    localStorage.setItem(AUTH_COLABORADOR_KEY, JSON.stringify(authData.colaborador))
  }

  // Guardar en cookies (para middleware)
  setCookie(AUTH_TOKEN_COOKIE, authData.jwt)
  setCookie(AUTH_USER_COOKIE, JSON.stringify(authData.usuario))
  if (authData.colaborador) {
    setCookie(AUTH_COLABORADOR_COOKIE, JSON.stringify(authData.colaborador))
  }
}

/**
 * Obtiene el JWT token almacenado (intenta cookies primero, luego localStorage para compatibilidad)
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  
  // Intentar leer de cookies primero (para middleware)
  const cookieToken = getCookie(AUTH_TOKEN_COOKIE)
  if (cookieToken) return cookieToken
  
  // Fallback a localStorage (compatibilidad con código existente)
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

/**
 * Obtiene los datos del usuario autenticado (intenta cookies primero, luego localStorage)
 */
export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  
  // Intentar leer de cookies primero
  const cookieUser = getCookie(AUTH_USER_COOKIE)
  if (cookieUser) {
    try {
      return JSON.parse(cookieUser)
    } catch {
      // Si falla, continuar con localStorage
    }
  }
  
  // Fallback a localStorage
  const userStr = localStorage.getItem(AUTH_USER_KEY)
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Obtiene los datos del colaborador vinculado (intenta cookies primero, luego localStorage)
 */
export function getAuthColaborador(): AuthColaborador | null {
  if (typeof window === 'undefined') return null
  
  // Intentar leer de cookies primero
  const cookieColab = getCookie(AUTH_COLABORADOR_COOKIE)
  if (cookieColab) {
    try {
      return JSON.parse(cookieColab)
    } catch {
      // Si falla, continuar con localStorage
    }
  }
  
  // Fallback a localStorage
  const colaboradorStr = localStorage.getItem(AUTH_COLABORADOR_KEY)
  if (!colaboradorStr) return null
  try {
    return JSON.parse(colaboradorStr)
  } catch {
    return null
  }
}

/**
 * Verifica si hay una sesión activa (busca en cookies y localStorage)
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}

/**
 * Sincroniza datos de localStorage a cookies (útil para migración)
 * Si hay datos en localStorage pero no en cookies, los copia a cookies
 */
export function syncLocalStorageToCookies(): void {
  if (typeof window === 'undefined') return
  
  // Verificar si ya hay cookies
  const existingCookieToken = getCookie(AUTH_TOKEN_COOKIE)
  if (existingCookieToken) return // Ya hay cookies, no hacer nada
  
  // Si no hay cookies pero hay localStorage, sincronizar
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const userStr = localStorage.getItem(AUTH_USER_KEY)
  const colaboradorStr = localStorage.getItem(AUTH_COLABORADOR_KEY)
  
  if (token) {
    setCookie(AUTH_TOKEN_COOKIE, token)
    if (userStr) {
      setCookie(AUTH_USER_COOKIE, userStr)
    }
    if (colaboradorStr) {
      setCookie(AUTH_COLABORADOR_COOKIE, colaboradorStr)
    }
  }
}

/**
 * Limpia los datos de autenticación (logout) - elimina cookies y localStorage
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return
  
  // Limpiar localStorage
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(AUTH_COLABORADOR_KEY)
  
  // Limpiar cookies
  deleteCookie(AUTH_TOKEN_COOKIE)
  deleteCookie(AUTH_USER_COOKIE)
  deleteCookie(AUTH_COLABORADOR_COOKIE)
}

/**
 * Realiza login con email y contraseña
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(error.error || 'Error al iniciar sesión')
  }

  const data = await response.json()
  setAuth(data)
  return data
}

// La función de registro ha sido eliminada
// Ahora las cuentas se crean desde el admin de Strapi por el jefe

