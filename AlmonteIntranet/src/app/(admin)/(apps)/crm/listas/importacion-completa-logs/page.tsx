'use client'

import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import LogsViewer from './components/LogsViewer'

export default function ImportacionCompletaLogsPage() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Logs de Importación Completa" subtitle="CRM - Listas" />
      <LogsViewer />
    </Container>
  )
}
