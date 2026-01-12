import { type Metadata } from 'next'
import { Col, Container, Row } from 'react-bootstrap'
import { TbCreditCard, TbRotateClockwise2, TbShoppingCart, TbUsers } from 'react-icons/tb'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import StatCard from '@/app/(admin)/(apps)/(dashboards)/dashboard/components/StatCard'
import SalesCharts from '@/app/(admin)/(apps)/(dashboards)/dashboard/components/SalesCharts'
import ProductInventory from '@/app/(admin)/(apps)/(dashboards)/dashboard/components/ProductInventory'
import RecentOrders from '@/app/(admin)/(apps)/(dashboards)/dashboard/components/RecentOrders'
import { getDashboardStats, getRecentOrders, getProducts, getMonthlySalesData, getTotalSalesChartData } from './lib/getDashboardData'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  // Obtener datos reales
  const [stats, orders, products, monthlyData, totalSalesData] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(10),
    getProducts(9),
    getMonthlySalesData(),
    getTotalSalesChartData(),
  ])
  
  // Contar pedidos pendientes
  const pendingOrders = orders.filter(o => o.statusVariant === 'warning').length

  // Crear las tarjetas de estadísticas con datos reales
  const statCards = [
    {
      id: 1,
      title: 'Ventas Totales',
      value: stats.totalSales / 1000, // Convertir a miles
      suffix: 'K',
      prefix: '$',
      icon: TbCreditCard,
      iconBg: 'primary' as const,
    },
    {
      id: 2,
      title: 'Pedidos Realizados',
      value: stats.totalOrders,
      icon: TbShoppingCart,
      iconBg: 'success' as const,
    },
    {
      id: 3,
      title: 'Clientes Activos',
      value: stats.activeCustomers,
      icon: TbUsers,
      iconBg: 'info' as const,
    },
    {
      id: 4,
      title: 'Solicitudes de Reembolso',
      value: stats.refundRequests,
      icon: TbRotateClockwise2,
      iconBg: 'warning' as const,
    },
  ]

  return (
    <Container fluid>
      <PageBreadcrumb title={'Dashboard'} />
      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1">
        {statCards.map((item, idx) => (
          <Col key={idx}>
            <StatCard item={item} />
          </Col>
        ))}
      </Row>

      <Row>
        <Col xs={12}>
          <SalesCharts monthlyData={monthlyData} totalSalesData={totalSalesData} pendingOrders={pendingOrders} />
        </Col>
      </Row>

      <Row>
        <Col xxl={6}>
          <ProductInventory products={products} />
        </Col>

        <Col xxl={6}>
          <RecentOrders orders={orders} />
        </Col>
      </Row>
    </Container>
  )
}

export default Page
