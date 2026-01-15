/**
 * Servicio de logging de actividades
 * Registra todas las acciones de los usuarios en el sistema
 */

import strapiClient from '@/lib/strapi/client'
import { NextRequest } from 'next/server'
// Importar logStorage para asegurar que los interceptores se inicialicen
import './logStorage'

/**
 * Type guard para verificar si el request es NextRequest (tiene cookies)
 */
function isNextRequest(request: NextRequest | Request): request is NextRequest {
  return 'cookies' in request && request.cookies !== undefined
}

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
export async function getUserFromRequest(request: NextRequest | Request): Promise<{
  id: string | number | null
  documentId?: string | number | null
  email?: string
  nombre?: string
} | null> {
  console.log('[LOGGING] 🔍 [getUserFromRequest] Iniciando extracción de usuario...')
  console.log('[LOGGING] 🔍 Request recibido:', typeof request)
  console.log('[LOGGING] 🔍 Request tiene cookies?:', isNextRequest(request))
  
  // VALIDACIÓN CRÍTICA
  if (!request) {
    console.error('[LOGGING] ❌ Request es undefined o null')
    return null
  }
  
  try {
    // Intentar obtener colaborador de las cookies
    // Buscar en múltiples nombres de cookie para compatibilidad:
    // 1. colaboradorData (usado por login y middleware)
    // 2. colaborador (compatibilidad)
    // 3. auth_colaborador (usado por lib/auth.ts y otros endpoints)
    let colaboradorCookieValue: string | undefined = undefined
    
    if (isNextRequest(request)) {
      // Es NextRequest, usar cookies directamente
      // Buscar en orden de prioridad
      colaboradorCookieValue = request.cookies.get('colaboradorData')?.value ||
                               request.cookies.get('colaborador')?.value ||
                               request.cookies.get('auth_colaborador')?.value
      console.log('[LOGGING] 📋 Cookie encontrada (desde cookies):', colaboradorCookieValue ? colaboradorCookieValue.substring(0, 500) : 'NO HAY COOKIE')
    } else {
      // Es Request normal, extraer del header Cookie
      console.log('[LOGGING] ⚠️ Request no tiene cookies, intentando extraer del header Cookie')
      const cookieHeader = request.headers.get('cookie')
      console.log('[LOGGING] 📋 Cookie header:', cookieHeader ? cookieHeader.substring(0, 500) : 'NO HAY HEADER COOKIE')
      
      if (cookieHeader) {
        // Parsear cookies manualmente del header
        // IMPORTANTE: El valor de la cookie puede contener JSON con caracteres especiales
        // Necesitamos parsear correctamente considerando que el valor puede tener ';' dentro del JSON
        const cookies: Record<string, string> = {}
        const parts = cookieHeader.split(';')
        
        for (const part of parts) {
          const trimmed = part.trim()
          const equalIndex = trimmed.indexOf('=')
          if (equalIndex > 0) {
            const name = trimmed.substring(0, equalIndex).trim()
            const value = trimmed.substring(equalIndex + 1).trim()
            // Decodificar solo si no es JSON (para evitar problemas con caracteres especiales)
            try {
              // Intentar parsear como JSON primero
              JSON.parse(value)
              cookies[name] = value
            } catch {
              // Si no es JSON válido, decodificar URI
              cookies[name] = decodeURIComponent(value)
            }
          }
        }
        
        // Buscar en orden de prioridad: colaboradorData, colaborador, auth_colaborador
        colaboradorCookieValue = cookies['colaboradorData'] || 
                                 cookies['colaborador'] || 
                                 cookies['auth_colaborador']
        console.log('[LOGGING] 📋 Cookie extraída del header:', colaboradorCookieValue ? colaboradorCookieValue.substring(0, 500) : 'NO HAY COOKIE EN HEADER')
        console.log('[LOGGING] 🔍 Cookies parseadas del header:', Object.keys(cookies).join(', '))
      }
    }
    
    // Solo loguear cookies si request tiene cookies (NextRequest)
    if (isNextRequest(request)) {
      console.log('[Logging] 🔍 [getUserFromRequest] Cookies desde request.cookies:', {
        tieneColaboradorData: !!request.cookies.get('colaboradorData')?.value,
        tieneColaborador: !!request.cookies.get('colaborador')?.value,
        valorColaboradorData: request.cookies.get('colaboradorData')?.value?.substring(0, 100) || 'no hay',
      })
    }
    
    // Si no hay cookies en request.cookies, intentar extraer del header Cookie
    // Esto es necesario cuando se hace fetch desde el servidor (SSR) o cuando es Request normal
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
        
        // Extraer ID y documentId directamente del nivel superior (como se guarda en login)
        let colaboradorId: string | number | null = null
        let colaboradorDocumentId: string | number | null = null
        
        // Prioridad 1: documentId en el nivel superior (Strapi v5 prefiere documentId para relaciones)
        if (colaborador.documentId !== undefined && colaborador.documentId !== null) {
          colaboradorDocumentId = colaborador.documentId
          console.log('[LOGGING] ✅ documentId encontrado en nivel superior (colaborador.documentId):', colaboradorDocumentId)
        }
        // Prioridad 2: ID en el nivel superior (fallback)
        if (colaborador.id !== undefined && colaborador.id !== null) {
          colaboradorId = colaborador.id
          console.log('[LOGGING] ✅ ID encontrado en nivel superior (colaborador.id):', colaboradorId)
        }
        // Prioridad 3: Búsqueda recursiva (fallback)
        if (!colaboradorDocumentId && !colaboradorId) {
          const findId = (obj: any): { id: string | number | null, documentId: string | number | null } => {
            if (!obj || typeof obj !== 'object') return { id: null, documentId: null }
            
            let foundId = null
            let foundDocumentId = null
            
            if (obj.id !== undefined && obj.id !== null) foundId = obj.id
            if (obj.documentId !== undefined && obj.documentId !== null) foundDocumentId = obj.documentId
            
            if (foundId || foundDocumentId) {
              return { id: foundId, documentId: foundDocumentId }
            }
            
            for (const key in obj) {
              if (typeof obj[key] === 'object' && obj[key] !== null) {
                const found = findId(obj[key])
                if (found.id || found.documentId) {
                  if (!foundId) foundId = found.id
                  if (!foundDocumentId) foundDocumentId = found.documentId
                }
              }
            }
            return { id: foundId, documentId: foundDocumentId }
          }
          const found = findId(colaborador)
          if (!colaboradorDocumentId) colaboradorDocumentId = found.documentId
          if (!colaboradorId) colaboradorId = found.id
          console.log('[LOGGING] ✅ IDs encontrados mediante búsqueda recursiva:', { id: colaboradorId, documentId: colaboradorDocumentId })
        }

        console.log('[LOGGING] 🔑 IDs extraídos:', { 
          id: colaboradorId, 
          documentId: colaboradorDocumentId,
          tipoId: typeof colaboradorId,
          tipoDocumentId: typeof colaboradorDocumentId,
        })

        // Usar documentId si está disponible, sino usar id
        const idFinal = colaboradorDocumentId || colaboradorId
        
        if (!idFinal) {
          console.log('[LOGGING] ❌ No se pudo encontrar ID ni documentId en el colaborador')
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
          documentId: colaboradorDocumentId,
          idFinal: idFinal,
          email: emailLogin, 
          nombre 
        })

        // Retornar tanto id como documentId para poder usar el correcto según Strapi
        // CRÍTICO: Priorizar documentId para Strapi v5 (relaciones manyToOne requieren documentId)
        // Si documentId no está disponible, usar id como fallback
        const documentIdFinal = colaboradorDocumentId || colaboradorId
        
        console.log('[LOGGING] 🔑 IDs finales para retornar:', {
          id: colaboradorId,
          documentId: colaboradorDocumentId,
          documentIdFinal: documentIdFinal,
          tipoDocumentIdFinal: typeof documentIdFinal,
        })
        
        return {
          id: colaboradorId,
          documentId: documentIdFinal, // Siempre incluir documentId (puede ser igual a id si no hay documentId separado)
          email: emailLogin,
          nombre: nombre
        }
      } catch (parseError: any) {
        console.error('[LOGGING] ❌ Error al parsear cookie colaboradorData:', {
          error: parseError.message,
          stack: parseError.stack,
          cookiePreview: colaboradorCookieValue?.substring(0, 200) || 'no hay cookie',
        })
      }
    } else {
      // No mostrar warnings en producción - es normal que no haya cookies en algunos requests
      // Solo loggear en desarrollo para debugging
      if (process.env.NODE_ENV === 'development') {
        if (isNextRequest(request)) {
          const allCookies = request.cookies.getAll()
          console.log('[LOGGING] ℹ️ No se encontró cookie colaboradorData (modo desarrollo):', {
            cookiesDisponibles: allCookies.map((c: any) => c.name).join(', '),
            totalCookies: allCookies.length,
          })
        }
      }
    }

    // Si hay token, intentar obtener usuario de Strapi
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  (isNextRequest(request) ? request.cookies.get('auth_token')?.value : undefined)

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
export function getClientIP(request: NextRequest | Request): string | null {
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
export function getUserAgent(request: NextRequest | Request): string | null {
  return request.headers.get('user-agent')
}

/**
 * Registra una actividad en el sistema de logs
 * Esta función es asíncrona y no bloquea la ejecución
 */
export async function logActivity(
  request: NextRequest | Request,
  params: Omit<LogActivityParams, 'usuarioId' | 'ipAddress' | 'userAgent'>
): Promise<void> {
  // LOG CRÍTICO AL INICIO - Debe aparecer SIEMPRE
  console.log('[LOGGING] ==========================================')
  console.log('[LOGGING] 🚀 INICIANDO logActivity')
  console.log('[LOGGING] 🔍 Request tipo:', typeof request)
  console.log('[LOGGING] 🔍 Request es NextRequest?:', request instanceof NextRequest)
  console.log('[LOGGING] 🚀 Acción:', params.accion, '| Entidad:', params.entidad)
  
  // Verificar cookies INMEDIATAMENTE
  if (isNextRequest(request)) {
    const cookieValue = request.cookies.get('colaboradorData')?.value
    console.log('[LOGGING] 🍪 Cookie colaboradorData disponible?:', !!cookieValue)
    console.log('[LOGGING] 🍪 Cookie preview:', cookieValue ? cookieValue.substring(0, 200) : 'NO HAY COOKIE')
  } else {
    const cookieHeader = request.headers.get('cookie')
    console.log('[LOGGING] 🍪 Cookie header disponible?:', !!cookieHeader)
    console.log('[LOGGING] 🍪 Cookie header preview:', cookieHeader ? cookieHeader.substring(0, 200) : 'NO HAY HEADER')
  }
  console.log('[LOGGING] ==========================================')
  
  if (!request) {
    console.error('[LOGGING] ❌ No se recibió request en logActivity')
    return
  }
  
  // NO retornar si no tiene cookies - puede ser Request normal, extraer del header
  if (!isNextRequest(request)) {
    console.log('[LOGGING] ⚠️ Request no tiene cookies, será Request normal (extraer del header)')
  }
  
  try {
    // ========== MÉTODO 1: Usar getUserFromRequest ==========
    console.log('[LOGGING] 🔍 MÉTODO 1: Intentando getUserFromRequest...')
    const usuario = await getUserFromRequest(request)
    console.log('[LOGGING] 👤 Resultado de getUserFromRequest:', JSON.stringify(usuario, null, 2))
    
    // ========== MÉTODO 2: Extracción directa desde cookies (más confiable) ==========
    let colaboradorDirecto: any = null
    let emailColaborador: string | null = null
    let nombreColaborador: string | null = null
    
    try {
      console.log('[LOGGING] 🔍 MÉTODO 2: Extracción directa desde cookies...')
      let colaboradorCookieValue: string | undefined = undefined
      
      if (isNextRequest(request)) {
        colaboradorCookieValue = request.cookies.get('colaboradorData')?.value || 
                                 request.cookies.get('colaborador')?.value ||
                                 request.cookies.get('auth_colaborador')?.value
      } else {
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie: string) => {
            const [name, ...valueParts] = cookie.trim().split('=')
            if (name && valueParts.length > 0) {
              const value = valueParts.join('=')
              try {
                JSON.parse(value)
                acc[name] = value
              } catch {
                acc[name] = decodeURIComponent(value)
              }
            }
            return acc
          }, {})
          colaboradorCookieValue = cookies['colaboradorData'] || 
                                   cookies['colaborador'] || 
                                   cookies['auth_colaborador']
        }
      }
      
      if (colaboradorCookieValue) {
        colaboradorDirecto = JSON.parse(colaboradorCookieValue)
        console.log('[LOGGING] ✅ Colaborador extraído directamente desde cookie:', {
          id: colaboradorDirecto.id,
          documentId: colaboradorDirecto.documentId,
          email_login: colaboradorDirecto.email_login,
          tienePersona: !!colaboradorDirecto.persona
        })
        
        // Extraer email
        emailColaborador = colaboradorDirecto.email_login || null
        
        // Extraer nombre de la persona
        if (colaboradorDirecto.persona) {
          const persona = colaboradorDirecto.persona
          const personaAttrs = persona.attributes || persona.data?.attributes || persona.data || persona
          nombreColaborador = personaAttrs.nombre_completo || 
                            `${(personaAttrs.nombres || '').trim()} ${(personaAttrs.primer_apellido || '').trim()}`.trim() ||
                            emailColaborador ||
                            null
        }
      }
    } catch (error: any) {
      console.warn('[LOGGING] ⚠️ Error en método 2 (extracción directa):', error.message)
    }
    
    // Si no se pudo obtener el usuario, intentar una vez más (solo en desarrollo)
    if (!usuario || !usuario.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[LOGGING] ℹ️ No se pudo obtener usuario, reintentando (modo desarrollo)...')
      }
      // Pequeño delay para asegurar que las cookies estén disponibles
      await new Promise(resolve => setTimeout(resolve, 100))
      const usuarioReintento = await getUserFromRequest(request)
      if (usuarioReintento && usuarioReintento.id) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[LOGGING] ✅ Usuario obtenido en reintento')
        }
        Object.assign(usuario || {}, usuarioReintento)
      }
    }
    
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
    // Manejar tanto NextRequest (con cookies) como Request (sin cookies)
    // Buscar en múltiples nombres de cookie para compatibilidad
    let colaboradorCookie: string | undefined = undefined
    if (isNextRequest(request)) {
      // Buscar en orden de prioridad: colaboradorData, colaborador, auth_colaborador
      colaboradorCookie = request.cookies.get('colaboradorData')?.value || 
                         request.cookies.get('colaborador')?.value ||
                         request.cookies.get('auth_colaborador')?.value
    } else {
      // Es Request normal, extraer del header
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie: string) => {
          const [name, ...valueParts] = cookie.trim().split('=')
          if (name && valueParts.length > 0) {
            const value = valueParts.join('=')
            // Intentar parsear JSON primero, si falla, decodificar URI
            try {
              JSON.parse(value)
              acc[name] = value
            } catch {
              acc[name] = decodeURIComponent(value)
            }
          }
          return acc
        }, {})
        // Buscar en orden de prioridad: colaboradorData, colaborador, auth_colaborador
        colaboradorCookie = cookies['colaboradorData'] || 
                           cookies['colaborador'] || 
                           cookies['auth_colaborador']
        console.log('[LOGGING] 🔍 Cookies extraídas del header:', Object.keys(cookies).join(', '))
        console.log('[LOGGING] 🔍 ColaboradorCookie encontrada?:', !!colaboradorCookie)
      }
    }
    const token = request.headers.get('authorization') || (isNextRequest(request) ? request.cookies.get('auth_token')?.value : undefined)
    
    // ========== DECIDIR QUÉ USUARIO USAR ==========
    // Priorizar colaboradorDirecto (más confiable, viene directamente de cookie)
    const colaboradorFinal = colaboradorDirecto || usuario
    const idFinal = colaboradorDirecto?.id || usuario?.id
    const documentIdFinal = colaboradorDirecto?.documentId || (usuario as any)?.documentId
    const emailFinal = emailColaborador || usuario?.email
    const nombreFinal = nombreColaborador || usuario?.nombre
    
    console.log('[LOGGING] 🎯 Colaborador final seleccionado:', {
      fuente: colaboradorDirecto ? 'cookie directa' : 'getUserFromRequest',
      id: idFinal,
      documentId: documentIdFinal,
      email: emailFinal,
      nombre: nombreFinal
    })
    
    // Agregar usuario si está disponible
    if (idFinal || documentIdFinal) {
      // CRÍTICO: Para relaciones manyToOne con colaborador, Strapi espera el ID numérico, NO documentId
      // Usar siempre el ID numérico del colaborador
      let usuarioParaStrapi: number | null = null
      
      // Priorizar ID numérico (Strapi espera ID numérico para relaciones manyToOne con colaborador)
      if (idFinal !== undefined && idFinal !== null) {
        // Convertir a número si es string
        const idNum = typeof idFinal === 'string' ? parseInt(idFinal) : idFinal
        if (typeof idNum === 'number' && !isNaN(idNum)) {
          usuarioParaStrapi = idNum
        } else {
          usuarioParaStrapi = null
        }
        console.log('[LOGGING] ✅ Usando ID numérico del colaborador para Strapi:', {
          idOriginal: idFinal,
          idTipo: typeof idFinal,
          idEnviado: usuarioParaStrapi,
          idEnviadoTipo: typeof usuarioParaStrapi,
        })
      } else if (documentIdFinal !== undefined && documentIdFinal !== null) {
        // Fallback: intentar usar documentId como número si el id no está disponible
        const docIdNum = typeof documentIdFinal === 'string' ? parseInt(documentIdFinal) : documentIdFinal
        if (!isNaN(docIdNum) && typeof docIdNum === 'number') {
          usuarioParaStrapi = docIdNum
          console.log('[LOGGING] ⚠️ Usando documentId como número (id no disponible):', {
            documentIdOriginal: documentIdFinal,
            documentIdTipo: typeof documentIdFinal,
            idEnviado: usuarioParaStrapi,
          })
        }
      }
      
      if (!usuarioParaStrapi) {
        console.error('[LOGGING] ❌ ERROR: No se pudo obtener ID ni documentId del usuario:', {
          colaboradorFinal: JSON.stringify(colaboradorFinal, null, 2),
          tieneId: !!idFinal,
          tieneDocumentId: !!documentIdFinal,
        })
        logData.usuario = null
      } else {
        // CRÍTICO: Para relaciones manyToOne con colaborador, Strapi espera ID numérico
        logData.usuario = usuarioParaStrapi
        console.log('[LOGGING] ✅ Usuario asociado al log:', {
          idOriginal: idFinal,
          documentId: documentIdFinal || 'no disponible',
          valorEnviado: logData.usuario,
          tipoEnviado: typeof logData.usuario,
          email: emailFinal,
          nombre: nombreFinal,
          accion: params.accion,
          entidad: params.entidad,
          formatoEnviado: 'ID numérico del colaborador: ' + logData.usuario,
          esNumber: typeof logData.usuario === 'number',
        })
        
        // Guardar email y nombre en metadata por si el colaborador no existe en Strapi
        if (emailFinal || nombreFinal) {
          const metadata: any = {}
          if (emailFinal) metadata.usuario_email = emailFinal
          if (nombreFinal) metadata.usuario_nombre = nombreFinal
          logData.metadata = JSON.stringify(metadata)
          console.log('[LOGGING] 📋 Metadata guardada:', metadata)
        }
      }
    } else {
      // No mostrar errores en producción - es normal que no haya usuario en algunos requests
      // Solo loggear en desarrollo para debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[LOGGING] ℹ️ No se pudo obtener usuario para el log (modo desarrollo):', {
          accion: params.accion,
          entidad: params.entidad,
          tieneColaboradorCookie: !!colaboradorCookie,
          tieneToken: !!token,
        })
      }
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
    console.log('[LOGGING] 📝 Registrando actividad:', {
      accion: params.accion,
      entidad: params.entidad,
      usuario: idFinal || 'sin usuario',
      usuarioEmail: emailFinal || 'sin email',
      usuarioNombre: nombreFinal || 'sin nombre',
      descripcion: params.descripcion.substring(0, 50),
      tieneColaboradorCookie: !!colaboradorCookie,
      tieneToken: !!token,
      colaboradorCookiePreview: colaboradorCookie ? colaboradorCookie.substring(0, 100) : 'no hay',
      esNextRequest: isNextRequest(request),
      tieneCookiesEnRequest: isNextRequest(request) ? 'sí' : 'no (Request normal)',
    })
    
    // Log del body que se envía a Strapi (solo para debug)
    const bodyToSend = { data: logData }
    console.log('[LOGGING] 📤 Log a enviar a Strapi:', JSON.stringify(logData, null, 2))
    console.log('[LOGGING] 🔍 Verificación del usuario en logData:', {
      tieneUsuario: !!logData.usuario,
      valorUsuario: logData.usuario,
      tipoUsuario: typeof logData.usuario,
      esNumero: typeof logData.usuario === 'number',
      esNull: logData.usuario === null,
      esUndefined: logData.usuario === undefined,
    })
    
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
      .catch(async (error) => {
        // Solo loggear errores, no lanzar excepciones para no afectar el flujo principal
        console.error('[LOGGING] ❌ ==========================================')
        console.error('[LOGGING] ❌ ERROR AL REGISTRAR ACTIVIDAD EN STRAPI')
        console.error('[LOGGING] ❌ Error:', error.message)
        console.error('[LOGGING] ❌ Status:', error.status)
        console.error('[LOGGING] ❌ Endpoint:', logEndpoint)
        console.error('[LOGGING] ❌ Details:', error.details)
        
        // Si el error es porque el usuario no existe, intentar verificar y usar documentId
        if (error.status === 400 && 
            (error.message?.includes('do not exist') || 
             error.message?.includes('associated with this entity do not exist')) && 
            logData.usuario) {
          console.log('[LOGGING] ⚠️ Usuario no existe en Strapi con el ID enviado, intentando verificar...')
          
          // Intentar con el ID numérico si tenemos el colaborador final y el ID es diferente
          if (idFinal && idFinal !== logData.usuario) {
            console.log('[LOGGING] 🔄 Intentando con ID numérico del colaborador...')
            const logDataConId = { ...logData }
            const idNum = typeof idFinal === 'string' ? parseInt(idFinal) : idFinal
            if (!isNaN(idNum)) {
              logDataConId.usuario = idNum
              
              // Asegurar que metadata tenga email y nombre
              if (emailFinal || nombreFinal) {
                const metadata: any = {}
                if (emailFinal) metadata.usuario_email = emailFinal
                if (nombreFinal) metadata.usuario_nombre = nombreFinal
                logDataConId.metadata = JSON.stringify(metadata)
              }
              
              try {
                const retryResponse: any = await strapiClient.post(logEndpoint, { data: logDataConId })
                console.log('[LOGGING] ✅ Log creado con ID numérico:', {
                  logId: retryResponse?.data?.id || retryResponse?.id || 'unknown',
                  accion: params.accion,
                  entidad: params.entidad,
                  usuarioUsado: logDataConId.usuario
                })
                return // Salir exitosamente
              } catch (retryError: any) {
                console.error('[LOGGING] ❌ Error al crear log con ID numérico:', retryError.message)
              }
            }
          }
          
          // Si falla con ID numérico, capturar email y nombre desde cookies y guardarlos como texto
          console.log('[LOGGING] ⚠️ No se pudo usar usuario, capturando email y nombre desde cookies...')
          console.log('[LOGGING] 📋 Usando valores ya extraídos:', {
            email: emailFinal || 'NO HAY',
            nombre: nombreFinal || 'NO HAY'
          })
          
          // Crear log sin usuario pero con email y nombre en metadata
          const logDataSinUsuario = { ...logData }
          delete logDataSinUsuario.usuario
          
          // Agregar email y nombre en metadata (campo JSON) si están disponibles
          if (emailFinal || nombreFinal) {
            const metadata: any = {}
            if (emailFinal) {
              metadata.usuario_email = emailFinal
            }
            if (nombreFinal) {
              metadata.usuario_nombre = nombreFinal
            }
            logDataSinUsuario.metadata = JSON.stringify(metadata)
            console.log('[LOGGING] 📋 Metadata agregada al log:', metadata)
          }
          
          // También incluir el nombre en la descripción para que sea visible
          if (nombreFinal) {
            logDataSinUsuario.descripcion = `${nombreFinal} - ${logDataSinUsuario.descripcion}`
          } else if (emailFinal) {
            logDataSinUsuario.descripcion = `${emailFinal} - ${logDataSinUsuario.descripcion}`
          }
          
          try {
            const retryResponse: any = await strapiClient.post(logEndpoint, { data: logDataSinUsuario })
            console.log('[LOGGING] ✅ Log creado con email/nombre (usuario no existe en Strapi):', {
              logId: retryResponse?.data?.id || retryResponse?.id || 'unknown',
              accion: params.accion,
              entidad: params.entidad,
              usuario_email: emailFinal || 'NO HAY',
              usuario_nombre: nombreFinal || 'NO HAY',
            })
            return // Salir sin mostrar más errores
          } catch (retryError: any) {
            console.error('[LOGGING] ❌ Error al crear log con email/nombre:', retryError.message)
          }
          return // Salir sin mostrar más errores
        }
        
        // Intentar obtener más detalles del error si está disponible
        let errorResponse = null
        if (error.response) {
          try {
            errorResponse = await error.response.text()
          } catch (e) {
            // Ignorar si no se puede leer
          }
        }
        
        console.error('[LOGGING] ❌ Error completo:', JSON.stringify(error, null, 2).substring(0, 1000))
        if (errorResponse) {
          console.error('[LOGGING] ❌ Respuesta de error de Strapi:', errorResponse.substring(0, 1000))
        }
        console.error('[LOGGING] ❌ LogData enviado:', {
          accion: logData.accion,
          entidad: logData.entidad,
          usuario: logData.usuario || null,
          tipoUsuario: typeof logData.usuario,
          descripcion: logData.descripcion?.substring(0, 50),
          tieneUsuario: !!logData.usuario,
          bodyCompleto: JSON.stringify(bodyToSend, null, 2).substring(0, 500),
        })
        
        // Si el error es porque el usuario no existe, intentar crear el log sin usuario pero con email/nombre
        if (error.status === 400 && 
            (error.message?.includes('do not exist') || 
             error.message?.includes('associated with this entity do not exist')) && 
            logData.usuario) {
          console.log('[LOGGING] ⚠️ Usuario no existe en Strapi, intentando crear log sin usuario pero con email/nombre...')
          const logDataSinUsuario = { ...logData }
          delete logDataSinUsuario.usuario
          
          // Agregar email y nombre en metadata si están disponibles
          if (emailFinal || nombreFinal) {
            const metadata: any = {}
            if (emailFinal) metadata.usuario_email = emailFinal
            if (nombreFinal) metadata.usuario_nombre = nombreFinal
            logDataSinUsuario.metadata = JSON.stringify(metadata)
            console.log('[LOGGING] 📋 Metadata agregada al log (fallback):', metadata)
          }
          
          try {
            const retryResponse: any = await strapiClient.post(logEndpoint, { data: logDataSinUsuario })
            console.log('[LOGGING] ✅ Log creado sin usuario pero con email/nombre (usuario no existe en Strapi):', {
              logId: retryResponse?.data?.id || retryResponse?.id || 'unknown',
              accion: params.accion,
              entidad: params.entidad,
              usuario_email: emailFinal || 'NO HAY',
              usuario_nombre: nombreFinal || 'NO HAY',
            })
            return // Salir sin mostrar más errores
          } catch (retryError: any) {
            console.error('[LOGGING] ❌ Error al crear log sin usuario:', retryError.message)
            // Continuar para mostrar el error original también
          }
        }
        
        console.error('[LOGGING] ❌ ==========================================')
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

