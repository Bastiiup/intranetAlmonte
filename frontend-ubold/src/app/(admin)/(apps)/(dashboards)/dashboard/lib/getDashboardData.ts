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
    
    // Obtener pedidos completados del mes actual
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const ordersResponse = await fetch(
      `${baseUrl}/api/woocommerce/orders?per_page=100&status=completed&after=${firstDayOfMonth.toISOString()}&before=${lastDayOfMonth.toISOString()}`,
      { cache: 'no-store' }
    )
    
    const ordersData = await ordersResponse.json()
    const orders = ordersData.success ? ordersData.data : []
    
    // Calcular ventas totales
    const totalSales = orders.reduce((sum: number, order: any) => {
      return sum + parseFloat(order.total || 0)
    }, 0)
    
    // Obtener todos los pedidos (para contar total)
    const allOrdersResponse = await fetch(
      `${baseUrl}/api/woocommerce/orders?per_page=100&status=any`,
      { cache: 'no-store' }
    )
    const allOrdersData = await allOrdersResponse.json()
    const allOrders = allOrdersData.success ? allOrdersData.data : []
    
    // Obtener clientes
    const customersResponse = await fetch(
      `${baseUrl}/api/woocommerce/customers?per_page=100`,
      { cache: 'no-store' }
    )
    const customersData = await customersResponse.json()
    const customers = customersData.success ? customersData.data : []
    
    // Contar clientes activos (que han hecho al menos un pedido)
    const customerIds = new Set(allOrders.map((order: any) => order.customer_id).filter(Boolean))
    const activeCustomers = customerIds.size
    
    // Refund requests (pedidos con estado refunded o cancelled)
    const refundRequests = allOrders.filter((order: any) => 
      order.status === 'refunded' || order.status === 'cancelled'
    ).length
    
    return {
      totalSales,
      totalOrders: allOrders.length,
      activeCustomers: activeCustomers || customers.length,
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
 * Obtiene los pedidos recientes
 */
export async function getRecentOrders(limit: number = 10): Promise<DashboardOrder[]> {
  try {
    const baseUrl = await getBaseUrl()
    
    const response = await fetch(
      `${baseUrl}/api/woocommerce/orders?per_page=${limit}&status=any&orderby=date&order=desc`,
      { cache: 'no-store' }
    )
    
    const data = await response.json()
    const orders = data.success ? data.data : []
    
    return orders.slice(0, limit).map((order: any) => {
      // Determinar el estado y su variante
      let status = order.status || 'pending'
      let statusVariant: 'success' | 'warning' | 'danger' = 'warning'
      
      if (status === 'completed' || status === 'processing') {
        status = 'Completado'
        statusVariant = 'success'
      } else if (status === 'pending' || status === 'on-hold') {
        status = 'Pendiente'
        statusVariant = 'warning'
      } else if (status === 'cancelled' || status === 'refunded') {
        status = 'Cancelado'
        statusVariant = 'danger'
      } else {
        status = status.charAt(0).toUpperCase() + status.slice(1)
      }
      
      // Obtener nombre del cliente
      const firstName = order.billing?.first_name || ''
      const lastName = order.billing?.last_name || ''
      const userName = `${firstName} ${lastName}`.trim() || 'Cliente'
      
      // Obtener primer producto del pedido
      const firstItem = order.line_items?.[0]
      const product = firstItem?.name || 'Producto'
      
      // Formatear fecha
      const date = order.date_created 
        ? new Date(order.date_created).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      
      // Obtener avatar del cliente si está disponible
      const avatarUrl = order.billing?.email 
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&size=128`
        : undefined

      return {
        id: `ORD-${order.id}`,
        userName,
        product,
        date,
        amount: `$${parseFloat(order.total || 0).toLocaleString('es-CL')}`,
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
        status = 'Agotado'
        statusVariant = 'danger'
      } else if (stock < 10) {
        status = 'Stock bajo'
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

