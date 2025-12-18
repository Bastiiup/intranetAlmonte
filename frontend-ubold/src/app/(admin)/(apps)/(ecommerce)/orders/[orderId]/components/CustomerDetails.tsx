import { Button, Card, CardBody, CardHeader, CardTitle, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { TbBan, TbDotsVertical, TbEdit, TbMail, TbMapPin, TbPencil, TbPhone, TbShare, TbTrash } from 'react-icons/tb'

import Image from 'next/image'
import Link from 'next/link'

import gbFlag from '@/assets/images/flags/gb.svg'
import user5 from '@/assets/images/users/user-5.jpg'

interface CustomerDetailsProps {
  pedido: any
}

const CustomerDetails = ({ pedido }: CustomerDetailsProps) => {
  if (!pedido || !pedido.billing) {
    return null
  }

  const billing = pedido.billing
  const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Cliente sin nombre'
  const email = billing.email || 'Sin email'
  const phone = billing.phone || 'Sin teléfono'
  const city = billing.city || ''
  const country = billing.country || 'CL'
  
  // Mapear país a flag (simplificado, usar CL por defecto)
  const countryFlag = gbFlag // Por ahora usar flag genérico

  return (
    <Card>
      <CardHeader className="justify-content-between border-dashed">
        <CardTitle as="h4">Detalles del Cliente</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="d-flex align-items-center mb-4">
          <div className="me-2">
            <Image src={user5} width={44} height={44} alt="avatar" className="rounded-circle avatar-lg" />
          </div>
          <div>
            <h5 className="mb-1 d-flex align-items-center">
              <Link href={pedido.customer_id ? `/customers` : '#'} className="link-reset">
                {customerName}
              </Link>
              <Image src={countryFlag} alt={country} width={16} height={16} className="ms-2 rounded-circle" />
            </h5>
            {pedido.customer_id && (
              <p className="text-muted mb-0">ID: {pedido.customer_id}</p>
            )}
          </div>
          <div className="ms-auto">
            <Dropdown align="end">
              <DropdownToggle variant="link" className="btn-icon btn-ghost-light text-muted drop-arrow-none">
                <TbDotsVertical className="fs-xl" />
              </DropdownToggle>

              <DropdownMenu>
                <DropdownItem>
                  <TbShare className="me-2" />
                  Compartir
                </DropdownItem>
                <DropdownItem>
                  <TbEdit className="me-2" />
                  Editar
                </DropdownItem>
                <DropdownItem>
                  <TbBan className="me-2" />
                  Bloquear
                </DropdownItem>
                <DropdownItem className="text-danger">
                  <TbTrash className="me-2" />
                  Eliminar
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
        <ul className="list-unstyled text-muted mb-0">
          <li className="mb-2">
            <div className="d-flex align-items-center gap-2">
              <div className="avatar-xs avatar-img-size fs-24">
                <span className="avatar-title text-bg-light fs-sm rounded-circle">
                  <TbMail />
                </span>
              </div>
              <h5 className="fs-base mb-0 fw-medium">
                <Link href={`mailto:${email}`} className="link-reset">
                  {email}
                </Link>
              </h5>
            </div>
          </li>
          <li className="mb-2">
            <div className="d-flex align-items-center gap-2">
              <div className="avatar-xs avatar-img-size fs-24">
                <span className="avatar-title text-bg-light fs-sm rounded-circle">
                  <TbPhone />
                </span>
              </div>
              <h5 className="fs-base mb-0 fw-medium">
                <Link href={`tel:${phone}`} className="link-reset">
                  {phone}
                </Link>
              </h5>
            </div>
          </li>
          <li>
            <div className="d-flex align-items-center gap-2">
              <div className="avatar-xs avatar-img-size fs-24">
                <span className="avatar-title text-bg-light fs-sm rounded-circle">
                  <TbMapPin />
                </span>
              </div>
              <h5 className="fs-base mb-0 fw-medium">
                {city ? `${city}, ${country}` : country}
              </h5>
            </div>
          </li>
        </ul>
      </CardBody>
    </Card>
  )
}

export default CustomerDetails
