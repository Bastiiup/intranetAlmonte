import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Solicitudes de Autores',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title= Solicitudes de Autores subtitle=Ecommerce />
      <p className='mt-3'>Vista de solicitudes de autores en construcciÃ³n.</p>
    </Container>
  )
}
