import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddObraForm from '../components/AddObraForm'

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Obra" subtitle="Ecommerce" />
      <AddObraForm />
    </Container>
  )
}



