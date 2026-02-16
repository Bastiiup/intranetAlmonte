import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import EvaluacionesOmrClient from './components/EvaluacionesOmrClient'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Evaluaciones OMR · MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Evaluaciones OMR" subtitle="MIRA" />
      <EvaluacionesOmrClient />
    </Container>
  )
}
