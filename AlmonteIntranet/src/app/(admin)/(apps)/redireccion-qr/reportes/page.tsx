import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import ReportesQRClient from './components/ReportesQRClient'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Reportes · Redirección QR',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Reportes" subtitle="Redirección QR" />
      <ReportesQRClient />
    </Container>
  )
}
