'use client'

import { useState } from 'react'
import { Container, Card, CardBody, CardHeader, Button, Alert, Badge, Row, Col } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function SyncMissingPedidosPage() {
  const [syncing, setSyncing] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  // Pedidos específicos reportados como faltantes
  const missingPedidos = [
    { numero: '9110', cliente: 'Andres Mardones' },
    { numero: '9111', cliente: 'Andres Mardones' },
    { numero: '9126', cliente: 'Andres Mardones' },
    { numero: '9368', cliente: 'Sin cliente' },
    { numero: '10923', cliente: 'Zenn Dev' },
    { numero: '10633', cliente: 'Martin Infante' },
  ]

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setResults([])

    try {
      const orderNumbers = missingPedidos.map(p => p.numero)
      
      const response = await fetch('/api/tienda/pedidos/sync-specific', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumbers,
          platforms: ['woo_moraleja', 'woo_escolar'],
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al sincronizar pedidos')
      }

      setResults(data.results || [])
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
      console.error('Error sincronizando pedidos:', err)
    } finally {
      setSyncing(false)
    }
  }

  const successCount = results.filter(r => r.success).length
  const errorCount = results.filter(r => !r.success).length

  return (
    <Container fluid>
      <PageBreadcrumb title="Sincronizar Pedidos Faltantes" subtitle="Ecommerce" />
      
      <Card>
        <CardHeader>
          <h4 className="mb-0">Sincronizar Pedidos Faltantes</h4>
        </CardHeader>
        <CardBody>
          <Alert variant="info">
            <strong>Pedidos a sincronizar:</strong>
            <ul className="mb-0 mt-2">
              {missingPedidos.map((pedido, idx) => (
                <li key={idx}>
                  #{pedido.numero} - {pedido.cliente}
                </li>
              ))}
            </ul>
          </Alert>

          <div className="d-flex gap-2 mb-4">
            <Button
              variant="primary"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar Pedidos'}
            </Button>
            {results.length > 0 && (
              <Button
                variant="success"
                onClick={() => window.location.href = '/atributos/pedidos'}
              >
                Ver Pedidos
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="danger" className="mt-3">
              <strong>Error:</strong> {error}
            </Alert>
          )}

          {results.length > 0 && (
            <>
              <Alert variant={errorCount === 0 ? 'success' : 'warning'} className="mt-3">
                <strong>Resultados:</strong> {successCount} exitosos, {errorCount} con errores
              </Alert>

              <div className="mt-4">
                <h5>Detalles de sincronización:</h5>
                <Row className="g-3">
                  {results.map((result, idx) => (
                    <Col md={6} key={idx}>
                      <Card className={result.success ? 'border-success' : 'border-danger'}>
                        <CardBody>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <strong>Pedido #{result.orderNumber}</strong>
                              <br />
                              <small className="text-muted">
                                Plataforma: {result.platform?.replace('woo_', '').toUpperCase()}
                              </small>
                            </div>
                            <Badge bg={result.success ? 'success' : 'danger'}>
                              {result.success ? '✓' : '✗'}
                            </Badge>
                          </div>
                          {result.success ? (
                            <div>
                              <small className="text-success">
                                {result.action === 'created' ? 'Creado' : 'Actualizado'} en Strapi
                              </small>
                              {result.documentId && (
                                <div>
                                  <small className="text-muted">ID: {result.documentId}</small>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <small className="text-danger">
                                Error: {result.error}
                              </small>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </Container>
  )
}

