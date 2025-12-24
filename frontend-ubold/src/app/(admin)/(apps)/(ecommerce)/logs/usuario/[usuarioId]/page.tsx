import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import UserActivityLogs from './components/UserActivityLogs'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ usuarioId: string }>
}

export default async function UserActivityLogsPage({ params }: PageProps) {
  const { usuarioId } = await params

  return (
    <Container fluid>
      <PageBreadcrumb title={`Actividades del Usuario #${usuarioId}`} subtitle="Ecommerce" />
      <UserActivityLogs usuarioId={usuarioId} />
    </Container>
  )
}


