import { Container, Row, Col } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddCategoriaForm from '../components/AddCategoriaForm'

export default function AgregarCategoriaPage() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Categoría" subtitle="Ecommerce" />
      <Row>
        <Col xxl={8} xl={10} lg={12}>
          <AddCategoriaForm />
        </Col>
      </Row>
    </Container>
  )
}

