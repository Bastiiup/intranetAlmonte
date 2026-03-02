import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import CrearColegioForm from './components/CrearColegioForm'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Crear Colegio - MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Crear Colegio" subtitle="MIRA" />
      <CrearColegioForm />
    </Container>
  )
}
