import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
// TODO: Importar componente de lista de pedidos cuando esté listo
// import PedidosList from './components/PedidosList'

export default async function PedidosPage() {
  // TODO: Conectar con Strapi para obtener pedidos
  // const pedidos = await strapiClient.get('/api/pedidos?populate=*')

  return (
    <Container fluid>
      <PageBreadcrumb title="Pedidos" subtitle="Tienda - Gestionar productos" />
      
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title mb-4">Lista de Pedidos</h4>
              <p className="text-muted">
                Esta página mostrará todos los pedidos obtenidos desde Strapi.
              </p>
              {/* Aquí irá el componente de lista de pedidos conectado con Strapi */}
              {/* <PedidosList pedidos={pedidos} /> */}
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

