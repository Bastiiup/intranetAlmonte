import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddSerieColeccionForm from '../components/AddSerieColeccionForm'

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Serie/Colección" subtitle="Ecommerce" />
      <AddSerieColeccionForm />
    </Container>
  )
}

