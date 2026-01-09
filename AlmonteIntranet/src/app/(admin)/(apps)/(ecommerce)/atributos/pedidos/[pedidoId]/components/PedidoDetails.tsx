'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl, Table } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX } from 'react-icons/lu'
import { TbEdit } from 'react-icons/tb'
import Link from 'next/link'

interface PedidoDetailsProps {
  pedido: any
  pedidoId: string
  error?: string | null
}

// Helper para obtener campo con múltiples variaciones
const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const PedidoDetails = ({ pedido: initialPedido, pedidoId, error: initialError }: PedidoDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [success, setSuccess] = useState(false)
  const [pedido, setPedido] = useState(initialPedido)
  
  if (!pedido && !initialError) {
    return (
      <Alert variant="warning">
        <strong>Cargando...</strong> Obteniendo información del pedido.
      </Alert>
    )
  }

  if (initialError && !pedido) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {initialError}
      </Alert>
    )
  }
  
  const attrs = pedido.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (pedido as any)

  // Extraer datos del pedido
  const numeroPedido = getField(data, 'numero_pedido', 'numeroPedido', 'NUMERO_PEDIDO') || pedidoId
  const fechaPedido = getField(data, 'fecha_pedido', 'fechaPedido', 'FECHA_PEDIDO')
  const estado = getField(data, 'estado', 'ESTADO') || 'pendiente'
  const metodoPago = getField(data, 'metodo_pago', 'metodoPago', 'METODO_PAGO') || ''
  const metodoPagoTitulo = getField(data, 'metodo_pago_titulo', 'metodoPagoTitulo', 'METODO_PAGO_TITULO') || metodoPago || 'Efectivo'
  const notaCliente = getField(data, 'nota_cliente', 'notaCliente', 'NOTA_CLIENTE') || ''
  
  const billing = getField(data, 'billing', 'BILLING') || {}
  const shipping = getField(data, 'shipping', 'SHIPPING') || {}
  const items = getField(data, 'items', 'ITEMS') || []
  const cliente = getField(data, 'cliente', 'CLIENTE')
  
  // Obtener información del cliente
  let clienteNombre = ''
  let clienteEmail = ''
  let clienteId = ''
  
  if (billing && typeof billing === 'object') {
    clienteNombre = `${billing.first_name || ''} ${billing.last_name || ''}`.trim()
    clienteEmail = billing.email || ''
  } else if (cliente) {
    if (typeof cliente === 'object') {
      clienteNombre = cliente.nombre || cliente.name || cliente.razon_social || ''
      clienteEmail = cliente.email || ''
      clienteId = cliente.id || cliente.documentId || ''
    }
  }
  
  // Si no hay nombre, intentar desde rawWooData
  if (!clienteNombre) {
    const rawWooData = getField(data, 'rawWooData', 'rawWooData')
    if (rawWooData && rawWooData.billing) {
      clienteNombre = `${rawWooData.billing.first_name || ''} ${rawWooData.billing.last_name || ''}`.trim()
      clienteEmail = rawWooData.billing.email || ''
    }
  }

  // Inicializar formData con los valores del pedido
  const [formData, setFormData] = useState({
    fecha_pedido: fechaPedido ? new Date(fechaPedido).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    estado: estado,
  })

  // Obtener el ID correcto
  const pId = pedido.id?.toString() || pedido.documentId || pedidoId
  
  // Formatear fecha de pago
  const fechaPago = fechaPedido ? format(new Date(fechaPedido), "d 'de' MMMM, yyyy '@' h:mm a") : ''
  
  // Calcular totales
  const subtotal = getField(data, 'subtotal', 'SUBTOTAL') || 0
  const impuestos = getField(data, 'impuestos', 'IMPUESTOS') || 0
  const envio = getField(data, 'envio', 'ENVIO') || 0
  const descuento = getField(data, 'descuento', 'DESCUENTO') || 0
  const total = getField(data, 'total', 'TOTAL') || subtotal
  const moneda = getField(data, 'moneda', 'MONEDA') || 'CLP'

  const handleEstadoChange = async (nuevoEstado: string) => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const url = `/api/tienda/pedidos/${pId}`
      const body = JSON.stringify({
        data: {
          estado: nuevoEstado,
        },
      })
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el estado')
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar el estado')
      }

      setFormData((prev) => ({ ...prev, estado: nuevoEstado }))
      setSuccess(true)
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (err: any) {
      console.error('[PedidoDetails] Error al actualizar estado:', err)
      setError(err.message || 'Error al actualizar el estado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Row>
      <Col xs={12}>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            ¡Estado actualizado exitosamente!
          </Alert>
        )}

        {/* Header */}
        <Card className="mb-4">
          <CardHeader>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-1">Detalles de Pedido #{numeroPedido}</h4>
                <p className="text-muted mb-0">
                  Pago a través de {metodoPagoTitulo.toLowerCase()}. {fechaPago && `Pagado el ${fechaPago}`}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* General, Facturación, Envío */}
        <Row className="g-3 mb-4">
          {/* General */}
          <Col md={4}>
            <Card>
              <CardHeader>
                <h6 className="mb-0">General</h6>
              </CardHeader>
              <CardBody>
                <FormGroup className="mb-3">
                  <FormLabel className="fw-semibold">Fecha de creación</FormLabel>
                  <div className="d-flex align-items-center gap-2">
                    <FormControl
                      type="date"
                      value={formData.fecha_pedido ? new Date(formData.fecha_pedido).toISOString().split('T')[0] : ''}
                      disabled
                      size="sm"
                    />
                    {formData.fecha_pedido && (
                      <span className="text-muted">
                        @ {format(new Date(formData.fecha_pedido), 'HH:mm')}
                      </span>
                    )}
                  </div>
                </FormGroup>
                
                <FormGroup className="mb-3">
                  <FormLabel className="fw-semibold">Estado</FormLabel>
                  <FormControl
                    as="select"
                    value={formData.estado}
                    onChange={(e) => handleEstadoChange(e.target.value)}
                    disabled={loading}
                    size="sm"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="procesando">Procesando</option>
                    <option value="en_espera">En Espera</option>
                    <option value="completado">Completado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="reembolsado">Reembolsado</option>
                    <option value="fallido">Fallido</option>
                  </FormControl>
                </FormGroup>
                
                <FormGroup>
                  <FormLabel className="fw-semibold">Cliente</FormLabel>
                  <div className="mb-2">
                    <FormControl
                      type="text"
                      value={clienteNombre ? `${clienteNombre}${clienteId ? ` (#${clienteId})` : ''}${clienteEmail ? ` - ${clienteEmail}` : ''}` : 'Sin cliente'}
                      disabled
                      size="sm"
                    />
                  </div>
                  {clienteId && (
                    <div className="d-flex gap-2">
                      <Link href={`/customers/${clienteId}`} className="text-decoration-none">
                        <small>Perfil →</small>
                      </Link>
                      <Link href={`/atributos/pedidos?cliente=${clienteId}`} className="text-decoration-none">
                        <small>Ver otros pedidos →</small>
                      </Link>
                    </div>
                  )}
                </FormGroup>
              </CardBody>
            </Card>
          </Col>

          {/* Facturación */}
          <Col md={4}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Facturación</h6>
                <Button variant="link" size="sm" className="p-0">
                  <TbEdit className="fs-sm" />
                </Button>
              </CardHeader>
              <CardBody>
                {billing && typeof billing === 'object' ? (
                  <>
                    <div className="mb-2">
                      <strong>Name:</strong> {clienteNombre || 'N/A'}
                    </div>
                    <div className="mb-2">
                      <strong>Address:</strong> {billing.address_1 || ''}
                      {billing.address_2 && <>, {billing.address_2}</>}
                    </div>
                    <div className="mb-2">
                      {billing.city && <>{billing.city}, </>}
                      {billing.state && <>{billing.state}, </>}
                      {billing.postcode && <>{billing.postcode}</>}
                    </div>
                    {billing.email && (
                      <div className="mb-2">
                        <strong>Correo electrónico:</strong>{' '}
                        <a href={`mailto:${billing.email}`} className="text-decoration-none">
                          {billing.email}
                        </a>
                      </div>
                    )}
                    {billing.phone && (
                      <div>
                        <strong>Teléfono:</strong>{' '}
                        <a href={`tel:${billing.phone}`} className="text-decoration-none">
                          {billing.phone}
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-muted">Sin información de facturación</span>
                )}
              </CardBody>
            </Card>
          </Col>

          {/* Envío */}
          <Col md={4}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Envío</h6>
                <Button variant="link" size="sm" className="p-0">
                  <TbEdit className="fs-sm" />
                </Button>
              </CardHeader>
              <CardBody>
                {shipping && typeof shipping === 'object' ? (
                  <>
                    <div className="mb-2">
                      <strong>Name:</strong> {shipping.first_name || ''} {shipping.last_name || ''}
                    </div>
                    <div className="mb-2">
                      <strong>Address:</strong> {shipping.address_1 || ''}
                      {shipping.address_2 && <>, {shipping.address_2}</>}
                    </div>
                    <div className="mb-2">
                      {shipping.city && <>{shipping.city}, </>}
                      {shipping.state && <>{shipping.state}, </>}
                      {shipping.postcode && <>{shipping.postcode}</>}
                    </div>
                  </>
                ) : (
                  <span className="text-muted">Sin información de envío</span>
                )}
                {notaCliente && (
                  <div className="mt-3 pt-3 border-top">
                    <strong>Nota ofrecida por el cliente:</strong>
                    <div className="text-muted small">{notaCliente}</div>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Artículos */}
        <Card className="mb-4">
          <CardHeader>
            <h6 className="mb-0">Artículo</h6>
          </CardHeader>
          <CardBody>
            {items && items.length > 0 ? (
              <Table responsive>
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            <span className="text-muted">📦</span>
                          </div>
                          <div>
                            <div className="fw-semibold">
                              <Link href={`/products/${item.producto_id || item.libro_id || '#'}`} className="text-decoration-none">
                                {item.nombre || 'Producto'}
                              </Link>
                            </div>
                            {item.sku && <small className="text-muted">SKU: {item.sku}</small>}
                          </div>
                        </div>
                      </td>
                      <td>${(item.precio_unitario || 0).toLocaleString()}</td>
                      <td>x {item.cantidad || 1}</td>
                      <td className="fw-semibold">${(item.total || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <span className="text-muted">No hay artículos en este pedido</span>
            )}
          </CardBody>
        </Card>

        {/* Resumen */}
        <Card>
          <CardBody>
            <Row>
              <Col md={6}>
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal de artículos:</span>
                  <strong>${subtotal.toLocaleString()} {moneda}</strong>
                </div>
                {impuestos > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span>Impuestos:</span>
                    <strong>${impuestos.toLocaleString()} {moneda}</strong>
                  </div>
                )}
                {envio > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span>Envío:</span>
                    <strong>${envio.toLocaleString()} {moneda}</strong>
                  </div>
                )}
                {descuento > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span>Descuento:</span>
                    <strong>-${descuento.toLocaleString()} {moneda}</strong>
                  </div>
                )}
                <hr />
                <div className="d-flex justify-content-between">
                  <strong>Total del pedido:</strong>
                  <strong className="fs-5">${total.toLocaleString()} {moneda}</strong>
                </div>
              </Col>
              <Col md={6}>
                <div className="mb-2">
                  <strong>Pagado:</strong> ${total.toLocaleString()} {moneda}
                </div>
                <div>
                  <strong>Payment Method/Date:</strong>{' '}
                  {fechaPago && `${format(new Date(fechaPedido), "d 'de' MMMM, yyyy")} a través de ${metodoPagoTitulo}`}
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default PedidoDetails
