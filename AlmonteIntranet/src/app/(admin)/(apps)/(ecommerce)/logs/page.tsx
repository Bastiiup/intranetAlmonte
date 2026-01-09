import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import LogsList from './components/LogsList'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Logs de Actividades',
}

export default async function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Logs de Actividades" subtitle="Ecommerce" />

      <LogsList />
    </Container>
  )
}

