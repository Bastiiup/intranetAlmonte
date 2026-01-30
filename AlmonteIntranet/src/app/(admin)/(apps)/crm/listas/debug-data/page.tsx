'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardBody, Badge, Spinner, Alert, Button } from 'react-bootstrap'

export default function DebugDataPage() {
  const [cursos, setCursos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarCursos = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/crm/listas/debug-all', {
        cache: 'no-store',
      })
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      setCursos(data.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCursos()
  }, [])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" />
      </div>
    )
  }

  if (error) {
    return <Alert variant="danger">Error: {error}</Alert>
  }

  return (
    <div className="container-fluid p-4">
      <h1 className="mb-4">🔍 Debug: Todos los Cursos</h1>
      
      <Button onClick={cargarCursos} variant="primary" className="mb-3">
        🔄 Recargar
      </Button>
      
      <Alert variant="info">
        <strong>Total de cursos:</strong> {cursos.length}
      </Alert>

      <div className="row">
        {cursos.map((curso, idx) => {
          const attrs = curso.attributes || curso
          const versiones = attrs.versiones_materiales || []
          const colegio = attrs.colegio?.data || attrs.colegio
          const colegioAttrs = colegio?.attributes || colegio
          
          return (
            <div key={curso.id || idx} className="col-12 col-md-6 col-lg-4 mb-3">
              <Card>
                <CardHeader>
                  <h6 className="mb-0">
                    {attrs.nombre_curso || 'Sin nombre'}
                    {' '}
                    <Badge bg={versiones.length > 0 ? 'success' : 'secondary'}>
                      {versiones.length} versión(es)
                    </Badge>
                  </h6>
                </CardHeader>
                <CardBody>
                  <p className="mb-1">
                    <strong>ID:</strong> {curso.id || 'N/A'}<br />
                    <strong>DocumentId:</strong> {curso.documentId || 'N/A'}
                  </p>
                  <p className="mb-1">
                    <strong>Nivel:</strong> {attrs.nivel || 'N/A'}<br />
                    <strong>Grado:</strong> {attrs.grado || 'N/A'}
                  </p>
                  <p className="mb-1">
                    <strong>Colegio:</strong> {colegioAttrs?.colegio_nombre || 'N/A'}<br />
                    <strong>RBD:</strong> {colegioAttrs?.rbd || 'N/A'}
                  </p>
                  
                  {versiones.length > 0 && (
                    <div className="mt-2">
                      <strong>Versiones:</strong>
                      {versiones.map((v: any, vIdx: number) => (
                        <div key={vIdx} className="mt-1 p-2 bg-light rounded">
                          <small>
                            <strong>Versión {vIdx + 1}:</strong><br />
                            PDF: {v.pdf_id ? `✅ ${v.pdf_id}` : '❌ No'}<br />
                            Productos: {v.productos?.length || 0}<br />
                            Fecha: {v.fecha_subida || v.fecha_actualizacion || 'N/A'}
                          </small>
                          {v.productos && v.productos.length > 0 && (
                            <ul className="mt-1 mb-0" style={{ fontSize: '11px' }}>
                              {v.productos.slice(0, 3).map((p: any, pIdx: number) => (
                                <li key={pIdx}>{p.nombre || p.material_nombre || 'Sin nombre'}</li>
                              ))}
                              {v.productos.length > 3 && <li>... y {v.productos.length - 3} más</li>}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {versiones.length === 0 && (
                    <Alert variant="warning" className="mt-2 mb-0 py-1">
                      <small>⚠️ Sin versiones de materiales</small>
                    </Alert>
                  )}
                </CardBody>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
