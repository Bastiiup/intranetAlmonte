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
    
    const response = await fetch(`${baseUrl}/api/woocommerce/orders?per_page=100&status=any`, {
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
                <strong>Pedidos desde WooCommerce</strong>
                <br />
                <small className="text-muted">
                  <span className="text-success">✅ Obteniendo pedidos desde WooCommerce</span>
                </small>
              </Alert>

              {/* Mostrar error si existe */}
              {error && (
                <Alert variant="warning" className="mb-3">
                  <strong>⚠️ Error:</strong> {error}
                  <br />
                  <small>
                    Verifica que las credenciales de WooCommerce estén configuradas correctamente.
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
                          <th>Fecha / Cliente</th>
                          <th>Estado</th>
                          <th>Total</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                      {pedidos.map((pedido: any) => {
                        // Estructura de WooCommerce Order
                        const numeroPedido = pedido.number || pedido.id
                        const fechaPedido = pedido.date_created
                        const estado = pedido.status || 'pending'
                        const total = parseFloat(pedido.total || 0)
                        const cliente = pedido.billing ? `${pedido.billing.first_name} ${pedido.billing.last_name}`.trim() : 'Sin cliente'
                        
                        // Verificar si tiene factura
                        const tieneFactura = pedido.meta_data?.some((m: any) => 
                          m.key === '_factura_emitida' || 
                          m.key === '_openfactura_folio' || 
                          m.key === '_haulmer_folio'
                        )
                        
                        // Formatear fecha
                        let fechaFormateada = 'Sin fecha'
                        if (fechaPedido) {
                          try {
                            const fecha = new Date(fechaPedido)
                            fechaFormateada = fecha.toLocaleDateString('es-CL', {
                              year: 'numeric',
                              month: 'short',
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
                            <td>
                              <div>{fechaFormateada}</div>
                              <small className="text-muted">{cliente}</small>
                            </td>
                            <td>
                              <span className={`badge ${
                                estado === 'completed' ? 'bg-success' : 
                                estado === 'processing' ? 'bg-info' : 
                                estado === 'pending' ? 'bg-warning' : 
                                'bg-secondary'
                              }`}>
                                {estado}
                              </span>
                            </td>
                            <td>
                              <strong>${total.toLocaleString('es-CL')}</strong>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <a href={`/tienda/pedidos/${pedido.id}`} className="btn btn-sm btn-outline-secondary">
                                  Ver
                                </a>
                                {tieneFactura ? (
                                  <a href={`/tienda/facturas/${pedido.id}`} className="btn btn-sm btn-primary" title="Ver Factura">
                                    📄 Factura
                                  </a>
                                ) : (
                                  <span className="btn btn-sm btn-outline-secondary disabled" title="Sin factura">
                                    Sin factura
                                  </span>
                                )}
                              </div>
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
                    No se encontraron pedidos en WooCommerce.
                  </p>
                  <p className="mb-0 mt-2">
                    Los pedidos se crean automáticamente desde el POS al procesar una venta.
                  </p>
                </Alert>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}
