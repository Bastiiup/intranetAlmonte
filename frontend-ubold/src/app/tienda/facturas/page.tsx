import { Container, Alert, Card, CardBody } from 'react-bootstrap'
import { headers } from 'next/headers'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import Link from 'next/link'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

interface InvoiceOrder {
  id: number
  number: string
  date_created: string
  status: string
  total: string
  billing: {
    first_name: string
    last_name: string
    email: string
    company?: string
  }
  meta_data: Array<{
    key: string
    value: string
  }>
}

export default async function FacturasPage() {
  let facturas: InvoiceOrder[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    // Obtener todos los pedidos de WooCommerce
    const response = await fetch(`${baseUrl}/api/woocommerce/orders?per_page=100&status=any`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      const allOrders: InvoiceOrder[] = Array.isArray(data.data) ? data.data : [data.data]
      
      // Filtrar solo los pedidos que tienen factura emitida
      facturas = allOrders.filter((order: InvoiceOrder) => {
        if (!order.meta_data || !Array.isArray(order.meta_data)) return false
        
        // Buscar si tiene factura emitida
        const hasInvoice = order.meta_data.some((meta: any) => 
          meta.key === '_factura_emitida' || 
          meta.key === '_openfactura_folio' || 
          meta.key === '_haulmer_folio'
        )
        
        return hasInvoice
      })
      
      // Ordenar por fecha más reciente primero
      facturas.sort((a, b) => {
        const dateA = new Date(a.date_created).getTime()
        const dateB = new Date(b.date_created).getTime()
        return dateB - dateA
      })
    } else {
      error = data.error || 'Error al obtener facturas'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('Error al obtener facturas:', err)
  }

  // Función helper para obtener el folio de la factura
  const getInvoiceFolio = (order: InvoiceOrder): string | null => {
    if (!order.meta_data) return null
    const folioMeta = order.meta_data.find((m: any) =>
      m.key === '_openfactura_folio' || m.key === '_haulmer_folio'
    )
    return folioMeta?.value || null
  }

  // Función helper para obtener la URL del PDF
  const getInvoicePdfUrl = (order: InvoiceOrder): string | null => {
    if (!order.meta_data) return null
    const pdfMeta = order.meta_data.find((m: any) =>
      m.key === '_openfactura_pdf_url' || 
      m.key === '_haulmer_pdf_url' ||
      m.key === '_openfactura_pdf_original_url' ||
      m.key === '_haulmer_pdf_original_url'
    )
    return pdfMeta?.value || null
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Facturas" subtitle="Tienda - Documentos Electrónicos" />
      
      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="card-title mb-0">Facturas Electrónicas</h4>
                <span className="badge bg-primary">{facturas.length} factura(s)</span>
              </div>
              
              {error && (
                <Alert variant="warning" className="mb-3">
                  <strong>⚠️ Error:</strong> {error}
                </Alert>
              )}

              {!error && facturas.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturas.map((factura) => {
                        const folio = getInvoiceFolio(factura)
                        const pdfUrl = getInvoicePdfUrl(factura)
                        const fecha = new Date(factura.date_created).toLocaleDateString('es-CL', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                        const clienteNombre = `${factura.billing.first_name} ${factura.billing.last_name}`.trim() || 'Sin nombre'
                        
                        return (
                          <tr key={factura.id}>
                            <td>
                              <strong className="text-primary">
                                {folio || 'N/A'}
                              </strong>
                            </td>
                            <td>
                              <Link href={`/tienda/pedidos/${factura.id}`} className="text-decoration-none">
                                #{factura.number || factura.id}
                              </Link>
                            </td>
                            <td>
                              <div>
                                <div>{clienteNombre}</div>
                                {factura.billing.company && (
                                  <small className="text-muted">{factura.billing.company}</small>
                                )}
                                {factura.billing.email && (
                                  <div><small className="text-muted">{factura.billing.email}</small></div>
                                )}
                              </div>
                            </td>
                            <td>{fecha}</td>
                            <td>
                              <strong>${parseFloat(factura.total).toLocaleString('es-CL')}</strong>
                            </td>
                            <td>
                              <span className={`badge ${
                                factura.status === 'completed' ? 'bg-success' : 
                                factura.status === 'processing' ? 'bg-info' : 
                                factura.status === 'pending' ? 'bg-warning' : 
                                'bg-secondary'
                              }`}>
                                {factura.status}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                {pdfUrl ? (
                                  <Link 
                                    href={`/tienda/facturas/${factura.id}`}
                                    className="btn btn-sm btn-primary"
                                    title="Ver Factura"
                                  >
                                    📄 Ver
                                  </Link>
                                ) : (
                                  <Link 
                                    href={`/tienda/facturas/${factura.id}`}
                                    className="btn btn-sm btn-outline-secondary"
                                    title="Ver Detalles"
                                  >
                                    Ver
                                  </Link>
                                )}
                                <Link 
                                  href={`/tienda/pedidos/${factura.id}`}
                                  className="btn btn-sm btn-outline-info"
                                  title="Ver Pedido"
                                >
                                  Pedido
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!error && facturas.length === 0 && (
                <Alert variant="secondary">
                  <p className="mb-0">
                    No se encontraron facturas emitidas.
                  </p>
                  <p className="mb-0 mt-2">
                    Las facturas se generan automáticamente al procesar pedidos desde el POS.
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
