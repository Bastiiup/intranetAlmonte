import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function PosPage() {
  return (
    <Container fluid>
      <PageBreadcrumb title="POS" subtitle="Tienda" />
      
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title mb-4">Punto de Venta (POS)</h4>
              <p className="text-muted">
                Esta página se conectará con Strapi para mostrar el sistema de punto de venta.
              </p>
              {/* Aquí irá el componente POS conectado con Strapi */}
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

