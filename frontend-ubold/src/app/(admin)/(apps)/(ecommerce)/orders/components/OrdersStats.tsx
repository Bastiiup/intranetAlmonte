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
  // Calcular estadísticas desde pedidos reales de Strapi
  const calculatedStats = useMemo(() => {
    if (!pedidos || pedidos.length === 0) {
      return orderStats
    }

    // Normalizar estado: puede venir de Strapi (español) o WooCommerce (inglés)
    const normalizeEstado = (estado: string): string => {
      if (!estado) return 'pendiente'
      const estadoLower = estado.toLowerCase().trim()
      
      // Mapeo de estados en español a inglés para comparación
      const estadoMap: Record<string, string> = {
        'pendiente': 'pending',
        'procesando': 'processing',
        'en_espera': 'on-hold',
        'completado': 'completed',
        'cancelado': 'cancelled',
        'reembolsado': 'refunded',
        'fallido': 'failed',
      }
      
      // Si ya está en inglés, devolverlo
      if (['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'].includes(estadoLower)) {
        return estadoLower
      }
      
      // Si está en español, mapearlo
      return estadoMap[estadoLower] || estadoLower
    }

    // Obtener estado del pedido (puede estar en diferentes lugares según la estructura)
    const getEstado = (p: any): string => {
      // Intentar obtener de diferentes lugares
      const estado = p.estado || p.status || p.attributes?.estado || p.data?.attributes?.estado || 'pendiente'
      return normalizeEstado(estado)
    }

    // Obtener fecha de creación (puede estar en diferentes lugares)
    const getFechaCreacion = (p: any): Date | null => {
      const fecha = p.fecha_pedido || p.date_created || p.createdAt || 
                   p.attributes?.fecha_pedido || p.data?.attributes?.fecha_pedido ||
                   p.attributes?.createdAt || p.data?.attributes?.createdAt
      
      if (!fecha) return null
      
      try {
        return new Date(fecha)
      } catch {
        return null
      }
    }

    // Contar por estado
    const completed = pedidos.filter((p: any) => getEstado(p) === 'completed').length
    const pending = pedidos.filter((p: any) => {
      const estado = getEstado(p)
      return estado === 'pending' || estado === 'processing' || estado === 'on-hold'
    }).length
    const cancelled = pedidos.filter((p: any) => {
      const estado = getEstado(p)
      return estado === 'cancelled' || estado === 'refunded'
    }).length
    
    // Pedidos nuevos (creados hoy)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const newOrders = pedidos.filter((p: any) => {
      const fechaCreacion = getFechaCreacion(p)
      if (!fechaCreacion) return false
      const orderDate = new Date(fechaCreacion)
      orderDate.setHours(0, 0, 0, 0)
      return orderDate.getTime() === today.getTime()
    }).length

    // Pedidos devueltos (reembolsados)
    const returned = pedidos.filter((p: any) => getEstado(p) === 'refunded').length

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
