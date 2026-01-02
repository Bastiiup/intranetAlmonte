import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddAutorForm from '../components/AddAutorForm'

export const metadata: Metadata = {
  title: 'Agregar Autor - Intranet Almonte',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Autor" subtitle="Ecommerce" />
      <AddAutorForm />
    </Container>
  )
}

