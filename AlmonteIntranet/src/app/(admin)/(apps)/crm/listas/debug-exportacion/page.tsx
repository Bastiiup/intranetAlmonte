'use client'

import { useState } from 'react'
import { Container, Card, CardBody, Button, Alert, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function DebugExportacionPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testExportacion = async (colegioId?: string) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let colegioIdParaUsar = colegioId
      
      // Si no se proporciona colegioId, obtener el primero disponible
      if (!colegioIdParaUsar) {
        const colegiosResponse = await fetch('/api/crm/colegios/list?pagination[pageSize]=10')
        const colegiosData = await colegiosResponse.json()
        
        if (!colegiosData.success || !colegiosData.data || colegiosData.data.length === 0) {
          setError('No se encontraron colegios para probar')
          setLoading(false)
          return
        }

        colegioIdParaUsar = colegiosData.data[0].id
      }
      
      const response = await fetch(`/api/crm/listas/exportar-colegio?colegioId=${colegioIdParaUsar}`)
      const data = await response.json()

      setResult({
        status: response.status,
        success: data.success,
        error: data.error,
        colegio: data.data?.colegio,
        totalListas: data.data?.totalListas,
        totalProductos: data.data?.totalProductos,
        datosExcel: data.data?.datosExcel?.length || 0,
        detalles: data.data?.listas ? {
          cursosConListas: data.data.listas.length,
          primerCurso: data.data.listas[0] ? {
            nombre: data.data.listas[0].curso_nombre,
            productos: data.data.listas[0].productos_count,
          } : null,
        } : null,
      })
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }
  
  const [colegioIdInput, setColegioIdInput] = useState('')

  return (
    <Container fluid>
      <PageBreadcrumb title="Debug Exportación" subtitle="CRM > Listas" />
      
      <Card>
        <CardBody>
          <h4>Debug de Exportación de Listas</h4>
          <p className="text-muted">
            Esta página te permite probar la exportación y ver los logs detallados.
          </p>

          <div className="mb-3">
            <div className="d-flex gap-2 mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="ID del colegio (opcional - dejar vacío para usar el primero)"
                value={colegioIdInput}
                onChange={(e) => setColegioIdInput(e.target.value)}
                style={{ maxWidth: '300px' }}
              />
              <Button 
                variant="primary" 
                onClick={() => testExportacion(colegioIdInput || undefined)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Probando...
                  </>
                ) : (
                  'Probar Exportación'
                )}
              </Button>
            </div>
            <small className="text-muted">
              Deja el campo vacío para probar con el primer colegio disponible, o ingresa un ID específico
            </small>
          </div>

          {error && (
            <Alert variant="danger">
              <strong>Error:</strong> {error}
            </Alert>
          )}

          {result && (
            <div className="mt-3">
              <h5>Resultado:</h5>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '5px',
                overflow: 'auto',
                maxHeight: '500px'
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-4">
            <h5>Logs del Servidor</h5>
            <p className="text-muted">
              Para ver los logs detallados, revisa la consola del servidor donde ejecutaste <code>npm run dev</code>.
              Los logs mostrarán:
            </p>
            <ul>
              <li><code>[API /crm/listas/exportar-colegio]</code> - Logs de la exportación</li>
              <li><code>[Strapi Client GET]</code> - Peticiones a Strapi</li>
              <li><code>[Strapi Client] ❌ Error</code> - Errores de Strapi</li>
            </ul>
          </div>
        </CardBody>
      </Card>
    </Container>
  )
}
