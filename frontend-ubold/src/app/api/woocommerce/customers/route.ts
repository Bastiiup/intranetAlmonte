/**
 * API Route para gestionar clientes de WooCommerce
 * 
 * Endpoints:
 * - GET: Buscar clientes
 * - POST: Crear cliente rápido
 */

import { NextRequest, NextResponse } from 'next/server'
import wooCommerceClient from '@/lib/woocommerce/client'
import strapiClient from '@/lib/strapi/client'
import { buildWooCommerceAddress, createAddressMetaData, type DetailedAddress } from '@/lib/woocommerce/address-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const perPage = parseInt(searchParams.get('per_page') || '10')
    const page = parseInt(searchParams.get('page') || '1')

    const params: Record<string, any> = {
      per_page: perPage,
      page: page,
    }

    if (search) {
      params.search = search
    }

    const customers = await wooCommerceClient.get<any[]>('customers', params)

    return NextResponse.json({
      success: true,
      data: customers,
    })
  } catch (error: any) {
    console.error('Error al obtener clientes de WooCommerce:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener clientes',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar campos requeridos
    if (!body.email || !body.first_name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email y nombre son requeridos',
        },
        { status: 400 }
      )
    }

    // Preparar datos de billing si vienen direcciones detalladas
    let billingData: any = {}
    let shippingData: any = {}
    let metaData: Array<{ key: string; value: string }> = []

    if (body.billing) {
      // Si viene con campos detallados, construir address_1 y address_2
      const billingDetailed: DetailedAddress = {
        calle: body.billing.calle || '',
        numero: body.billing.numero || '',
        dpto: body.billing.dpto || '',
        block: body.billing.block || '',
        condominio: body.billing.condominio || '',
        city: body.billing.city || '',
        state: body.billing.state || '',
        postcode: body.billing.postcode || '',
        country: body.billing.country || 'CL',
      }

      const billingWooCommerce = buildWooCommerceAddress(billingDetailed)
      metaData.push(...createAddressMetaData('billing', billingDetailed))

      billingData = {
        first_name: body.first_name,
        last_name: body.last_name || '',
        email: body.email,
        phone: body.billing.phone || body.phone || '',
        company: body.billing.company || body.company || '',
        address_1: billingWooCommerce.address_1,
        address_2: billingWooCommerce.address_2,
        city: billingDetailed.city || '',
        state: billingDetailed.state || '',
        postcode: billingDetailed.postcode || '',
        country: billingDetailed.country || 'CL',
      }
    } else if (body.phone) {
      billingData = { phone: body.phone }
    }

    if (body.shipping) {
      const shippingDetailed: DetailedAddress = {
        calle: body.shipping.calle || '',
        numero: body.shipping.numero || '',
        dpto: body.shipping.dpto || '',
        block: body.shipping.block || '',
        condominio: body.shipping.condominio || '',
        city: body.shipping.city || '',
        state: body.shipping.state || '',
        postcode: body.shipping.postcode || '',
        country: body.shipping.country || 'CL',
      }

      const shippingWooCommerce = buildWooCommerceAddress(shippingDetailed)
      metaData.push(...createAddressMetaData('shipping', shippingDetailed))

      shippingData = {
        first_name: body.first_name,
        last_name: body.last_name || '',
        address_1: shippingWooCommerce.address_1,
        address_2: shippingWooCommerce.address_2,
        city: shippingDetailed.city || '',
        state: shippingDetailed.state || '',
        postcode: shippingDetailed.postcode || '',
        country: shippingDetailed.country || 'CL',
      }
    }

    // Crear cliente en WooCommerce
    const customerData: any = {
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name || '',
      username: body.email.split('@')[0] + '_' + Date.now(),
      password: body.password || `temp_${Date.now()}`,
      ...(Object.keys(billingData).length > 0 && { billing: billingData }),
      ...(Object.keys(shippingData).length > 0 && { shipping: shippingData }),
      ...(metaData.length > 0 && { meta_data: metaData }),
    }

    // Crear cliente en WooCommerce primero
    const customer = await wooCommerceClient.post<any>('customers', customerData)
    console.log('[API POST] ✅ Cliente creado en WooCommerce:', {
      id: customer.id,
      email: customer.email
    })

    // Crear en Strapi después
    let strapiClientData = null
    try {
      console.log('[API POST] 📚 Creando cliente en Strapi...')
      
      const strapiCustomerData: any = {
        data: {
          nombre: `${body.first_name} ${body.last_name || ''}`.trim(),
          correo_electronico: body.email,
          woocommerce_id: customer.id.toString(), // Guardar ID de WooCommerce
        }
      }

      // Agregar teléfono si existe
      if (billingData.phone) {
        strapiCustomerData.data.telefono = billingData.phone
      }

      // Agregar dirección si existe
      if (billingData.address_1) {
        strapiCustomerData.data.direccion = billingData.address_1
        if (billingData.address_2) {
          strapiCustomerData.data.direccion += `, ${billingData.address_2}`
        }
      }

      strapiClientData = await strapiClient.post<any>('/api/wo-clientes', strapiCustomerData)
      console.log('[API POST] ✅ Cliente creado en Strapi:', {
        id: strapiClientData.data?.id,
        documentId: strapiClientData.data?.documentId
      })
    } catch (strapiError: any) {
      console.error('[API POST] ⚠️ Error al crear cliente en Strapi (no crítico):', strapiError.message)
      // No fallar si Strapi falla, el cliente ya está en WooCommerce
    }

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: customer,
        strapi: strapiClientData?.data || null,
      },
      message: 'Cliente creado exitosamente en WooCommerce' + (strapiClientData ? ' y Strapi' : ' (Strapi falló)')
    })
  } catch (error: any) {
    console.error('Error al crear cliente en WooCommerce:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear cliente',
        status: error.status || 500,
        details: error.details,
      },
      { status: error.status || 500 }
    )
  }
}

