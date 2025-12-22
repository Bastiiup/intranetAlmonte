import { Container, Alert, Card, CardBody, Badge } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import strapiClient from '@/lib/strapi/client'
import { STRAPI_API_URL, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

interface ConnectionStatus {
  connected: boolean
  url: string
  tokenConfigured: boolean
  tokenLength?: number
  testEndpoint?: string
  testResponse?: any
  error?: string
  statusCode?: number
}

interface TestResult {
  endpoint: string
  success: boolean
  status?: number
  error?: string
  existe?: boolean
  tieneDatos?: boolean
}

export default async function TestStrapiPage() {
  const status: ConnectionStatus = {
    connected: false,
    url: STRAPI_API_URL,
    tokenConfigured: !!STRAPI_API_TOKEN,
    tokenLength: STRAPI_API_TOKEN?.length,
  }

  // Intentar hacer peticiones de prueba a Strapi
  const testResults: TestResult[] = []

  try {
    // Lista amplia de endpoints para probar
    const testEndpoints = [
      // Endpoints que sabemos que funcionan (chat)
      '/api/wo-clientes?pagination[pageSize]=1',
      '/api/intranet-chats?pagination[pageSize]=1',
      
      // Endpoints de productos/libros
      '/api/product-libro-edicion?pagination[pageSize]=1',
      '/api/producto-libro-edicion?pagination[pageSize]=1',
      '/api/libro-edicion?pagination[pageSize]=1',
      '/api/producto?pagination[pageSize]=1',
      '/api/productos?pagination[pageSize]=1',
      '/api/libro?pagination[pageSize]=1',
      '/api/libros?pagination[pageSize]=1',
      
      // Endpoints de pedidos
      '/api/ecommerce-pedidos?pagination[pageSize]=1',
      '/api/wo-pedidos?pagination[pageSize]=1',
      '/api/pedidos?pagination[pageSize]=1',
      
      // Otros
      '/api/turnos-tiendas?pagination[pageSize]=1',
    ]

    for (const endpoint of testEndpoints) {
      try {
        const response = await strapiClient.get<any>(endpoint)
        const tieneDatos = Array.isArray(response.data) 
          ? response.data.length > 0 
          : response.data !== undefined && response.data !== null
        
        testResults.push({
          endpoint,
          success: true,
          tieneDatos,
        })
        
        // Si es el primero que funciona, guardarlo como testResponse
        if (!status.connected) {
          status.connected = true
          status.testEndpoint = endpoint
          status.testResponse = response
        }
      } catch (err: any) {
        const statusCode = err.status || 500
        const existe = statusCode !== 404
        
        testResults.push({
          endpoint,
          success: false,
          status: statusCode,
          error: err.message || `HTTP ${statusCode}`,
          existe,
        })
        
        if (!status.statusCode) {
          status.statusCode = statusCode
        }
      }
    }

    if (!status.connected) {
      // Si ningún endpoint funcionó, intentar un endpoint básico de Strapi
      try {
        const healthCheck = await fetch(`${STRAPI_API_URL}/api`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {}),
          },
        })
        
        if (healthCheck.ok) {
          status.connected = true
          status.testEndpoint = '/api'
          status.testResponse = { message: 'Strapi API está respondiendo' }
        } else {
          status.statusCode = healthCheck.status
          status.error = `HTTP ${healthCheck.status}: ${healthCheck.statusText}`
        }
      } catch (err: any) {
        status.error = err.message || 'Error al conectar con Strapi'
      }
    }
  } catch (err: any) {
    status.error = err.message || 'Error desconocido'
    status.statusCode = err.status
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Test de Conexión Strapi" subtitle="Tienda - Diagnóstico" />
      
      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <h4 className="card-title mb-4">Estado de Conexión con Strapi</h4>

              {/* Información de Configuración */}
              <div className="mb-4">
                <h5 className="mb-3">Configuración</h5>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <tbody>
                      <tr>
                        <td><strong>URL de Strapi:</strong></td>
                        <td>
                          <code>{status.url}</code>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Token Configurado:</strong></td>
                        <td>
                          {status.tokenConfigured ? (
                            <Badge bg="success">
                              ✓ Sí ({status.tokenLength} caracteres)
                            </Badge>
                          ) : (
                            <Badge bg="warning">⚠ No configurado</Badge>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Entorno:</strong></td>
                        <td>
                          <Badge bg={process.env.NODE_ENV === 'production' ? 'primary' : 'info'}>
                            {process.env.NODE_ENV || 'development'}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Estado de Conexión */}
              {status.connected ? (
                <Alert variant="success" className="mb-4">
                  <h5 className="alert-heading">✅ Conexión Exitosa</h5>
                  <p className="mb-2">
                    La aplicación está conectada correctamente a Strapi en <strong>{status.url}</strong>
                  </p>
                  {status.testEndpoint && (
                    <p className="mb-0">
                      <small>
                        Endpoint probado: <code>{status.testEndpoint}</code>
                      </small>
                    </p>
                  )}
                </Alert>
              ) : (
                <Alert variant="danger" className="mb-4">
                  <h5 className="alert-heading">❌ Error de Conexión</h5>
                  <p className="mb-2">
                    No se pudo conectar con Strapi en <strong>{status.url}</strong>
                  </p>
                  {status.error && (
                    <p className="mb-1">
                      <strong>Error:</strong> {status.error}
                    </p>
                  )}
                  {status.statusCode && (
                    <p className="mb-0">
                      <strong>Código de estado:</strong> {status.statusCode}
                    </p>
                  )}
                  <hr />
                  <p className="mb-0">
                    <strong>Posibles causas:</strong>
                  </p>
                  <ul className="mb-0">
                    <li>La URL de Strapi es incorrecta</li>
                    <li>El token de API no está configurado o es inválido</li>
                    <li>Strapi no está accesible desde este servidor</li>
                    <li>Los permisos de CORS no están configurados en Strapi</li>
                    <li>El endpoint probado no existe en Strapi</li>
                  </ul>
                </Alert>
              )}

              {/* Resultados Detallados */}
              {testResults.length > 0 && (
                <div className="mb-4">
                  <h5 className="mb-3">Resultados de Prueba por Endpoint</h5>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Endpoint</th>
                          <th>Estado</th>
                          <th>Detalles</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResults.map((result, index) => (
                          <tr key={index}>
                            <td><code>{result.endpoint}</code></td>
                            <td>
                              {result.success ? (
                                <Badge bg="success">✅ OK</Badge>
                              ) : result.existe ? (
                                <Badge bg="warning">⚠️ Existe (permisos?)</Badge>
                              ) : (
                                <Badge bg="danger">❌ No existe</Badge>
                              )}
                            </td>
                            <td>
                              {result.success ? (
                                <small className="text-success">
                                  Status {result.status || 200} - {result.tieneDatos ? 'Con datos' : 'Sin datos'}
                                </small>
                              ) : (
                                <small className={result.existe ? 'text-warning' : 'text-danger'}>
                                  {result.error || `Status ${result.status}`}
                                  {result.existe && (
                                    <>
                                      <br />
                                      <strong>Este endpoint existe pero puede tener problemas de permisos</strong>
                                    </>
                                  )}
                                </small>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {testResults.some(r => r.success) && (
                    <Alert variant="success" className="mt-3">
                      <strong>✅ Endpoints que funcionan:</strong>
                      <ul className="mb-0 mt-2">
                        {testResults.filter(r => r.success).map((r, i) => (
                          <li key={i}>
                            <code>{r.endpoint}</code>
                            {r.tieneDatos && <span className="text-success ms-2">(con datos)</span>}
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  {testResults.some(r => r.existe && !r.success) && (
                    <Alert variant="warning" className="mt-3">
                      <strong>⚠️ Endpoints que existen pero tienen problemas:</strong>
                      <ul className="mb-0 mt-2">
                        {testResults.filter(r => r.existe && !r.success).map((r, i) => (
                          <li key={i}>
                            <code>{r.endpoint}</code> - {r.error} (Status: {r.status})
                            <br />
                            <small className="text-muted">
                              Ve a Strapi → Settings → Users & Permissions → Roles → <strong>API Token</strong> → 
                              Habilita permisos para esta colección
                            </small>
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                </div>
              )}

              {/* Respuesta de Prueba */}
              {status.testResponse && (
                <div className="mb-4">
                  <h5 className="mb-3">Respuesta de Prueba (Primer Endpoint Exitoso)</h5>
                  <pre className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflow: 'auto', fontSize: '0.85em' }}>
                    <code>{JSON.stringify(status.testResponse, null, 2)}</code>
                  </pre>
                </div>
              )}

              {/* Instrucciones */}
              <Alert variant="info">
                <h5 className="alert-heading">ℹ️ Información</h5>
                <p className="mb-2">
                  Para verificar la conexión, esta página intenta hacer una petición real a Strapi.
                </p>
                <p className="mb-0">
                  <strong>Variables de entorno necesarias:</strong>
                </p>
                <ul className="mb-0">
                  <li><code>NEXT_PUBLIC_STRAPI_URL</code> - URL de tu instancia de Strapi</li>
                  <li><code>STRAPI_API_TOKEN</code> - Token de API de Strapi (opcional pero recomendado)</li>
                </ul>
              </Alert>
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}
