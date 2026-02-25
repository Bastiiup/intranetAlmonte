import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import GeneradorQRClient from './components/GeneradorQRClient'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Generador QR MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Generador QR" subtitle="MIRA" />
      <GeneradorQRClient />
    </Container>
  )
}
