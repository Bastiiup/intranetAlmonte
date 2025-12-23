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
      // Intentar primero con filtro por ID
      const response = await strapiClient.get<any>(`/api/wo-clientes?filters[id][$eq]=${id}&populate=*`)
      
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
        console.error('[API Clientes GET] Error en búsqueda:', searchError.message)
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
        console.error('[API Clientes GET] Error en endpoint directo:', directError.message)
      }
    }

    if (!cliente) {
      return NextResponse.json({
        success: false,
        error: 'Cliente no encontrado'
      }, { status: 404 })
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
        console.error('[API Clientes PUT] Error en búsqueda:', searchError.message)
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

    // 1. Actualizar en WO-Clientes
    const woClienteResponse = await strapiClient.put(`/api/wo-clientes/${clienteDocumentId}`, updateData)
    console.log('[API Clientes PUT] ✅ Cliente actualizado en WO-Clientes:', clienteDocumentId)
    
    // 2. Si se actualizó nombre o correo, actualizar también en Persona y WordPress
    if (body.data.nombre !== undefined || body.data.correo_electronico !== undefined) {
      const nombreFinal = body.data.nombre !== undefined ? body.data.nombre : (cliente.attributes?.nombre || (cliente as any).nombre || '')
      const correoFinal = body.data.correo_electronico !== undefined ? body.data.correo_electronico : (cliente.attributes?.correo_electronico || (cliente as any).correo_electronico || '')
      
      // Actualizar en Persona (buscar por correo)
      if (correoFinal) {
        try {
          // Buscar persona por email - obtener todas las personas y filtrar por email
          // ya que emails es un componente y el filtro puede no funcionar directamente
          const personaSearch = await strapiClient.get<any>(`/api/personas?populate[emails]=*&pagination[pageSize]=1000`)
          
          let personaEncontrada: any = null
          const personasArray = personaSearch.data && Array.isArray(personaSearch.data) 
            ? personaSearch.data 
            : (personaSearch.data ? [personaSearch.data] : [])
          
          // Buscar persona que tenga el email en su array de emails
          for (const persona of personasArray) {
            const attrs = persona.attributes || persona
            if (attrs.emails && Array.isArray(attrs.emails)) {
              const tieneEmail = attrs.emails.some((e: any) => {
                const emailValue = typeof e === 'string' ? e : (e.email || e)
                return emailValue?.toLowerCase() === correoFinal.toLowerCase()
              })
              if (tieneEmail) {
                personaEncontrada = persona
                break
              }
            }
          }
          
          if (personaEncontrada) {
            const nombreParseado = parseNombreCompleto(nombreFinal.trim())
            const personaDocumentId = personaEncontrada.documentId || personaEncontrada.id?.toString()
            
            const personaUpdateData: any = {
              data: {
                nombre_completo: nombreFinal.trim(),
                nombres: nombreParseado.nombres || null,
                primer_apellido: nombreParseado.primer_apellido || null,
                segundo_apellido: nombreParseado.segundo_apellido || null,
              },
            }
            
            // Actualizar email si cambió
            if (body.data.correo_electronico !== undefined) {
              personaUpdateData.data.emails = [
                {
                  email: correoFinal.trim(),
                  tipo: 'principal',
                }
              ]
            }
            
            await strapiClient.put(`/api/personas/${personaDocumentId}`, personaUpdateData)
            console.log('[API Clientes PUT] ✅ Persona actualizada en Strapi:', personaDocumentId)
          } else {
            // Si no se encuentra, crear nueva persona
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
                    tipo: 'principal',
                  }
                ],
              },
            }
            await strapiClient.post('/api/personas', personaData)
            console.log('[API Clientes PUT] ✅ Nueva Persona creada en Strapi')
          }
        } catch (personaError: any) {
          console.error('[API Clientes PUT] ⚠️ Error al actualizar/crear Persona (no crítico):', personaError.message)
        }
      }
      
      // Actualizar en WordPress (buscará por email y actualizará o creará según corresponda)
      try {
        const nombreParseado = parseNombreCompleto(nombreFinal.trim())
        const wpResults = await enviarClienteABothWordPress({
          email: correoFinal.trim(),
          first_name: nombreParseado.nombres || nombreFinal.trim(),
          last_name: nombreParseado.primer_apellido || '',
        })
        console.log('[API Clientes PUT] ✅ Cliente sincronizado con WordPress:', {
          escolar: wpResults.escolar.success,
          moraleja: wpResults.moraleja.success,
        })
      } catch (wpError: any) {
        console.error('[API Clientes PUT] ⚠️ Error al sincronizar con WordPress (no crítico):', wpError.message)
      }
    }
    
    return NextResponse.json({
      success: true,
      data: woClienteResponse
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

