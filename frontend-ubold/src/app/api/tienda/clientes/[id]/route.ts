import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { parseNombreCompleto, enviarClienteABothWordPress } from '@/lib/clientes/utils'

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
        // Tomar el primer teléfono
        const primerTelefono = telefonos[0]
        telefono = typeof primerTelefono === 'string' ? primerTelefono : (primerTelefono.numero || primerTelefono.telefono || primerTelefono.value || '')
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
    console.log('[API Clientes PUT] Actualizando cliente:', id, body)

    // Buscar el cliente primero para obtener el ID correcto
    let cliente: any = null
    
    try {
      // Intentar primero por ID numérico
      const response = await strapiClient.get<any>(`/api/wo-clientes?filters[id][$eq]=${id}&populate=*`)
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        cliente = response.data[0]
      } else if (response.data && !Array.isArray(response.data)) {
        cliente = response.data
      } else if (Array.isArray(response) && response.length > 0) {
        cliente = response[0]
      }
    } catch (error: any) {
      console.log('[API Clientes PUT] Filtro por ID falló, intentando por documentId...')
      
      // Si falla, intentar por documentId
      try {
        const responseByDocId = await strapiClient.get<any>(`/api/wo-clientes?filters[documentId][$eq]=${id}&populate=*`)
        
        if (responseByDocId.data && Array.isArray(responseByDocId.data) && responseByDocId.data.length > 0) {
          cliente = responseByDocId.data[0]
        } else if (responseByDocId.data && !Array.isArray(responseByDocId.data)) {
          cliente = responseByDocId.data
        }
      } catch (docIdError: any) {
        console.log('[API Clientes PUT] Filtro por documentId falló, intentando búsqueda exhaustiva...')
      }
    }
    
    // Si aún no se encontró, hacer búsqueda exhaustiva
    if (!cliente) {
      try {
        const allResponse = await strapiClient.get<any>('/api/wo-clientes?populate=*&pagination[pageSize]=1000')
        const allClientes = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        cliente = allClientes.find((c: any) => {
          const cId = c.id?.toString()
          const cDocId = c.documentId?.toString()
          const cAttrsId = c.attributes?.id?.toString()
          const cAttrsDocId = c.attributes?.documentId?.toString()
          const searchId = id.toString()
          
          return cId === searchId || 
                 cDocId === searchId || 
                 cAttrsId === searchId || 
                 cAttrsDocId === searchId
        })
      } catch (searchError: any) {
        console.error('[API Clientes PUT] Error en búsqueda exhaustiva:', searchError.message)
      }
    }
    
    // Si aún no se encontró, intentar endpoint directo
    if (!cliente) {
      try {
        cliente = await strapiClient.get<any>(`/api/wo-clientes/${id}?populate=*`)
        if (cliente.data) {
          cliente = cliente.data
        }
      } catch (directError: any) {
        console.error('[API Clientes PUT] Error en endpoint directo:', directError.message)
      }
    }

    if (!cliente) {
      return NextResponse.json({
        success: false,
        error: 'Cliente no encontrado'
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
        // Buscar todas las entradas WO-Clientes que tengan esta Persona
        const woClientesSearch = await strapiClient.get<any>(`/api/wo-clientes?populate[persona]=*&pagination[pageSize]=1000`)
        const woClientesArray = woClientesSearch.data && Array.isArray(woClientesSearch.data)
          ? woClientesSearch.data
          : (woClientesSearch.data ? [woClientesSearch.data] : [])
        
        todasLasEntradasWOClientes = woClientesArray.filter((wc: any) => {
          const wcAttrs = wc.attributes || wc
          const wcPersona = wcAttrs.persona || wc.persona
          const wcPersonaId = wcPersona?.data?.documentId || wcPersona?.data?.id || wcPersona?.documentId || wcPersona?.id
          return wcPersonaId?.toString() === personaDocumentId?.toString()
        })
        
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
    
    // 4. Actualizar Persona si se actualizó nombre o correo
    if ((body.data.nombre !== undefined || body.data.correo_electronico !== undefined) && personaDocumentId) {
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
        
        // Manejar teléfono si se envía (desde body.data.telefono o body.data.persona?.telefonos)
        if (body.data.telefono !== undefined || body.data.persona?.telefonos) {
          const telefonos = body.data.persona?.telefonos || (
            body.data.telefono 
              ? [{ numero: body.data.telefono, tipo: 'principal' }]
              : null
          )
          if (telefonos && Array.isArray(telefonos) && telefonos.length > 0) {
            personaUpdateData.data.telefonos = telefonos.map((t: any) => ({
              numero: (t.numero || t.telefono || t.value || '').trim(),
              tipo: t.tipo || 'principal',
            }))
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
        
        // Manejar teléfono si se envía
        if (body.data.telefono || body.data.persona?.telefonos) {
          const telefonos = body.data.persona?.telefonos || (
            body.data.telefono 
              ? [{ numero: body.data.telefono, tipo: 'principal' }]
              : null
          )
          if (telefonos && Array.isArray(telefonos) && telefonos.length > 0) {
            personaData.data.telefonos = telefonos.map((t: any) => ({
              numero: (t.numero || t.telefono || t.value || '').trim(),
              tipo: t.tipo || 'principal',
            }))
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

