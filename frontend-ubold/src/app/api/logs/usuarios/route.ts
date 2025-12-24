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
      // Usar el mismo populate que funciona en /api/logs/route.ts
      // Esto obtiene todos los datos del usuario (Colaborador) sin especificar campos
      logsResponse = await strapiClient.get<any>(
        `/api/activity-logs?populate[usuario][populate]=*&pagination[pageSize]=10000&sort=fecha:desc`
      )
      addDebugLog('[API /logs/usuarios] ✅ Respuesta de Strapi recibida')
    } catch (strapiError: any) {
      addDebugLog(`[API /logs/usuarios] ❌ Error al obtener logs de Strapi: ${strapiError.message}`)
      addDebugLog(`[API /logs/usuarios] ❌ Stack: ${strapiError.stack?.substring(0, 500)}`)
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

    console.log('[API /logs/usuarios] 🔍 Procesando logs, total:', logs.length)
    
    logs.forEach((log: any, index: number) => {
      // Manejar estructura de Strapi (puede venir con .attributes o directamente)
      const logData = log.attributes || log
      const usuario = logData.usuario
      
      if (index === 0) {
        addDebugLog(`[API /logs/usuarios] 🔍 Primer log estructura completa:\n${JSON.stringify(log, null, 2).substring(0, 1000)}`)
        addDebugLog(`[API /logs/usuarios] 🔍 logData keys: ${Object.keys(logData).join(', ')}`)
        addDebugLog(`[API /logs/usuarios] 🔍 logData.usuario:\n${JSON.stringify(usuario, null, 2).substring(0, 500)}`)
      }
      
      if (!usuario) {
        // Si no hay usuario, crear un usuario "anónimo" basado en IP para agrupar logs sin usuario
        const ipAddress = logData.ip_address || 'desconocido'
        const userAgent = logData.user_agent || 'desconocido'
        const fechaLog = logData.fecha || logData.createdAt
        
        // Generar un ID único basado en la IP (usar hash simple)
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
          // Crear nuevo usuario anónimo
          usuariosMap.set(usuarioId, {
            id: usuarioId,
            nombre: `Usuario Anónimo (${ipAddress === 'desconocido' ? 'Sin IP' : ipAddress})`,
            usuario: ipAddress,
            email: userAgent.substring(0, 50) + (userAgent.length > 50 ? '...' : ''),
            ultimoAcceso: fechaLog || null,
            totalAcciones: 1,
          })
        }
        return
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
            nombre = personaAttrs.nombre_completo || 
                     personaAttrs.nombres || 
                     `${(personaAttrs.primer_apellido || '')} ${(personaAttrs.segundo_apellido || '')}`.trim() ||
                     emailLogin || 
                     'Sin nombre'
          } else {
            nombre = emailLogin || 'Sin nombre'
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
            nombre = personaAttrs.nombre_completo || 
                     personaAttrs.nombres || 
                     `${(personaAttrs.primer_apellido || '')} ${(personaAttrs.segundo_apellido || '')}`.trim() ||
                     emailLogin || 
                     'Sin nombre'
          } else {
            nombre = emailLogin || 'Sin nombre'
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
        addDebugLog(`[API /logs/usuarios] 🔍 Procesando usuario del primer log: tipo=${typeof usuario}, esObjeto=${typeof usuario === 'object'}, keys=${usuario && typeof usuario === 'object' ? Object.keys(usuario).join(', ') : 'N/A'}, usuarioId=${usuarioId}, nombre=${nombre}, emailLogin=${emailLogin}`)
      }

      if (!usuarioId) {
        addDebugLog(`[API /logs/usuarios] ⚠️ No se pudo extraer usuarioId del log ${index}: tipo=${typeof usuario}`)
        return
      }

      const fechaLog = logData.fecha || logData.createdAt

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

