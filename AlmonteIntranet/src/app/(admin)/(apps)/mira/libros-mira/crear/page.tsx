import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import CrearLibroMiraForm from '../components/CrearLibroMiraForm'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Asignar Libro a MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Asignar Libro a MIRA" subtitle="MIRA" />
      <CrearLibroMiraForm />
    </Container>
  )
}

