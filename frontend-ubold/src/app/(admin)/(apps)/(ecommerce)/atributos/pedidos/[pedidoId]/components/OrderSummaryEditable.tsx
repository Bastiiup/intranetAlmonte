'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import product1 from '@/assets/images/products/1.png'
import { currency } from '@/helpers'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardBody, CardHeader, Table, Alert, FormControl, Button } from 'react-bootstrap'
import { TbCalendar, TbPointFilled, TbTruck, TbEdit } from 'react-icons/tb'
import { LuSave } from 'react-icons/lu'
import { format } from 'date-fns'

// Función para traducir estados al español
const translatePaymentStatus = (datePaid: string | null): { text: string; variant: string } => {
  if (datePaid) {
    return { text: 'Pagado', variant: 'success' }
  }
  return { text: 'Pendiente', variant: 'warning' }
}

const translateOrderStatus = (status: string): { text: string; variant: string } => {
  const statusMap: Record<string, { text: string; variant: string }> = {
    completed: { text: 'Completado', variant: 'success' },
    processing: { text: 'Procesando', variant: 'info' },
    'on-hold': { text: 'En Espera', variant: 'warning' },
    cancelled: { text: 'Cancelado', variant: 'danger' },
    refunded: { text: 'Reembolsado', variant: 'danger' },
    failed: { text: 'Fallido', variant: 'danger' },
    pending: { text: 'Pendiente', variant: 'warning' },
  }
  return statusMap[status] || { text: status, variant: 'secondary' }
}

// Función para mapear estado de inglés (Strapi) a español (frontend)
const mapEstadoFromStrapi = (strapiStatus: string): string => {
  const mapping: Record<string, string> = {
    'pending': 'pendiente',
    'processing': 'procesando',
    'on-hold': 'en_espera',
    'completed': 'completado',
    'cancelled': 'cancelado',
    'refunded': 'reembolsado',
    'failed': 'fallido',
    'auto-draft': 'pendiente',
    'checkout-draft': 'pendiente',
  }
  
  const statusLower = strapiStatus.toLowerCase().trim()
  return mapping[statusLower] || strapiStatus
}

// Función para mapear estado de español (frontend) a inglés (Strapi)
const mapEstadoToStrapi = (frontendStatus: string): string => {
  const mapping: Record<string, string> = {
    'pendiente': 'pending',
    'procesando': 'processing',
    'en_espera': 'on-hold',
    'completado': 'completed',
    'cancelado': 'cancelled',
    'reembolsado': 'refunded',
    'fallido': 'failed',
  }
  
  const statusLower = frontendStatus.toLowerCase().trim()
  return mapping[statusLower] || frontendStatus
}

interface OrderSummaryEditableProps {
  pedido: any
  pedidoId: string
}

const OrderSummaryEditable = ({ pedido, pedidoId }: OrderSummaryEditableProps) => {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  if (!pedido) {
    return null
  }

  // Parsear fecha
  const dateCreated = pedido.date_created ? new Date(pedido.date_created) : new Date()
  const date = format(dateCreated, 'dd MMM, yyyy')
  const time = format(dateCreated, 'h:mm a')

  // Estados
  const paymentStatus = translatePaymentStatus(pedido.date_paid)
  const orderStatus = translateOrderStatus(pedido.status || 'pending')
  
  // Mapear estado actual de inglés a español para el select
  const estadoActual = mapEstadoFromStrapi(pedido.status || 'pending')
  const [selectedEstado, setSelectedEstado] = useState(estadoActual)

  // Calcular totales
  const subtotal = parseFloat(pedido.total || '0') - parseFloat(pedido.total_tax || '0') - parseFloat(pedido.shipping_total || '0') + parseFloat(pedido.discount_total || '0')
  const tax = parseFloat(pedido.total_tax || '0')
  const discount = parseFloat(pedido.discount_total || '0')
  const shipping = parseFloat(pedido.shipping_total || '0')
  const grandTotal = parseFloat(pedido.total || '0')

  // Obtener items del pedido
  const lineItems = pedido.line_items || []

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Mapear estado de español a inglés antes de enviar
      const estadoParaEnviar = mapEstadoToStrapi(selectedEstado)
      
      const response = await fetch(`/api/tienda/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            estado: estadoParaEnviar,
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el estado')
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar el estado')
      }

      setSuccess(true)
      setIsEditing(false)
      
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err: any) {
      console.error('[OrderSummaryEditable] Error al actualizar estado:', err)
      setError(err.message || 'Error al actualizar el estado')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedEstado(estadoActual)
    setIsEditing(false)
    setError(null)
    setSuccess(false)
  }

  return (
    <div>
      {/* Mostrar alertas de éxito/error */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-3">
          ¡Estado actualizado exitosamente! Recargando...
        </Alert>
      )}

      <Card>
        <CardHeader className="align-items-start p-4">
          <div>
            <h3 className="mb-1 d-flex fs-xl align-items-center">Pedido #{pedido.number || pedido.id}</h3>
            <p className="text-muted mb-3">
              <TbCalendar /> {date} <small className="text-muted">{time}</small>
            </p>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className={`badge badge-soft-${paymentStatus.variant} fs-xxs badge-label`}>
                <TbPointFilled className="align-middle fs-sm" /> {paymentStatus.text}
              </span>
              {!isEditing ? (
                <div className="d-flex align-items-center gap-1">
                  <span className={`badge badge-soft-${orderStatus.variant} fs-xxs badge-label`}>
                    <TbTruck className="align-middle fs-sm" /> {orderStatus.text}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link p-0 ms-1"
                    onClick={() => setIsEditing(true)}
                    title="Editar estado"
                    style={{ lineHeight: 1 }}
                  >
                    <TbEdit className="fs-sm text-muted" />
                  </button>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2">
                  <FormControl
                    as="select"
                    size="sm"
                    value={selectedEstado}
                    onChange={(e) => setSelectedEstado(e.target.value)}
                    disabled={loading}
                    style={{ minWidth: '150px', display: 'inline-block' }}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="procesando">Procesando</option>
                    <option value="en_espera">En Espera</option>
                    <option value="completado">Completado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="reembolsado">Reembolsado</option>
                    <option value="fallido">Fallido</option>
                  </FormControl>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={handleSave}
                    disabled={loading || selectedEstado === estadoActual}
                    title="Guardar"
                  >
                    <LuSave className="fs-sm" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCancel}
                    disabled={loading}
                    title="Cancelar"
                  >
                    ✕
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-4">
          <h4 className="fs-sm mb-3">Resumen del Pedido</h4>
          <Table responsive bordered className="table-custom table-nowrap align-middle mb-1">
            <thead className="bg-light align-middle bg-opacity-25 thead-sm">
              <tr className="text-uppercase fs-xxs">
                <th>Producto</th>
                <th>Precio</th>
                <th>Cantidad</th>
                <th className="text-end">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length > 0 ? (
                lineItems.map((item: any, index: number) => {
                  const itemPrice = parseFloat(item.price || '0')
                  const itemQuantity = item.quantity || 0
                  const itemTotal = parseFloat(item.total || '0')
                  
                  return (
                    <tr key={item.id || index}>
                      <td>
                        <div className="d-flex">
                          <div className="avatar-md me-3">
                            <Image 
                              src={product1} 
                              width={36} 
                              height={36} 
                              alt={item.name || 'Producto'} 
                              className="img-fluid rounded" 
                            />
                          </div>
                          <div>
                            <h5 className="mb-0">
                              <Link href={`/products/${item.product_id}`} className="link-reset">
                                {item.name || 'Producto sin nombre'}
                              </Link>
                            </h5>
                            {item.sku && (
                              <p className="text-muted mb-0 fs-xs">SKU: {item.sku}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{currency}{itemPrice.toFixed(2)}</td>
                      <td>{itemQuantity}</td>
                      <td className="text-end">{currency}{itemTotal.toFixed(2)}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    No hay productos en este pedido
                  </td>
                </tr>
              )}
              <tr className="border-top">
                <td colSpan={3} className="text-end fw-semibold">
                  Subtotal
                </td>
                <td className="text-end">{currency}{subtotal.toFixed(2)}</td>
              </tr>
              {tax > 0 && (
                <tr>
                  <td colSpan={3} className="text-end fw-semibold">
                    Impuestos
                  </td>
                  <td className="text-end">{currency}{tax.toFixed(2)}</td>
                </tr>
              )}
              {discount > 0 && (
                <tr>
                  <td colSpan={3} className="text-end fw-semibold">
                    Descuento
                  </td>
                  <td className="text-end text-danger fw-semibold">-{currency}{discount.toFixed(2)}</td>
                </tr>
              )}
              {shipping > 0 && (
                <tr>
                  <td colSpan={3} className="text-end fw-semibold">
                    Envío
                  </td>
                  <td className="text-end">{currency}{shipping.toFixed(2)}</td>
                </tr>
              )}
              <tr className="border-top">
                <td colSpan={3} className="text-end fw-bold text-uppercase">
                  Total
                </td>
                <td className="fw-bold text-end table-active">{currency}{grandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  )
}

export default OrderSummaryEditable

