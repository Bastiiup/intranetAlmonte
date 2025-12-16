import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function TurnoPage() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Número de Atención" subtitle="Tienda" />
      
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title mb-4">Número de Atención</h4>
              <p className="text-muted">
                Esta página se conectará con Strapi para gestionar los números de atención/turnos.
              </p>
              {/* Aquí irá el componente de gestión de turnos conectado con Strapi */}
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

