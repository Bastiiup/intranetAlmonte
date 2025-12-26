import { Container, Row, Col } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddEtiquetaForm from '../components/AddEtiquetaForm'

export default function AgregarEtiquetaPage() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Etiqueta" subtitle="Ecommerce" />
      <Row>
        <Col xxl={8} xl={10} lg={12}>
          <AddEtiquetaForm />
        </Col>
      </Row>
    </Container>
  )
}

