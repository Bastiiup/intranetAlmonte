import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import LogsViewer from './components/LogsViewer'

export const metadata: Metadata = {
  title: 'Logs de Importación - Colegios',
}

export const dynamic = 'force-dynamic'

export default async function LogsPage() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Logs de Importación" subtitle="Colegios" />

      <LogsViewer />
    </Container>
  )
}
