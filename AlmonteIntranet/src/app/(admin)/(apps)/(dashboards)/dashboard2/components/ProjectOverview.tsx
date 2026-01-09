'use client'
import { Card, CardBody, CardHeader, Nav, NavItem, NavLink } from 'react-bootstrap'
import ApexChartClient from '@/components/client-wrapper/ApexChartClient'
import { TbHome, TbSettings, TbUserCircle } from 'react-icons/tb'
import { getColor } from '@/helpers/color'
import { ApexOptions } from 'apexcharts'
import { useMemo } from 'react'

interface ProjectOverviewProps {
  sessions?: number[]
  pageViews?: number[]
}

const ProjectOverview = ({ sessions, pageViews }: ProjectOverviewProps) => {
  // Usar datos reales si están disponibles, sino usar datos vacíos
  const chartData = useMemo(() => {
    const defaultSessions = Array(19).fill(0)
    const defaultPageViews = Array(19).fill(0)
    
    return {
      sessions: sessions || defaultSessions,
      pageViews: pageViews || defaultPageViews,
    }
  }, [sessions, pageViews])

  const projectOverviewChart = (): ApexOptions => ({
    chart: {
      height: 330,
      type: 'area',
      toolbar: { show: false },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 2,
      curve: 'smooth',
    },
    colors: [getColor('chart-primary'), getColor('secondary')],
    series: [
      {
        name: 'Pedidos',
        data: chartData.sessions,
      },
      {
        name: 'Ventas',
        data: chartData.pageViews,
      },
    ],
    legend: {
      offsetY: 5,
    },
    xaxis: {
      categories: [
        '',
        '8 AM',
        '9 AM',
        '10 AM',
        '11 AM',
        '12 PM',
        '1 PM',
        '2 PM',
        '3 PM',
        '4 PM',
        '5 PM',
        '6 PM',
        '7 PM',
        '8 PM',
        '9 PM',
        '10 PM',
        '11 PM',
        '12 AM',
        '',
      ],
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: 6,
      labels: {
        style: {
          fontSize: '12px',
        },
      },
    },
    tooltip: {
      shared: true,
      y: {
        formatter: function (val, { seriesIndex }) {
          if (seriesIndex === 0) {
            return val + ' Pedidos'
          } else if (seriesIndex === 1) {
            return val + ' Ventas'
          }
          return val.toString()
        },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.2,
        stops: [15, 120, 100],
      },
    },
    grid: {
      borderColor: getColor('border-color'),
      padding: {
        bottom: 0,
      },
    },
  })

  return (
    <Card>
      <CardHeader className="border-dashed card-tabs d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="card-title">Ventas por Hora</h4>
        </div>
        <Nav defaultActiveKey={'two'} justify className="nav nav-tabs card-header-tabs nav-bordered">
          <NavItem>
            <NavLink eventKey={'one'}>
              <TbHome className="d-md-none d-block"/>
              <span className="d-none d-md-block">Hoy</span>
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink eventKey={'two'}>
              <TbUserCircle className="d-md-none d-block"/>
              <span className="d-none d-md-block">Mensual</span>
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink eventKey={'three'}>
              <TbSettings className="d-md-none d-block"/>
              <span className="d-none d-md-block">Anual</span>
            </NavLink>
          </NavItem>
        </Nav>
      </CardHeader>
      <CardBody>
        <div dir="ltr">
          <ApexChartClient getOptions={projectOverviewChart} />
        </div>
      </CardBody>
    </Card>
  )
}

export default ProjectOverview
