/**
 * API Route para actualizar clientes en WooCommerce
 * Permite actualizar datos del cliente incluyendo direcciones detalladas
 */

import { NextRequest, NextResponse } from 'next/server'
import wooCommerceClient from '@/lib/woocommerce/client'
import strapiClient from '@/lib/strapi/client'
import { buildWooCommerceAddress, createAddressMetaData, type DetailedAddress } from '@/lib/woocommerce/address-utils'
import { parseNombreCompleto, enviarClienteABothWordPress, eliminarClientePorEmail } from '@/lib/clientes/utils'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/woocommerce/customers/[id]
 * Actualiza un cliente existente
 * El [id] puede ser el ID de WooCommerce o un email
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Si el ID es un email (contiene @), buscar el cliente por email primero
    let customerId: number | null = null
    if (id.includes('@')) {
      // Es un email, buscar el cliente
      try {
        const customers = await wooCommerceClient.get<any[]>(`customers`, { email: id, per_page: 1 })
        if (customers && Array.isArray(customers) && customers.length > 0) {
          customerId = customers[0].id
          console.log('[API PUT] Cliente encontrado por email:', id, 'ID:', customerId)
        } else {
          return NextResponse.json(
            {
              success: false,
              error: 'Cliente no encontrado con ese email',
            },
            { status: 404 }
          )
        }
      } catch (searchError: any) {
        console.error('[API PUT] Error al buscar cliente por email:', searchError)
        return NextResponse.json(
          {
            success: false,
            error: 'Error al buscar cliente por email: ' + (searchError.message || 'Error desconocido'),
          },
          { status: 500 }
        )
      }
    } else {
      // Es un ID numérico
      customerId = parseInt(id)
      if (isNaN(customerId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'ID de cliente inválido',
          },
          { status: 400 }
        )
      }
    }

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo determinar el ID del cliente',
        },
        { status: 400 }
      )
    }

    // Preparar datos de actualización
    const updateData: any = {}

    // Actualizar datos básicos
    if (body.first_name !== undefined) updateData.first_name = body.first_name
    if (body.last_name !== undefined) updateData.last_name = body.last_name
    if (body.email !== undefined) updateData.email = body.email

    // Obtener cliente actual para preservar datos de billing si solo viene phone
    let currentCustomer: any = null
    if (body.phone && !body.billing) {
      try {
        currentCustomer = await wooCommerceClient.get(`customers/${customerId}`)
      } catch (error) {
        console.warn('[API PUT] No se pudo obtener cliente actual para preservar billing')
      }
    }

    // Actualizar billing si viene
    if (body.billing) {
      updateData.billing = {
        first_name: body.billing.first_name || '',
        last_name: body.billing.last_name || '',
        company: body.billing.company || '',
        address_1: body.billing.address_1 || '',
        address_2: body.billing.address_2 || '',
        city: body.billing.city || '',
        state: body.billing.state || '',
        postcode: body.billing.postcode || '',
        country: body.billing.country || 'CL',
        email: body.billing.email || '',
        phone: body.billing.phone || '',
      }
    } else if (body.phone !== undefined && currentCustomer) {
      // Si solo viene phone sin billing, preservar el billing existente y actualizar solo el phone
      const existingBilling = (currentCustomer as any).billing || {}
      updateData.billing = {
        first_name: existingBilling.first_name || body.first_name || '',
        last_name: existingBilling.last_name || body.last_name || '',
        company: existingBilling.company || '',
        address_1: existingBilling.address_1 || '',
        address_2: existingBilling.address_2 || '',
        city: existingBilling.city || '',
        state: existingBilling.state || '',
        postcode: existingBilling.postcode || '',
        country: existingBilling.country || 'CL',
        email: existingBilling.email || body.email || '',
        phone: body.phone || '',
      }
    }

    // Actualizar shipping si viene
    if (body.shipping) {
      updateData.shipping = {
        first_name: body.shipping.first_name || '',
        last_name: body.shipping.last_name || '',
        company: body.shipping.company || '',
        address_1: body.shipping.address_1 || '',
        address_2: body.shipping.address_2 || '',
        city: body.shipping.city || '',
        state: body.shipping.state || '',
        postcode: body.shipping.postcode || '',
        country: body.shipping.country || 'CL',
      }
    }

    // Actualizar meta_data si viene
    // Nota: WooCommerce requiere que se envíen TODOS los meta_data existentes
    if (body.meta_data && Array.isArray(body.meta_data)) {
      try {
        // Obtener cliente actual para preservar meta_data existente
        const currentCustomer = await wooCommerceClient.get(`customers/${customerId}`)
        const existingMetaData = (currentCustomer as any).meta_data || []
        
        // Combinar: mantener existentes y agregar/actualizar nuevos
        const newKeys = new Set(body.meta_data.map((m: any) => m.key))
        const combinedMetaData = [
          ...existingMetaData.filter((m: any) => !newKeys.has(m.key)),
          ...body.meta_data,
        ]
        
        updateData.meta_data = combinedMetaData
      } catch (error) {
        // Si falla obtener el cliente, usar solo los nuevos meta_data
        console.warn('[API] No se pudo obtener cliente actual, usando solo nuevos meta_data')
        updateData.meta_data = body.meta_data
      }
    }

    console.log('[API] Actualizando cliente:', {
      customerId,
      hasBilling: !!updateData.billing,
      hasShipping: !!updateData.shipping,
      metaDataCount: updateData.meta_data?.length || 0,
    })

    // Actualizar cliente en WooCommerce
    const customer = await wooCommerceClient.put<any>(
      `customers/${customerId}`,
      updateData
    )

    // Actualizar también en Strapi (WO-Clientes) si existe
    try {
      const emailFinal = updateData.email || (customer as any).email
      
      if (emailFinal) {
        // Buscar cliente en Strapi por correo_electronico (email)
        const strapiSearch = await strapiClient.get<any>(`/api/wo-clientes?filters[correo_electronico][$eq]=${encodeURIComponent(emailFinal)}&populate=*`)
        const strapiClientes = strapiSearch.data && Array.isArray(strapiSearch.data) ? strapiSearch.data : (strapiSearch.data ? [strapiSearch.data] : [])
        
        if (strapiClientes.length > 0) {
          const strapiCliente = strapiClientes[0]
          const strapiClienteId = strapiCliente.documentId || strapiCliente.id?.toString()
          
          const nombreCompleto = `${updateData.first_name || (customer as any).first_name} ${updateData.last_name || (customer as any).last_name || ''}`.trim()
          
          const strapiUpdateData: any = {
            data: {
              nombre: nombreCompleto,
              correo_electronico: emailFinal,
            },
          }
          
          if (updateData.billing?.phone) {
            strapiUpdateData.data.telefono = updateData.billing.phone
          }
          
          await strapiClient.put(`/api/wo-clientes/${strapiClienteId}`, strapiUpdateData)
          console.log('[API PUT] ✅ Cliente actualizado en Strapi (WO-Clientes):', strapiClienteId)
        }
      }
    } catch (strapiError: any) {
      console.error('[API PUT] ⚠️ Error al actualizar en Strapi WO-Clientes (no crítico):', strapiError.message)
    }

    // Actualizar también en Persona si existe
    try {
      const emailFinal = updateData.email || (customer as any).email
      if (emailFinal) {
        // Buscar persona por email
        const personaSearch = await strapiClient.get<any>(`/api/personas?populate[emails]=*&pagination[pageSize]=1000`)
        const personasArray = personaSearch.data && Array.isArray(personaSearch.data) 
          ? personaSearch.data 
          : (personaSearch.data ? [personaSearch.data] : [])
        
        let personaEncontrada: any = null
        for (const persona of personasArray) {
          const attrs = persona.attributes || persona
          if (attrs.emails && Array.isArray(attrs.emails)) {
            const tieneEmail = attrs.emails.some((e: any) => {
              const emailValue = typeof e === 'string' ? e : (e.email || e)
              return emailValue?.toLowerCase() === emailFinal.toLowerCase()
            })
            if (tieneEmail) {
              personaEncontrada = persona
              break
            }
          }
        }
        
        if (personaEncontrada) {
          const nombreCompleto = `${updateData.first_name || (customer as any).first_name} ${updateData.last_name || (customer as any).last_name || ''}`.trim()
          const nombreParseado = parseNombreCompleto(nombreCompleto)
          const personaId = personaEncontrada.documentId || personaEncontrada.id?.toString()
          
          const personaUpdateData: any = {
            data: {
              nombre_completo: nombreCompleto,
              nombres: nombreParseado.nombres || updateData.first_name || (customer as any).first_name,
              primer_apellido: nombreParseado.primer_apellido || updateData.last_name || (customer as any).last_name || null,
              segundo_apellido: nombreParseado.segundo_apellido || null,
            },
          }
          
          if (updateData.email) {
            personaUpdateData.data.emails = [
              {
                email: updateData.email.trim(),
                tipo: 'principal',
              }
            ]
          }
          
          // Agregar teléfono si viene en los datos de actualización
          if (updateData.billing?.phone) {
            personaUpdateData.data.telefonos = [
              {
                telefono: updateData.billing.phone.trim(),
                tipo: 'principal',
              }
            ]
          }
          
          await strapiClient.put(`/api/personas/${personaId}`, personaUpdateData)
          console.log('[API PUT] ✅ Persona actualizada en Strapi:', personaId)
        }
      }
    } catch (personaError: any) {
      console.error('[API PUT] ⚠️ Error al actualizar Persona en Strapi (no crítico):', personaError.message)
    }

    // Enviar a ambos WordPress (ya está actualizado en el principal, pero lo sincronizamos también con el segundo)
    try {
      const nombreCompleto = `${updateData.first_name || (customer as any).first_name} ${updateData.last_name || (customer as any).last_name || ''}`.trim()
      const nombreParseado = parseNombreCompleto(nombreCompleto)
      await enviarClienteABothWordPress({
        email: updateData.email || (customer as any).email,
        first_name: nombreParseado.nombres || updateData.first_name || (customer as any).first_name,
        last_name: nombreParseado.primer_apellido || updateData.last_name || (customer as any).last_name || '',
      })
      console.log('[API PUT] ✅ Cliente sincronizado con WordPress adicional')
    } catch (wpError: any) {
      console.error('[API PUT] ⚠️ Error al sincronizar con WordPress adicional (no crítico):', wpError.message)
    }

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error: any) {
    console.error('Error al actualizar cliente en WooCommerce:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar cliente',
        status: error.status || 500,
        details: error.details,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * GET /api/woocommerce/customers/[id]
 * Obtiene un cliente específico con todos sus datos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const customerId = parseInt(id)

    if (isNaN(customerId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de cliente inválido',
        },
        { status: 400 }
      )
    }

    const customer = await wooCommerceClient.get(`customers/${customerId}`)

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error: any) {
    console.error('Error al obtener cliente de WooCommerce:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener cliente',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/woocommerce/customers/[id]
 * Elimina un cliente de:
 * 1. WooCommerce principal (Escolar)
 * 2. Editorial Moraleja (WooCommerce secundario)
 * 3. TODAS las entradas WO-Clientes en Strapi
 * 4. Persona en Strapi (solo si no hay más referencias WO-Clientes)
 * 
 * El [id] puede ser el ID de WooCommerce o un email
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deletionResults = {
    wooCommercePrincipal: { success: false, error: null as string | null },
    wooCommerceMoraleja: { success: false, error: null as string | null },
    strapiWoClientes: { deleted: 0, errors: [] as string[] },
    strapiPersona: { success: false, error: null as string | null, deleted: false },
  }

  try {
    const { id } = await params

    console.log('[API DELETE] 🗑️ Iniciando eliminación de cliente, ID recibido:', id)

    // Si el ID es un email (contiene @), buscar el cliente por email primero
    let customerId: number | null = null
    if (id.includes('@')) {
      // Es un email, buscar el cliente
      try {
        const customers = await wooCommerceClient.get<any[]>(`customers`, { email: id, per_page: 1 })
        if (customers && Array.isArray(customers) && customers.length > 0) {
          customerId = customers[0].id
          console.log('[API DELETE] ✅ Cliente encontrado por email:', id, 'ID:', customerId)
        } else {
          return NextResponse.json(
            {
              success: false,
              error: 'Cliente no encontrado con ese email',
            },
            { status: 404 }
          )
        }
      } catch (searchError: any) {
        console.error('[API DELETE] ❌ Error al buscar cliente por email:', searchError)
        return NextResponse.json(
          {
            success: false,
            error: 'Error al buscar cliente por email: ' + (searchError.message || 'Error desconocido'),
          },
          { status: 500 }
        )
      }
    } else {
      // Es un ID numérico
      customerId = parseInt(id)
      if (isNaN(customerId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'ID de cliente inválido',
          },
          { status: 400 }
        )
      }
    }

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo determinar el ID del cliente',
        },
        { status: 400 }
      )
    }

    // 1. Obtener email del cliente de WooCommerce principal para buscar en otros sistemas
    let customerEmail: string | null = null
    try {
      const wcCustomer = await wooCommerceClient.get<any>(`customers/${customerId}`)
      customerEmail = wcCustomer.email || null
      console.log('[API DELETE] 📧 Email del cliente obtenido:', customerEmail)
    } catch (error: any) {
      console.warn('[API DELETE] ⚠️ No se pudo obtener email del cliente de WooCommerce principal (continuando):', error.message)
      // Intentar usar el ID como email si es un email válido
      if (id.includes('@')) {
        customerEmail = id
      }
    }

    // 2. Eliminar de Editorial Moraleja (WooCommerce secundario)
    if (customerEmail) {
      try {
        const moralejaUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA || ''
        const moralejaKey = process.env.WOO_MORALEJA_CONSUMER_KEY || ''
        const moralejaSecret = process.env.WOO_MORALEJA_CONSUMER_SECRET || ''

        if (moralejaUrl && moralejaKey && moralejaSecret) {
          console.log('[API DELETE] 🔍 Intentando eliminar de Editorial Moraleja...')
          const deleteResult = await eliminarClientePorEmail(moralejaUrl, moralejaKey, moralejaSecret, customerEmail)
          if (deleteResult.success) {
            deletionResults.wooCommerceMoraleja.success = true
            console.log('[API DELETE] ✅ Cliente eliminado de Editorial Moraleja (ID:', deleteResult.customerId, ')')
          } else {
            deletionResults.wooCommerceMoraleja.error = deleteResult.error || 'Error desconocido'
            console.warn('[API DELETE] ⚠️ No se pudo eliminar de Editorial Moraleja:', deleteResult.error)
          }
        } else {
          console.log('[API DELETE] ⏭️ Credenciales de Editorial Moraleja no configuradas, omitiendo...')
        }
      } catch (error: any) {
        deletionResults.wooCommerceMoraleja.error = error.message || 'Error desconocido'
        console.error('[API DELETE] ⚠️ Error al eliminar de Editorial Moraleja (no crítico):', error.message)
      }
    }

    // 3. Eliminar de WooCommerce principal (Escolar)
    try {
      console.log('[API DELETE] 🔍 Eliminando de WooCommerce principal (ID:', customerId, ')...')
      await wooCommerceClient.delete(`customers/${customerId}`, true)
      deletionResults.wooCommercePrincipal.success = true
      console.log('[API DELETE] ✅ Cliente eliminado de WooCommerce principal:', customerId)
    } catch (wcError: any) {
      // Si el cliente no existe en WooCommerce, no es un error crítico
      if (wcError.status === 404) {
        console.log('[API DELETE] ℹ️ Cliente no encontrado en WooCommerce principal (ya eliminado):', customerId)
        deletionResults.wooCommercePrincipal.success = true // Consideramos éxito si ya estaba eliminado
      } else {
        deletionResults.wooCommercePrincipal.error = wcError.message || 'Error desconocido'
        throw wcError // Esto es crítico, lanzar el error
      }
    }

    // 4. Buscar y eliminar TODAS las entradas WO-Clientes en Strapi
    let personaDocumentId: string | null = null
    if (customerEmail) {
      try {
        console.log('[API DELETE] 🔍 Buscando entradas WO-Clientes en Strapi por email:', customerEmail)
        const strapiSearch = await strapiClient.get<any>(`/api/wo-clientes?filters[correo_electronico][$eq]=${encodeURIComponent(customerEmail)}&populate[persona]=documentId`)
        const strapiClientes = strapiSearch.data && Array.isArray(strapiSearch.data) 
          ? strapiSearch.data 
          : (strapiSearch.data ? [strapiSearch.data] : [])
        
        console.log('[API DELETE] 📊 Entradas WO-Clientes encontradas:', strapiClientes.length)

        // Obtener personaDocumentId de la primera entrada (si existe)
        if (strapiClientes.length > 0) {
          const primeraEntrada = strapiClientes[0]
          const personaData = primeraEntrada.attributes?.persona?.data || primeraEntrada.persona?.data || primeraEntrada.persona
          personaDocumentId = personaData?.documentId || personaData?.id?.toString() || null
          if (personaDocumentId) {
            console.log('[API DELETE] 📌 Persona documentId obtenido:', personaDocumentId)
          }
        }

        // Eliminar TODAS las entradas WO-Clientes encontradas
        for (const strapiCliente of strapiClientes) {
          try {
            const strapiClienteId = strapiCliente.documentId || strapiCliente.id?.toString()
            if (strapiClienteId) {
              await strapiClient.delete(`/api/wo-clientes/${strapiClienteId}`)
              deletionResults.strapiWoClientes.deleted++
              console.log('[API DELETE] ✅ WO-Cliente eliminado de Strapi:', strapiClienteId)
            }
          } catch (error: any) {
            const errorMsg = error.message || 'Error desconocido'
            deletionResults.strapiWoClientes.errors.push(`WO-Cliente ${strapiCliente.documentId || strapiCliente.id}: ${errorMsg}`)
            console.error('[API DELETE] ⚠️ Error al eliminar WO-Cliente específico (continuando):', errorMsg)
          }
        }

        if (deletionResults.strapiWoClientes.deleted > 0) {
          console.log('[API DELETE] ✅ Total de entradas WO-Clientes eliminadas:', deletionResults.strapiWoClientes.deleted)
        }
      } catch (strapiError: any) {
        deletionResults.strapiWoClientes.errors.push(`Error general: ${strapiError.message || 'Error desconocido'}`)
        console.error('[API DELETE] ⚠️ Error al buscar/eliminar WO-Clientes en Strapi (no crítico):', strapiError.message)
      }
    }

    // 5. Eliminar Persona si no hay más referencias WO-Clientes
    if (personaDocumentId) {
      try {
        console.log('[API DELETE] 🔍 Verificando si Persona tiene más referencias WO-Clientes...')
        const woClientesCheck = await strapiClient.get<any>(`/api/wo-clientes?filters[persona][documentId][$eq]=${personaDocumentId}`)
        const woClientesRestantes = woClientesCheck.data && Array.isArray(woClientesCheck.data) 
          ? woClientesCheck.data 
          : (woClientesCheck.data ? [woClientesCheck.data] : [])
        
        if (woClientesRestantes.length === 0) {
          console.log('[API DELETE] ✅ No hay más referencias WO-Clientes, eliminando Persona...')
          await strapiClient.delete(`/api/personas/${personaDocumentId}`)
          deletionResults.strapiPersona.success = true
          deletionResults.strapiPersona.deleted = true
          console.log('[API DELETE] ✅ Persona eliminada de Strapi:', personaDocumentId)
        } else {
          console.log('[API DELETE] ℹ️ Persona mantiene', woClientesRestantes.length, 'referencias WO-Clientes, no se eliminará')
        }
      } catch (personaError: any) {
        deletionResults.strapiPersona.error = personaError.message || 'Error desconocido'
        console.error('[API DELETE] ⚠️ Error al eliminar Persona en Strapi (no crítico):', personaError.message)
      }
    }

    // Resumen final
    const allCriticalSuccess = deletionResults.wooCommercePrincipal.success
    const hasWarnings = 
      !deletionResults.wooCommerceMoraleja.success ||
      deletionResults.strapiWoClientes.errors.length > 0 ||
      !deletionResults.strapiPersona.success

    console.log('[API DELETE] 📊 Resumen de eliminación:', {
      wooCommercePrincipal: deletionResults.wooCommercePrincipal.success ? '✅' : '❌',
      wooCommerceMoraleja: deletionResults.wooCommerceMoraleja.success ? '✅' : '⚠️',
      strapiWoClientes: `${deletionResults.strapiWoClientes.deleted} eliminadas`,
      strapiPersona: deletionResults.strapiPersona.deleted ? '✅ Eliminada' : 'ℹ️ No eliminada (hay referencias)',
    })

    if (!allCriticalSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Error al eliminar cliente de WooCommerce principal',
          details: deletionResults,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado exitosamente',
      details: deletionResults,
      warnings: hasWarnings ? 'Algunas operaciones secundarias fallaron o fueron omitidas' : undefined,
    })
  } catch (error: any) {
    console.error('[API DELETE] ❌ Error crítico al eliminar cliente:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar cliente',
        status: error.status || 500,
        details: deletionResults,
      },
      { status: error.status || 500 }
    )
  }
}
