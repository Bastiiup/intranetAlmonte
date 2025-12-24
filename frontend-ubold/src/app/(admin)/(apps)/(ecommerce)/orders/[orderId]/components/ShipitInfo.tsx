'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Button, Badge, Alert, Spinner } from 'react-bootstrap'
import { LuTruck, LuRefreshCw, LuExternalLink } from 'react-icons/lu'
import { getShipitIdFromOrder, getShipitTrackingFromOrder } from '@/lib/shipit/utils'

interface ShipitInfoProps {
  pedido: any
  onRefresh?: () => void
}

export default function ShipitInfo({ pedido, onRefresh }: ShipitInfoProps) {
  const [loading, setLoading] = useState(false)
  const [shipmentStatus, setShipmentStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const shipitId = getShipitIdFromOrder(pedido)
  const trackingNumber = getShipitTrackingFromOrder(pedido)
  const deliveryType = pedido.meta_data?.find((m: any) => m.key === '_delivery_type')?.value || 'pickup'

  // Cargar estado del envío si existe
  useEffect(() => {
    if (shipitId) {
      loadShipmentStatus()
    }
  }, [shipitId])

  const loadShipmentStatus = async () => {
    if (!shipitId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/shipit/shipments/${shipitId}/status`)
      const data = await response.json()

      if (data.success) {
        setShipmentStatus(data.data)
      } else {
        setError(data.error || 'Error al obtener estado del envío')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con Shipit')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShipment = async () => {
    if (!pedido?.id && !pedido?.number) return

    setCreating(true)
    setError(null)

    try {
      // Para pedidos de Strapi, usar wooId o numero_pedido si está disponible
      // Para pedidos de WooCommerce, usar id directamente
      const orderId = pedido.wooId || pedido.numero_pedido || pedido.id || pedido.number
      
      if (!orderId) {
        setError('No se pudo determinar el ID del pedido')
        setCreating(false)
        return
      }

      const response = await fetch('/api/shipit/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId,
          courier: 'shippify',
          kind: 0,
          testMode: false,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Recargar página o actualizar estado
        if (onRefresh) {
          onRefresh()
        } else {
          window.location.reload()
        }
      } else {
        setError(data.error || 'Error al crear envío')
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear envío')
    } finally {
      setCreating(false)
    }
  }

  // Si es retiro en tienda, no mostrar información de Shipit
  if (deliveryType === 'pickup') {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h4" className="d-flex align-items-center">
            <LuTruck className="me-2" />
            Envío Shipit
          </CardTitle>
        </CardHeader>
        <CardBody>
          <Alert variant="info" className="mb-0">
            <small>
              Este pedido es para <strong>retiro en tienda</strong>, no requiere envío.
            </small>
          </Alert>
        </CardBody>
      </Card>
    )
  }

  // Si no tiene envío de Shipit
  if (!shipitId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h4" className="d-flex align-items-center">
            <LuTruck className="me-2" />
            Envío Shipit
          </CardTitle>
        </CardHeader>
        <CardBody>
          <Alert variant="warning" className="mb-3">
            <small>
              Este pedido no tiene un envío creado en Shipit.
            </small>
          </Alert>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateShipment}
            disabled={creating}
            className="w-100"
          >
            {creating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Creando...
              </>
            ) : (
              <>
                <LuTruck className="me-2" />
                Crear Envío en Shipit
              </>
            )}
          </Button>
          {error && (
            <Alert variant="danger" className="mt-2 mb-0">
              <small>{error}</small>
            </Alert>
          )}
        </CardBody>
      </Card>
    )
  }

  // Mostrar información del envío
  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge bg="secondary">Desconocido</Badge>

    const statusLower = status.toLowerCase()
    if (statusLower.includes('delivered') || statusLower.includes('entregado')) {
      return <Badge bg="success">Entregado</Badge>
    }
    if (statusLower.includes('transit') || statusLower.includes('tránsito')) {
      return <Badge bg="info">En Tránsito</Badge>
    }
    if (statusLower.includes('pending') || statusLower.includes('pendiente')) {
      return <Badge bg="warning">Pendiente</Badge>
    }
    if (statusLower.includes('failed') || statusLower.includes('fallido')) {
      return <Badge bg="danger">Fallido</Badge>
    }
    return <Badge bg="secondary">{status}</Badge>
  }

  const trackingUrl = trackingNumber
    ? `https://shipit.cl/tracking/${trackingNumber}`
    : shipmentStatus?.tracking_url

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <CardTitle as="h4" className="d-flex align-items-center mb-0">
          <LuTruck className="me-2" />
          Envío Shipit
        </CardTitle>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={loadShipmentStatus}
          disabled={loading}
          title="Actualizar estado"
        >
          <LuRefreshCw className={loading ? 'spinning' : ''} />
        </Button>
      </CardHeader>
      <CardBody>
        {loading && !shipmentStatus ? (
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" />
            <div className="mt-2 text-muted">Cargando estado...</div>
          </div>
        ) : error && !shipmentStatus ? (
          <Alert variant="danger">
            <small>{error}</small>
          </Alert>
        ) : (
          <>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">ID de Envío:</span>
                <strong className="small">{shipitId}</strong>
              </div>
              {trackingNumber && (
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small">Tracking:</span>
                  <strong className="small">{trackingNumber}</strong>
                </div>
              )}
              {shipmentStatus?.status && (
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small">Estado:</span>
                  {getStatusBadge(shipmentStatus.status)}
                </div>
              )}
              {shipmentStatus?.courier && (
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small">Courier:</span>
                  <span className="small">{shipmentStatus.courier.name || shipmentStatus.courier.client}</span>
                </div>
              )}
            </div>

            {trackingUrl && (
              <Button
                variant="outline-primary"
                size="sm"
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-100 mb-2"
                as="a"
              >
                <LuExternalLink className="me-2" />
                Ver Tracking en Shipit
              </Button>
            )}

            {shipmentStatus?.events && shipmentStatus.events.length > 0 && (
              <div className="mt-3">
                <small className="text-muted d-block mb-2">Historial de Eventos:</small>
                <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {shipmentStatus.events.map((event: any, idx: number) => (
                    <div key={idx} className="small mb-2 pb-2 border-bottom">
                      <div className="fw-bold">{event.status}</div>
                      <div className="text-muted">{event.description}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {new Date(event.date).toLocaleString('es-CL')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <Alert variant="warning" className="mt-2 mb-0">
                <small>{error}</small>
              </Alert>
            )}
          </>
        )}
      </CardBody>
    </Card>
  )
}
