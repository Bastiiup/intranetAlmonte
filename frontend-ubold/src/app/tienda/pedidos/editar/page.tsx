import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function EditarPedidosPage() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Edición de Pedidos" subtitle="Tienda - Gestionar productos" />
      
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title mb-4">Editar Pedido</h4>
              <p className="text-muted">
                Esta página permitirá editar pedidos obtenidos desde Strapi.
              </p>
              {/* Aquí irá el formulario de edición de pedidos conectado con Strapi */}
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

