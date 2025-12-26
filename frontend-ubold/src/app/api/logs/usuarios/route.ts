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
      
      // Populate del usuario con persona para obtener email_login y nombre
      // IMPORTANTE: Especificar solo los campos que existen en persona para evitar errores con relaciones inexistentes (como tags)
      logsResponse = await strapiClient.get<any>(
        `/api/activity-logs?populate[usuario][fields]=email_login,id,documentId&populate[usuario][populate][persona][fields]=nombres,primer_apellido,segundo_apellido,nombre_completo&pagination[pageSize]=10000&sort=fecha:desc`
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
    
    // El endpoint personalizado devuelve { data: [...], meta: { pagination: {...} } }
    if (logsResponse.data !== undefined) {
      if (Array.isArray(logsResponse.data)) {
        logs = logsResponse.data
        addDebugLog(`[API /logs/usuarios] 📦 Respuesta del endpoint personalizado, logs: ${logs.length}`)
        if (logsResponse.meta) {
          addDebugLog(`[API /logs/usuarios] 📊 Meta paginación: ${JSON.stringify(logsResponse.meta.pagination)}`)
        }
      } else if (logsResponse.data) {
        logs = [logsResponse.data]
        addDebugLog('[API /logs/usuarios] 📦 Respuesta tiene data como objeto único')
      } else {
        logs = []
        addDebugLog('[API /logs/usuarios] ⚠️ Respuesta tiene data pero es null/undefined')
      }
    } else if (Array.isArray(logsResponse)) {
      // Fallback: si viene como array directo
      logs = logsResponse
      addDebugLog(`[API /logs/usuarios] 📦 Respuesta es array directo, logs: ${logs.length}`)
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

    // Agrupar logs por EMAIL del usuario (no por ID)
    // Esto asegura que todos los logs del mismo email se agrupen juntos
    const usuariosMap = new Map<string, {
      id: number
      nombre: string
      usuario: string
      email: string
      ultimoAcceso: string | null
      totalAcciones: number
    }>()

    // Mapa temporal para rastrear IPs que ya tienen email asociado
    // Esto evita crear usuarios anónimos si ya existe un usuario real con esa IP
    const ipToEmail = new Map<string, string>() // IP -> Email (último email que usó esa IP)
    
    // Mapa para rastrear TODAS las IPs de cada email (más exhaustivo)
    const emailToIps = new Map<string, Set<string>>() // Email -> Set de IPs (todas las IPs de ese email)
    
    // Mapa para mantener el ID del usuario asociado a cada email
    const emailToId = new Map<string, number>()

    console.log('[API /logs/usuarios] 🔍 Procesando logs, total:', logs.length)
    
    // PRIMERA PASADA: Procesar TODOS los logs CON usuario real
    // Esto registra todas las IPs asociadas a usuarios reales
    logs.forEach((log: any, index: number) => {
      // Manejar estructura de Strapi (puede venir con .attributes o directamente)
      const logData = log.attributes || log
      const usuario = logData.usuario
      
      // Logging detallado para debugging
      if (index < 5) { // Aumentar a 5 logs para ver más casos
        addDebugLog(`[API /logs/usuarios] 🔍 Log #${index} - usuario: ${usuario ? 'EXISTE' : 'NULL'}`)
        if (usuario) {
          addDebugLog(`[API /logs/usuarios] 🔍 Log #${index} - usuario estructura completa: ${JSON.stringify(usuario, null, 2).substring(0, 1000)}`)
          // Verificar estructura específica
          if (usuario.data) {
            addDebugLog(`[API /logs/usuarios] 🔍 Log #${index} - usuario tiene .data`)
            if (usuario.data.attributes) {
              addDebugLog(`[API /logs/usuarios] 🔍 Log #${index} - usuario.data.attributes.email_login: ${usuario.data.attributes.email_login || 'NO HAY'}`)
            }
          } else if (usuario.attributes) {
            addDebugLog(`[API /logs/usuarios] 🔍 Log #${index} - usuario tiene .attributes`)
            addDebugLog(`[API /logs/usuarios] 🔍 Log #${index} - usuario.attributes.email_login: ${usuario.attributes.email_login || 'NO HAY'}`)
          } else if (usuario.email_login) {
            addDebugLog(`[API /logs/usuarios] 🔍 Log #${index} - usuario tiene email_login directo: ${usuario.email_login}`)
          }
        } else {
          addDebugLog(`[API /logs/usuarios] ⚠️ Log #${index} - usuario es NULL, IP: ${logData.ip_address || 'sin IP'}`)
          // Verificar si el log tiene estructura diferente
          addDebugLog(`[API /logs/usuarios] 🔍 Log #${index} - logData completo (primeros 500 chars): ${JSON.stringify(logData, null, 2).substring(0, 500)}`)
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

      // Usar email como clave de agrupación (no ID)
      // Si no hay email, usar el ID como fallback
      const emailKey = emailLogin && emailLogin !== 'Sin usuario' && emailLogin !== 'Sin email' 
        ? emailLogin.toLowerCase().trim() 
        : `id_${usuarioId}`
      
      // Logging para debugging
      if (index < 3) {
        addDebugLog(`[API /logs/usuarios] 🔍 Log #${index} - emailKey: "${emailKey}", emailLogin: "${emailLogin}", usuarioId: ${usuarioId}`)
      }
      
      // Registrar la IP con este email para evitar crear usuarios anónimos después
      // CRÍTICO: Registrar TODAS las IPs asociadas a este usuario para asociar logs anónimos después
      if (ipAddress !== 'desconocido' && emailKey && !emailKey.startsWith('id_')) {
        // Registrar IP -> Email (la más reciente gana)
        ipToEmail.set(ipAddress, emailKey)
        
        // Registrar Email -> IPs (todas las IPs de este email)
        if (!emailToIps.has(emailKey)) {
          emailToIps.set(emailKey, new Set())
        }
        emailToIps.get(emailKey)!.add(ipAddress)
        
        emailToId.set(emailKey, usuarioId)
        if (index < 3) {
          addDebugLog(`[API /logs/usuarios] ✅ Asociando IP ${ipAddress} con email ${emailKey} (ID: ${usuarioId})`)
        }
      }

      // Si el usuario ya existe (por email), actualizar último acceso si es más reciente
      if (usuariosMap.has(emailKey)) {
        const usuarioExistente = usuariosMap.get(emailKey)!
        usuarioExistente.totalAcciones++
        // Actualizar ID al del log más reciente (usar el ID del log con fecha más reciente)
        if (fechaLog && (!usuarioExistente.ultimoAcceso || new Date(fechaLog) > new Date(usuarioExistente.ultimoAcceso))) {
          usuarioExistente.ultimoAcceso = fechaLog
          // Si este log es más reciente, usar su ID
          usuarioExistente.id = usuarioId
        }
      } else {
        // Crear nuevo usuario agrupado por email
        usuariosMap.set(emailKey, {
          id: usuarioId,
          nombre,
          usuario: emailLogin,
          email: emailLogin,
          ultimoAcceso: fechaLog || null,
          totalAcciones: 1,
        })
      }
    })

    // Segunda pasada: procesar logs sin usuario, pero asociarlos con usuarios reales si es posible
    let anonimoIndex = 0
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
      
      // CRÍTICO: Buscar si hay algún usuario real con esta IP
      // Estrategia: buscar en emailToIps para encontrar todos los emails que han usado esta IP
      let usuarioRealEncontrado = false
      let emailUsuarioEncontrado: string | null = null
      
      // Método 1: Buscar directamente en ipToEmail (más rápido)
      if (ipToEmail.has(ipAddress)) {
        const emailUsuario = ipToEmail.get(ipAddress)!
        if (usuariosMap.has(emailUsuario)) {
          usuarioRealEncontrado = true
          emailUsuarioEncontrado = emailUsuario
        }
      }
      
      // Método 2: Buscar en emailToIps (más exhaustivo - busca en todas las IPs de todos los usuarios)
      if (!usuarioRealEncontrado) {
        for (const [emailKey, ipsSet] of emailToIps.entries()) {
          if (ipsSet.has(ipAddress) && usuariosMap.has(emailKey)) {
            usuarioRealEncontrado = true
            emailUsuarioEncontrado = emailKey
            break
          }
        }
      }
      
      // Si se encontró un usuario real, asociar este log anónimo a ese usuario
      if (usuarioRealEncontrado && emailUsuarioEncontrado) {
        const usuarioExistente = usuariosMap.get(emailUsuarioEncontrado)!
        usuarioExistente.totalAcciones++
        if (fechaLog && (!usuarioExistente.ultimoAcceso || new Date(fechaLog) > new Date(usuarioExistente.ultimoAcceso))) {
          usuarioExistente.ultimoAcceso = fechaLog
        }
        if (anonimoIndex < 3) {
          addDebugLog(`[API /logs/usuarios] ✅ Log anónimo (IP: ${ipAddress}) asociado a usuario real: ${emailUsuarioEncontrado}`)
        }
        anonimoIndex++
        return // No crear usuario anónimo, ya está asociado a un usuario real
      }
      
      // Solo crear usuario anónimo si realmente no hay usuario real con esa IP
      const ipKey = `anonimo_${ipAddress}`
      
      // Si el usuario anónimo ya existe, actualizar último acceso
      if (usuariosMap.has(ipKey)) {
        const usuarioExistente = usuariosMap.get(ipKey)!
        usuarioExistente.totalAcciones++
        if (fechaLog && (!usuarioExistente.ultimoAcceso || new Date(fechaLog) > new Date(usuarioExistente.ultimoAcceso))) {
          usuarioExistente.ultimoAcceso = fechaLog
        }
      } else {
        // Crear nuevo usuario anónimo solo si realmente no hay usuario real con esa IP
        const ipHash = ipAddress.split('').reduce((acc: number, char: string) => {
          return ((acc << 5) - acc) + char.charCodeAt(0)
        }, 0)
        const usuarioId = -Math.abs(ipHash) // ID negativo para usuarios anónimos
        
        usuariosMap.set(ipKey, {
          id: usuarioId,
          nombre: `Usuario Anónimo (${ipAddress === 'desconocido' ? 'Sin IP' : ipAddress})`,
          usuario: `IP: ${ipAddress}`, // Mostrar "IP: ..." para que sea claro que es anónimo
          email: `IP: ${ipAddress}`, // Mostrar IP como email para usuarios anónimos
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
    
    // Listar todos los emails encontrados para debug
    const emailsEncontrados = Array.from(usuariosMap.keys()).filter(key => !key.startsWith('id_') && !key.startsWith('anonimo_'))
    addDebugLog(`[API /logs/usuarios] 📧 Emails encontrados: ${emailsEncontrados.join(', ')}`)
    
    // Verificar si hay logs con usuario null
    const logsSinUsuario = logs.filter((log: any) => {
      const logData = log.attributes || log
      return !logData.usuario
    }).length
    addDebugLog(`[API /logs/usuarios] ⚠️ Logs sin usuario (null): ${logsSinUsuario}`)

    if (usuarios.length > 0) {
      addDebugLog(`[API /logs/usuarios] 🔍 Primer usuario:\n${JSON.stringify(usuarios[0], null, 2)}`)
      // Buscar específicamente holanda@holanda.com
      const holandaUsuario = usuarios.find(u => u.email?.toLowerCase().includes('holanda'))
      if (holandaUsuario) {
        addDebugLog(`[API /logs/usuarios] ✅ Usuario holanda@holanda.com encontrado: ${JSON.stringify(holandaUsuario, null, 2)}`)
      } else {
        addDebugLog(`[API /logs/usuarios] ⚠️ Usuario holanda@holanda.com NO encontrado en la lista`)
      }
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

