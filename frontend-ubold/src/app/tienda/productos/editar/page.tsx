import { Container, Card, CardBody, Alert } from 'react-bootstrap'
import Link from 'next/link'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Button } from 'react-bootstrap'

export default function EditarProductoPage() {
  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Editar Producto" 
        subtitle="Tienda - Productos" 
      />
      
      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <h4 className="card-title mb-4">Editar Producto</h4>
              
              <Alert variant="info" className="mb-3">
                <strong>ℹ️ Información:</strong> Para editar un producto, ve a la lista de productos y haz clic en "Editar" en el producto que deseas modificar.
              </Alert>

              <div className="mt-4">
                <Link href="/tienda/productos">
                  <Button variant="primary">
                    Ir a Lista de Productos
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}


