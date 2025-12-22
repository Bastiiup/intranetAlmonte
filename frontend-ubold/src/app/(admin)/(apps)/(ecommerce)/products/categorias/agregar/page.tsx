import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddCategoryForm from '../components/AddCategoryForm'

export const metadata: Metadata = {
  title: 'Agregar Categoría',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Categoría" subtitle="Ecommerce" />
      <AddCategoryForm />
    </Container>
  )
}

