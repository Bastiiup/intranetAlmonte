'use client'

import { OrderStatisticsType, orderStats } from '@/app/(admin)/(apps)/(ecommerce)/orders/data'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import CountUpClient from '@/components/client-wrapper/CountUpClient'
import { useMemo } from 'react'
import { TbCheck, TbHourglass, TbRepeat, TbShoppingCart, TbX } from 'react-icons/tb'

const StatCard = ({ item }: { item: OrderStatisticsType }) => {
  return (
    <Card className="mb-1">
      <CardBody>
        <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
          <h3 className="mb-0">
            <CountUpClient end={item.count} prefix={item.prefix} suffix={item.suffix} />
          </h3>
          <div className="avatar-md flex-shrink-0">
            <span className={`avatar-title text-bg-${item.variant} rounded-circle fs-22`}>
              <item.icon />
            </span>
          </div>
        </div>
        <p className="mb-0 text-uppercase fs-xs fw-bold">
          {item.title}
          <span className={`float-end badge badge-soft-${item.variant}`}>{item.change}%</span>
        </p>
      </CardBody>
    </Card>
  )
}

interface OrdersStatsProps {
  pedidos?: any[]
}

const OrdersStats = ({ pedidos }: OrdersStatsProps = {}) => {
  // Calcular estadísticas desde pedidos reales de WooCommerce
  const calculatedStats = useMemo(() => {
    if (!pedidos || pedidos.length === 0) {
      return orderStats
    }

    const completed = pedidos.filter((p: any) => p.status === 'completed').length
    const pending = pedidos.filter((p: any) => 
      p.status === 'pending' || p.status === 'processing' || p.status === 'on-hold'
    ).length
    const cancelled = pedidos.filter((p: any) => 
      p.status === 'cancelled' || p.status === 'refunded'
    ).length
    
    // Pedidos nuevos (creados hoy)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const newOrders = pedidos.filter((p: any) => {
      if (!p.date_created) return false
      const orderDate = new Date(p.date_created)
      orderDate.setHours(0, 0, 0, 0)
      return orderDate.getTime() === today.getTime()
    }).length

    // Pedidos devueltos (simplificado, usar refunded)
    const returned = pedidos.filter((p: any) => p.status === 'refunded').length

    return [
      {
        title: 'Pedidos Completados',
        count: completed,
        change: '+0.00',
        icon: TbCheck,
        variant: 'success',
      },
      {
        title: 'Pedidos Pendientes',
        count: pending,
        change: '+0.00',
        icon: TbHourglass,
        variant: 'warning',
      },
      {
        title: 'Pedidos Cancelados',
        count: cancelled,
        change: '+0.00',
        icon: TbX,
        variant: 'danger',
      },
      {
        title: 'Nuevos Pedidos',
        count: newOrders,
        change: '+0.00',
        icon: TbShoppingCart,
        variant: 'info',
      },
      {
        title: 'Pedidos Devueltos',
        count: returned,
        change: '+0.00',
        icon: TbRepeat,
        variant: 'primary',
      },
    ] as OrderStatisticsType[]
  }, [pedidos])

  const statsToShow = pedidos && pedidos.length > 0 ? calculatedStats : orderStats

  return (
    <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 align-items-center g-1">
      {statsToShow.map((item, idx) => (
        <Col key={idx}>
          <StatCard item={item} />
        </Col>
      ))}
    </Row>
  )
}

export default OrdersStats
