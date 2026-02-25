import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import DashboardQRClient from './components/DashboardQRClient'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard · Redirección QR',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Dashboard" subtitle="Redirección QR" />
      <DashboardQRClient />
    </Container>
  )
}
