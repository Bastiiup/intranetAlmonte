import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import AddColaboradorForm from '@/app/(admin)/(apps)/colaboradores/components/AddColaboradorForm'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const metadata: Metadata = {
  title: 'Agregar Colaborador',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Agregar Colaborador" 
        subtitle="Colaboradores"
      />
      <AddColaboradorForm />
    </Container>
  )
}

