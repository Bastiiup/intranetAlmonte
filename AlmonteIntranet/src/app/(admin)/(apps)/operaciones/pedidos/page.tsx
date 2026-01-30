'use client'

import { useState, useEffect } from 'react'
import { Container, Card, CardHeader, CardBody, Button, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuRefreshCw, LuSearch, LuFilter } from 'react-icons/lu'
import { useNotificationContext } from '@/context/useNotificationContext'
import PedidosList from './components/PedidosList'
import type { SincronizedOrder } from '@/lib/operaciones/types'

export default function OperacionesPedidosPage() {
  const { showNotification } = useNotificationContext()
  const [pedidos, setPedidos] = useState<SincronizedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'synced' | 'pending' | 'conflict' | 'error'>('all')
  const [filterConfidence, setFilterConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  // Cargar pedidos al montar el componente
  useEffect(() => {
    loadPedidos()
  }, [])

  const loadPedidos = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/operaciones/pedidos')
      const data = await response.json()

      if (data.success) {
        setPedidos(data.data || [])
      } else {
        setError(data.error || 'Error al obtener pedidos')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
      console.error('Error al cargar pedidos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/operaciones/pedidos', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        setPedidos(data.data || [])
        showNotification('success', 'Pedidos sincronizados exitosamente', `Se sincronizaron ${data.count || 0} pedidos`)
      } else {
        showNotification('error', 'Error al sincronizar', data.error || 'Error desconocido')
      }
    } catch (err: any) {
      showNotification('error', 'Error al sincronizar', err.message || 'Error desconocido')
    } finally {
      setSyncing(false)
    }
  }

  // Filtrar pedidos
  const filteredPedidos = pedidos.filter(pedido => {
    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const wcOrderNum = pedido.wearecloud_order?.order_number?.toLowerCase() || ''
      const jsOrderNum = pedido.jumpseller_order?.order_number?.toLowerCase() || ''
      const customerEmail = pedido.jumpseller_order?.customer?.email?.toLowerCase() || ''
      const customerName = `${pedido.jumpseller_order?.customer?.first_name || ''} ${pedido.jumpseller_order?.customer?.last_name || ''}`.toLowerCase()
      
      if (!wcOrderNum.includes(term) && 
          !jsOrderNum.includes(term) && 
          !customerEmail.includes(term) && 
          !customerName.includes(term)) {
        return false
      }
    }

    // Filtro por estado de sincronización
    if (filterStatus !== 'all' && pedido.sync_status !== filterStatus) {
      return false
    }

    // Filtro por confianza del match
    if (filterConfidence !== 'all' && pedido.match_confidence !== filterConfidence) {
      return false
    }

    return true
  })

  // Estadísticas
  const stats = {
    total: pedidos.length,
    synced: pedidos.filter(p => p.sync_status === 'synced').length,
    pending: pedidos.filter(p => p.sync_status === 'pending').length,
    conflict: pedidos.filter(p => p.sync_status === 'conflict').length,
    error: pedidos.filter(p => p.sync_status === 'error').length,
    highConfidence: pedidos.filter(p => p.match_confidence === 'high').length,
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Pedidos Sincronizados" subtitle="Operaciones" />

      {/* Estadísticas */}
      <Row className="mb-4">
        <Col xs={12} sm={6} md={3}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="text-muted mb-1">Total Pedidos</h6>
                  <h3 className="mb-0">{stats.total}</h3>
                </div>
                <div className="text-primary">
                  <LuRefreshCw size={24} />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="text-muted mb-1">Sincronizados</h6>
                  <h3 className="mb-0 text-success">{stats.synced}</h3>
                </div>
                <div className="text-success">
                  <LuRefreshCw size={24} />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="text-muted mb-1">Pendientes</h6>
                  <h3 className="mb-0 text-warning">{stats.pending}</h3>
                </div>
                <div className="text-warning">
                  <LuRefreshCw size={24} />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="text-muted mb-1">Alta Confianza</h6>
                  <h3 className="mb-0 text-info">{stats.highConfidence}</h3>
                </div>
                <div className="text-info">
                  <LuRefreshCw size={24} />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Controles */}
      <Card className="mb-4">
        <CardHeader>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 className="mb-0">Pedidos Sincronizados</h5>
            <div className="d-flex gap-2">
              <Button
                variant="primary"
                onClick={handleSync}
                disabled={syncing || loading}
              >
                {syncing ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <LuRefreshCw className="me-2" />
                    Sincronizar
                  </>
                )}
              </Button>
              <Button
                variant="outline-primary"
                onClick={loadPedidos}
                disabled={loading}
              >
                <LuRefreshCw className="me-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {/* Filtros */}
          <Row className="mb-3">
            <Col md={4}>
              <div className="input-group">
                <span className="input-group-text">
                  <LuSearch />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por número de pedido, email, nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </Col>
            <Col md={4}>
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">Todos los estados</option>
                <option value="synced">Sincronizados</option>
                <option value="pending">Pendientes</option>
                <option value="conflict">Conflictos</option>
                <option value="error">Errores</option>
              </select>
            </Col>
            <Col md={4}>
              <select
                className="form-select"
                value={filterConfidence}
                onChange={(e) => setFilterConfidence(e.target.value as any)}
              >
                <option value="all">Todas las confianzas</option>
                <option value="high">Alta confianza</option>
                <option value="medium">Media confianza</option>
                <option value="low">Baja confianza</option>
              </select>
            </Col>
          </Row>

          {/* Lista de pedidos */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2">Cargando pedidos...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">
              <strong>Error:</strong> {error}
              <div className="mt-2">
                <Button variant="outline-danger" size="sm" onClick={loadPedidos}>
                  Reintentar
                </Button>
              </div>
            </Alert>
          ) : filteredPedidos.length === 0 ? (
            <Alert variant="info">
              {searchTerm || filterStatus !== 'all' || filterConfidence !== 'all'
                ? 'No se encontraron pedidos con los filtros aplicados'
                : 'No hay pedidos sincronizados. Haz clic en "Sincronizar" para comenzar.'}
            </Alert>
          ) : (
            <PedidosList pedidos={filteredPedidos} onUpdate={loadPedidos} />
          )}
        </CardBody>
      </Card>
    </Container>
  )
}

