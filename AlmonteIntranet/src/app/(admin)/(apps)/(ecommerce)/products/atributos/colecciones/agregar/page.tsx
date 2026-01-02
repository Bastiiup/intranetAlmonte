import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddColeccionForm from '../components/AddColeccionForm'

export const metadata: Metadata = {
  title: 'Agregar Colección - Intranet Almonte',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Colección" subtitle="Ecommerce" />
      <AddColeccionForm />
    </Container>
  )
}

