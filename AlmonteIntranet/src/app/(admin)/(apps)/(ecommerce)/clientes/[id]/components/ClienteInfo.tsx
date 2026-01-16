'use client'

import { Card, CardBody, CardHeader, Row, Col } from 'react-bootstrap'
import { LuUser, LuMail, LuPhone, LuMapPin } from 'react-icons/lu'

interface ClienteInfoProps {
  cliente: any
}

const ClienteInfo = ({ cliente }: ClienteInfoProps) => {
  const clienteNombre = `${cliente.first_name || ''} ${cliente.last_name || ''}`.trim() || cliente.email || 'Sin nombre'
  const clienteEmail = cliente.email || cliente.billing?.email || 'N/A'
  const clienteTelefono = cliente.billing?.phone || cliente.phone || 'N/A'
  const clienteDireccion = cliente.billing
    ? `${cliente.billing.address_1 || ''} ${cliente.billing.address_2 || ''}`.trim() || 'N/A'
    : 'N/A'
  const clienteCiudad = cliente.billing?.city || 'N/A'
  const clienteRegion = cliente.billing?.state || 'N/A'
  const clientePais = cliente.billing?.country || 'CL'

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Información del Cliente</h5>
      </CardHeader>
      <CardBody>
        <Row>
          <Col md={6} className="mb-3">
            <div className="d-flex align-items-center gap-3">
              <div className="avatar-md bg-light d-flex align-items-center justify-content-center rounded">
                <LuUser className="text-muted fs-lg" />
              </div>
              <div>
                <h6 className="mb-0">Nombre</h6>
                <p className="text-muted mb-0">{clienteNombre}</p>
              </div>
            </div>
          </Col>
          <Col md={6} className="mb-3">
            <div className="d-flex align-items-center gap-3">
              <div className="avatar-md bg-light d-flex align-items-center justify-content-center rounded">
                <LuMail className="text-muted fs-lg" />
              </div>
              <div>
                <h6 className="mb-0">Email</h6>
                <p className="text-muted mb-0">
                  <a href={`mailto:${clienteEmail}`} className="text-reset">
                    {clienteEmail}
                  </a>
                </p>
              </div>
            </div>
          </Col>
          <Col md={6} className="mb-3">
            <div className="d-flex align-items-center gap-3">
              <div className="avatar-md bg-light d-flex align-items-center justify-content-center rounded">
                <LuPhone className="text-muted fs-lg" />
              </div>
              <div>
                <h6 className="mb-0">Teléfono</h6>
                <p className="text-muted mb-0">
                  {clienteTelefono !== 'N/A' ? (
                    <a href={`tel:${clienteTelefono}`} className="text-reset">
                      {clienteTelefono}
                    </a>
                  ) : (
                    clienteTelefono
                  )}
                </p>
              </div>
            </div>
          </Col>
          <Col md={6} className="mb-3">
            <div className="d-flex align-items-center gap-3">
              <div className="avatar-md bg-light d-flex align-items-center justify-content-center rounded">
                <LuMapPin className="text-muted fs-lg" />
              </div>
              <div>
                <h6 className="mb-0">Dirección</h6>
                <p className="text-muted mb-0">
                  {clienteDireccion}
                  {clienteCiudad !== 'N/A' && `, ${clienteCiudad}`}
                  {clienteRegion !== 'N/A' && `, ${clienteRegion}`}
                  {`, ${clientePais}`}
                </p>
              </div>
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}

export default ClienteInfo

