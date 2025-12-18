import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddTagForm from '../components/AddTagForm'

export const metadata: Metadata = {
  title: 'Agregar Etiqueta',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Etiqueta" subtitle="Ecommerce" />
      <AddTagForm />
    </Container>
  )
}

