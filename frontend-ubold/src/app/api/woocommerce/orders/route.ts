/**
 * API Route para crear pedidos en WooCommerce
 * 
 * Esta ruta actúa como proxy para evitar exponer las credenciales en el cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import wooCommerceClient from '@/lib/woocommerce/client'
import type { WooCommerceOrder } from '@/lib/woocommerce/types'

export const dynamic = 'force-dynamic'

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
    const orderData = {
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
        city: '',
        state: '',
        postcode: '',
        country: 'CL',
      },
      shipping: body.shipping || {
        first_name: '',
        last_name: '',
        address_1: '',
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
    }

    // Crear pedido en WooCommerce
    const order = await wooCommerceClient.post<WooCommerceOrder>('orders', orderData)

    return NextResponse.json({
      success: true,
      data: order,
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


