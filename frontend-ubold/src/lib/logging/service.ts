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
    console.log('[LOGGING] 🔍 [getUserFromRequest] Iniciando extracción de usuario...')
    const colaboradorCookie = request.cookies.get('colaboradorData')?.value
    console.log('[LOGGING] 📋 Cookie colaboradorData:', colaboradorCookie ? colaboradorCookie.substring(0, 500) : 'NO HAY COOKIE')
    
    // Intentar obtener colaborador de las cookies
    // Primero intentar desde request.cookies (funciona cuando viene del navegador)
    let colaboradorCookieValue = colaboradorCookie || 
                           request.cookies.get('colaborador')?.value
    
    console.log('[Logging] 🔍 [getUserFromRequest] Cookies desde request.cookies:', {
      tieneColaboradorData: !!request.cookies.get('colaboradorData')?.value,
      tieneColaborador: !!request.cookies.get('colaborador')?.value,
      valorColaboradorData: request.cookies.get('colaboradorData')?.value?.substring(0, 100) || 'no hay',
    })
    
    // Si no hay cookies en request.cookies, intentar extraer del header Cookie
    // Esto es necesario cuando se hace fetch desde el servidor (SSR)
    if (!colaboradorCookieValue) {
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
        
        colaboradorCookieValue = cookies['colaboradorData'] || cookies['colaborador']
        
        console.log('[Logging] 🔍 [getUserFromRequest] Cookies extraídas del header:', {
          tieneColaboradorData: !!cookies['colaboradorData'],
          tieneColaborador: !!cookies['colaborador'],
          todasLasCookies: Object.keys(cookies).join(', '),
          valorColaboradorData: cookies['colaboradorData']?.substring(0, 100) || 'no hay',
        })
      }
    }
    
    if (colaboradorCookieValue) {
      try {
        const colaborador = JSON.parse(colaboradorCookieValue)
        console.log('[LOGGING] 👤 Colaborador parseado (estructura completa):', JSON.stringify(colaborador, null, 2))
        
        // Extraer ID directamente del nivel superior (como se guarda en login)
        let colaboradorId: string | number | null = null
        
        // Prioridad 1: ID en el nivel superior (como se guarda en login)
        if (colaborador.id !== undefined && colaborador.id !== null) {
          colaboradorId = colaborador.id
          console.log('[LOGGING] ✅ ID encontrado en nivel superior (colaborador.id):', colaboradorId)
        }
        // Prioridad 2: documentId en el nivel superior
        else if (colaborador.documentId !== undefined && colaborador.documentId !== null) {
          colaboradorId = colaborador.documentId
          console.log('[LOGGING] ✅ ID encontrado en nivel superior (colaborador.documentId):', colaboradorId)
        }
        // Prioridad 3: Búsqueda recursiva (fallback)
        else {
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
          colaboradorId = findId(colaborador)
          console.log('[LOGGING] ✅ ID encontrado mediante búsqueda recursiva:', colaboradorId)
        }

        console.log('[LOGGING] 🔑 ID final extraído:', colaboradorId, 'tipo:', typeof colaboradorId)

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
        console.error('[LOGGING] ❌ Error al parsear cookie colaboradorData:', {
          error: parseError.message,
          stack: parseError.stack,
          cookiePreview: colaboradorCookie?.substring(0, 200) || 'no hay cookie',
        })
      }
    } else {
      // Listar todas las cookies disponibles para debug
      const allCookies = request.cookies.getAll()
      console.warn('[LOGGING] ⚠️ No se encontró cookie colaboradorData ni colaborador', {
        cookiesDisponibles: allCookies.map(c => c.name).join(', '),
        totalCookies: allCookies.length,
        cookieHeader: request.headers.get('cookie')?.substring(0, 200) || 'no hay header cookie',
      })
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
    console.log('[LOGGING] 🚀 Iniciando logActivity para:', params.accion, params.entidad)
    
    // Obtener información del usuario, IP y User-Agent
    const usuario = await getUserFromRequest(request)
    console.log('[LOGGING] 👤 Resultado de getUserFromRequest:', JSON.stringify(usuario, null, 2))
    
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
    if (usuario?.id) {
      // CRÍTICO: El campo usuario debe ser solo el ID numérico, NO un objeto
      // Convertir explícitamente a número para asegurar el formato correcto
      logData.usuario = Number(usuario.id) || null
      console.log('[LOGGING] ✅ Usuario asociado al log:', {
        idOriginal: usuario.id,
        idConvertido: logData.usuario,
        email: usuario.email,
        nombre: usuario.nombre,
        accion: params.accion,
        entidad: params.entidad,
        tipoUsuario: typeof logData.usuario,
        esNumero: typeof logData.usuario === 'number',
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
      usuario: usuario?.id || 'sin usuario',
      usuarioEmail: usuario?.email || 'sin email',
      usuarioNombre: usuario?.nombre || 'sin nombre',
      descripcion: params.descripcion.substring(0, 50),
      tieneColaboradorCookie: !!colaboradorCookie,
      tieneToken: !!token,
      colaboradorCookiePreview: colaboradorCookie ? colaboradorCookie.substring(0, 100) : 'no hay',
    })
    
    // Log del body que se envía a Strapi (solo para debug)
    const bodyToSend = { data: logData }
    console.log('[LOGGING] 📤 Log a enviar a Strapi:', JSON.stringify(logData, null, 2))
    
    strapiClient.post(logEndpoint, bodyToSend)
      .then(async (response: any) => {
        const responseText = JSON.stringify(response, null, 2)
        console.log('[LOGGING] 📥 Respuesta de Strapi:', responseText.substring(0, 1000))
        const logId = response?.data?.id || response?.id || response?.data?.documentId || 'unknown'
        // En Strapi v5, las relaciones no siempre se devuelven en la respuesta de creación
        // Verificar en diferentes estructuras posibles
        const usuarioEnRespuesta = 
          response?.data?.attributes?.usuario?.data?.id ||
          response?.data?.attributes?.usuario?.id ||
          response?.data?.usuario?.data?.id ||
          response?.data?.usuario?.id ||
          response?.data?.usuario ||
          response?.usuario ||
          null
        
        console.log('[LOGGING] ✅ Log creado exitosamente en Strapi:', {
          logId: logId,
          usuarioEnviado: logData.usuario || 'null',
          usuarioEnRespuesta: usuarioEnRespuesta ? (typeof usuarioEnRespuesta === 'object' ? usuarioEnRespuesta.id : usuarioEnRespuesta) : 'null',
          accion: params.accion,
          entidad: params.entidad,
          tipoRespuesta: typeof response?.data,
          tieneData: !!response?.data,
        })
        
        // Nota: En Strapi v5, las relaciones manyToOne no siempre se devuelven en la respuesta de creación
        // Esto es normal y no indica un error. El usuario se guarda correctamente aunque no aparezca en la respuesta.
        if (!usuarioEnRespuesta && logData.usuario) {
          console.log('[LOGGING] ℹ️ Nota: Usuario enviado pero no aparece en respuesta de creación (comportamiento normal en Strapi v5):', {
            usuarioEnviado: logData.usuario,
            mensaje: 'El usuario se guarda correctamente aunque no aparezca en la respuesta inmediata',
          })
        }
      })
      .catch((error) => {
        // Solo loggear errores, no lanzar excepciones para no afectar el flujo principal
        console.error('[LOGGING] ❌ Error al registrar actividad en Strapi:', {
          error: error.message,
          status: error.status,
          endpoint: logEndpoint,
          details: error.details,
          errorCompleto: JSON.stringify(error, null, 2).substring(0, 500),
          logDataEnviado: {
            accion: logData.accion,
            entidad: logData.entidad,
            usuario: logData.usuario || null,
            tipoUsuario: typeof logData.usuario,
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

