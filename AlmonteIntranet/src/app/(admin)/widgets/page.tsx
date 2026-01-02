'use client'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'
import { Widget1Data, Widget2Data, Widget3Data, Widget4Data, Widget5Data, Widget6Data } from './data'
import Widgets1Card from './components/Widgets1'
import Widgets2 from './components/Widgets2'
import Widgets3 from './components/Widgets3'
import Widgets4 from './components/Widgets4'
import Widgets5 from './components/Widgets5'
import Widgets6 from './components/Widgets6'
import Report from './components/Report'
import Chat from './components/Chat'
import TrafficSources from './components/TrafficSources'
import TopCountries from './components/TopCountries'

const Page = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Widgets" />


      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1">
        {
          Widget1Data.map((item, idx) => (
            <Col key={idx}>
              <Widgets1Card item={item} />
            </Col>
          ))
        }
      </Row>
      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1">
        {
          Widget2Data.map((item, idx) => (
            <Col key={idx}>
              <Widgets2 item={item} />
            </Col>
          ))
        }
      </Row>
      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 g-3 align-items-center">
        {
          Widget3Data.map((item, idx) => (
            <Col key={idx}>
              <Widgets3 item={item} />
            </Col>
          ))
        }
      </Row>
      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 g-3 align-items-center">
        {
          Widget4Data.map((item, idx) => (
            <Col key={idx}>
              <Widgets4 item={item} />
            </Col>
          ))
        }
      </Row>
      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 g-3 align-items-center">
        {
          Widget5Data.map((item, idx) => (
            <Col key={idx}>
              <Widgets5 item={item} />
            </Col>
          ))
        }
      </Row>
      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 g-3 align-items-center">
        {
          Widget6Data.map((item, idx) => (
            <Col key={idx}>
              <Widgets6 item={item} />
            </Col>
          ))
        }
      </Row>
      <Report />
      <Row>
        <Col xl={4}>
          <Chat />
        </Col>
        <Col xxl={4} lg={6}>
          <TrafficSources />
        </Col>
        <Col xxl={4} lg={6}>
          <TopCountries />
        </Col>
      </Row>
    </Container>
  )
}
export default Page
