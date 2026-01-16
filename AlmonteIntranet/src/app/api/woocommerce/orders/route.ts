/**
 * API Route para crear pedidos en WooCommerce
 * 
 * Esta ruta actúa como proxy para evitar exponer las credenciales en el cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import wooCommerceClient from '@/lib/woocommerce/client'
import type { WooCommerceOrder } from '@/lib/woocommerce/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const perPage = parseInt(searchParams.get('per_page') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const status = searchParams.get('status') || 'any'
    const customerId = searchParams.get('customer_id')
    const customerEmail = searchParams.get('customer_email')

    const params: Record<string, any> = {
      per_page: perPage,
      page: page,
    }

    if (status !== 'any') {
      params.status = status
    }

    // Filtrar por customer_id si se proporciona
    if (customerId) {
      params.customer = customerId
    }

    // Filtrar por email de cliente si se proporciona (a través de billing.email)
    if (customerEmail && !customerId) {
      // WooCommerce no soporta filtrar directamente por billing.email,
      // así que obtenemos todos y filtramos después
      const orders = await wooCommerceClient.get<WooCommerceOrder[]>('orders', params)
      const filteredOrders = orders.filter(order => 
        order.billing?.email?.toLowerCase() === customerEmail.toLowerCase()
      )
      return NextResponse.json({
        success: true,
        data: filteredOrders,
      })
    }

    const orders = await wooCommerceClient.get<WooCommerceOrder[]>('orders', params)

    return NextResponse.json({
      success: true,
      data: orders,
    })
  } catch (error: any) {
    console.error('Error al obtener pedidos de WooCommerce:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener pedidos',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar que el pedido tenga line_items
    if (!body.line_items || !Array.isArray(body.line_items) || body.line_items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'El pedido debe tener al menos un producto',
        },
        { status: 400 }
      )
    }

    // Preparar datos del pedido para WooCommerce
    const orderData: any = {
      payment_method: body.payment_method || 'pos',
      payment_method_title: body.payment_method_title || 'Punto de Venta',
      set_paid: body.set_paid !== undefined ? body.set_paid : true,
      status: body.status || 'completed',
      customer_id: body.customer_id || 0,
      billing: body.billing || {
        first_name: 'Cliente',
        last_name: 'POS',
        email: 'pos@escolar.cl',
        phone: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'CL',
      },
      shipping: body.shipping || {
        first_name: '',
        last_name: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'CL',
      },
      line_items: body.line_items.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        ...(item.variation_id && { variation_id: item.variation_id }),
      })),
      ...(body.customer_note && { customer_note: body.customer_note }),
      // Incluir meta_data si viene (para direcciones detalladas)
      ...(body.meta_data && Array.isArray(body.meta_data) && { meta_data: body.meta_data }),
    }

    // Crear pedido en WooCommerce
    const order = await wooCommerceClient.post<WooCommerceOrder>('orders', orderData)
    console.log('[API POST] ✅ Pedido creado en WooCommerce:', {
      id: order.id,
      status: order.status,
      total: order.total
    })

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Pedido creado exitosamente en WooCommerce'
    })
  } catch (error: any) {
    console.error('Error al crear pedido en WooCommerce:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear pedido',
        status: error.status || 500,
        details: error.details,
      },
      { status: error.status || 500 }
    )
  }
}


