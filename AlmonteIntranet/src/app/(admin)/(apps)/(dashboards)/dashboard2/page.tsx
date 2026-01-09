import { type Metadata } from 'next'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import StatisticWidget from '@/app/(admin)/(apps)/(dashboards)/dashboard2/components/StatisticWidget'
import { Col, Container, Row } from 'react-bootstrap'
import ProjectOverview from '@/app/(admin)/(apps)/(dashboards)/dashboard2/components/ProjectOverview'
import TaskProgress from '@/app/(admin)/(apps)/(dashboards)/dashboard2/components/TaskProgress'
import ChatCard from '@/components/cards/ChatCard'
import ActiveProjectsOverview from '@/app/(admin)/(apps)/(dashboards)/dashboard2/components/ActiveProjectsOverview'
import ProjectByCountry from '@/app/(admin)/(apps)/(dashboards)/dashboard2/components/ProjectByCountry'
import { getDashboard2Stats, getCountriesData, getSalesByHourData } from './lib/getDashboardData2'

export const metadata: Metadata = {
  title: 'Dashboard 2',
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  // Obtener datos reales
  const [stats, countries, salesData] = await Promise.all([
    getDashboard2Stats(),
    getCountriesData(),
    getSalesByHourData(),
  ])

  return (
    <Container fluid>
      <PageBreadcrumb title={'Dashboard 2'} />

      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 g-3 align-items-center">
        {stats.map((item, idx) => (
          <Col key={idx}>
            <StatisticWidget item={item} />
          </Col>
        ))}
      </Row>

      <Row>
        <Col xxl={6}>
          <ProjectOverview sessions={salesData.sessions} pageViews={salesData.pageViews} />
        </Col>
        <Col xxl={6}>
          <TaskProgress />
        </Col>
      </Row>

      <Row>
        <Col xl={4}>
          <ChatCard />
        </Col>

        <Col xxl={4} lg={6}>
          <ActiveProjectsOverview />
        </Col>

        <Col xxl={4} lg={6}>
        <ProjectByCountry countriesData={countries} />
        </Col>
      </Row>
    </Container>
  )
}

export default Page
