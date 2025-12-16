import { Container, Alert, Card, CardBody } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import strapiClient from '@/lib/strapi/client'
import { STRAPI_API_URL } from '@/lib/strapi/config'

// Forzar renderizado dinámico (no estático) para poder usar variables de entorno
export const dynamic = 'force-dynamic'

export default async function PedidosPage() {
  let pedidos: any[] = []
  let error: string | null = null
  let isLoading = false

  try {
    // Intentar obtener pedidos desde Strapi
    // Nota: Ajusta la ruta según tu colección en Strapi
    // Ejemplos comunes: '/api/pedidos', '/api/orders', '/api/ordenes'
    const response = await strapiClient.get<any>('/api/pedidos?populate=*')
    
    // Strapi devuelve los datos en response.data
    if (Array.isArray(response.data)) {
      pedidos = response.data
    } else if (response.data) {
      pedidos = [response.data]
    }
  } catch (err: any) {
    // Manejar errores (puede ser que la colección no exista aún, o que falte el token)
    // No lanzar el error para que el build no falle
    error = err.message || 'Error al conectar con Strapi'
    
    // Solo loguear en desarrollo, no en build
    if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
      console.error('Error al obtener pedidos:', err)
    }
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Pedidos" subtitle="Tienda - Gestionar productos" />
      
      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <h4 className="card-title mb-4">Lista de Pedidos</h4>
              
              {/* Mostrar información de conexión */}
              <Alert variant="info" className="mb-3">
                <strong>URL de Strapi:</strong> {STRAPI_API_URL}
                <br />
                <small className="text-muted">
                  Endpoint: {STRAPI_API_URL}/api/pedidos
                </small>
              </Alert>

              {/* Mostrar error si existe */}
              {error && (
                <Alert variant="warning" className="mb-3">
                  <strong>⚠️ Error:</strong> {error}
                  <br />
                  <small>
                    Asegúrate de que:
                    <ul className="mb-0 mt-2">
                      <li>La colección "pedidos" existe en Strapi</li>
                      <li>El API Token está configurado en las variables de entorno</li>
                      <li>Los permisos de la colección están habilitados en Strapi</li>
                    </ul>
                  </small>
                </Alert>
              )}

              {/* Mostrar pedidos si existen */}
              {!error && pedidos.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Total</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidos.map((pedido: any) => (
                        <tr key={pedido.id}>
                          <td>#{pedido.id}</td>
                          <td>
                            {pedido.attributes?.createdAt 
                              ? new Date(pedido.attributes.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </td>
                          <td>
                            <span className="badge bg-primary">
                              {pedido.attributes?.estado || pedido.attributes?.status || 'Pendiente'}
                            </span>
                          </td>
                          <td>
                            ${pedido.attributes?.total || pedido.attributes?.monto || '0.00'}
                          </td>
                          <td>
                            <a href={`/tienda/pedidos/${pedido.id}`} className="btn btn-sm btn-primary">
                              Ver
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mensaje si no hay pedidos */}
              {!error && pedidos.length === 0 && (
                <Alert variant="secondary">
                  <p className="mb-0">
                    No se encontraron pedidos. Esto puede significar:
                  </p>
                  <ul className="mb-0 mt-2">
                    <li>La colección está vacía en Strapi</li>
                    <li>El nombre de la colección es diferente (revisa la URL en el mensaje de arriba)</li>
                    <li>Los permisos no están configurados correctamente</li>
                  </ul>
                </Alert>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}
