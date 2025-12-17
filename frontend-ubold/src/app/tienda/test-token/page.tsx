/**
 * Página temporal para probar diferentes tokens de Strapi
 * Útil para debugging sin tener que desplegar
 */

'use client'

import { Container, Alert, Card, CardBody, Form, Button, InputGroup } from 'react-bootstrap'
import { useState } from 'react'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { STRAPI_API_URL } from '@/lib/strapi/config'

export default function TestTokenPage() {
  const [token, setToken] = useState('')
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const endpointsToTest = [
    '/api/wo-clientes', // Sabemos que este funciona
    '/api/product-libro-edicion',
    '/api/producto',
    '/api/productos',
    '/api/libro',
    '/api/libros',
  ]

  const testToken = async () => {
    if (!token.trim()) {
      setError('Por favor ingresa un token')
      return
    }

    setTesting(true)
    setError(null)
    setResults([])

    const testResults: any[] = []

    for (const endpoint of endpointsToTest) {
      try {
        const response = await fetch(`${STRAPI_API_URL}${endpoint}?pagination[pageSize]=1`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })

        const data = await response.json()

        if (response.ok) {
          const tieneDatos = Array.isArray(data.data) 
            ? data.data.length > 0 
            : data.data !== undefined && data.data !== null

          testResults.push({
            endpoint,
            success: true,
            status: response.status,
            tieneDatos,
            count: Array.isArray(data.data) ? data.data.length : data.data ? 1 : 0,
          })
        } else {
          testResults.push({
            endpoint,
            success: false,
            status: response.status,
            error: data.error?.message || `HTTP ${response.status}`,
            existe: response.status !== 404, // Si no es 404, existe pero tiene problemas
          })
        }
      } catch (err: any) {
        testResults.push({
          endpoint,
          success: false,
          error: err.message || 'Error de red',
        })
      }
    }

    setResults(testResults)
    setTesting(false)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Probar Token de Strapi" subtitle="Diagnóstico" />

      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <h4 className="card-title mb-4">Probar API Token de Strapi</h4>

              <Alert variant="info" className="mb-4">
                <strong>ℹ️ Instrucciones:</strong>
                <ol className="mb-0 mt-2">
                  <li>Obtén un nuevo API Token de Strapi (Settings → API Tokens)</li>
                  <li>Pega el token aquí para probarlo</li>
                  <li>Si funciona, actualízalo en Railway (Variables → STRAPI_API_TOKEN)</li>
                </ol>
              </Alert>

              <Form onSubmit={(e) => { e.preventDefault(); testToken(); }}>
                <InputGroup className="mb-3">
                  <InputGroup.Text>Token:</InputGroup.Text>
                  <Form.Control
                    type="password"
                    placeholder="Pega tu API Token de Strapi aquí"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={testing}
                  />
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={testing || !token.trim()}
                  >
                    {testing ? 'Probando...' : 'Probar Token'}
                  </Button>
                </InputGroup>
              </Form>

              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}

              {results.length > 0 && (
                <>
                  <h5 className="mb-3">Resultados:</h5>
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
                        {results.map((result, index) => (
                          <tr key={index}>
                            <td><code>{result.endpoint}</code></td>
                            <td>
                              {result.success ? (
                                <span className="badge bg-success">✅ OK</span>
                              ) : result.existe ? (
                                <span className="badge bg-warning">⚠️ Existe (permisos?)</span>
                              ) : (
                                <span className="badge bg-danger">❌ No existe</span>
                              )}
                            </td>
                            <td>
                              {result.success ? (
                                <small className="text-success">
                                  Status {result.status} - {result.count} registro(s) encontrado(s)
                                </small>
                              ) : (
                                <small className={result.existe ? 'text-warning' : 'text-danger'}>
                                  {result.error || `Status ${result.status}`}
                                  {result.existe && (
                                    <br />
                                    <strong>Este endpoint existe pero puede tener problemas de permisos</strong>
                                  )}
                                </small>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {results.some(r => r.success) && (
                    <Alert variant="success" className="mt-3">
                      <strong>✅ El token funciona correctamente</strong>
                      <br />
                      <small>
                        Endpoints que funcionan: {results.filter(r => r.success).map(r => r.endpoint).join(', ')}
                      </small>
                    </Alert>
                  )}

                  {results.some(r => r.existe && !r.success) && (
                    <Alert variant="warning" className="mt-3">
                      <strong>⚠️ Algunos endpoints existen pero tienen problemas de permisos</strong>
                      <br />
                      <small>
                        Ve a Strapi → Settings → Users & Permissions → Roles → <strong>API Token</strong> → 
                        Habilita los permisos necesarios para estas colecciones
                      </small>
                    </Alert>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}

