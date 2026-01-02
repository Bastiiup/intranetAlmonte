import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddClienteForm from '../components/AddClienteForm'

export const metadata: Metadata = {
  title: 'Agregar Cliente - Intranet Almonte',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Cliente" subtitle="Ecommerce" />
      <AddClienteForm />
    </Container>
  )
}

