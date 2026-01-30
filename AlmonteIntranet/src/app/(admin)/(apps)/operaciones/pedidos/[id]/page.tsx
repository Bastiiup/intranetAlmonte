'use client'

import { useState, useEffect } from 'react'
import { Container, Card, CardHeader, CardBody, Row, Col, Badge, Alert, Spinner, Button } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuArrowLeft, LuPencil, LuRefreshCw, LuExternalLink } from 'react-icons/lu'
import { useParams, useRouter } from 'next/navigation'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { SincronizedOrder } from '@/lib/operaciones/types'
import ActualizarPedidoModal from '../components/ActualizarPedidoModal'

// URLs públicas (disponibles en el cliente)
const WEARECLOUD_URL = process.env.NEXT_PUBLIC_WEARECLOUD_URL || 'https://ecommerce.wareclouds.app'
const JUMPSELLER_ADMIN_URL = process.env.NEXT_PUBLIC_JUMPSELLER_ADMIN_URL || 'https://jumpseller.cl/admin'

export default function PedidoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const { showNotification } = useNotificationContext()
  const [pedido, setPedido] = useState<SincronizedOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadPedido()
    }
  }, [params.id])

  const loadPedido = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/operaciones/pedidos/${params.id}`)
      const data = await response.json()

      if (data.success) {
        setPedido(data.data)
      } else {
        setError(data.error || 'Error al obtener el pedido')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Detalle de Pedido" subtitle="Operaciones" />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2">Cargando pedido...</p>
        </div>
      </Container>
    )
  }

  if (error || !pedido) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Detalle de Pedido" subtitle="Operaciones" />
        <Alert variant="danger">
          <strong>Error:</strong> {error || 'Pedido no encontrado'}
          <div className="mt-3">
            <Button variant="outline-danger" onClick={() => router.push('/operaciones/pedidos')}>
              <LuArrowLeft className="me-2" />
              Volver a la lista
            </Button>
          </div>
        </Alert>
      </Container>
    )
  }

  const wcOrder = pedido.wearecloud_order
  const jsOrder = pedido.jumpseller_order

  return (
    <Container fluid>
      <PageBreadcrumb title="Detalle de Pedido" subtitle="Operaciones" />

      <div className="mb-3">
        <Button variant="outline-secondary" onClick={() => router.push('/operaciones/pedidos')}>
          <LuArrowLeft className="me-2" />
          Volver a la lista
        </Button>
      </div>

      <Row>
        {/* Información General */}
        <Col md={12}>
          <Card className="mb-4">
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Información General</h5>
              <div className="d-flex gap-2 flex-wrap">
                {/* Enlaces directos a los sistemas (funcionan con sesión del navegador) */}
                {wcOrder && (wcOrder.url || wcOrder.warecloud_id || wcOrder.id || wcOrder.pedido_ecommerce) && (
                  <Button
                    variant="info"
                    size="sm"
                    href={
                      wcOrder.url || 
                      (wcOrder.warecloud_id ? `${WEARECLOUD_URL}/orders/${wcOrder.warecloud_id}` : null) ||
                      (wcOrder.id ? `${WEARECLOUD_URL}/orders/${wcOrder.id}` : null) ||
                      (wcOrder.pedido_ecommerce ? `${WEARECLOUD_URL}/orders?search=${wcOrder.pedido_ecommerce}` : '#')
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    as="a"
                    className="text-white"
                  >
                    <LuExternalLink className="me-2" />
                    Abrir en WeareCloud
                  </Button>
                )}
                {jsOrder && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      href={
                        jsOrder.id 
                          ? `${JUMPSELLER_ADMIN_URL}/orders/${jsOrder.id}` 
                          : (jsOrder.order_number ? `${JUMPSELLER_ADMIN_URL}/orders?search=${jsOrder.order_number}` : '#')
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      as="a"
                      className="text-white"
                    >
                      <LuExternalLink className="me-2" />
                      Abrir en JumpSeller
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => setShowUpdateModal(true)}
                    >
                      <LuPencil className="me-2" />
                      Actualizar en JumpSeller
                    </Button>
                  </>
                )}
                <Button
                  variant="outline-warning"
                  size="sm"
                  onClick={loadPedido}
                >
                  <LuRefreshCw className="me-2" />
                  Sincronizar
                </Button>
              </div>
              </div>
            </CardHeader>
            <CardBody>
              <Row>
                <Col md={6}>
                  <h6>Estado de Sincronización</h6>
                  <p>
                    <Badge bg={pedido.sync_status === 'synced' ? 'success' : 'warning'}>
                      {pedido.sync_status}
                    </Badge>
                    {' '}
                    <Badge bg={pedido.match_confidence === 'high' ? 'success' : pedido.match_confidence === 'medium' ? 'warning' : 'danger'}>
                      Confianza: {pedido.match_confidence}
                    </Badge>
                  </p>
                  {pedido.match_reason && (
                    <p className="text-muted small">
                      <strong>Razón del match:</strong> {pedido.match_reason}
                    </p>
                  )}
                  {pedido.last_synced_at && (
                    <p className="text-muted small">
                      <strong>Última sincronización:</strong>{' '}
                      {new Date(pedido.last_synced_at).toLocaleString('es-CL')}
                    </p>
                  )}
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>

        {/* Pedido WeareCloud */}
        {wcOrder && (
          <Col md={6}>
            <Card className="mb-4">
              <CardHeader>
                <h5 className="mb-0">
                  Pedido WeareCloud
                  {wcOrder.url && (
                    <a
                      href={wcOrder.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ms-2"
                    >
                      <LuExternalLink size={16} />
                    </a>
                  )}
                </h5>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col xs={6}>
                    <strong>Número de Pedido:</strong>
                    <p>#{wcOrder.order_number}</p>
                  </Col>
                  <Col xs={6}>
                    <strong>Estado:</strong>
                    <p>
                      <Badge bg="secondary">{wcOrder.status}</Badge>
                    </p>
                  </Col>
                  <Col xs={6}>
                    <strong>Total:</strong>
                    <p>${wcOrder.total}</p>
                  </Col>
                  <Col xs={6}>
                    <strong>Fecha Creación:</strong>
                    <p>{new Date(wcOrder.created_at).toLocaleDateString('es-CL')}</p>
                  </Col>
                  {wcOrder.customer && (
                    <>
                      <Col xs={12}>
                        <strong>Cliente:</strong>
                        <p>{wcOrder.customer.name}</p>
                      </Col>
                      <Col xs={12}>
                        <strong>Email:</strong>
                        <p>{wcOrder.customer.email}</p>
                      </Col>
                      {wcOrder.customer.phone && (
                        <Col xs={12}>
                          <strong>Teléfono:</strong>
                          <p>{wcOrder.customer.phone}</p>
                        </Col>
                      )}
                    </>
                  )}
                </Row>
              </CardBody>
            </Card>
          </Col>
        )}

        {/* Pedido JumpSeller */}
        {jsOrder && (
          <Col md={6}>
            <Card className="mb-4">
              <CardHeader>
                <h5 className="mb-0">Pedido JumpSeller</h5>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col xs={6}>
                    <strong>Número de Pedido:</strong>
                    <p>#{jsOrder.order_number || jsOrder.id}</p>
                  </Col>
                  <Col xs={6}>
                    <strong>Estado:</strong>
                    <p>
                      <Badge bg="secondary">{jsOrder.status}</Badge>
                    </p>
                  </Col>
                  <Col xs={6}>
                    <strong>Total:</strong>
                    <p>${jsOrder.total}</p>
                  </Col>
                  <Col xs={6}>
                    <strong>Moneda:</strong>
                    <p>{jsOrder.currency}</p>
                  </Col>
                  <Col xs={6}>
                    <strong>Fecha Creación:</strong>
                    <p>{new Date(jsOrder.created_at).toLocaleDateString('es-CL')}</p>
                  </Col>
                  {jsOrder.customer && (
                    <>
                      <Col xs={12}>
                        <strong>Cliente:</strong>
                        <p>
                          {jsOrder.customer.first_name} {jsOrder.customer.last_name}
                        </p>
                      </Col>
                      <Col xs={12}>
                        <strong>Email:</strong>
                        <p>{jsOrder.customer.email}</p>
                      </Col>
                      {jsOrder.customer.phone && (
                        <Col xs={12}>
                          <strong>Teléfono:</strong>
                          <p>{jsOrder.customer.phone}</p>
                        </Col>
                      )}
                    </>
                  )}
                  {jsOrder.billing_address && (
                    <Col xs={12}>
                      <strong>Dirección de Facturación:</strong>
                      <p>
                        {jsOrder.billing_address.address_1}
                        {jsOrder.billing_address.address_2 && `, ${jsOrder.billing_address.address_2}`}
                        <br />
                        {jsOrder.billing_address.city}, {jsOrder.billing_address.state}
                        <br />
                        {jsOrder.billing_address.postcode}
                      </p>
                    </Col>
                  )}
                  {jsOrder.customer_note && (
                    <Col xs={12}>
                      <strong>Nota del Cliente:</strong>
                      <p>{jsOrder.customer_note}</p>
                    </Col>
                  )}
                  {jsOrder.internal_note && (
                    <Col xs={12}>
                      <strong>Nota Interna:</strong>
                      <p>{jsOrder.internal_note}</p>
                    </Col>
                  )}
                </Row>
              </CardBody>
            </Card>
          </Col>
        )}

        {/* Items del Pedido */}
        {jsOrder?.line_items && jsOrder.line_items.length > 0 && (
          <Col md={12}>
            <Card>
              <CardHeader>
                <h5 className="mb-0">Items del Pedido</h5>
              </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>SKU</th>
                        <th className="text-center">Cantidad</th>
                        <th className="text-end">Precio</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jsOrder.line_items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.sku}</td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-end">${item.price}</td>
                          <td className="text-end">${item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </Col>
        )}
      </Row>

      {pedido && (
        <ActualizarPedidoModal
          show={showUpdateModal}
          onHide={() => setShowUpdateModal(false)}
          pedido={pedido}
          onSuccess={loadPedido}
        />
      )}
    </Container>
  )
}

