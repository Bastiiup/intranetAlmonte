'use client'

import { Card, CardBody, Col, Row } from 'react-bootstrap'
import CountUpClient from '@/components/client-wrapper/CountUpClient'
import { useMemo } from 'react'
import { TbUsers, TbCurrencyDollar, TbShoppingBag, TbTrendingUp, TbUserCheck } from 'react-icons/tb'
import { currency } from '@/helpers'

interface ClienteType {
  id?: number | string
  nombre?: string
  correo_electronico?: string
  pedidos?: number
  gasto_total?: number
  fecha_registro?: string
  orders?: number
  totalSpends?: number
}

interface ClientesStatsProps {
  clientes?: ClienteType[]
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

const ClientesStats = ({ clientes }: ClientesStatsProps = {}) => {
  const stats = useMemo(() => {
    if (!clientes || clientes.length === 0) {
      return {
        totalClientes: 0,
        gastoTotal: 0,
        promedioGasto: 0,
        totalPedidos: 0,
        promedioPedidos: 0,
        clientesActivos: 0,
      }
    }

    // Calcular métricas
    const totalClientes = clientes.length
    
    // Gasto total: sumar gasto_total o totalSpends
    const gastoTotal = clientes.reduce((sum, cliente) => {
      const gasto = cliente.gasto_total || cliente.totalSpends || 0
      return sum + (typeof gasto === 'string' ? parseFloat(gasto) || 0 : gasto)
    }, 0)
    
    const promedioGasto = totalClientes > 0 ? gastoTotal / totalClientes : 0
    
    // Total de pedidos: sumar pedidos u orders
    const totalPedidos = clientes.reduce((sum, cliente) => {
      const pedidos = cliente.pedidos || cliente.orders || 0
      return sum + (typeof pedidos === 'string' ? parseInt(pedidos) || 0 : pedidos)
    }, 0)
    
    const promedioPedidos = totalClientes > 0 ? totalPedidos / totalClientes : 0
    
    // Clientes activos: aquellos con al menos un pedido o gasto > 0
    const clientesActivos = clientes.filter(cliente => {
      const pedidos = cliente.pedidos || cliente.orders || 0
      const gasto = cliente.gasto_total || cliente.totalSpends || 0
      const gastoNum = typeof gasto === 'string' ? parseFloat(gasto) || 0 : gasto
      const pedidosNum = typeof pedidos === 'string' ? parseInt(pedidos) || 0 : pedidos
      return pedidosNum > 0 || gastoNum > 0
    }).length

    return {
      totalClientes,
      gastoTotal,
      promedioGasto,
      totalPedidos,
      promedioPedidos,
      clientesActivos,
    }
  }, [clientes])

  const statsToShow = [
    {
      title: 'Total Clientes',
      count: stats.totalClientes,
      icon: TbUsers,
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
      title: 'Promedio de Gasto',
      count: stats.promedioGasto,
      icon: TbTrendingUp,
      variant: 'info',
      suffix: '',
    },
    {
      title: 'Total Pedidos',
      count: stats.totalPedidos,
      icon: TbShoppingBag,
      variant: 'warning',
      suffix: '',
    },
    {
      title: 'Clientes Activos',
      count: stats.clientesActivos,
      icon: TbUserCheck,
      variant: 'danger',
      suffix: '',
    },
  ]

  return (
    <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 align-items-center g-1 mb-3">
      {statsToShow.map((item, idx) => (
        <Col key={idx}>
          <StatCard {...item} />
        </Col>
      ))}
    </Row>
  )
}

export default ClientesStats

