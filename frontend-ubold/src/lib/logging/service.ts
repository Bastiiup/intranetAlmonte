/**
 * Servicio de logging de actividades
 * Registra todas las acciones de los usuarios en el sistema
 */

import strapiClient from '@/lib/strapi/client'
import { NextRequest } from 'next/server'

export type AccionType =
  | 'crear'
  | 'actualizar'
  | 'eliminar'
  | 'ver'
  | 'exportar'
  | 'sincronizar'
  | 'cambiar_estado'
  | 'login'
  | 'logout'
  | 'descargar'
  | 'imprimir'
  | 'ocultar'
  | 'mostrar'

export interface LogActivityParams {
  usuarioId?: string | number | null
  accion: AccionType
  entidad: string
  entidadId?: string | number | null
  descripcion: string
  datosAnteriores?: any
  datosNuevos?: any
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, any>
}

/**
 * Obtiene información del usuario desde el request
 */
export async function getUserFromRequest(request: NextRequest): Promise<{
  id: string | number | null
  email?: string
  nombre?: string
} | null> {
  try {
    // Intentar obtener colaborador de las cookies
    const colaboradorCookie = request.cookies.get('colaboradorData')?.value || 
                              request.cookies.get('colaborador')?.value
    
    if (colaboradorCookie) {
      try {
        const colaborador = JSON.parse(colaboradorCookie)
        return {
          id: colaborador.id || colaborador.documentId || null,
          email: colaborador.email_login || colaborador.email || undefined,
          nombre: colaborador.nombre || undefined,
        }
      } catch {
        // Si no se puede parsear, continuar
      }
    }

    // Si hay token, intentar obtener usuario de Strapi
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('auth_token')?.value

    if (token) {
      try {
        const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_API_URL
        if (strapiUrl) {
          const response = await fetch(`${strapiUrl}/api/users/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            cache: 'no-store',
          })

          if (response.ok) {
            const user = await response.json()
            return {
              id: user.id || null,
              email: user.email || undefined,
              nombre: user.username || undefined,
            }
          }
        }
      } catch (error) {
        console.warn('[Logging] Error al obtener usuario desde token:', error)
      }
    }

    return null
  } catch (error) {
    console.warn('[Logging] Error al obtener usuario del request:', error)
    return null
  }
}

/**
 * Obtiene la IP del cliente desde el request
 */
export function getClientIP(request: NextRequest): string | null {
  // Intentar obtener IP de headers comunes
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  return null
}

/**
 * Obtiene el User-Agent del request
 */
export function getUserAgent(request: NextRequest): string | null {
  return request.headers.get('user-agent')
}

/**
 * Registra una actividad en el sistema de logs
 * Esta función es asíncrona y no bloquea la ejecución
 */
export async function logActivity(
  request: NextRequest,
  params: Omit<LogActivityParams, 'usuarioId' | 'ipAddress' | 'userAgent'>
): Promise<void> {
  try {
    // Obtener información del usuario, IP y User-Agent
    const user = await getUserFromRequest(request)
    const ipAddress = getClientIP(request)
    const userAgent = getUserAgent(request)

    // Preparar datos para Strapi
    const logData: any = {
      accion: params.accion,
      entidad: params.entidad,
      descripcion: params.descripcion,
      fecha: new Date().toISOString(),
    }

    // Agregar usuario si está disponible
    if (user?.id) {
      logData.usuario = user.id
      console.log('[Logging] ✅ Usuario capturado para log:', {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
      })
    } else {
      console.warn('[Logging] ⚠️ No se pudo capturar usuario para log:', {
        tieneColaboradorCookie: !!colaboradorCookie,
        tieneToken: !!token,
        colaboradorCookiePreview: colaboradorCookie ? colaboradorCookie.substring(0, 50) : 'no hay',
      })
    }

    // Agregar entidad_id si está disponible
    if (params.entidadId) {
      logData.entidad_id = String(params.entidadId)
    }

    // Agregar datos anteriores y nuevos (convertir a JSON string si es necesario)
    if (params.datosAnteriores !== undefined) {
      logData.datos_anteriores = typeof params.datosAnteriores === 'string' 
        ? params.datosAnteriores 
        : JSON.stringify(params.datosAnteriores)
    }

    if (params.datosNuevos !== undefined) {
      logData.datos_nuevos = typeof params.datosNuevos === 'string'
        ? params.datosNuevos
        : JSON.stringify(params.datosNuevos)
    }

    // Agregar IP y User-Agent
    if (ipAddress) {
      logData.ip_address = ipAddress
    }

    if (userAgent) {
      logData.user_agent = userAgent
    }

    // Agregar metadata
    if (params.metadata) {
      logData.metadata = typeof params.metadata === 'string'
        ? params.metadata
        : JSON.stringify(params.metadata)
    }

    // Crear log en Strapi (de forma asíncrona, no bloquea)
    // El Content Type "Log de Actividades" en Strapi se convierte a "activity-logs" en la API
    const logEndpoint = '/api/activity-logs'
    
    // Logging mejorado para debug
    const colaboradorCookie = request.cookies.get('colaboradorData')?.value || request.cookies.get('colaborador')?.value
    const token = request.headers.get('authorization') || request.cookies.get('auth_token')?.value
    
    console.log('[Logging] 📝 Registrando actividad:', {
      accion: params.accion,
      entidad: params.entidad,
      usuario: user?.id || 'sin usuario',
      usuarioEmail: user?.email || 'sin email',
      usuarioNombre: user?.nombre || 'sin nombre',
      descripcion: params.descripcion.substring(0, 50),
      tieneColaboradorCookie: !!colaboradorCookie,
      tieneToken: !!token,
      colaboradorCookiePreview: colaboradorCookie ? colaboradorCookie.substring(0, 100) : 'no hay',
    })
    
    strapiClient.post(logEndpoint, { data: logData })
      .then(() => {
        console.log('[Logging] ✅ Actividad registrada exitosamente')
      })
      .catch((error) => {
        // Solo loggear errores, no lanzar excepciones para no afectar el flujo principal
        console.error('[Logging] ❌ Error al registrar actividad:', {
          error: error.message,
          status: error.status,
          endpoint: logEndpoint,
          details: error.details,
          logData: JSON.stringify(logData).substring(0, 200), // Primeros 200 caracteres para debug
        })
      })
  } catch (error) {
    // No lanzar errores para no afectar el flujo principal
    console.error('[Logging] Error al preparar log de actividad:', error)
  }
}

/**
 * Helper para crear descripciones legibles de acciones comunes
 */
export function createLogDescription(
  accion: AccionType,
  entidad: string,
  entidadId?: string | number | null,
  detalles?: string
): string {
  const entidadNombre = entidad.charAt(0).toUpperCase() + entidad.slice(1)
  const idPart = entidadId ? ` #${entidadId}` : ''
  const detallesPart = detalles ? `: ${detalles}` : ''

  const accionMap: Record<AccionType, string> = {
    crear: 'Creó',
    actualizar: 'Actualizó',
    eliminar: 'Eliminó',
    ver: 'Vio',
    exportar: 'Exportó',
    sincronizar: 'Sincronizó',
    cambiar_estado: 'Cambió el estado de',
    login: 'Inició sesión',
    logout: 'Cerró sesión',
    descargar: 'Descargó',
    imprimir: 'Imprimió',
    ocultar: 'Ocultó',
    mostrar: 'Mostró',
  }

  const accionTexto = accionMap[accion] || accion

  if (accion === 'login' || accion === 'logout') {
    return `${accionTexto}${detallesPart}`
  }

  return `${accionTexto} ${entidadNombre}${idPart}${detallesPart}`
}

