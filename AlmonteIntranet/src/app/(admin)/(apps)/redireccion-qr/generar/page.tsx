import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import GenerarQRClient from './components/GenerarQRClient'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Generar QR · Redirección QR',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Generar QR" subtitle="Redirección QR" />
      <GenerarQRClient />
    </Container>
  )
}
