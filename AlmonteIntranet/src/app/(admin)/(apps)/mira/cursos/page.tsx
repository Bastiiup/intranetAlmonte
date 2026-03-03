import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import CursosListing from './components/CursosListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gestión de Cursos - MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Gestión de Cursos" subtitle="MIRA" />
      <CursosListing />
    </Container>
  )
}

