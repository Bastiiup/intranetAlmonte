import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddCategoryForm from '../components/AddCategoryForm'

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Categoría" subtitle="Ecommerce" />
      <AddCategoryForm />
    </Container>
  )
}

