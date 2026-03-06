import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import CrearAsignacionForm from './components/CrearAsignacionForm'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nueva Asignación de Docente - MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Nueva Asignación de Docente" subtitle="MIRA" />
      <CrearAsignacionForm />
    </Container>
  )
}

