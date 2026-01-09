/**
 * API Route para reportes de ventas de WooCommerce
 */

import { NextRequest, NextResponse } from 'next/server'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'sales'
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const period = searchParams.get('period') || 'day' // day, week, month

    if (type === 'sales') {
      // Obtener pedidos del período
      const startDate = new Date(date)
      const endDate = new Date(date)
      
      if (period === 'day') {
        endDate.setDate(endDate.getDate() + 1)
      } else if (period === 'week') {
        endDate.setDate(endDate.getDate() + 7)
      } else if (period === 'month') {
        endDate.setMonth(endDate.getMonth() + 1)
      }

      const orders = await wooCommerceClient.get<any[]>('orders', {
        after: startDate.toISOString(),
        before: endDate.toISOString(),
        per_page: 100,
        status: 'completed',
      })

      // Calcular estadísticas
      const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0)
      const totalOrders = orders.length
      const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0

      // Productos más vendidos
      const productSales: Record<number, { product: any; quantity: number; revenue: number }> = {}
      
      orders.forEach((order: any) => {
        if (order.line_items) {
          order.line_items.forEach((item: any) => {
            if (!productSales[item.product_id]) {
              productSales[item.product_id] = {
                product: { id: item.product_id, name: item.name },
                quantity: 0,
                revenue: 0,
              }
            }
            productSales[item.product_id].quantity += item.quantity
            productSales[item.product_id].revenue += parseFloat(item.total || 0)
          })
        }
      })

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)

      return NextResponse.json({
        success: true,
        data: {
          period,
          date,
          total_sales: totalSales,
          total_orders: totalOrders,
          average_order: averageOrder,
          top_products: topProducts,
          orders: orders.map((o: any) => ({
            id: o.id,
            total: o.total,
            date: o.date_created,
            customer: o.billing?.first_name + ' ' + o.billing?.last_name,
          })),
        },
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Tipo de reporte no válido',
    }, { status: 400 })
  } catch (error: any) {
    console.error('Error al obtener reportes:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener reportes',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

