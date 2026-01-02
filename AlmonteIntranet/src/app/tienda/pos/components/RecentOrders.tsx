'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Button, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap'
import { LuHistory, LuFileText, LuPrinter, LuExternalLink, LuX } from 'react-icons/lu'
import { formatCurrencyNumber } from '../utils/calculations'
import { printReceipt, type ReceiptData } from '../utils/receipt'

interface RecentOrder {
  id: number
  date_created: string
  status: string
  total: string
  billing?: {
    first_name: string
    last_name: string
    email: string
  }
  meta_data?: Array<{
    key: string
    value: string
  }>
}

interface RecentOrdersProps {
  show: boolean
  onClose: () => void
  limit?: number
}

export default function RecentOrders({ show, onClose, limit = 10 }: RecentOrdersProps) {
  const [orders, setOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (show) {
      loadRecentOrders()
    }
  }, [show])

  const loadRecentOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/woocommerce/orders?per_page=${limit}&orderby=date&order=desc`)
      const data = await response.json()

      if (data.success) {
        setOrders(data.data || [])
      } else {
        setError(data.error || 'Error al cargar pedidos')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
    } finally {
      setLoading(false)
    }
  }

  const getInvoiceUrl = (order: RecentOrder): string | null => {
    const pdfMeta = order.meta_data?.find((m: any) => 
      m.key === '_openfactura_pdf_url' || 
      m.key === '_haulmer_pdf_url' ||
      m.key === '_openfactura_pdf_original_url' ||
      m.key === '_haulmer_pdf_original_url'
    )
    return pdfMeta?.value || null
  }

  const getInvoiceFolio = (order: RecentOrder): string | null => {
    const folioMeta = order.meta_data?.find((m: any) => 
      m.key === '_openfactura_folio' || 
      m.key === '_haulmer_folio'
    )
    return folioMeta?.value || null
  }

  const handleRePrint = async (order: RecentOrder) => {
    try {
      // Cargar detalles completos del pedido para el ticket
      const response = await fetch(`/api/woocommerce/orders/${order.id}`)
      const data = await response.json()

      if (data.success && data.data) {
        const orderData = data.data
        const receiptData: ReceiptData = {
          orderId: orderData.id,
          date: orderData.date_created,
          items: orderData.line_items?.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price || 0),
            total: parseFloat(item.total || 0),
          })) || [],
          subtotal: parseFloat(orderData.subtotal || 0),
          discount: parseFloat(orderData.discount_total || 0),
          tax: parseFloat(orderData.total_tax || 0),
          total: parseFloat(orderData.total || 0),
          payment: {
            method: orderData.payment_method || 'unknown',
            amount: parseFloat(orderData.total || 0),
            change: 0,
          },
          customer: orderData.billing ? {
            name: `${orderData.billing.first_name} ${orderData.billing.last_name}`,
            email: orderData.billing.email,
          } : undefined,
        }

        printReceipt(receiptData)
      }
    } catch (err: any) {
      console.error('Error al reimprimir ticket:', err)
    }
  }

  if (!show) return null

  return (
    <Card className="position-fixed top-0 end-0 m-3" style={{ width: '400px', maxHeight: '80vh', zIndex: 1050 }}>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <CardTitle className="mb-0">
          <LuHistory className="me-2" />
          Pedidos Recientes
        </CardTitle>
        <Button variant="link" size="sm" onClick={onClose} className="p-0">
          <LuX size={20} />
        </Button>
      </CardHeader>
      <CardBody style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Cargando pedidos...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">
            {error}
          </Alert>
        ) : orders.length === 0 ? (
          <Alert variant="info">
            No hay pedidos recientes
          </Alert>
        ) : (
          <ListGroup variant="flush">
            {orders.map((order) => {
              const invoiceUrl = getInvoiceUrl(order)
              const invoiceFolio = getInvoiceFolio(order)
              const customerName = order.billing 
                ? `${order.billing.first_name} ${order.billing.last_name}`.trim()
                : 'Cliente no registrado'

              return (
                <ListGroup.Item key={order.id} className="px-0">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="fw-bold">
                        Pedido #{order.id}
                      </div>
                      <small className="text-muted">
                        {new Date(order.date_created).toLocaleString('es-CL')}
                      </small>
                      <div className="small text-muted mt-1">
                        {customerName}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold text-primary">
                        ${formatCurrencyNumber(parseFloat(order.total))}
                      </div>
                      <Badge bg={
                        order.status === 'completed' ? 'success' :
                        order.status === 'processing' ? 'primary' :
                        order.status === 'pending' ? 'warning' :
                        'secondary'
                      } className="mt-1">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {invoiceFolio && (
                    <div className="mb-2">
                      <Badge bg="info">
                        Factura: {invoiceFolio}
                      </Badge>
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleRePrint(order)}
                      title="Reimprimir ticket"
                    >
                      <LuPrinter className="me-1" />
                      Ticket
                    </Button>
                    {invoiceUrl && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => window.open(`/tienda/facturas/${order.id}`, '_blank')}
                        title="Ver factura"
                      >
                        <LuFileText className="me-1" />
                        Factura
                      </Button>
                    )}
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => window.open(`/tienda/pedidos/${order.id}`, '_blank')}
                      title="Ver detalles del pedido"
                    >
                      <LuExternalLink className="me-1" />
                      Ver
                    </Button>
                  </div>
                </ListGroup.Item>
              )
            })}
          </ListGroup>
        )}
      </CardBody>
    </Card>
  )
}
