import { shippingTimeline } from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/data'
import Link from 'next/link'
import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'
import { format } from 'date-fns'

interface ShippingActivityProps {
  pedido: any
}

const ShippingActivity = ({ pedido }: ShippingActivityProps) => {
  if (!pedido) {
    return null
  }

  // Generar timeline basado en el estado del pedido
  const generateTimeline = () => {
    const timeline: Array<{ time: string | null; title: string; description: string; trackingNo: string; by: string; variant: string }> = []
    
    const dateCreated = pedido.date_created ? new Date(pedido.date_created) : new Date()
    const datePaid = pedido.date_paid ? new Date(pedido.date_paid) : null
    const dateCompleted = pedido.date_completed ? new Date(pedido.date_completed) : null
    const status = pedido.status || 'pending'

    // Orden confirmado
    timeline.push({
      time: format(dateCreated, 'dd MMM, yyyy h:mm a'),
      title: 'Pedido Confirmado',
      description: 'El pedido fue creado y está siendo procesado.',
      trackingNo: pedido.number || pedido.id?.toString() || 'N/A',
      by: 'Sistema',
      variant: 'success',
    })

    // Si está pagado
    if (datePaid) {
      timeline.push({
        time: format(datePaid, 'dd MMM, yyyy h:mm a'),
        title: 'Pago Confirmado',
        description: 'El pago del pedido fue procesado exitosamente.',
        trackingNo: pedido.transaction_id || 'N/A',
        by: pedido.payment_method_title || 'Sistema de Pago',
        variant: 'success',
      })
    }

    // Estados según el status
    if (status === 'processing' || status === 'on-hold') {
      timeline.push({
        time: null,
        title: 'En Procesamiento',
        description: 'El pedido está siendo preparado para el envío.',
        trackingNo: pedido.number || pedido.id?.toString() || 'N/A',
        by: 'Almacén',
        variant: 'info',
      })
    }

    if (status === 'shipped' || status === 'completed') {
      timeline.push({
        time: null,
        title: 'Enviado',
        description: 'El pedido ha sido enviado y está en tránsito.',
        trackingNo: pedido.number || pedido.id?.toString() || 'N/A',
        by: 'Transportista',
        variant: 'success',
      })
    }

    if (status === 'completed' && dateCompleted) {
      timeline.push({
        time: format(dateCompleted, 'dd MMM, yyyy h:mm a'),
        title: 'Completado',
        description: 'El pedido fue entregado exitosamente.',
        trackingNo: pedido.number || pedido.id?.toString() || 'N/A',
        by: 'Sistema',
        variant: 'success',
      })
    }

    if (status === 'cancelled') {
      timeline.push({
        time: null,
        title: 'Cancelado',
        description: 'El pedido fue cancelado.',
        trackingNo: pedido.number || pedido.id?.toString() || 'N/A',
        by: 'Sistema',
        variant: 'danger',
      })
    }

    if (status === 'refunded') {
      timeline.push({
        time: null,
        title: 'Reembolsado',
        description: 'El pedido fue reembolsado.',
        trackingNo: pedido.number || pedido.id?.toString() || 'N/A',
        by: 'Sistema',
        variant: 'danger',
      })
    }

    // Si no hay eventos, usar timeline por defecto
    if (timeline.length === 0) {
      return shippingTimeline
    }

    return timeline
  }

  const timeline = generateTimeline()

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h4">Actividad de Envío</CardTitle>
      </CardHeader>
      <CardBody className="p-4">
        <div className="timeline">
          {timeline.map((item, idx) => (
            <div key={idx} className="timeline-item d-flex align-items-stretch">
              <div className="timeline-time pe-3 text-muted">{item.time ?? ''}</div>
              <div className={`timeline-dot bg-${item.variant}`} />
              <div className={`timeline-content ps-3 ${idx != timeline.length - 1 ? 'pb-5' : ''}`}>
                <h5 className="mb-1">{item.title}</h5>
                <p className="mb-1 text-muted">{item.description}</p>
                <p className="mb-1 text-muted fs-xxs">
                  Número de Seguimiento:{' '}
                  <Link href="#" className="link-primary fw-semibold text-decoration-underline">
                    {item.trackingNo}
                  </Link>
                </p>
                <span className="fw-semibold fs-xxs">Por {item.by}</span>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

export default ShippingActivity
