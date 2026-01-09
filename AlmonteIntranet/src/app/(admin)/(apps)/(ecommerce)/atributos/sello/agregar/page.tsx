import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddSelloForm from '../components/AddSelloForm'

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Sello" subtitle="Ecommerce" />
      <AddSelloForm />
    </Container>
  )
}
