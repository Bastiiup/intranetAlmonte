'use client'
import { Card, Row, CardBody, Col } from 'react-bootstrap'
import Link from 'next/link'
import { TbArrowRight } from 'react-icons/tb'
import ChartJsClient from '@/components/client-wrapper/ChartJsClient'
import { ArcElement, BarController, BarElement, LineController, LineElement, PieController, PointElement } from 'chart.js'
import { getColor } from '@/helpers/color'
import { ChartJSOptionsType } from '@/types'
import { useMemo } from 'react'

interface SalesChartsProps {
  monthlyData?: {
    onlineSales: number[]
    inStoreSales: number[]
    totalSales: number[]
    labels: string[]
  }
  totalSalesData?: {
    currentYear: number[]
    previousYear: number[]
  }
  pendingOrders?: number
}

const SalesCharts = ({ monthlyData, totalSalesData, pendingOrders = 0 }: SalesChartsProps) => {
  const totalSalesChart = useMemo((): ChartJSOptionsType => {
    const defaultData = {
      currentYear: [0, 0, 0, 0],
      previousYear: [0, 0, 0, 0],
    }
    
    const data = totalSalesData || defaultData
    
    return {
      data: {
        labels: ['Tienda Online', 'Tienda Física', 'B2B', 'Marketplace'],
        datasets: [
          {
            label: '2024',
            data: data.currentYear,
            backgroundColor: [getColor('chart-primary'), getColor('chart-secondary'), getColor('chart-dark'), getColor('chart-gray')],
            borderColor: 'transparent',
            borderWidth: 1,
            weight: 1,
          },
          {
            label: '2023',
            data: data.previousYear,
            backgroundColor: [
              getColor('chart-primary-rgb', 0.3),
              getColor('chart-secondary-rgb', 0.3),
              getColor('chart-dark-rgb', 0.3),
              getColor('chart-gray-rgb', 0.3),
            ],
            borderColor: 'transparent',
            borderWidth: 3,
            weight: 0.8,
          },
        ],
      },
      options: {
        cutout: '30%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: getComputedStyle(document.body).fontFamily },
              color: getColor('secondary-color'),
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              padding: 15,
            },
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return `${ctx.dataset.label} - ${ctx.label}: $${ctx.parsed.toLocaleString('es-CL')}`
              },
            },
          },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      } as any,
    }
  }, [totalSalesData])

  const salesAnalyticsChart = useMemo((): ChartJSOptionsType => {
    const defaultData = {
      onlineSales: Array(12).fill(0),
      inStoreSales: Array(12).fill(0),
      totalSales: Array(12).fill(0),
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    }
    
    const data = monthlyData || defaultData
    
    return {
      data: {
        labels: data.labels,
        datasets: [
          {
            type: 'bar',
            label: 'Ventas Online',
            data: data.onlineSales,
            borderColor: getColor('chart-primary'),
            backgroundColor: getColor('chart-primary'),
            stack: 'sales',
            barThickness: 20,
            borderRadius: 6,
          },
          {
            type: 'bar',
            label: 'Ventas en Tienda',
            data: data.inStoreSales,
            borderColor: getColor('chart-gray'),
            backgroundColor: getColor('chart-gray'),
            stack: 'sales',
            barThickness: 20,
            borderRadius: 6,
          },
          {
            type: 'line',
            label: 'Ventas Totales',
            data: data.totalSales,
            borderColor: getColor('chart-dark'),
            backgroundColor: getColor('chart-dark-rgb', 0.2),
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            fill: false,
            yAxisID: 'y',
          },
        ],
      },
    }
  }, [monthlyData])

  return (
    <Card>
      <CardBody className="p-0">
        <Row className="g-0">
          <Col xxl={3} xl={6} className="order-xl-1 order-xxl-0">
            <div className="p-3 border-end border-dashed">
              <h4 className="card-title mb-0">Ventas Totales</h4>
              <p className="text-muted fs-xs">
                {pendingOrders > 0 
                  ? `Tienes ${pendingOrders} pedidos pendientes por cumplir.`
                  : 'No hay pedidos pendientes.'}
              </p>

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
                <Link href="/tienda/facturas" className="link-reset text-decoration-underline fw-semibold link-offset-3">
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
