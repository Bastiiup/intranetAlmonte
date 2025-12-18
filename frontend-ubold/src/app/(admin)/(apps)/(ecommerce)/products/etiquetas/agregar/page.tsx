import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddTagForm from '../components/AddTagForm'

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Etiqueta" subtitle="Ecommerce" />
      <AddTagForm />
    </Container>
  )
}

