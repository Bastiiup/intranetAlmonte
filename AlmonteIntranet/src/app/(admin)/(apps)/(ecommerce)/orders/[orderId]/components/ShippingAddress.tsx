import { Alert, Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'

interface ShippingAddressProps {
  pedido: any
}

const ShippingAddress = ({ pedido }: ShippingAddressProps) => {
  if (!pedido || !pedido.shipping) {
    return null
  }

  const shipping = pedido.shipping
  const name = `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() || 'Sin nombre'
  const address1 = shipping.address_1 || ''
  const address2 = shipping.address_2 || ''
  const city = shipping.city || ''
  const state = shipping.state || ''
  const postcode = shipping.postcode || ''
  const country = shipping.country || 'CL'
  
  // Construir dirección completa para el mapa
  const fullAddress = [address1, address2, city, state, postcode, country].filter(Boolean).join(', ')
  const mapQuery = encodeURIComponent(fullAddress || 'Chile')

  // Construir líneas de dirección
  const addressLines = [
    address1,
    address2,
    city && state ? `${city}, ${state} ${postcode}` : city || state || postcode,
    country,
  ].filter(Boolean)

  // Nota del cliente
  const customerNote = pedido.customer_note

  return (
    <Card>
      <CardHeader className="justify-content-between border-dashed">
        <CardTitle as="h4">Dirección de Envío</CardTitle>
      </CardHeader>
      <CardBody>
        {fullAddress && (
          <iframe
            src={`https://www.google.com/maps/embed/v1/place?q=${mapQuery}&key=AIzaSyBSFRN6WWGYwmFi498qXXsD2UwkbmD74v4`}
            style={{ width: '100%', height: 180, overflow: 'hidden', border: 0 }}
            title="Mapa de dirección de envío"
          />
        )}
        <div className="d-flex align-items-start my-3">
          <div className="flex-grow-1">
            <h5 className="mb-2">{name}</h5>
            {shipping.company && (
              <p className="text-muted mb-1 fs-xs">
                <strong>Empresa:</strong> {shipping.company}
              </p>
            )}
            {addressLines.length > 0 ? (
              <p className="text-muted mb-1">
                {addressLines.map((line, idx) => (
                  <span key={idx}>
                    {line}
                    {idx < addressLines.length - 1 && <br />}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-muted mb-1">Sin dirección de envío</p>
            )}
            {pedido.billing && (
              <p className="mb-0 text-muted">
                {pedido.billing.phone && (
                  <>
                    <strong>Teléfono:</strong> {pedido.billing.phone}
                    <br />
                  </>
                )}
                {pedido.billing.email && (
                  <>
                    <strong>Email:</strong> {pedido.billing.email}
                  </>
                )}
              </p>
            )}
          </div>
          <div className="ms-auto">
            <span className="badge bg-success-subtle text-success">Dirección Principal</span>
          </div>
        </div>
        {customerNote && (
          <Alert variant="warning" className="mb-0">
            <h6 className="mb-2">Instrucciones de Entrega:</h6>
            <p className="fst-italic mb-0">{customerNote}</p>
          </Alert>
        )}
      </CardBody>
    </Card>
  )
}

export default ShippingAddress
