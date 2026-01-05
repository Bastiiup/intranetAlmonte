import Link from 'next/link'
import { Col, ProgressBar, Row, Table } from 'react-bootstrap'
import { TbCaretRightFilled, TbLink } from 'react-icons/tb'

import ComponentCard from '@/components/cards/ComponentCard'
import CountUpClient from '@/components/client-wrapper/CountUpClient'

type ProjectSource = {
  url: string
  totalTask: number
  completedTask: number
  deadlineDate: string
}

interface ActiveProjectsOverviewProps {
  projects?: ProjectSource[]
}

const ActiveProjectsOverview = async ({ projects }: ActiveProjectsOverviewProps) => {
  // Si no se pasan proyectos, obtener datos reales
  let projectsData = projects || []
  
  if (projectsData.length === 0) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const response = await fetch(
        `${baseUrl}/api/tienda/pedidos?pagination[pageSize]=10&sort=fecha_pedido:desc`,
        { cache: 'no-store' }
      )
      
      const data = await response.json()
      const orders = data.success && data.data ? data.data : []
      
      // Convertir pedidos a formato de proyectos
      projectsData = orders.slice(0, 5).map((order: any, index: number) => {
        const attrs = order.attributes || {}
        const pedidoData = (attrs && Object.keys(attrs).length > 0) ? attrs : order
        const estado = pedidoData.estado || 'pending'
        const fechaPedido = pedidoData.fecha_pedido || pedidoData.createdAt
        
        // Calcular progreso basado en estado
        let completedTask = 0
        let totalTask = 4 // Estados: pending, processing, shipped, completed
        
        if (estado === 'completed' || estado === 'completado') {
          completedTask = 4
        } else if (estado === 'shipped' || estado === 'enviado') {
          completedTask = 3
        } else if (estado === 'processing' || estado === 'procesando') {
          completedTask = 2
        } else {
          completedTask = 1
        }
        
        // Formatear fecha
        const fecha = fechaPedido ? new Date(fechaPedido) : new Date()
        const deadlineDate = fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
        
        // Obtener nombre del pedido
        const orderNumber = pedidoData.numero_pedido || pedidoData.id || `PED-${index + 1}`
        const firstItem = pedidoData.items?.[0]
        const productName = firstItem?.nombre || firstItem?.name || 'Producto'
        
        return {
          url: `Pedido ${orderNumber} - ${productName}`,
          totalTask,
          completedTask,
          deadlineDate,
        }
      })
    } catch (error) {
      console.error('Error al obtener proyectos:', error)
      projectsData = []
    }
  }
  
  const totalProjects = projectsData.length
  const completedProjects = projectsData.filter(p => p.completedTask === p.totalTask).length
  const inProgressProjects = projectsData.filter(p => p.completedTask > 0 && p.completedTask < p.totalTask).length
  const pendingProjects = projectsData.filter(p => p.completedTask === 0).length
  
  const completedPercent = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0
  const inProgressPercent = totalProjects > 0 ? Math.round((inProgressProjects / totalProjects) * 100) : 0
  const pendingPercent = totalProjects > 0 ? Math.round((pendingProjects / totalProjects) * 100) : 0

  if (projectsData.length === 0) {
    return (
      <ComponentCard title="Active Projects Overview" isCloseable isCollapsible isRefreshable>
        <div className="text-center py-4">
          <p className="text-muted mb-0">Aún no hay pedidos activos</p>
        </div>
      </ComponentCard>
    )
  }

  return (
    <ComponentCard title="Active Projects Overview" isCloseable isCollapsible isRefreshable>
      <Row className="mb-2">
        <Col lg>
          <h3 className="mb-2 fw-bold" id="live-visitors">
            <CountUpClient end={totalProjects} />
          </h3>
          <p className="mb-2 fw-semibold text-muted">Pedidos en Progreso</p>
        </Col>
        <Col lg="auto" className="align-self-center">
          <ul className="list-unstyled mb-0 lh-lg">
            <li>
              <TbCaretRightFilled className="align-middle text-primary me-1" />
              <span className="text-muted">Completados</span>
            </li>
            <li>
              <TbCaretRightFilled className="align-middle text-success me-1" />
              <span className="text-muted">En Progreso</span>
            </li>
            <li>
              <TbCaretRightFilled className="align-middle me-1" />
              <span className="text-muted">Pendientes</span>
            </li>
          </ul>
        </Col>
      </Row>

      <ProgressBar style={{ height: 10 }} className="mb-3">
        <ProgressBar now={completedPercent} key={1} />
        <ProgressBar variant="success" now={inProgressPercent} key={2} />
        <ProgressBar variant="info" now={pendingPercent} key={3} />
      </ProgressBar>

      <div className="table-responsive">
        <Table size="sm" className="table-custom table-nowrap table-hover table-centered mb-0">
          <thead className="bg-light align-middle bg-opacity-25 thead-sm">
            <tr className="text-uppercase fs-xxs">
              <th className="text-muted">Pedido</th>
              <th className="text-muted text-end">Progreso</th>
              <th className="text-muted text-end">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {projectsData.map((source, index) => (
              <tr key={index}>
                <td className="text-decoration-underline">{source.url}</td>
                <td className="text-end">{source.completedTask}/{source.totalTask}</td>
                <td className="text-end">{source.deadlineDate}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className="text-center mt-3">
        <Link href="/chat" className="link-reset text-decoration-underline fw-semibold link-offset-3">
          View all Projects <TbLink size={13} />
        </Link>
      </div>
    </ComponentCard>
  )
}

export default ActiveProjectsOverview
