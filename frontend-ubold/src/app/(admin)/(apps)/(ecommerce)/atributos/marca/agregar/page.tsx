import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddMarcaForm from '../components/AddMarcaForm'

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Marca" subtitle="Ecommerce" />
      <AddMarcaForm />
    </Container>
  )
}



