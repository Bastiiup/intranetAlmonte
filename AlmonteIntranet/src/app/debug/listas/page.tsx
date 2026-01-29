'use client'

import { useState } from 'react'
import { Button, Card, Container, Spinner, Alert } from 'react-bootstrap'

export default function DebugListasPage() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testEndpoint = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      console.log('[DEBUG] Iniciando petición a /api/crm/listas/por-colegio')
      const startTime = Date.now()
      
      const res = await fetch('/api/crm/listas/por-colegio?cache=false', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log('[DEBUG] Respuesta recibida:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        duration: `${duration}ms`,
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('[DEBUG] Error:', errorText)
        setError(`HTTP ${res.status}: ${errorText}`)
        return
      }

      const data = await res.json()
      console.log('[DEBUG] Datos recibidos:', data)

      setResponse({
        status: res.status,
        statusText: res.statusText,
        duration: `${duration}ms`,
        data: data,
      })
    } catch (err: any) {
      console.error('[DEBUG] Excepción:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">🐛 Debug: Listas de Útiles</h1>

      <Card className="mb-4">
        <Card.Body>
          <h5>Información</h5>
          <p>Esta página prueba el endpoint <code>/api/crm/listas/por-colegio</code></p>
          <Button 
            onClick={testEndpoint} 
            disabled={loading}
            variant="primary"
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Cargando...
              </>
            ) : (
              'Probar Endpoint'
            )}
          </Button>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger">
          <h5>❌ Error</h5>
          <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
        </Alert>
      )}

      {response && (
        <>
          <Card className="mb-4">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">✅ Respuesta HTTP</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong>Status:</strong> {response.status} {response.statusText}
              </div>
              <div className="mb-3">
                <strong>Duración:</strong> {response.duration}
              </div>
              <div>
                <strong>Success:</strong> {response.data.success ? '✅ Sí' : '❌ No'}
              </div>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">📊 Resumen de Datos</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-2">
                <strong>Total de Colegios:</strong> {response.data.total || 0}
              </div>
              <div className="mb-2">
                <strong>Datos en Array:</strong> {response.data.data?.length || 0}
              </div>
              <div className="mb-2">
                <strong>Cached:</strong> {response.data.cached ? 'Sí' : 'No'}
              </div>
              
              {response.data.diagnostic && (
                <div className="mt-3">
                  <h6>Diagnóstico:</h6>
                  <ul>
                    <li><strong>Total Cursos:</strong> {response.data.diagnostic.totalCursos}</li>
                    <li><strong>Cursos con Versiones:</strong> {response.data.diagnostic.cursosConVersiones}</li>
                    <li><strong>Cursos con PDFs:</strong> {response.data.diagnostic.cursosConPDFs}</li>
                  </ul>
                </div>
              )}
            </Card.Body>
          </Card>

          {response.data.data && response.data.data.length > 0 && (
            <Card className="mb-4">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">🏫 Primeros 5 Colegios</h5>
              </Card.Header>
              <Card.Body>
                {response.data.data.slice(0, 5).map((colegio: any, idx: number) => (
                  <div key={idx} className="mb-3 p-3 border rounded">
                    <h6>{colegio.nombre} (RBD: {colegio.rbd})</h6>
                    <ul className="mb-0">
                      <li><strong>ID:</strong> {colegio.id}</li>
                      <li><strong>Total Listas:</strong> {colegio.totalListas}</li>
                      <li><strong>Matrícula Total:</strong> {colegio.matriculaTotal || 0}</li>
                      <li><strong>Región:</strong> {colegio.region || 'N/A'}</li>
                      <li><strong>Comuna:</strong> {colegio.comuna || 'N/A'}</li>
                      <li><strong>Cursos:</strong> {colegio.cursos?.length || 0}</li>
                    </ul>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}

          <Card>
            <Card.Header className="bg-secondary text-white">
              <h5 className="mb-0">📋 Respuesta Completa (JSON)</h5>
            </Card.Header>
            <Card.Body>
              <pre style={{ 
                maxHeight: '500px', 
                overflow: 'auto',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
              }}>
                {JSON.stringify(response.data, null, 2)}
              </pre>
            </Card.Body>
          </Card>

          {response.data.details && (
            <Card className="mt-4">
              <Card.Header className="bg-warning">
                <h5 className="mb-0">⚠️ Detalles del Error</h5>
              </Card.Header>
              <Card.Body>
                <pre style={{ 
                  maxHeight: '300px', 
                  overflow: 'auto',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                }}>
                  {JSON.stringify(response.data.details, null, 2)}
                </pre>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      <Card className="mt-4">
        <Card.Header className="bg-dark text-white">
          <h5 className="mb-0">💡 Consola del Navegador</h5>
        </Card.Header>
        <Card.Body>
          <p>Abre la consola del navegador (F12) para ver logs detallados de la petición.</p>
          <p className="mb-0">También revisa los logs del servidor en la terminal.</p>
        </Card.Body>
      </Card>
    </Container>
  )
}
