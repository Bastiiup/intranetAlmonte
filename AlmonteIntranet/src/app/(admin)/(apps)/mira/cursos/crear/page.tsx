import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import CrearCursoForm from './components/CrearCursoForm'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Crear Curso - MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Crear Curso" subtitle="MIRA" />
      <CrearCursoForm />
    </Container>
  )
}

