import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import { CrearEvaluacionOmrForm } from './components/CrearEvaluacionOmrForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Crear Evaluación OMR · MIRA',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Crear Evaluación OMR" subtitle="MIRA" />
      <CrearEvaluacionOmrForm />
    </Container>
  )
}

