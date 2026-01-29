import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import LogsViewer from './components/LogsViewer'

export default function LogsPage() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Logs de Listas" subtitle="CRM > Listas" />
      <LogsViewer />
    </Container>
  )
}
