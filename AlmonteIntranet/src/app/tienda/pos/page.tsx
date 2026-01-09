import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import PosInterface from './components/PosInterface'

export const dynamic = 'force-dynamic'

export default function PosPage() {
  return (
    <Container fluid>
      <PageBreadcrumb title="POS" subtitle="Tienda" />
      <PosInterface />
    </Container>
  )
}

