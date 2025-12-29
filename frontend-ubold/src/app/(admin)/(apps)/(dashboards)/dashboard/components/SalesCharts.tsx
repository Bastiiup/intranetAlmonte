'use client'
import { Card, Row, CardBody, Col } from 'react-bootstrap'
import Link from 'next/link'
import { TbArrowRight } from 'react-icons/tb'
import ChartJsClient from '@/components/client-wrapper/ChartJsClient'
import { salesAnalyticsChart, totalSalesChart } from '@/app/(admin)/(apps)/(dashboards)/dashboard/data'
import { ArcElement, BarController, BarElement, LineController, LineElement, PieController, PointElement } from 'chart.js'

const SalesCharts = () => {
  return (
    <Card>
      <CardBody className="p-0">
        <Row className="g-0">
          <Col xxl={3} xl={6} className="order-xl-1 order-xxl-0">
            <div className="p-3 border-end border-dashed">
              <h4 className="card-title mb-0">Total de Ventas</h4>
              <p className="text-muted fs-xs">Tienes 21 pedidos pendientes de cumplimiento.</p>

              <Row className="mt-4">
                <Col lg={12}>
                  <ChartJsClient type={'doughnut'} getOptions={totalSalesChart} height={300}
                                 plugins={[PieController, ArcElement]} />
                </Col>
              </Row>
            </div>
            <hr className="d-xxl-none border-light m-0" />
          </Col>
          <Col xxl={9} className="order-xl-3 order-xxl-1">
            <div className="px-4 py-3">
              <div className="d-flex justify-content-between mb-3">
                <h4 className="card-title">Análisis de Ventas</h4>
                <Link href="" className="link-reset text-decoration-underline fw-semibold link-offset-3">
                  Ver Reportes <TbArrowRight />
                </Link>
              </div>

              <div dir="ltr">
                <ChartJsClient type={'bar'} getOptions={salesAnalyticsChart} height={330}  plugins={[BarController,BarElement,PointElement,LineElement,LineController]}/>
              </div>
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}

export default SalesCharts
