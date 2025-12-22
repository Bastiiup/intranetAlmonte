import { type Metadata } from 'next'
import { Col, Container, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import StatCard from '@/app/(admin)/(apps)/(dashboards)/dashboard/components/StatCard'
import { statCards } from '@/app/(admin)/(apps)/(dashboards)/dashboard/data'
import SalesCharts from '@/app/(admin)/(apps)/(dashboards)/dashboard/components/SalesCharts'
import ProductInventory from '@/app/(admin)/(apps)/(dashboards)/dashboard/components/ProductInventory'
import RecentOrders from '@/app/(admin)/(apps)/(dashboards)/dashboard/components/RecentOrders'

export const metadata: Metadata = {
  title: 'Dashboard',
}

const Page = () => {
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
          <SalesCharts />
        </Col>
      </Row>

      <Row>
        <Col xxl={6}>
          <ProductInventory/>
        </Col>

        <Col xxl={6}>
        <RecentOrders/>
        </Col>
      </Row>
    </Container>
  )
}

export default Page
