import product1 from '@/assets/images/products/1.png'
import { currency } from '@/helpers'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardBody, CardHeader, Table } from 'react-bootstrap'
import { TbCalendar, TbPointFilled, TbTruck } from 'react-icons/tb'
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

interface OrderSummaryProps {
  pedido: any
}

const OrderSummary = ({ pedido }: OrderSummaryProps) => {
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

  // Calcular totales
  const subtotal = parseFloat(pedido.total || '0') - parseFloat(pedido.total_tax || '0') - parseFloat(pedido.shipping_total || '0') + parseFloat(pedido.discount_total || '0')
  const tax = parseFloat(pedido.total_tax || '0')
  const discount = parseFloat(pedido.discount_total || '0')
  const shipping = parseFloat(pedido.shipping_total || '0')
  const grandTotal = parseFloat(pedido.total || '0')

  // Obtener items del pedido
  const lineItems = pedido.line_items || []

  return (
    <Card>
      <CardHeader className="align-items-start p-4">
        <div>
          <h3 className="mb-1 d-flex fs-xl align-items-center">Pedido #{pedido.number || pedido.id}</h3>
          <p className="text-muted mb-3">
            <TbCalendar /> {date} <small className="text-muted">{time}</small>
          </p>
          <span className={`badge badge-soft-${paymentStatus.variant} fs-xxs badge-label me-1`}>
            <TbPointFilled className="align-middle fs-sm" /> {paymentStatus.text}
          </span>
          <span className={`badge badge-soft-${orderStatus.variant} fs-xxs badge-label`}>
            <TbTruck className="align-middle fs-sm" /> {orderStatus.text}
          </span>
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
  )
}

export default OrderSummary
