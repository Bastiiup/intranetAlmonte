/**
 * Funciones helper para obtener datos reales del dashboard
 */

import { headers } from 'next/headers'

export interface DashboardStats {
  totalSales: number
  totalOrders: number
  activeCustomers: number
  refundRequests: number
}

export interface DashboardOrder {
  id: string
  userName: string
  product: string
  date: string
  amount: string
  status: string
  statusVariant: 'success' | 'warning' | 'danger'
  userImage?: string
}

export interface DashboardProduct {
  id: number
  name: string
  category: string
  stock: string
  price: string
  ratings: number
  reviews: number
  status: string
  statusVariant: 'success' | 'warning' | 'danger'
  image?: string
}

/**
 * Obtiene la URL base de la aplicación
 */
async function getBaseUrl(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  return `${protocol}://${host}`
}

/**
 * Obtiene las estadísticas principales del dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const baseUrl = await getBaseUrl()
    
    // Obtener todos los pedidos de Strapi
    const ordersResponse = await fetch(
      `${baseUrl}/api/tienda/pedidos?pagination[pageSize]=5000`,
      { cache: 'no-store' }
    )
    
    const ordersData = await ordersResponse.json()
    const allOrders = ordersData.success && ordersData.data ? ordersData.data : []
    
    // Obtener pedidos completados del mes actual
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const completedOrders = allOrders.filter((order: any) => {
      const attrs = order.attributes || {}
      const pedidoData = (attrs && Object.keys(attrs).length > 0) ? attrs : order
      const estado = pedidoData.estado || ''
      const fechaPedido = pedidoData.fecha_pedido || pedidoData.createdAt
      
      if (estado !== 'completed' && estado !== 'completado') return false
      if (!fechaPedido) return false
      
      const fecha = new Date(fechaPedido)
      return fecha >= firstDayOfMonth && fecha <= lastDayOfMonth
    })
    
    // Calcular ventas totales del mes
    const totalSales = completedOrders.reduce((sum: number, order: any) => {
      const attrs = order.attributes || {}
      const pedidoData = (attrs && Object.keys(attrs).length > 0) ? attrs : order
      return sum + parseFloat(pedidoData.total || 0)
    }, 0)
    
    // Contar clientes únicos (por email de billing)
    const customerEmails = new Set<string>()
    allOrders.forEach((order: any) => {
      const attrs = order.attributes || {}
      const pedidoData = (attrs && Object.keys(attrs).length > 0) ? attrs : order
      const billing = pedidoData.billing
      if (billing && typeof billing === 'object' && billing.email) {
        customerEmails.add(billing.email)
      }
    })
    
    // Refund requests (pedidos con estado refunded o cancelled)
    const refundRequests = allOrders.filter((order: any) => {
      const attrs = order.attributes || {}
      const pedidoData = (attrs && Object.keys(attrs).length > 0) ? attrs : order
      const estado = pedidoData.estado || ''
      return estado === 'refunded' || estado === 'reembolsado' || 
             estado === 'cancelled' || estado === 'cancelado'
    }).length
    
    return {
      totalSales,
      totalOrders: allOrders.length,
      activeCustomers: customerEmails.size,
      refundRequests,
    }
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error)
    // Retornar valores por defecto en caso de error
    return {
      totalSales: 0,
      totalOrders: 0,
      activeCustomers: 0,
      refundRequests: 0,
    }
  }
}

/**
 * Obtiene los pedidos recientes desde Strapi
 */
export async function getRecentOrders(limit: number = 10): Promise<DashboardOrder[]> {
  try {
    const baseUrl = await getBaseUrl()
    
    // Usar el endpoint de pedidos de Strapi
    const response = await fetch(
      `${baseUrl}/api/tienda/pedidos?pagination[pageSize]=${limit}&sort=fecha_pedido:desc`,
      { cache: 'no-store' }
    )
    
    const data = await response.json()
    const orders = data.success && data.data ? data.data : []
    
    return orders.slice(0, limit).map((order: any) => {
      // Extraer datos del pedido de Strapi
      const attrs = order.attributes || {}
      const pedidoData = (attrs && Object.keys(attrs).length > 0) ? attrs : order
      
      // Mapear estado de Strapi a formato del dashboard
      let status = pedidoData.estado || 'pending'
      let statusVariant: 'success' | 'warning' | 'danger' = 'warning'
      
      // Mapear estados de inglés a español para mostrar
      if (status === 'completed' || status === 'completado') {
        status = 'Completado'
        statusVariant = 'success'
      } else if (status === 'processing' || status === 'procesando') {
        status = 'Procesando'
        statusVariant = 'success'
      } else if (status === 'pending' || status === 'pendiente') {
        status = 'Pendiente'
        statusVariant = 'warning'
      } else if (status === 'on-hold' || status === 'en_espera') {
        status = 'En Espera'
        statusVariant = 'warning'
      } else if (status === 'cancelled' || status === 'cancelado') {
        status = 'Cancelado'
        statusVariant = 'danger'
      } else if (status === 'refunded' || status === 'reembolsado') {
        status = 'Reembolsado'
        statusVariant = 'danger'
      } else {
        status = status.charAt(0).toUpperCase() + status.slice(1)
      }
      
      // Obtener nombre del cliente desde billing o cliente
      let userName = 'Cliente'
      const billing = pedidoData.billing
      if (billing && typeof billing === 'object') {
        const firstName = billing.first_name || ''
        const lastName = billing.last_name || ''
        userName = `${firstName} ${lastName}`.trim() || 'Cliente'
      } else if (pedidoData.cliente) {
        if (typeof pedidoData.cliente === 'object') {
          userName = pedidoData.cliente.nombre || pedidoData.cliente.name || 'Cliente'
        } else {
          userName = String(pedidoData.cliente)
        }
      }
      
      // Obtener primer producto del pedido
      const firstItem = pedidoData.items?.[0]
      const product = firstItem?.nombre || firstItem?.name || 'Producto'
      
      // Formatear fecha
      const fechaPedido = pedidoData.fecha_pedido || pedidoData.createdAt || new Date().toISOString()
      const date = new Date(fechaPedido).toISOString().split('T')[0]
      
      // Obtener avatar del cliente
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&size=128`
      
      // Obtener total
      const total = pedidoData.total || 0
      const moneda = pedidoData.moneda || 'CLP'

      return {
        id: order.documentId || order.id || `ORD-${order.id}`,
        userName,
        product,
        date,
        amount: `${moneda === 'CLP' ? '$' : ''}${parseFloat(total.toString()).toLocaleString('es-CL')}`,
        status,
        statusVariant,
        userImage: avatarUrl,
      }
    })
  } catch (error) {
    console.error('Error al obtener pedidos recientes:', error)
    return []
  }
}

/**
 * Obtiene los productos del inventario
 */
export async function getProducts(limit: number = 9): Promise<DashboardProduct[]> {
  try {
    const baseUrl = await getBaseUrl()
    
    const response = await fetch(
      `${baseUrl}/api/tienda/productos?pagination[pageSize]=${limit}`,
      { cache: 'no-store' }
    )
    
    const data = await response.json()
    const products = data.success && data.data ? data.data : []
    
    return products.slice(0, limit).map((product: any, index: number) => {
      const attrs = product.attributes || product
      
      // Obtener imagen
      const imagen = attrs.imagen?.data?.[0]?.attributes?.url || 
                     attrs.imagen?.url ||
                     attrs.portada?.data?.attributes?.url ||
                     attrs.portada?.url
      
      const imageUrl = imagen 
        ? (imagen.startsWith('http') ? imagen : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'}${imagen}`)
        : undefined
      
      // Obtener stock (usar stock disponible o 0)
      const stock = attrs.stock_disponible || attrs.stock || 0
      const stockText = stock > 0 ? `${stock} unidades` : '0 unidades'
      
      // Obtener precio
      const precio = attrs.precio_venta || attrs.precio || 0
      const priceText = `$${parseFloat(precio.toString()).toLocaleString('es-CL')}`
      
      // Determinar estado según stock
      let status = 'Active'
      let statusVariant: 'success' | 'warning' | 'danger' = 'success'
      
      if (stock === 0) {
        status = 'Out of Stock'
        statusVariant = 'danger'
      } else if (stock < 10) {
        status = 'Low Stock'
        statusVariant = 'warning'
      }
      
      // Obtener categoría
      const categoria = attrs.categoria?.data?.attributes?.nombre || 
                       attrs.categoria?.nombre ||
                       'Sin categoría'
      
      return {
        id: product.id || index + 1,
        name: attrs.titulo || attrs.nombre || 'Producto sin nombre',
        category: categoria,
        stock: stockText,
        price: priceText,
        ratings: 4, // Por defecto, ya que no tenemos ratings en Strapi
        reviews: 0, // Por defecto
        status,
        statusVariant,
        image: imageUrl,
      }
    })
  } catch (error) {
    console.error('Error al obtener productos:', error)
    return []
  }
}

/**
 * Obtiene datos de ventas para los gráficos
 */
export async function getSalesData() {
  try {
    const baseUrl = await getBaseUrl()
    
    // Obtener pedidos de los últimos 12 meses
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    
    const response = await fetch(
      `${baseUrl}/api/woocommerce/reports?type=sales&date=${twelveMonthsAgo.toISOString().split('T')[0]}&period=month`,
      { cache: 'no-store' }
    )
    
    const data = await response.json()
    
    if (data.success && data.data) {
      return {
        totalSales: data.data.total_sales || 0,
        totalOrders: data.data.total_orders || 0,
        averageOrder: data.data.average_order || 0,
      }
    }
    
    return {
      totalSales: 0,
      totalOrders: 0,
      averageOrder: 0,
    }
  } catch (error) {
    console.error('Error al obtener datos de ventas:', error)
    return {
      totalSales: 0,
      totalOrders: 0,
      averageOrder: 0,
    }
  }
}

