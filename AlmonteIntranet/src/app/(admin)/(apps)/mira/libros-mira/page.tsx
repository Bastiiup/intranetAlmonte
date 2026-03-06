import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import LibrosMiraListing from './components/LibrosMiraListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Asignar Libros a MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Asignar Libros a MIRA" subtitle="MIRA" />
      <LibrosMiraListing />
    </Container>
  )
}

