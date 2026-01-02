import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'

import mastercard from '@/assets/images/cards/mastercard.svg'
import Image from 'next/image'

interface BillingDetailsProps {
  pedido: any
}

const BillingDetails = ({ pedido }: BillingDetailsProps) => {
  if (!pedido || !pedido.billing) {
    return null
  }

  const billing = pedido.billing
  const name = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Sin nombre'
  const address1 = billing.address_1 || ''
  const address2 = billing.address_2 || ''
  const city = billing.city || ''
  const state = billing.state || ''
  const postcode = billing.postcode || ''
  const country = billing.country || 'CL'
  
  // Método de pago
  const paymentMethod = pedido.payment_method_title || pedido.payment_method || 'No especificado'
  const isPaid = !!pedido.date_paid

  // Construir dirección completa
  const addressLines = [
    address1,
    address2,
    city && state ? `${city}, ${state} ${postcode}` : city || state || postcode,
    country,
  ].filter(Boolean)

  return (
    <Card>
      <CardHeader className="justify-content-between border-dashed">
        <CardTitle as="h4">Datos de Facturación</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="d-flex align-items-start mb-0">
          <div className="flex-grow-1">
            <h5 className="mb-2">{name}</h5>
            {billing.company && (
              <p className="text-muted mb-1 fs-xs">
                <strong>Empresa:</strong> {billing.company}
              </p>
            )}
            <p className="text-muted mb-0">
              {addressLines.length > 0 ? (
                addressLines.map((line, idx) => (
                  <span key={idx}>
                    {line}
                    {idx < addressLines.length - 1 && <br />}
                  </span>
                ))
              ) : (
                'Sin dirección'
              )}
            </p>
          </div>
          <div className="ms-auto">
            <span className="badge bg-primary-subtle text-primary">Dirección de Facturación</span>
          </div>
        </div>
        <hr />
        <div className="d-flex align-items-center">
          <div className="avatar-sm me-2">
            <Image src={mastercard} alt={paymentMethod} height={32} width={32} className="img-fluid rounded" />
          </div>
          <div>
            <h5 className="fs-xs mb-1">{paymentMethod}</h5>
            {pedido.transaction_id && (
              <p className="text-muted mb-0 fs-xs">ID: {pedido.transaction_id}</p>
            )}
          </div>
          <div className="ms-auto">
            <span className={`badge bg-${isPaid ? 'success' : 'warning'}-subtle text-${isPaid ? 'success' : 'warning'}`}>
              {isPaid ? 'Pagado' : 'Pendiente'}
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default BillingDetails
