import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import LogsList from './components/LogsList'

export const dynamic = 'force-dynamic'

export default async function LogsPage() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Logs de Actividades" subtitle="Ecommerce" />
      <LogsList />
    </Container>
  )
}


