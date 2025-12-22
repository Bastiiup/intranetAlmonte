/**
 * API Route para validar cupones de WooCommerce
 */

import { NextRequest, NextResponse } from 'next/server'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, amount } = body

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: 'El código del cupón es requerido',
        },
        { status: 400 }
      )
    }

    // Buscar cupón por código
    const coupons = await wooCommerceClient.get<any[]>('coupons', {
      code: code,
      per_page: 1,
    })

    if (!coupons || coupons.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Cupón no encontrado',
        valid: false,
      })
    }

    const coupon = coupons[0]

    // Validar que el cupón esté activo
    if (coupon.status !== 'publish') {
      return NextResponse.json({
        success: false,
        error: 'Cupón no válido',
        valid: false,
      })
    }

    // Validar fechas de expiración
    const now = new Date()
    if (coupon.date_expires) {
      const expiryDate = new Date(coupon.date_expires)
      if (expiryDate < now) {
        return NextResponse.json({
          success: false,
          error: 'Cupón expirado',
          valid: false,
        })
      }
    }

    // Calcular descuento
    let discountAmount = 0
    if (coupon.discount_type === 'percent') {
      discountAmount = (amount * parseFloat(coupon.amount)) / 100
    } else if (coupon.discount_type === 'fixed_cart' || coupon.discount_type === 'fixed_product') {
      discountAmount = parseFloat(coupon.amount)
    }

    // Validar monto mínimo
    if (coupon.minimum_amount && amount < parseFloat(coupon.minimum_amount)) {
      return NextResponse.json({
        success: false,
        error: `El monto mínimo es $${parseFloat(coupon.minimum_amount).toLocaleString('es-CL')}`,
        valid: false,
      })
    }

    // Validar monto máximo
    if (coupon.maximum_amount && amount > parseFloat(coupon.maximum_amount)) {
      return NextResponse.json({
        success: false,
        error: `El monto máximo es $${parseFloat(coupon.maximum_amount).toLocaleString('es-CL')}`,
        valid: false,
      })
    }

    return NextResponse.json({
      success: true,
      valid: true,
      data: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.discount_type,
        amount: coupon.amount,
        discount_amount: discountAmount,
        description: coupon.description,
      },
    })
  } catch (error: any) {
    console.error('Error al validar cupón:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al validar cupón',
        valid: false,
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

