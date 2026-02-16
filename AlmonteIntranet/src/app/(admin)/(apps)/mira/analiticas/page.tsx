import { type Metadata } from 'next'
import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AnaliticasMiraClient from './components/AnaliticasMiraClient'

export const metadata: Metadata = {
  title: 'MIRA · Analíticas',
}

export const dynamic = 'force-dynamic'

const Page = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Analíticas MIRA" subtitle="MIRA" />
      <AnaliticasMiraClient />
    </Container>
  )
}

export default Page
