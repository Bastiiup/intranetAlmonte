import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import AsignacionesListing from './components/AsignacionesListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Asignación de Docentes - MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Asignación de Docentes" subtitle="MIRA" />
      <AsignacionesListing />
    </Container>
  )
}

