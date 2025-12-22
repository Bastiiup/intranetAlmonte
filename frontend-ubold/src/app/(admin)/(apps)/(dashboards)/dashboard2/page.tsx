import { type Metadata } from 'next'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { stats } from '@/app/(admin)/(apps)/(dashboards)/dashboard2/data'
import StatisticWidget from '@/app/(admin)/(apps)/(dashboards)/dashboard2/components/StatisticWidget'
import { Col, Container, Row } from 'react-bootstrap'
import ProjectOverview from '@/app/(admin)/(apps)/(dashboards)/dashboard2/components/ProjectOverview'
import TaskProgress from '@/app/(admin)/(apps)/(dashboards)/dashboard2/components/TaskProgress'
import ChatCard from '@/components/cards/ChatCard'
import ActiveProjectsOverview from '@/app/(admin)/(apps)/(dashboards)/dashboard2/components/ActiveProjectsOverview'
import ProjectByCountry from '@/app/(admin)/(apps)/(dashboards)/dashboard2/components/ProjectByCountry'

export const metadata: Metadata = {
  title: 'Dashboard 2',
}

const Page = () => {
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
          <ProjectOverview />
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
        <ProjectByCountry/>
        </Col>
      </Row>
    </Container>
  )
}

export default Page
