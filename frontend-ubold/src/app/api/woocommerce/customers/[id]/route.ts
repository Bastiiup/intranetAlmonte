/**
 * API Route para actualizar clientes en WooCommerce
 * Permite actualizar datos del cliente incluyendo direcciones detalladas
 */

import { NextRequest, NextResponse } from 'next/server'
import wooCommerceClient from '@/lib/woocommerce/client'
import strapiClient from '@/lib/strapi/client'
import { buildWooCommerceAddress, createAddressMetaData, type DetailedAddress } from '@/lib/woocommerce/address-utils'
import { parseNombreCompleto, enviarClienteABothWordPress } from '@/lib/clientes/utils'

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
 * Elimina un cliente de WooCommerce y también en Strapi (WO-Clientes)
 * El [id] puede ser el ID de WooCommerce o un email
 * Nota: No se elimina Persona ya que puede estar relacionada con otras entidades
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Si el ID es un email (contiene @), buscar el cliente por email primero
    let customerId: number | null = null
    if (id.includes('@')) {
      // Es un email, buscar el cliente
      try {
        const customers = await wooCommerceClient.get<any[]>(`customers`, { email: id, per_page: 1 })
        if (customers && Array.isArray(customers) && customers.length > 0) {
          customerId = customers[0].id
          console.log('[API DELETE] Cliente encontrado por email:', id, 'ID:', customerId)
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
        console.error('[API DELETE] Error al buscar cliente por email:', searchError)
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

    console.log('[API DELETE] Eliminando cliente:', customerId)

    // 1. Obtener email del cliente de WooCommerce para buscar en Strapi
    let customerEmail: string | null = null
    try {
      const wcCustomer = await wooCommerceClient.get<any>(`customers/${customerId}`)
      customerEmail = wcCustomer.email || null
    } catch (error: any) {
      console.warn('[API DELETE] No se pudo obtener email del cliente de WooCommerce (continuando):', error.message)
    }

    // 2. Buscar y eliminar cliente en Strapi (WO-Clientes) por correo_electronico
    if (customerEmail) {
      try {
        const strapiSearch = await strapiClient.get<any>(`/api/wo-clientes?filters[correo_electronico][$eq]=${encodeURIComponent(customerEmail)}&populate=*`)
        const strapiClientes = strapiSearch.data && Array.isArray(strapiSearch.data) ? strapiSearch.data : (strapiSearch.data ? [strapiSearch.data] : [])
        
        if (strapiClientes.length > 0) {
          const strapiCliente = strapiClientes[0]
          const strapiClienteId = strapiCliente.documentId || strapiCliente.id?.toString()
          
          // Eliminar de Strapi (WO-Clientes)
          await strapiClient.delete(`/api/wo-clientes/${strapiClienteId}`)
          console.log('[API DELETE] ✅ Cliente eliminado de Strapi (WO-Clientes):', strapiClienteId)
          
          // Nota: No eliminamos la Persona asociada ya que puede estar relacionada con otras entidades
        }
      } catch (strapiError: any) {
        console.error('[API DELETE] ⚠️ Error al eliminar de Strapi WO-Clientes (no crítico):', strapiError.message)
        // Continuar aunque falle Strapi
      }
    }

    // 3. Eliminar de WooCommerce principal
    try {
      await wooCommerceClient.delete(`customers/${customerId}`, true)
      console.log('[API DELETE] ✅ Cliente eliminado de WooCommerce principal:', customerId)
    } catch (wcError: any) {
      // Si el cliente no existe en WooCommerce, no es un error crítico
      if (wcError.status === 404) {
        console.log('[API DELETE] Cliente no encontrado en WooCommerce (ya eliminado):', customerId)
      } else {
        throw wcError
      }
    }

    // 3. Intentar eliminar de WordPress adicional (Editorial Moraleja)
    // Nota: Esto requiere buscar por email ya que no tenemos el ID directamente
    // Por ahora, solo eliminamos del principal ya que no hay una forma directa de obtener el ID del segundo WordPress

    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado exitosamente',
    })
  } catch (error: any) {
    console.error('[API DELETE] ❌ Error al eliminar cliente:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar cliente',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
