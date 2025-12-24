import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/logs/usuarios
 * Obtiene la lista de usuarios únicos que tienen logs, con su información y último acceso
 */
export async function GET(request: NextRequest) {
  const debugInfo: string[] = []
  
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('es-CL')
    debugInfo.push(`[${timestamp}] ${message}`)
    console.log(message)
  }
  
  try {
    addDebugLog('[API /logs/usuarios] 🚀 Iniciando obtención de usuarios con logs')

    // Primero obtener todos los logs para agrupar por usuario
    // El campo 'usuario' es una relación manyToOne con 'Colaboradores'
    // Colaboradores tiene relaciones con 'Persona' (nombre) y 'User'
    let logsResponse: any
    try {
      // Obtener logs con populate completo de usuario (Colaborador) y persona
      // El campo 'usuario' en activity-logs es una relación manyToOne con 'Colaboradores'
      // Dentro de 'Colaboradores' hay una relación oneWay con 'Persona'
      // Especificar campos del Colaborador (email_login) y de Persona (nombres, apellidos)
      // Evitar usar * para prevenir errores con relaciones anidadas problemáticas
      
      const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_API_URL || 'https://strapi.moraleja.cl'
      addDebugLog(`[API /logs/usuarios] 🔗 URL de Strapi: ${strapiUrl}`)
      addDebugLog(`[API /logs/usuarios] 🔗 Endpoint completo: ${strapiUrl}/api/activity-logs?...`)
      
      logsResponse = await strapiClient.get<any>(
        `/api/activity-logs?populate[usuario][fields]=email_login&populate[usuario][populate][persona][fields]=nombres,primer_apellido,segundo_apellido,nombre_completo&pagination[pageSize]=10000&sort=fecha:desc`
      )
      addDebugLog('[API /logs/usuarios] ✅ Respuesta de Strapi recibida')
    } catch (strapiError: any) {
      const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_API_URL || 'https://strapi.moraleja.cl'
      addDebugLog(`[API /logs/usuarios] ❌ Error al obtener logs de Strapi: ${strapiError.message}`)
      addDebugLog(`[API /logs/usuarios] ❌ URL intentada: ${strapiUrl}/api/activity-logs`)
      addDebugLog(`[API /logs/usuarios] ❌ Tipo de error: ${strapiError.name || 'Unknown'}`)
      addDebugLog(`[API /logs/usuarios] ❌ Código de error: ${strapiError.code || 'N/A'}`)
      addDebugLog(`[API /logs/usuarios] ❌ Stack: ${strapiError.stack?.substring(0, 1000)}`)
      
      // Si es un error de conexión, dar más información
      if (strapiError.message?.includes('fetch failed') || strapiError.code === 'ECONNREFUSED' || strapiError.code === 'ENOTFOUND') {
        addDebugLog(`[API /logs/usuarios] ⚠️ Error de conexión detectado. Verificar:`)
        addDebugLog(`  - ¿Strapi está corriendo en ${strapiUrl}?`)
        addDebugLog(`  - ¿La URL es correcta?`)
        addDebugLog(`  - ¿Hay problemas de red/firewall?`)
      }
      
      throw strapiError
    }

    addDebugLog(`[API /logs/usuarios] 🔍 Tipo de respuesta: ${typeof logsResponse} ${Array.isArray(logsResponse) ? 'Array' : 'Object'}`)
    addDebugLog(`[API /logs/usuarios] 🔍 Keys de respuesta: ${Object.keys(logsResponse).join(', ')}`)
    
    // Log completo pero truncado para no saturar
    const responseStr = JSON.stringify(logsResponse, null, 2)
    addDebugLog(`[API /logs/usuarios] 🔍 Respuesta completa (primeros 2000 chars):\n${responseStr.substring(0, 2000)}`)
    if (responseStr.length > 2000) {
      addDebugLog(`[API /logs/usuarios] 🔍 ... (respuesta truncada, total: ${responseStr.length} chars)`)
    }

    let logs: any[] = []
    
    // Manejar estructura de Strapi v5: { data: [...], meta: { pagination: {...} } }
    if (Array.isArray(logsResponse)) {
      logs = logsResponse
      addDebugLog(`[API /logs/usuarios] 📦 Respuesta es array directo, logs: ${logs.length}`)
    } else if (logsResponse.data !== undefined) {
      // Strapi v5 devuelve { data: [...], meta: {...} }
      if (Array.isArray(logsResponse.data)) {
        logs = logsResponse.data
        addDebugLog(`[API /logs/usuarios] 📦 Respuesta tiene data como array, logs: ${logs.length}`)
        if (logsResponse.meta) {
          addDebugLog(`[API /logs/usuarios] 📊 Meta paginación: ${JSON.stringify(logsResponse.meta.pagination)}`)
        }
      } else if (logsResponse.data) {
        logs = [logsResponse.data]
        addDebugLog('[API /logs/usuarios] 📦 Respuesta tiene data como objeto único')
      } else {
        // data es null o undefined
        logs = []
        addDebugLog('[API /logs/usuarios] ⚠️ Respuesta tiene data pero es null/undefined')
      }
    } else {
      // Si no tiene estructura conocida, intentar como objeto único
      logs = [logsResponse]
      addDebugLog('[API /logs/usuarios] 📦 Respuesta como objeto único')
    }

    addDebugLog(`[API /logs/usuarios] 📊 Logs obtenidos: ${logs.length}`)

    if (logs.length === 0) {
      addDebugLog('[API /logs/usuarios] ⚠️ No se encontraron logs en Strapi')
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No hay logs disponibles',
        debug: debugInfo,
      })
    }

    // Agrupar logs por usuario y obtener el último acceso
    const usuariosMap = new Map<number, {
      id: number
      nombre: string
      usuario: string
      email: string
      ultimoAcceso: string | null
      totalAcciones: number
    }>()

    // Mapa temporal para rastrear IPs que ya tienen usuario asociado
    // Esto evita crear usuarios anónimos si ya existe un usuario real con esa IP
    const ipToUsuarioId = new Map<string, number>()

    console.log('[API /logs/usuarios] 🔍 Procesando logs, total:', logs.length)
    
    // PRIMERA PASADA: Procesar TODOS los logs CON usuario real
    // Esto registra todas las IPs asociadas a usuarios reales
    logs.forEach((log: any, index: number) => {
      // Manejar estructura de Strapi (puede venir con .attributes o directamente)
      const logData = log.attributes || log
      const usuario = logData.usuario
      
      if (index === 0) {
        addDebugLog(`[API /logs/usuarios] 🔍 Primer log estructura completa:\n${JSON.stringify(log, null, 2).substring(0, 1500)}`)
        addDebugLog(`[API /logs/usuarios] 🔍 logData keys: ${Object.keys(logData).join(', ')}`)
        addDebugLog(`[API /logs/usuarios] 🔍 logData.usuario tipo: ${typeof usuario}, esObjeto: ${typeof usuario === 'object'}`)
        if (usuario && typeof usuario === 'object') {
          addDebugLog(`[API /logs/usuarios] 🔍 logData.usuario keys: ${Object.keys(usuario).join(', ')}`)
          addDebugLog(`[API /logs/usuarios] 🔍 logData.usuario estructura:\n${JSON.stringify(usuario, null, 2).substring(0, 1000)}`)
        }
      }
      
      // Solo procesar logs CON usuario real en la primera pasada
      if (!usuario) {
        return // Saltar logs sin usuario, se procesarán en la segunda pasada
      }

      let usuarioId: number | null = null
      let nombre = 'Sin nombre'
      let emailLogin = 'Sin usuario'
      let email = 'Sin email'

      // Extraer información del usuario (Colaborador)
      // Por ahora solo obtenemos email_login, luego podemos hacer otra consulta para obtener Persona si es necesario
      
      if (usuario && typeof usuario === 'object') {
        // Caso 1: usuario.data (estructura Strapi v4/v5 con populate)
        if (usuario.data) {
          const colaboradorData = usuario.data
          usuarioId = colaboradorData.id || colaboradorData.documentId || null
          
          // Atributos del Colaborador
          const colaboradorAttrs = colaboradorData.attributes || colaboradorData
          
          // Obtener email_login del Colaborador
          emailLogin = colaboradorAttrs.email_login || 'Sin usuario'
          email = colaboradorAttrs.email_login || 'Sin email'
          
          // Intentar obtener nombre de Persona si está disponible
          const persona = colaboradorAttrs.persona
          if (persona) {
            const personaData = persona.data || persona
            const personaAttrs = personaData?.attributes || personaData || persona
            
            // Construir nombre completo desde los campos disponibles
            // Prioridad: nombre_completo > nombres + primer_apellido > solo nombres > email_login
            if (personaAttrs?.nombre_completo) {
              nombre = personaAttrs.nombre_completo
            } else if (personaAttrs?.nombres) {
              const nombres = personaAttrs.nombres.trim()
              const primerApellido = (personaAttrs.primer_apellido || '').trim()
              // Solo usar nombres + primer_apellido (sin segundo_apellido)
              nombre = primerApellido ? `${nombres} ${primerApellido}`.trim() : nombres
            } else if (personaAttrs?.primer_apellido) {
              nombre = personaAttrs.primer_apellido.trim()
            } else {
              nombre = emailLogin || 'Usuario sin nombre'
            }
          } else {
            nombre = emailLogin || 'Usuario sin nombre'
          }
        } 
        // Caso 2: usuario directamente con id y attributes
        else if (usuario.id || usuario.documentId) {
          usuarioId = usuario.id || usuario.documentId
          const colaboradorAttrs = usuario.attributes || usuario
          
          emailLogin = colaboradorAttrs.email_login || 'Sin usuario'
          email = colaboradorAttrs.email_login || 'Sin email'
          
          // Intentar obtener nombre de Persona si está disponible
          const persona = colaboradorAttrs.persona
          if (persona) {
            const personaData = persona.data || persona
            const personaAttrs = personaData?.attributes || personaData || persona
            
            // Construir nombre completo desde los campos disponibles
            // Prioridad: nombre_completo > nombres + primer_apellido > solo nombres > email_login
            if (personaAttrs?.nombre_completo) {
              nombre = personaAttrs.nombre_completo
            } else if (personaAttrs?.nombres) {
              const nombres = personaAttrs.nombres.trim()
              const primerApellido = (personaAttrs.primer_apellido || '').trim()
              // Solo usar nombres + primer_apellido (sin segundo_apellido)
              nombre = primerApellido ? `${nombres} ${primerApellido}`.trim() : nombres
            } else if (personaAttrs?.primer_apellido) {
              nombre = personaAttrs.primer_apellido.trim()
            } else {
              nombre = emailLogin || 'Usuario sin nombre'
            }
          } else {
            nombre = emailLogin || 'Usuario sin nombre'
          }
        }
      } 
      // Caso 3: Solo ID numérico
      else if (typeof usuario === 'number') {
        usuarioId = usuario
        nombre = `Usuario #${usuario}`
        emailLogin = `ID: ${usuario}`
        email = 'Sin email'
      }
      
      if (index === 0) {
        addDebugLog(`[API /logs/usuarios] 🔍 Procesando usuario del primer log:`)
        addDebugLog(`  - tipo: ${typeof usuario}`)
        addDebugLog(`  - esObjeto: ${typeof usuario === 'object'}`)
        addDebugLog(`  - keys: ${usuario && typeof usuario === 'object' ? Object.keys(usuario).join(', ') : 'N/A'}`)
        addDebugLog(`  - usuarioId: ${usuarioId}`)
        addDebugLog(`  - nombre: ${nombre}`)
        addDebugLog(`  - emailLogin: ${emailLogin}`)
        addDebugLog(`  - email: ${email}`)
        if (usuario && typeof usuario === 'object') {
          if (usuario.data) {
            const colaboradorAttrs = usuario.data.attributes || usuario.data
            addDebugLog(`  - colaboradorAttrs.email_login: ${colaboradorAttrs.email_login}`)
            addDebugLog(`  - colaboradorAttrs.persona: ${colaboradorAttrs.persona ? 'existe' : 'no existe'}`)
            if (colaboradorAttrs.persona) {
              const personaAttrs = colaboradorAttrs.persona.data?.attributes || colaboradorAttrs.persona.data || colaboradorAttrs.persona.attributes || colaboradorAttrs.persona
              addDebugLog(`  - personaAttrs.nombre_completo: ${personaAttrs.nombre_completo || 'no existe'}`)
              addDebugLog(`  - personaAttrs.nombres: ${personaAttrs.nombres || 'no existe'}`)
            }
          } else if (usuario.attributes || usuario.id) {
            const colaboradorAttrs = usuario.attributes || usuario
            addDebugLog(`  - colaboradorAttrs.email_login: ${colaboradorAttrs.email_login}`)
            addDebugLog(`  - colaboradorAttrs.persona: ${colaboradorAttrs.persona ? 'existe' : 'no existe'}`)
          }
        }
      }

      if (!usuarioId) {
        addDebugLog(`[API /logs/usuarios] ⚠️ No se pudo extraer usuarioId del log ${index}: tipo=${typeof usuario}`)
        return
      }

      const fechaLog = logData.fecha || logData.createdAt
      const ipAddress = logData.ip_address || 'desconocido'

      // Registrar la IP con este usuarioId para evitar crear usuarios anónimos después
      if (ipAddress !== 'desconocido') {
        ipToUsuarioId.set(ipAddress, usuarioId)
      }

      // Si el usuario ya existe, actualizar último acceso si es más reciente
      if (usuariosMap.has(usuarioId)) {
        const usuarioExistente = usuariosMap.get(usuarioId)!
        usuarioExistente.totalAcciones++
        if (fechaLog && (!usuarioExistente.ultimoAcceso || new Date(fechaLog) > new Date(usuarioExistente.ultimoAcceso))) {
          usuarioExistente.ultimoAcceso = fechaLog
        }
      } else {
        // Crear nuevo usuario
        usuariosMap.set(usuarioId, {
          id: usuarioId,
          nombre,
          usuario: emailLogin,
          email,
          ultimoAcceso: fechaLog || null,
          totalAcciones: 1,
        })
      }
    })

    // Segunda pasada: procesar logs sin usuario, pero solo si la IP no está asociada a un usuario real
    logs.forEach((log: any) => {
      const logData = log.attributes || log
      const usuario = logData.usuario
      
      // Solo procesar logs sin usuario
      if (usuario) {
        return
      }

      const ipAddress = logData.ip_address || 'desconocido'
      const userAgent = logData.user_agent || 'desconocido'
      const fechaLog = logData.fecha || logData.createdAt
      
      // Si esta IP ya está asociada a un usuario real, agregar el log a ese usuario
      if (ipToUsuarioId.has(ipAddress)) {
        const usuarioIdReal = ipToUsuarioId.get(ipAddress)!
        if (usuariosMap.has(usuarioIdReal)) {
          const usuarioExistente = usuariosMap.get(usuarioIdReal)!
          usuarioExistente.totalAcciones++
          if (fechaLog && (!usuarioExistente.ultimoAcceso || new Date(fechaLog) > new Date(usuarioExistente.ultimoAcceso))) {
            usuarioExistente.ultimoAcceso = fechaLog
          }
        }
        return // No crear usuario anónimo, ya está asociado a un usuario real
      }
      
      // Solo crear usuario anónimo si la IP no está asociada a ningún usuario real
      const ipHash = ipAddress.split('').reduce((acc: number, char: string) => {
        return ((acc << 5) - acc) + char.charCodeAt(0)
      }, 0)
      const usuarioId = -Math.abs(ipHash) // ID negativo para usuarios anónimos
      
      // Si el usuario anónimo ya existe, actualizar último acceso
      if (usuariosMap.has(usuarioId)) {
        const usuarioExistente = usuariosMap.get(usuarioId)!
        usuarioExistente.totalAcciones++
        if (fechaLog && (!usuarioExistente.ultimoAcceso || new Date(fechaLog) > new Date(usuarioExistente.ultimoAcceso))) {
          usuarioExistente.ultimoAcceso = fechaLog
        }
      } else {
        // Crear nuevo usuario anónimo solo si no hay usuario real con esa IP
        usuariosMap.set(usuarioId, {
          id: usuarioId,
          nombre: `Usuario Anónimo (${ipAddress === 'desconocido' ? 'Sin IP' : ipAddress})`,
          usuario: ipAddress,
          email: userAgent.substring(0, 50) + (userAgent.length > 50 ? '...' : ''),
          ultimoAcceso: fechaLog || null,
          totalAcciones: 1,
        })
      }
    })

    // Convertir map a array y ordenar por último acceso
    const usuarios = Array.from(usuariosMap.values()).sort((a, b) => {
      if (!a.ultimoAcceso) return 1
      if (!b.ultimoAcceso) return -1
      return new Date(b.ultimoAcceso).getTime() - new Date(a.ultimoAcceso).getTime()
    })

    addDebugLog(`[API /logs/usuarios] ✅ Usuarios agrupados: ${usuarios.length}`)
    addDebugLog(`[API /logs/usuarios] 📊 Total de logs procesados: ${logs.length}`)
    addDebugLog(`[API /logs/usuarios] 📊 Logs con usuario válido: ${Array.from(usuariosMap.keys()).length}`)
    
    if (usuarios.length > 0) {
      addDebugLog(`[API /logs/usuarios] 🔍 Primer usuario:\n${JSON.stringify(usuarios[0], null, 2)}`)
    } else {
      addDebugLog('[API /logs/usuarios] ⚠️ No se pudieron agrupar usuarios. Revisar logs anteriores.')
    }

    return NextResponse.json({
      success: true,
      data: usuarios,
      debug: debugInfo,
    })
  } catch (error: any) {
    addDebugLog(`[API /logs/usuarios] ❌ Error: ${error.message}`)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener usuarios',
        data: [],
        debug: debugInfo,
      },
      { status: error.status || 500 }
    )
  }
}

