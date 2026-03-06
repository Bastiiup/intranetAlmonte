import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import ColegiosListing from './components/ColegiosListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gestión de Establecimientos - MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Gestión de Establecimientos" subtitle="MIRA" />
      <ColegiosListing />
    </Container>
  )
}
