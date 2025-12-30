import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { parseNombreCompleto, enviarClienteABothWordPress } from '@/lib/clientes/utils'
import { limpiarRUT } from '@/lib/utils/rut'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Clientes GET] Obteniendo cliente:', id)

    // Intentar obtener el cliente por ID
    let cliente: any = null
    
    try {
      // Intentar primero con filtro por ID, incluyendo populate de Persona con teléfonos
      const response = await strapiClient.get<any>(`/api/wo-clientes?filters[id][$eq]=${id}&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`)
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        cliente = response.data[0]
      } else if (response.data && !Array.isArray(response.data)) {
        cliente = response.data
      } else if (Array.isArray(response) && response.length > 0) {
        cliente = response[0]
      }
    } catch (error: any) {
      console.log('[API Clientes GET] Filtro por ID falló, intentando búsqueda directa...')
      
      // Si falla, intentar obtener todos y buscar
      try {
        const allResponse = await strapiClient.get<any>('/api/wo-clientes?populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*&pagination[pageSize]=1000')
        const allClientes = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        cliente = allClientes.find((c: any) => 
          c.id?.toString() === id || 
          c.documentId === id ||
          (c.attributes && (c.attributes.id?.toString() === id || c.attributes.documentId === id))
        )
      } catch (searchError: any) {
        console.error('[API Clientes GET] Error en búsqueda:', searchError.message)
      }
    }

    // Si aún no se encontró, intentar endpoint directo con populate de Persona
    if (!cliente) {
      try {
        cliente = await strapiClient.get<any>(`/api/wo-clientes/${id}?populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`)
        if (cliente.data) {
          cliente = cliente.data
        }
      } catch (directError: any) {
        console.error('[API Clientes GET] Error en endpoint directo:', directError.message)
      }
    }

    if (!cliente) {
      return NextResponse.json({
        success: false,
        error: 'Cliente no encontrado'
      }, { status: 404 })
    }

    // Extraer teléfono de la Persona relacionada si existe
    const clienteAttrs = cliente.attributes || cliente
    const persona = clienteAttrs.persona?.data || clienteAttrs.persona || cliente.persona?.data || cliente.persona
    let telefono = ''
    if (persona) {
      const personaAttrs = persona.attributes || persona
      const telefonos = personaAttrs.telefonos || persona.telefonos
      if (telefonos && Array.isArray(telefonos) && telefonos.length > 0) {
        // Tomar el primer teléfono (buscar el principal si existe, sino el primero)
        const telefonoPrincipal = telefonos.find((t: any) => t.principal === true || t.principal === 'true' || t.principal === 1) || telefonos[0]
        const tel = typeof telefonoPrincipal === 'string' ? telefonoPrincipal : telefonoPrincipal
        telefono = tel?.telefono_raw || tel?.telefono_norm || tel?.numero || tel?.telefono || tel?.value || ''
      }
    }
    
    // Agregar teléfono al objeto cliente si no existe
    if (telefono && !clienteAttrs.telefono && !cliente.telefono) {
      if (cliente.attributes) {
        cliente.attributes.telefono = telefono
      } else {
        cliente.telefono = telefono
      }
    }

    console.log('[API Clientes GET] ✅ Cliente encontrado:', cliente.id || cliente.documentId)
    
    return NextResponse.json({
      success: true,
      data: cliente
    })
  } catch (error: any) {
    console.error('[API Clientes GET] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener el cliente'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    console.log('[API Clientes PUT] ===== INICIO DE BÚSQUEDA =====')
    console.log('[API Clientes PUT] 📝 ID recibido desde URL:', id, '(tipo:', typeof id, ')')
    console.log('[API Clientes PUT] 📦 Body recibido:', JSON.stringify(body, null, 2))
    console.log('[API Clientes PUT] 🔍 RUT en body.data.persona.rut:', body.data?.persona?.rut || 'no proporcionado')

    // Buscar el cliente primero para obtener el ID correcto
    let cliente: any = null
    console.log('[API Clientes PUT] 🔍 Iniciando búsqueda de cliente con ID:', id, '(tipo:', typeof id, ')')
    
    try {
      // Intentar primero por ID numérico (sin populate para evitar errores)
      const response = await strapiClient.get<any>(`/api/wo-clientes?filters[id][$eq]=${id}`)
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        cliente = response.data[0]
        console.log('[API Clientes PUT] ✅ Cliente encontrado por ID numérico:', cliente.id || cliente.documentId)
      } else if (response.data && !Array.isArray(response.data)) {
        cliente = response.data
        console.log('[API Clientes PUT] ✅ Cliente encontrado por ID numérico (formato directo):', cliente.id || cliente.documentId)
      } else if (Array.isArray(response) && response.length > 0) {
        cliente = response[0]
        console.log('[API Clientes PUT] ✅ Cliente encontrado por ID numérico (array directo):', cliente.id || cliente.documentId)
      } else {
        console.log('[API Clientes PUT] ⚠️ No se encontró cliente por ID numérico, intentando por documentId...')
      }
    } catch (error: any) {
      console.log('[API Clientes PUT] ⚠️ Error al buscar por ID numérico:', error.message, '- Intentando por documentId...')
      
      // Si falla, intentar por documentId (sin populate para evitar errores)
      try {
        const responseByDocId = await strapiClient.get<any>(`/api/wo-clientes?filters[documentId][$eq]=${id}`)
        
        if (responseByDocId.data && Array.isArray(responseByDocId.data) && responseByDocId.data.length > 0) {
          cliente = responseByDocId.data[0]
          console.log('[API Clientes PUT] ✅ Cliente encontrado por documentId:', cliente.id || cliente.documentId)
        } else if (responseByDocId.data && !Array.isArray(responseByDocId.data)) {
          cliente = responseByDocId.data
          console.log('[API Clientes PUT] ✅ Cliente encontrado por documentId (formato directo):', cliente.id || cliente.documentId)
        } else {
          console.log('[API Clientes PUT] ⚠️ No se encontró cliente por documentId, intentando búsqueda exhaustiva...')
        }
      } catch (docIdError: any) {
        console.log('[API Clientes PUT] ⚠️ Error al buscar por documentId:', docIdError.message, '- Intentando búsqueda exhaustiva...')
      }
    }
    
    // Si aún no se encontró, hacer búsqueda exhaustiva (sin populate para evitar errores)
    if (!cliente) {
      try {
        console.log('[API Clientes PUT] 🔍 Realizando búsqueda exhaustiva en todos los clientes...')
        const allResponse = await strapiClient.get<any>('/api/wo-clientes?pagination[pageSize]=1000')
        const allClientes = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        console.log('[API Clientes PUT] 📊 Total de clientes a buscar:', allClientes.length)
        
        cliente = allClientes.find((c: any) => {
          const cId = c.id?.toString()
          const cDocId = c.documentId?.toString()
          const cAttrsId = c.attributes?.id?.toString()
          const cAttrsDocId = c.attributes?.documentId?.toString()
          const searchId = id.toString()
          
          const match = cId === searchId || 
                 cDocId === searchId || 
                 cAttrsId === searchId || 
                 cAttrsDocId === searchId
          
          if (match) {
            console.log('[API Clientes PUT] ✅ Match encontrado:', { cId, cDocId, cAttrsId, cAttrsDocId, searchId })
          }
          
          return match
        })
        
        if (cliente) {
          console.log('[API Clientes PUT] ✅ Cliente encontrado en búsqueda exhaustiva:', cliente.id || cliente.documentId)
        } else {
          console.log('[API Clientes PUT] ⚠️ No se encontró cliente en búsqueda exhaustiva, intentando endpoint directo...')
        }
      } catch (searchError: any) {
        console.error('[API Clientes PUT] ❌ Error en búsqueda exhaustiva:', searchError.message)
      }
    }
    
    // Si aún no se encontró, intentar endpoint directo
    if (!cliente) {
      try {
        console.log('[API Clientes PUT] 🔍 Intentando endpoint directo:', `/api/wo-clientes/${id}`)
        cliente = await strapiClient.get<any>(`/api/wo-clientes/${id}`)
        if (cliente.data) {
          cliente = cliente.data
        }
        if (cliente) {
          console.log('[API Clientes PUT] ✅ Cliente encontrado por endpoint directo:', cliente.id || cliente.documentId)
        }
      } catch (directError: any) {
        console.error('[API Clientes PUT] ❌ Error en endpoint directo:', directError.message)
        if (directError.response?.data) {
          console.error('[API Clientes PUT] ❌ Detalles del error:', JSON.stringify(directError.response.data, null, 2))
        }
        if (directError.response?.status) {
          console.error('[API Clientes PUT] ❌ Status del error:', directError.response.status)
        }
        // No continuar si el error es 404, ya que significa que realmente no existe
        if (directError.response?.status === 404) {
          console.log('[API Clientes PUT] ⚠️ Endpoint directo retornó 404, el cliente no existe con ese ID')
        }
      }
    }

    // Si aún no se encontró y se proporciona RUT en el body, buscar por RUT
    if (!cliente && body.data?.persona?.rut) {
      console.log('[API Clientes PUT] 🔍 No se encontró cliente por ID, intentando búsqueda por RUT...')
      console.log('[API Clientes PUT] 📋 RUT proporcionado en body:', body.data.persona.rut)
      try {
        const rutParaBuscar = limpiarRUT(body.data.persona.rut)
        console.log('[API Clientes PUT] 🔍 Buscando cliente por RUT:', rutParaBuscar)
        
        // Buscar Persona por RUT (sin populate para evitar campos problemáticos como tags)
        const personaSearch = await strapiClient.get<any>(
          `/api/personas?filters[rut][$contains]=${encodeURIComponent(rutParaBuscar)}&pagination[pageSize]=100`
        )
        
        const personasEncontradas = personaSearch.data && Array.isArray(personaSearch.data)
          ? personaSearch.data
          : (personaSearch.data ? [personaSearch.data] : [])
        
        // Buscar la persona que tenga exactamente el mismo RUT (normalizado)
        let personaEncontradaPorRut: any = null
        for (const persona of personasEncontradas) {
          const personaAttrs = persona.attributes || persona
          const personaRut = personaAttrs.rut || persona.rut
          if (personaRut) {
            const rutPersonaNormalizado = limpiarRUT(personaRut.toString())
            if (rutPersonaNormalizado === rutParaBuscar) {
              personaEncontradaPorRut = persona
              break
            }
          }
        }
        
        if (personaEncontradaPorRut) {
          const personaDocId = personaEncontradaPorRut.documentId || personaEncontradaPorRut.id?.toString()
          console.log('[API Clientes PUT] ✅ Persona encontrada por RUT:', personaDocId)
          
          // Buscar WO-Clientes relacionados con esta Persona usando filtros directamente (evita populate que causa error de tags)
          // Intentar primero con documentId, luego con id numérico
          let woClientesSearch: any = null
          try {
            woClientesSearch = await strapiClient.get<any>(
              `/api/wo-clientes?filters[persona][documentId][$eq]=${personaDocId}&pagination[pageSize]=1000`
            )
          } catch (docIdError: any) {
            // Si falla con documentId, intentar con id numérico
            const personaIdNum = personaEncontradaPorRut.id
            if (personaIdNum) {
              woClientesSearch = await strapiClient.get<any>(
                `/api/wo-clientes?filters[persona][id][$eq]=${personaIdNum}&pagination[pageSize]=1000`
              )
            }
          }
          
          if (woClientesSearch) {
            const woClientesArray = woClientesSearch.data && Array.isArray(woClientesSearch.data)
              ? woClientesSearch.data
              : (woClientesSearch.data ? [woClientesSearch.data] : [])
            
            // Si hay resultados, tomar el primero (o buscar el que coincida mejor si hay múltiples)
            if (woClientesArray.length > 0) {
              cliente = woClientesArray[0]
            }
          }
          
          if (cliente) {
            console.log('[API Clientes PUT] ✅ Cliente encontrado por RUT:', cliente.id || cliente.documentId)
          } else {
            console.log('[API Clientes PUT] ⚠️ Persona encontrada por RUT pero no hay WO-Clientes relacionados')
          }
        } else {
          console.log('[API Clientes PUT] ⚠️ No se encontró Persona con el RUT proporcionado')
        }
      } catch (rutSearchError: any) {
        console.error('[API Clientes PUT] ❌ Error al buscar por RUT:', rutSearchError.message)
      }
    }

    if (!cliente) {
      console.error('[API Clientes PUT] ❌ Cliente no encontrado después de todos los intentos de búsqueda')
      console.error('[API Clientes PUT] 📊 Resumen de búsqueda:', {
        idBuscado: id,
        tipoId: typeof id,
        intentoPorIdNumerico: 'falló',
        intentoPorDocumentId: 'falló',
        intentoBusquedaExhaustiva: 'falló',
        intentoEndpointDirecto: 'falló',
        intentoPorRUT: body.data?.persona?.rut ? 'se intentó' : 'no se intentó (no hay RUT en body)',
        rutEnBody: body.data?.persona?.rut || 'no proporcionado',
      })
      return NextResponse.json({
        success: false,
        error: `Cliente no encontrado con ID: ${id}. Intenta editar desde la lista de clientes.`
      }, { status: 404 })
    }

    // En Strapi v4, usar documentId (string) para actualizar, no el id numérico
    const clienteDocumentId = cliente.documentId || cliente.data?.documentId || cliente.id?.toString() || id
    console.log('[API Clientes PUT] Usando documentId para actualizar:', clienteDocumentId)

    // Preparar datos de actualización
    const updateData: any = {
      data: {},
    }

    if (body.data.nombre !== undefined) {
      updateData.data.nombre = body.data.nombre
    }
    if (body.data.correo_electronico !== undefined) {
      updateData.data.correo_electronico = body.data.correo_electronico
    }
    // Nota: telefono y direccion no existen en el schema de WO-Clientes, se omiten
    if (body.data.pedidos !== undefined) {
      updateData.data.pedidos = typeof body.data.pedidos === 'number' ? body.data.pedidos : parseInt(body.data.pedidos) || 0
    }
    if (body.data.gasto_total !== undefined) {
      updateData.data.gasto_total = typeof body.data.gasto_total === 'number' ? body.data.gasto_total : parseFloat(body.data.gasto_total) || 0
    }
    if (body.data.fecha_registro !== undefined) {
      updateData.data.fecha_registro = body.data.fecha_registro
    }
    if (body.data.ultima_actividad !== undefined) {
      updateData.data.ultima_actividad = body.data.ultima_actividad
    }

    // NOTA: Los canales NO existen en el schema de WO-Clientes (solo en productos/libros)
    // Se omiten completamente
    if (body.data.canales !== undefined) {
      console.log('[API Clientes PUT] ℹ️ Canales detectados pero se omitirán (WO-Clientes no tiene campo canales en Strapi)')
    }

    // Obtener la Persona relacionada del cliente actual (si está populateada)
    const clienteAttrs = cliente.attributes || cliente
    const personaRelacionada = clienteAttrs.persona || cliente.persona
    
    // Obtener valores finales (nuevos o existentes)
    const nombreFinal = body.data.nombre !== undefined ? body.data.nombre : (clienteAttrs.nombre || (cliente as any).nombre || '')
    const correoFinal = body.data.correo_electronico !== undefined ? body.data.correo_electronico : (clienteAttrs.correo_electronico || (cliente as any).correo_electronico || '')
    
    // 1. Buscar la Persona (por relación o por email si no está populateada)
    let personaEncontrada: any = null
    let personaDocumentId: string | null = null
    
    if (personaRelacionada) {
      // Si la persona viene populateada, usarla directamente
      personaEncontrada = personaRelacionada.data || personaRelacionada
      personaDocumentId = personaEncontrada.documentId || personaEncontrada.id?.toString()
      console.log('[API Clientes PUT] 📌 Persona encontrada desde relación:', personaDocumentId)
    } else if (correoFinal) {
      // Si no está populateada, buscar por email
      try {
        const personaSearch = await strapiClient.get<any>(`/api/personas?populate[emails]=*&pagination[pageSize]=1000`)
        const personasArray = personaSearch.data && Array.isArray(personaSearch.data) 
          ? personaSearch.data 
          : (personaSearch.data ? [personaSearch.data] : [])
        
        for (const persona of personasArray) {
          const attrs = persona.attributes || persona
          if (attrs.emails && Array.isArray(attrs.emails)) {
            const tieneEmail = attrs.emails.some((e: any) => {
              const emailValue = typeof e === 'string' ? e : (e.email || e)
              return emailValue?.toLowerCase() === correoFinal.toLowerCase()
            })
            if (tieneEmail) {
              personaEncontrada = persona
              personaDocumentId = persona.documentId || persona.id?.toString()
              break
            }
          }
        }
        if (personaDocumentId) {
          console.log('[API Clientes PUT] 📌 Persona encontrada por email:', personaDocumentId)
        }
      } catch (personaSearchError: any) {
        console.error('[API Clientes PUT] ⚠️ Error al buscar Persona:', personaSearchError.message)
      }
    }
    
    // 2. Si tenemos Persona, buscar TODAS las entradas WO-Clientes relacionadas a esa Persona
    let todasLasEntradasWOClientes: any[] = []
    if (personaDocumentId) {
      try {
        // Buscar todas las entradas WO-Clientes que tengan esta Persona usando filtros directamente (evita populate que causa error de tags)
        // Intentar primero con documentId, luego con id numérico
        let woClientesSearch: any = null
        try {
          woClientesSearch = await strapiClient.get<any>(
            `/api/wo-clientes?filters[persona][documentId][$eq]=${personaDocumentId}&pagination[pageSize]=1000`
          )
        } catch (docIdError: any) {
          // Si falla con documentId, intentar obtener el id numérico de la persona encontrada
          if (personaEncontrada) {
            const personaIdNum = personaEncontrada.id || (personaEncontrada.attributes && personaEncontrada.attributes.id)
            if (personaIdNum) {
              try {
                woClientesSearch = await strapiClient.get<any>(
                  `/api/wo-clientes?filters[persona][id][$eq]=${personaIdNum}&pagination[pageSize]=1000`
                )
              } catch (idError: any) {
                console.log('[API Clientes PUT] ⚠️ Error al buscar con id numérico también, usando solo la entrada actual')
              }
            }
          }
        }
        
        if (woClientesSearch) {
          const woClientesArray = woClientesSearch.data && Array.isArray(woClientesSearch.data)
            ? woClientesSearch.data
            : (woClientesSearch.data ? [woClientesSearch.data] : [])
          
          // Los resultados ya están filtrados por Strapi, así que usarlos directamente
          todasLasEntradasWOClientes = woClientesArray
        }
        
        console.log('[API Clientes PUT] 📦 Encontradas entradas WO-Clientes relacionadas:', todasLasEntradasWOClientes.length)
      } catch (woClientesError: any) {
        console.error('[API Clientes PUT] ⚠️ Error al buscar entradas WO-Clientes relacionadas:', woClientesError.message)
        // Si falla, solo actualizar la entrada actual
        todasLasEntradasWOClientes = [cliente]
      }
    } else {
      // Si no hay Persona, solo actualizar la entrada actual
      todasLasEntradasWOClientes = [cliente]
    }
    
    // 3. Actualizar TODAS las entradas WO-Clientes relacionadas
    const woClientesActualizadas: any[] = []
    for (const woCliente of todasLasEntradasWOClientes) {
      const woClienteDocId = woCliente.documentId || woCliente.data?.documentId || woCliente.id?.toString()
      try {
        const woClienteResponse = await strapiClient.put(`/api/wo-clientes/${woClienteDocId}`, updateData)
        woClientesActualizadas.push(woClienteResponse)
        console.log('[API Clientes PUT] ✅ Cliente actualizado en WO-Clientes:', woClienteDocId)
      } catch (woClienteError: any) {
        console.error(`[API Clientes PUT] ⚠️ Error al actualizar WO-Clientes ${woClienteDocId}:`, woClienteError.message)
      }
    }
    
    // 4. Actualizar Persona si se actualizó nombre, correo o RUT
    if ((body.data.nombre !== undefined || body.data.correo_electronico !== undefined || body.data.persona?.rut) && personaDocumentId) {
      try {
        const nombreParseado = parseNombreCompleto(nombreFinal.trim())
        const personaUpdateData: any = {
          data: {
            nombre_completo: nombreFinal.trim(),
            nombres: nombreParseado.nombres || null,
            primer_apellido: nombreParseado.primer_apellido || null,
            segundo_apellido: nombreParseado.segundo_apellido || null,
          },
        }
        
        // Actualizar email si cambió
        if (body.data.correo_electronico !== undefined && correoFinal) {
          personaUpdateData.data.emails = [
            {
              email: correoFinal.trim(),
              tipo: 'Personal', // Valores válidos: "Personal", "Laboral", "Institucional"
            }
          ]
        }

        // Actualizar RUT si se proporciona
        if (body.data.persona?.rut && body.data.persona.rut.trim()) {
          personaUpdateData.data.rut = body.data.persona.rut.trim()
        }
        
        // Manejar teléfono si se envía (desde body.data.telefono o body.data.persona?.telefonos)
        if (body.data.telefono !== undefined || body.data.persona?.telefonos) {
          const telefonos = body.data.persona?.telefonos || (
            body.data.telefono 
              ? [{ telefono_raw: body.data.telefono }]
              : null
          )
          if (telefonos && Array.isArray(telefonos) && telefonos.length > 0) {
            personaUpdateData.data.telefonos = telefonos.map((t: any) => {
              const telefonoValue = (t.telefono_raw || t.telefono_norm || t.numero || t.telefono || t.value || '').trim()
              // Validar que tipo sea uno de los valores permitidos, sino usar null
              let tipoValido = null
              if (t.tipo && ['Personal', 'Laboral', 'Institucional'].includes(t.tipo)) {
                tipoValido = t.tipo
              }
              
              return {
                telefono_raw: telefonoValue,
                telefono_norm: telefonoValue, // Por ahora usar el mismo valor
                tipo: tipoValido, // Solo valores válidos: "Personal", "Laboral", "Institucional" o null
                principal: t.principal !== undefined ? t.principal : true, // Por defecto true
                status: t.status !== undefined ? t.status : true, // Por defecto true (vigente)
              }
            })
          } else if (body.data.telefono === '' || body.data.telefono === null) {
            // Si se envía vacío, eliminar todos los teléfonos
            personaUpdateData.data.telefonos = []
          }
        }
        
        await strapiClient.put(`/api/personas/${personaDocumentId}`, personaUpdateData)
        console.log('[API Clientes PUT] ✅ Persona actualizada en Strapi:', personaDocumentId)
      } catch (personaError: any) {
        console.error('[API Clientes PUT] ⚠️ Error al actualizar Persona (no crítico):', personaError.message)
      }
    } else if ((body.data.nombre !== undefined || body.data.correo_electronico !== undefined) && !personaDocumentId && correoFinal) {
      // Si no se encontró Persona pero hay correo, crear nueva Persona
      try {
        const nombreParseado = parseNombreCompleto(nombreFinal.trim())
        const personaData: any = {
          data: {
            nombre_completo: nombreFinal.trim(),
            nombres: nombreParseado.nombres || null,
            primer_apellido: nombreParseado.primer_apellido || null,
            segundo_apellido: nombreParseado.segundo_apellido || null,
            emails: [
              {
                email: correoFinal.trim(),
                tipo: 'Personal',
              }
            ],
          },
        }
        
        // Agregar RUT si se proporciona
        if (body.data.persona?.rut && body.data.persona.rut.trim()) {
          personaData.data.rut = body.data.persona.rut.trim()
        }
        
        // Manejar teléfono si se envía
        if (body.data.telefono || body.data.persona?.telefonos) {
          const telefonos = body.data.persona?.telefonos || (
            body.data.telefono 
              ? [{ telefono_raw: body.data.telefono }]
              : null
          )
          if (telefonos && Array.isArray(telefonos) && telefonos.length > 0) {
            personaData.data.telefonos = telefonos.map((t: any) => {
              const telefonoValue = (t.telefono_raw || t.telefono_norm || t.numero || t.telefono || t.value || '').trim()
              // Validar que tipo sea uno de los valores permitidos, sino usar null
              let tipoValido = null
              if (t.tipo && ['Personal', 'Laboral', 'Institucional'].includes(t.tipo)) {
                tipoValido = t.tipo
              }
              
              return {
                telefono_raw: telefonoValue,
                telefono_norm: telefonoValue, // Por ahora usar el mismo valor
                tipo: tipoValido, // Solo valores válidos: "Personal", "Laboral", "Institucional" o null
                principal: t.principal !== undefined ? t.principal : true, // Por defecto true
                status: t.status !== undefined ? t.status : true, // Por defecto true (vigente)
              }
            })
          }
        }
        
        await strapiClient.post('/api/personas', personaData)
        console.log('[API Clientes PUT] ✅ Nueva Persona creada en Strapi')
      } catch (personaError: any) {
        console.error('[API Clientes PUT] ⚠️ Error al crear Persona (no crítico):', personaError.message)
      }
    }
    
    // 5. Actualizar WordPress en ambas plataformas (Moraleja y Escolar)
    if (body.data.nombre !== undefined || body.data.correo_electronico !== undefined) {
      if (nombreFinal && correoFinal) {
        try {
          const nombreParseado = parseNombreCompleto(nombreFinal.trim())
          const nombresWordPress = nombreParseado.nombres || nombreFinal.trim()
          const apellidoWordPress = nombreParseado.primer_apellido || ''
          
          console.log('[API Clientes PUT] 🌐 Actualizando cliente en WordPress (Moraleja y Escolar)...')
          const wordPressResults = await enviarClienteABothWordPress({
            email: correoFinal.trim(),
            first_name: nombresWordPress,
            last_name: apellidoWordPress,
          })
          
          console.log('[API Clientes PUT] ✅ Cliente actualizado en WordPress:', {
            escolar: wordPressResults.escolar.success,
            moraleja: wordPressResults.moraleja.success,
          })
        } catch (wpError: any) {
          console.error('[API Clientes PUT] ⚠️ Error al actualizar en WordPress (no crítico):', wpError.message)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: woClientesActualizadas.length > 0 ? woClientesActualizadas[0] : null,
      entradasActualizadas: woClientesActualizadas.length,
      message: `Cliente actualizado exitosamente. ${woClientesActualizadas.length} entrada(s) WO-Clientes actualizada(s)`
    })
  } catch (error: any) {
    console.error('[API Clientes PUT] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar el cliente'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Clientes DELETE] Eliminando cliente:', id)

    // Buscar el cliente primero para obtener el ID correcto
    let cliente: any = null
    
    try {
      const response = await strapiClient.get<any>(`/api/wo-clientes?filters[id][$eq]=${id}&populate=*`)
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        cliente = response.data[0]
      } else if (response.data && !Array.isArray(response.data)) {
        cliente = response.data
      } else if (Array.isArray(response) && response.length > 0) {
        cliente = response[0]
      }
    } catch (error: any) {
      // Si falla, intentar obtener todos y buscar
      try {
        const allResponse = await strapiClient.get<any>('/api/wo-clientes?populate=*&pagination[pageSize]=1000')
        const allClientes = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        cliente = allClientes.find((c: any) => 
          c.id?.toString() === id || 
          c.documentId === id ||
          (c.attributes && (c.attributes.id?.toString() === id || c.attributes.documentId === id))
        )
      } catch (searchError: any) {
        console.error('[API Clientes DELETE] Error en búsqueda:', searchError.message)
      }
    }

    if (!cliente) {
      return NextResponse.json({
        success: false,
        error: 'Cliente no encontrado'
      }, { status: 404 })
    }

    // En Strapi v4, usar documentId (string) para eliminar, no el id numérico
    const clienteDocumentId = cliente.documentId || cliente.data?.documentId || cliente.id?.toString() || id
    console.log('[API Clientes DELETE] Usando documentId para eliminar:', clienteDocumentId)

    await strapiClient.delete(`/api/wo-clientes/${clienteDocumentId}`)
    
    console.log('[API Clientes DELETE] ✅ Cliente eliminado:', clienteDocumentId)
    
    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    })
  } catch (error: any) {
    console.error('[API Clientes DELETE] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar el cliente'
    }, { status: 500 })
  }
}

