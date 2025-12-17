/**
 * Utilidades para manejo de autenticación
 * 
 * Almacena el JWT token en localStorage y proporciona funciones
 * para login, logout y verificación de sesión
 */

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_KEY = 'auth_user'
const AUTH_COLABORADOR_KEY = 'auth_colaborador'

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
 * Guarda los datos de autenticación en localStorage
 */
export function setAuth(authData: AuthResponse): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(AUTH_TOKEN_KEY, authData.jwt)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authData.usuario))
  if (authData.colaborador) {
    localStorage.setItem(AUTH_COLABORADOR_KEY, JSON.stringify(authData.colaborador))
  }
}

/**
 * Obtiene el JWT token almacenado
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

/**
 * Obtiene los datos del usuario autenticado
 */
export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem(AUTH_USER_KEY)
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Obtiene los datos del colaborador vinculado
 */
export function getAuthColaborador(): AuthColaborador | null {
  if (typeof window === 'undefined') return null
  const colaboradorStr = localStorage.getItem(AUTH_COLABORADOR_KEY)
  if (!colaboradorStr) return null
  try {
    return JSON.parse(colaboradorStr)
  } catch {
    return null
  }
}

/**
 * Verifica si hay una sesión activa
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}

/**
 * Limpia los datos de autenticación (logout)
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(AUTH_COLABORADOR_KEY)
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

