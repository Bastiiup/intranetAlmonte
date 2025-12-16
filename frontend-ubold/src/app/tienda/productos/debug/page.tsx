import { Container, Alert, Card, CardBody } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import strapiClient from '@/lib/strapi/client'
import { STRAPI_API_URL, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

export default async function ProductosDebugPage() {
  const endpointsToTest = [
    '/api/producto', // Principal - singular como aparece en Strapi
    '/api/productos',
    '/api/products',
    '/api/ecommerce-productos',
    '/api/ecommerce-products',
    '/api/tienda-productos',
    '/api/tienda-products',
    '/api/woocommerce-products',
    '/api/wo-products',
  ]

  const results: Array<{ endpoint: string; success: boolean; error?: string; data?: any }> = []

  for (const endpoint of endpointsToTest) {
    try {
      const response = await strapiClient.get<any>(`${endpoint}?pagination[pageSize]=1`)
      results.push({
        endpoint,
        success: true,
        data: response,
      })
    } catch (err: any) {
      results.push({
        endpoint,
        success: false,
        error: err.message || `HTTP ${err.status || 'Unknown'}`,
      })
    }
  }

  // Intentar obtener la lista de content types disponibles
  let contentTypes: any = null
  try {
    // Strapi v4 tiene un endpoint para obtener content types
    const ctResponse = await fetch(`${STRAPI_API_URL}/api/content-type-builder/content-types`, {
      headers: {
        'Content-Type': 'application/json',
        ...(STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {}),
      },
    })
    if (ctResponse.ok) {
      contentTypes = await ctResponse.json()
    }
  } catch (err) {
    // Si falla, no es crítico
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Debug Productos Strapi" subtitle="Tienda - Diagnóstico" />
      
      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <h4 className="card-title mb-4">Diagnóstico de Conexión con Strapi</h4>

              <Alert variant="info" className="mb-3">
                <strong>URL de Strapi:</strong> {STRAPI_API_URL}
                <br />
                <strong>Token configurado:</strong> {STRAPI_API_TOKEN ? '✅ Sí' : '❌ No'}
                {STRAPI_API_TOKEN && (
                  <>
                    <br />
                    <small className="text-muted">Longitud del token: {STRAPI_API_TOKEN.length} caracteres</small>
                  </>
                )}
              </Alert>

              <h5 className="mb-3">Resultados de Prueba de Endpoints:</h5>
              
              <div className="table-responsive mb-4">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Estado</th>
                      <th>Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index}>
                        <td><code>{result.endpoint}</code></td>
                        <td>
                          {result.success ? (
                            <span className="badge bg-success">✅ OK</span>
                          ) : (
                            <span className="badge bg-danger">❌ Error</span>
                          )}
                        </td>
                        <td>
                          {result.success ? (
                            <small className="text-success">
                              Datos encontrados: {result.data?.data?.length || 0} registro(s)
                            </small>
                          ) : (
                            <small className="text-danger">{result.error}</small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {results.some(r => r.success) && (
                <Alert variant="success" className="mb-3">
                  <strong>✅ Endpoints que funcionan:</strong>
                  <ul className="mb-0 mt-2">
                    {results.filter(r => r.success).map((r, i) => (
                      <li key={i}><code>{r.endpoint}</code></li>
                    ))}
                  </ul>
                </Alert>
              )}

              {!results.some(r => r.success) && (
                <Alert variant="warning" className="mb-3">
                  <strong>⚠️ Ningún endpoint funcionó</strong>
                  <p className="mb-2 mt-2">
                    Posibles causas:
                  </p>
                  <ul className="mb-0">
                    <li>La colección de productos no existe en Strapi con estos nombres</li>
                    <li>El nombre de la colección es diferente (revisa en Strapi → Content Manager)</li>
                    <li>Los permisos no están configurados (Settings → Roles → Public → Find)</li>
                    <li>El API Token no tiene permisos suficientes</li>
                  </ul>
                </Alert>
              )}

              {contentTypes && (
                <div className="mb-4">
                  <h5 className="mb-3">Content Types Disponibles en Strapi:</h5>
                  <pre className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflow: 'auto', fontSize: '0.85em' }}>
                    <code>{JSON.stringify(contentTypes, null, 2)}</code>
                  </pre>
                </div>
              )}

              <Alert variant="info">
                <strong>ℹ️ Instrucciones:</strong>
                <ol className="mb-0 mt-2">
                  <li>Ve a Strapi → Content Manager</li>
                  <li>Revisa qué colecciones de productos existen</li>
                  <li>El nombre de la colección debe ser el mismo que aparece en la URL de Strapi</li>
                  <li>Configura los permisos en Settings → Roles → Public → Find</li>
                  <li>Si el nombre es diferente, actualiza el código con el nombre correcto</li>
                </ol>
              </Alert>
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}

