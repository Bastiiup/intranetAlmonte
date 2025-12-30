import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { enviarClienteABothWordPress } from '@/lib/clientes/utils'
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
    console.log('[API Clientes PUT] ===== INICIO DE EDICIÓN =====')
    console.log('[API Clientes PUT] 📝 ID recibido desde URL:', id, '(tipo:', typeof id, ')')
    console.log('[API Clientes PUT] 📦 Body recibido:', JSON.stringify(body, null, 2))
    console.log('[API Clientes PUT] 🔍 RUT en body.data.persona.rut:', body.data?.persona?.rut || 'no proporcionado')
    console.log('[API Clientes PUT] 🔍 personaDocumentId en body.data.persona.documentId:', body.data?.persona?.documentId || 'no proporcionado')

    // Buscar Persona directamente
    let personaEncontrada: any = null
    let personaDocumentId: string | null = null
    
    // 1. PRIORIDAD: Si se proporciona documentId de Persona, usarlo directamente (más confiable para edición)
    // Si se proporciona el documentId, confiamos en él y lo usamos para actualizar directamente
    if (body.data?.persona?.documentId) {
      personaDocumentId = body.data.persona.documentId
      console.log('[API Clientes PUT] ✅ Usando personaDocumentId proporcionado para actualizar:', personaDocumentId)
    }
    
    // 2. Si no se encontró por documentId, intentar buscar Persona por RUT (método secundario)
    if (!personaDocumentId && body.data?.persona?.rut) {
      try {
        const rutParaBuscar = limpiarRUT(body.data.persona.rut)
        console.log('[API Clientes PUT] 🔍 Buscando Persona por RUT:', rutParaBuscar)
        
        const personaSearch = await strapiClient.get<any>(
          `/api/personas?filters[rut][$contains]=${encodeURIComponent(rutParaBuscar)}&pagination[pageSize]=100`
        )
        
        const personasEncontradas = personaSearch.data && Array.isArray(personaSearch.data)
          ? personaSearch.data
          : (personaSearch.data ? [personaSearch.data] : [])
        
        // Buscar la persona que tenga exactamente el mismo RUT (normalizado)
        for (const persona of personasEncontradas) {
          const personaAttrs = persona.attributes || persona
          const personaRut = personaAttrs.rut || persona.rut
          if (personaRut) {
            const rutPersonaNormalizado = limpiarRUT(personaRut.toString())
            if (rutPersonaNormalizado === rutParaBuscar) {
              personaEncontrada = persona
              personaDocumentId = personaEncontrada.documentId || personaEncontrada.id?.toString()
              console.log('[API Clientes PUT] ✅ Persona encontrada por RUT:', personaDocumentId)
              break
            }
          }
        }
        
        if (!personaDocumentId) {
          console.log('[API Clientes PUT] ⚠️ No se encontró Persona con el RUT proporcionado, se creará una nueva')
        }
      } catch (rutSearchError: any) {
        console.error('[API Clientes PUT] ❌ Error al buscar Persona por RUT:', rutSearchError.message)
      }
    }
    
    // 3. Si no se encontró por documentId ni por RUT, intentar buscar Persona por ID (fallback, aunque probablemente no funcione)
    if (!personaDocumentId && id) {
      try {
        console.log('[API Clientes PUT] 🔍 Intentando buscar Persona por ID:', id)
        const personaById = await strapiClient.get<any>(`/api/personas/${id}`)
        if (personaById.data) {
          personaEncontrada = personaById.data
          personaDocumentId = personaEncontrada.documentId || personaEncontrada.id?.toString()
          console.log('[API Clientes PUT] ✅ Persona encontrada por ID:', personaDocumentId)
        }
      } catch (idError: any) {
        console.log('[API Clientes PUT] ⚠️ No se encontró Persona por ID (esto es normal si el ID no corresponde a Persona)')
      }
    }

    // 3. Obtener valores del body
    const nombreFinal = body.data.nombre || ''
    const correoFinal = body.data.correo_electronico || ''
    
    // 4. Si se encontró Persona, actualizarla; si no, crearla
    if (personaDocumentId) {
      // Actualizar Persona existente
      try {
        // No usar parseNombreCompleto para edición - guardar el nombre completo tal cual
        // Esto evita que nombres adicionales se conviertan en apellidos
        const personaUpdateData: any = {
          data: {
            nombre_completo: nombreFinal.trim(),
            // Guardar todo el nombre completo en 'nombres' sin dividirlo
            nombres: nombreFinal.trim(),
            // Dejar apellidos como null cuando se está editando desde un solo campo
            primer_apellido: null,
            segundo_apellido: null,
          },
        }
        
        // Actualizar email si se proporciona
        if (correoFinal) {
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
                telefono_norm: telefonoValue,
                tipo: tipoValido,
                principal: t.principal !== undefined ? t.principal : true,
                status: t.status !== undefined ? t.status : true,
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
        console.error('[API Clientes PUT] ❌ Error al actualizar Persona:', personaError.message)
        return NextResponse.json({
          success: false,
          error: `Error al actualizar Persona: ${personaError.message}`
        }, { status: 500 })
      }
    } else {
      // Crear nueva Persona
      if (!nombreFinal || !correoFinal) {
        return NextResponse.json({
          success: false,
          error: 'No se encontró Persona y se requiere nombre y correo electrónico para crear una nueva'
        }, { status: 400 })
      }
      
      try {
        // No usar parseNombreCompleto para creación desde edición - guardar el nombre completo tal cual
        // Esto evita que nombres adicionales se conviertan en apellidos
        const personaData: any = {
          data: {
            nombre_completo: nombreFinal.trim(),
            // Guardar todo el nombre completo en 'nombres' sin dividirlo
            nombres: nombreFinal.trim(),
            // Dejar apellidos como null cuando se está creando desde un solo campo
            primer_apellido: null,
            segundo_apellido: null,
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
              let tipoValido = null
              if (t.tipo && ['Personal', 'Laboral', 'Institucional'].includes(t.tipo)) {
                tipoValido = t.tipo
              }
              
              return {
                telefono_raw: telefonoValue,
                telefono_norm: telefonoValue,
                tipo: tipoValido,
                principal: t.principal !== undefined ? t.principal : true,
                status: t.status !== undefined ? t.status : true,
              }
            })
          }
        }
        
        const personaResponse = await strapiClient.post('/api/personas', personaData) as any
        personaDocumentId = personaResponse.data?.documentId || personaResponse.data?.id?.toString() || personaResponse.documentId || personaResponse.id?.toString()
        console.log('[API Clientes PUT] ✅ Nueva Persona creada en Strapi:', personaDocumentId)
      } catch (personaError: any) {
        console.error('[API Clientes PUT] ❌ Error al crear Persona:', personaError.message)
        return NextResponse.json({
          success: false,
          error: `Error al crear Persona: ${personaError.message}`
        }, { status: 500 })
      }
    }
    
    // 5. Sincronizar con WordPress (Moraleja y Escolar)
    if (nombreFinal && correoFinal) {
      try {
        // Para WordPress, dividir el nombre completo: primera palabra = nombre, resto = apellido
        // Esto es necesario porque WooCommerce espera first_name y last_name separados
        const partesNombre = nombreFinal.trim().split(/\s+/)
        const nombresWordPress = partesNombre[0] || nombreFinal.trim()
        const apellidoWordPress = partesNombre.slice(1).join(' ') || ''
        
        console.log('[API Clientes PUT] 🌐 Sincronizando cliente con WordPress (Moraleja y Escolar)...')
        const wordPressResults = await enviarClienteABothWordPress({
          email: correoFinal.trim(),
          first_name: nombresWordPress,
          last_name: apellidoWordPress,
        })
        
        console.log('[API Clientes PUT] ✅ Cliente sincronizado con WordPress:', {
          escolar: wordPressResults.escolar.success,
          moraleja: wordPressResults.moraleja.success,
        })
      } catch (wpError: any) {
        console.error('[API Clientes PUT] ⚠️ Error al sincronizar con WordPress (no crítico):', wpError.message)
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        documentId: personaDocumentId,
        nombre: nombreFinal,
        correo_electronico: correoFinal,
      },
      message: 'Cliente actualizado exitosamente en Persona y sincronizado con WordPress'
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

