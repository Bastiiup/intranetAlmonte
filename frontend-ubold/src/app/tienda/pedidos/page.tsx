import { Container, Alert, Card, CardBody } from 'react-bootstrap'
import { headers } from 'next/headers'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import { STRAPI_API_URL } from '@/lib/strapi/config'

// Forzar renderizado dinámico (no estático) para poder usar variables de entorno
export const dynamic = 'force-dynamic'

export default async function PedidosPage() {
  let pedidos: any[] = []
  let error: string | null = null
  let endpointUsed = ''

  try {
    // Usar API Route como proxy (igual que el chat)
    // Esto maneja el token de Strapi solo en el servidor
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/pedidos`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      pedidos = Array.isArray(data.data) ? data.data : [data.data]
      endpointUsed = data.endpoint || ''
    } else {
      error = data.error || 'Error al obtener pedidos'
    }
  } catch (err: any) {
    // Manejar errores (puede ser que la colección no exista aún, o que falte el token)
    // No lanzar el error para que el build no falle
    error = err.message || 'Error al conectar con la API'
    
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
                  Endpoint usado: <code>{endpointUsed || '/api/ecommerce-pedidos'}</code>
                  <br />
                  <span className="text-success">✅ Usando API Route como proxy (igual que el chat)</span>
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
                      <li>Las colecciones "ecommerce-pedidos", "wo-pedidos" o "pedidos" existen en Strapi</li>
                      <li>El API Token está configurado en las variables de entorno</li>
                      <li>Los permisos de la colección están habilitados en Strapi (Settings → Roles → Public → Find)</li>
                    </ul>
                  </small>
                </Alert>
              )}

              {/* Mostrar pedidos si existen */}
              {!error && pedidos.length > 0 && (
                <>
                  <Alert variant="success" className="mb-3">
                    <strong>✅ {pedidos.length} pedido(s) encontrado(s)</strong>
                    <br />
                    <small>
                      Si los campos no se muestran correctamente, ve a{' '}
                      <a href="/tienda/pedidos/debug" className="text-decoration-underline">
                        /tienda/pedidos/debug
                      </a>{' '}
                      para ver la estructura exacta de los datos.
                    </small>
                  </Alert>
                  
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Número de Pedido</th>
                          <th>Fecha de Pedido</th>
                          <th>Estado</th>
                          <th>Publicación</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                      {pedidos.map((pedido: any) => {
                        // Obtener los campos según la estructura de Strapi
                        // Intentar múltiples variaciones de nombres de campos
                        const attrs = pedido.attributes || {}
                        
                        // Número de pedido - probar todas las variaciones posibles
                        const numeroPedido = 
                          attrs.NUMERO_PEDIDO || 
                          attrs.numero_pedido || 
                          attrs.numeroPedido || 
                          attrs.numero_pedido ||
                          attrs.numero ||
                          attrs.order_number ||
                          attrs.orderNumber ||
                          pedido.id
                        
                        // Fecha de pedido - probar todas las variaciones posibles
                        const fechaPedido = 
                          attrs.FECHA_PEDIDO || 
                          attrs.fecha_pedido || 
                          attrs.fechaPedido || 
                          attrs.fecha ||
                          attrs.date ||
                          attrs.order_date ||
                          attrs.orderDate ||
                          attrs.createdAt ||
                          attrs.created_at
                        
                        // Estado - probar todas las variaciones posibles
                        const estado = 
                          attrs.ESTADO || 
                          attrs.estado || 
                          attrs.status ||
                          attrs.ESTADO_PEDIDO ||
                          attrs.estado_pedido ||
                          'Sin estado'
                        
                        // Status de publicación
                        const status = attrs.publishedAt ? 'Published' : (attrs.STATUS || attrs.status || 'Sin estado')
                        
                        // Formatear fecha si existe
                        let fechaFormateada = 'Sin fecha'
                        if (fechaPedido) {
                          try {
                            const fecha = new Date(fechaPedido)
                            fechaFormateada = fecha.toLocaleDateString('es-CL', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          } catch {
                            fechaFormateada = String(fechaPedido)
                          }
                        }
                        
                        return (
                          <tr key={pedido.id}>
                            <td>#{pedido.id}</td>
                            <td>
                              <strong>{numeroPedido}</strong>
                            </td>
                            <td>{fechaFormateada}</td>
                            <td>
                              <span className={`badge ${
                                estado === 'Completado' ? 'bg-success' : 
                                estado === 'Pendiente' ? 'bg-warning' : 
                                'bg-primary'
                              }`}>
                                {estado}
                              </span>
                            </td>
                            <td>
                              {status === 'Published' || status === 'published' ? (
                                <span className="badge bg-success">Publicado</span>
                              ) : (
                                <span className="badge bg-secondary">No publicado</span>
                              )}
                            </td>
                          <td>
                            <a href={`/tienda/pedidos/${pedido.id}`} className="btn btn-sm btn-primary me-1">
                              Editar
                            </a>
                            <a href={`/tienda/pedidos/${pedido.id}`} className="btn btn-sm btn-outline-secondary">
                              Ver
                            </a>
                          </td>
                          </tr>
                        )
                      })}
                      </tbody>
                    </table>
                  </div>
                </>
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
