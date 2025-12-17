/**
 * API Route para gestionar clientes de WooCommerce
 * 
 * Endpoints:
 * - GET: Buscar clientes
 * - POST: Crear cliente rápido
 */

import { NextRequest, NextResponse } from 'next/server'
import wooCommerceClient from '@/lib/woocommerce/client'

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

    // Crear cliente en WooCommerce
    const customerData = {
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name || '',
      username: body.email.split('@')[0] + '_' + Date.now(),
      password: body.password || `temp_${Date.now()}`,
      ...(body.phone && { billing: { phone: body.phone } }),
    }

    const customer = await wooCommerceClient.post<any>('customers', customerData)

    return NextResponse.json({
      success: true,
      data: customer,
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

