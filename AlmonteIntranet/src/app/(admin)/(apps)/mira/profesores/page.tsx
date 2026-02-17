import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import ProfesoresListing from './components/ProfesoresListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gestión de Profesores - MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Gestión de Profesores" subtitle="MIRA" />
      <ProfesoresListing />
    </Container>
  )
}
