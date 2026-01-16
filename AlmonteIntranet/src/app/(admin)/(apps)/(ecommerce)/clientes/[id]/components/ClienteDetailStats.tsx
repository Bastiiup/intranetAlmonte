'use client'

import { Card, CardBody, Col, Row } from 'react-bootstrap'
import CountUpClient from '@/components/client-wrapper/CountUpClient'
import { useMemo } from 'react'
import { TbShoppingBag, TbCurrencyDollar, TbTrendingUp, TbClock, TbCheck } from 'react-icons/tb'
import { currency } from '@/helpers'

interface ClienteDetailStatsProps {
  cliente: any
  pedidos: any[]
}

const StatCard = ({ title, count, icon: Icon, variant, suffix = '' }: { 
  title: string
  count: number
  icon: any
  variant: string
  suffix?: string
}) => {
  return (
    <Card className="mb-1">
      <CardBody>
        <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
          <h3 className="mb-0">
            <CountUpClient end={count} prefix={currency} suffix={suffix} />
          </h3>
          <div className="avatar-md flex-shrink-0">
            <span className={`avatar-title text-bg-${variant} rounded-circle fs-22`}>
              <Icon />
            </span>
          </div>
        </div>
        <p className="mb-0 text-uppercase fs-xs fw-bold">
          {title}
        </p>
      </CardBody>
    </Card>
  )
}

const ClienteDetailStats = ({ cliente, pedidos }: ClienteDetailStatsProps) => {
  const stats = useMemo(() => {
    const totalPedidos = pedidos.length
    
    // Gasto total del cliente desde WooCommerce o calculado desde pedidos
    const gastoTotal = cliente.total_spent 
      ? parseFloat(cliente.total_spent) || 0
      : pedidos.reduce((sum, pedido) => {
          const total = parseFloat(pedido.total || '0') || 0
          return sum + total
        }, 0)
    
    // Promedio de gasto por pedido
    const promedioGasto = totalPedidos > 0 ? gastoTotal / totalPedidos : 0
    
    // Pedidos completados
    const pedidosCompletados = pedidos.filter((p: any) => 
      (p.status || '').toLowerCase() === 'completed'
    ).length
    
    // Último pedido
    const ultimoPedido = pedidos.length > 0 ? pedidos[0] : null
    const fechaUltimoPedido = ultimoPedido ? new Date(ultimoPedido.date_created) : null

    return {
      totalPedidos,
      gastoTotal,
      promedioGasto,
      pedidosCompletados,
      fechaUltimoPedido,
    }
  }, [cliente, pedidos])

  const statsToShow = [
    {
      title: 'Total Pedidos',
      count: stats.totalPedidos,
      icon: TbShoppingBag,
      variant: 'primary',
      suffix: '',
    },
    {
      title: 'Gasto Total',
      count: stats.gastoTotal,
      icon: TbCurrencyDollar,
      variant: 'success',
      suffix: '',
    },
    {
      title: 'Promedio por Pedido',
      count: stats.promedioGasto,
      icon: TbTrendingUp,
      variant: 'info',
      suffix: '',
    },
    {
      title: 'Pedidos Completados',
      count: stats.pedidosCompletados,
      icon: TbCheck,
      variant: 'warning',
      suffix: '',
    },
  ]

  return (
    <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 align-items-center g-1 mb-3">
      {statsToShow.map((item, idx) => (
        <Col key={idx}>
          <StatCard {...item} />
        </Col>
      ))}
    </Row>
  )
}

export default ClienteDetailStats

