/**
 * API Route para actualizar clientes en WooCommerce
 * Permite actualizar datos del cliente incluyendo direcciones detalladas
 */

import { NextRequest, NextResponse } from 'next/server'
import wooCommerceClient from '@/lib/woocommerce/client'
import { buildWooCommerceAddress, createAddressMetaData, type DetailedAddress } from '@/lib/woocommerce/address-utils'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/woocommerce/customers/[id]
 * Actualiza un cliente existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const customerId = parseInt(id)
    const body = await request.json()

    if (isNaN(customerId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de cliente inválido',
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
    const customer = await wooCommerceClient.put(
      `customers/${customerId}`,
      updateData
    )

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
