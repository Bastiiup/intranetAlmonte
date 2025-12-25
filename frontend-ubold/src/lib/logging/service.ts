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
    console.log('[Logging] 🔍 [getUserFromRequest] Iniciando extracción de usuario...')
    
    // Intentar obtener colaborador de las cookies
    // Primero intentar desde request.cookies (funciona cuando viene del navegador)
    let colaboradorCookie = request.cookies.get('colaboradorData')?.value || 
                           request.cookies.get('colaborador')?.value
    
    console.log('[Logging] 🔍 [getUserFromRequest] Cookies desde request.cookies:', {
      tieneColaboradorData: !!request.cookies.get('colaboradorData')?.value,
      tieneColaborador: !!request.cookies.get('colaborador')?.value,
      valorColaboradorData: request.cookies.get('colaboradorData')?.value?.substring(0, 100) || 'no hay',
    })
    
    // Si no hay cookies en request.cookies, intentar extraer del header Cookie
    // Esto es necesario cuando se hace fetch desde el servidor (SSR)
    if (!colaboradorCookie) {
      const cookieHeader = request.headers.get('cookie')
      console.log('[Logging] 🔍 [getUserFromRequest] Cookie header completo:', cookieHeader ? cookieHeader.substring(0, 200) : 'no hay')
      
      if (cookieHeader) {
        // Parsear cookies manualmente del header
        const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie: string) => {
          const [name, ...valueParts] = cookie.trim().split('=')
          if (name && valueParts.length > 0) {
            acc[name] = decodeURIComponent(valueParts.join('='))
          }
          return acc
        }, {})
        
        colaboradorCookie = cookies['colaboradorData'] || cookies['colaborador']
        
        console.log('[Logging] 🔍 [getUserFromRequest] Cookies extraídas del header:', {
          tieneColaboradorData: !!cookies['colaboradorData'],
          tieneColaborador: !!cookies['colaborador'],
          todasLasCookies: Object.keys(cookies).join(', '),
          valorColaboradorData: cookies['colaboradorData']?.substring(0, 100) || 'no hay',
        })
      }
    }
    
    if (colaboradorCookie) {
      try {
        console.log('[LOGGING] 📋 Cookie colaboradorData:', colaboradorCookie.substring(0, 200))
        
        const colaborador = JSON.parse(colaboradorCookie)
        console.log('[LOGGING] 👤 Colaborador parseado:', JSON.stringify(colaborador, null, 2).substring(0, 1000))
        
        // Búsqueda recursiva del ID
        const findId = (obj: any): string | number | null => {
          if (!obj || typeof obj !== 'object') return null
          if (obj.id !== undefined && obj.id !== null) return obj.id
          if (obj.documentId !== undefined && obj.documentId !== null) return obj.documentId
          
          for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              const found = findId(obj[key])
              if (found) return found
            }
          }
          return null
        }

        const colaboradorId = findId(colaborador)
        console.log('[LOGGING] 🔑 ID encontrado:', colaboradorId)

        if (!colaboradorId) {
          console.log('[LOGGING] ❌ No se pudo encontrar ID en el colaborador')
          console.log('[LOGGING] ❌ Estructura completa:', JSON.stringify(colaborador, null, 2))
          return null
        }

        // Extraer email y nombre
        const emailLogin = colaborador.email_login || 
                           colaborador.data?.attributes?.email_login || 
                           colaborador.attributes?.email_login || 
                           colaborador.email ||
                           'Sin email'

        const persona = colaborador.persona || 
                        colaborador.data?.attributes?.persona?.data?.attributes ||
                        colaborador.attributes?.persona?.data?.attributes ||
                        colaborador.data?.attributes?.persona ||
                        colaborador.attributes?.persona ||
                        {}

        const personaAttrs = persona.attributes || persona.data?.attributes || persona.data || persona

        const nombre = personaAttrs.nombre_completo || 
                       `${(personaAttrs.nombres || '').trim()} ${(personaAttrs.primer_apellido || '').trim()}`.trim() ||
                       emailLogin

        console.log('[LOGGING] ✅ Usuario extraído:', { 
          id: colaboradorId, 
          email: emailLogin, 
          nombre 
        })

        return {
          id: colaboradorId,
          email: emailLogin,
          nombre: nombre
        }
      } catch (parseError: any) {
        console.warn('[Logging] ⚠️ Error al parsear cookie colaboradorData:', {
          error: parseError.message,
          cookiePreview: colaboradorCookie.substring(0, 100),
        })
      }
    } else {
      console.warn('[Logging] ⚠️ No se encontró cookie colaboradorData ni colaborador')
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

    // Obtener cookies y token para logging
    const colaboradorCookie = request.cookies.get('colaboradorData')?.value || request.cookies.get('colaborador')?.value
    const token = request.headers.get('authorization') || request.cookies.get('auth_token')?.value
    
    // Agregar usuario si está disponible
    console.log('[LOGGING] 🎯 Usuario obtenido para log:', user)
    
    if (user?.id) {
      // CRÍTICO: El campo usuario debe ser solo el ID numérico o documentId, NO un objeto
      logData.usuario = user.id
      console.log('[LOGGING] ✅ Usuario asociado al log:', {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        accion: params.accion,
        entidad: params.entidad,
        usuarioEnLogData: logData.usuario,
        tipoUsuario: typeof logData.usuario,
      })
    } else {
      // Listar todas las cookies disponibles para debug
      const allCookies: Record<string, string> = {}
      try {
        // Intentar obtener todas las cookies (puede no estar disponible en todas las versiones)
        if (typeof request.cookies.getAll === 'function') {
          request.cookies.getAll().forEach((cookie: any) => {
            allCookies[cookie.name] = cookie.value ? cookie.value.substring(0, 100) : '' // Primeros 100 chars
          })
        } else {
          // Fallback: solo listar las cookies conocidas
          const knownCookies = ['colaboradorData', 'colaborador', 'auth_token', 'user']
          knownCookies.forEach(name => {
            const cookie = request.cookies.get(name)
            if (cookie) {
              allCookies[name] = cookie.value.substring(0, 100)
            }
          })
        }
      } catch (cookieError) {
        // Si hay error al obtener cookies, continuar sin ellas
        console.warn('[Logging] ⚠️ Error al obtener cookies:', cookieError)
      }
      
      console.warn('[Logging] ⚠️ No se pudo capturar usuario para log:', {
        accion: params.accion,
        entidad: params.entidad,
        tieneColaboradorCookie: !!colaboradorCookie,
        tieneToken: !!token,
        colaboradorCookiePreview: colaboradorCookie ? colaboradorCookie.substring(0, 100) : 'no hay',
        todasLasCookies: Object.keys(allCookies).join(', '),
        cookiesDisponibles: allCookies,
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
    
    // Logging mejorado para debug (usar las variables ya definidas arriba)
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
    
    // Log del body que se envía a Strapi (solo para debug)
    const bodyToSend = { data: logData }
    console.log('[LOGGING] 📤 Log a enviar a Strapi:', JSON.stringify(bodyToSend, null, 2))
    
    strapiClient.post(logEndpoint, bodyToSend)
      .then((response: any) => {
        const logId = response?.data?.id || response?.id || 'unknown'
        console.log('[LOGGING] ✅ Log creado exitosamente:', {
          logId: logId,
          usuario: logData.usuario || 'null',
          accion: params.accion,
          entidad: params.entidad,
        })
      })
      .catch((error) => {
        // Solo loggear errores, no lanzar excepciones para no afectar el flujo principal
        console.error('[Logging] ❌ Error al registrar actividad:', {
          error: error.message,
          status: error.status,
          endpoint: logEndpoint,
          details: error.details,
          logData: {
            accion: logData.accion,
            entidad: logData.entidad,
            usuario: logData.usuario || null,
            descripcion: logData.descripcion?.substring(0, 50),
          },
          tieneUsuario: !!logData.usuario,
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

