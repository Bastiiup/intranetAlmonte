'use client'

import { useState, useEffect } from 'react'
import { Badge, Spinner } from 'react-bootstrap'
import { LuTrendingUp, LuShoppingBag, LuDollarSign } from 'react-icons/lu'
import { formatCurrencyNumber } from '../utils/calculations'

interface QuickStatsProps {
  className?: string
}

interface StatsData {
  totalToday: number
  ordersCount: number
  averageOrder: number
  loading: boolean
}

export default function QuickStats({ className = '' }: QuickStatsProps) {
  const [stats, setStats] = useState<StatsData>({
    totalToday: 0,
    ordersCount: 0,
    averageOrder: 0,
    loading: true,
  })

  useEffect(() => {
    loadStats()
    // Actualizar cada 30 segundos
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      const response = await fetch(
        `/api/woocommerce/orders?after=${todayISO}&per_page=100&orderby=date&order=desc`
      )
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        const orders = data.data
        const totalToday = orders.reduce((sum: number, order: any) => 
          sum + parseFloat(order.total || 0), 0
        )
        const ordersCount = orders.length
        const averageOrder = ordersCount > 0 ? totalToday / ordersCount : 0

        setStats({
          totalToday,
          ordersCount,
          averageOrder,
          loading: false,
        })
      } else {
        setStats(prev => ({ ...prev, loading: false }))
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err)
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  if (stats.loading) {
    return (
      <div className={`d-flex align-items-center gap-2 ${className}`}>
        <Spinner animation="border" size="sm" variant="primary" />
        <small className="text-muted">Cargando...</small>
      </div>
    )
  }

  return (
    <div className={`d-flex align-items-center gap-3 ${className}`}>
      <Badge bg="success" className="d-flex align-items-center gap-1 px-3 py-2">
        <LuDollarSign />
        <span>Hoy: ${formatCurrencyNumber(stats.totalToday)}</span>
      </Badge>
      <Badge bg="primary" className="d-flex align-items-center gap-1 px-3 py-2">
        <LuShoppingBag />
        <span>{stats.ordersCount} pedidos</span>
      </Badge>
      {stats.ordersCount > 0 && (
        <Badge bg="info" className="d-flex align-items-center gap-1 px-3 py-2">
          <LuTrendingUp />
          <span>Promedio: ${formatCurrencyNumber(stats.averageOrder)}</span>
        </Badge>
      )}
    </div>
  )
}
