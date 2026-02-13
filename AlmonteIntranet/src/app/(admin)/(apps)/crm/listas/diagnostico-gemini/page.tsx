'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, Button, Spinner, Alert, Badge, Table } from 'react-bootstrap'
import { TbRefresh, TbCheck, TbX, TbAlertCircle } from 'react-icons/tb'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function DiagnosticoGeminiPage() {
  const [loading, setLoading] = useState(false)
  const [diagnostico, setDiagnostico] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const ejecutarDiagnostico = async () => {
    setLoading(true)
    setError(null)
    setDiagnostico(null)

    try {
      const response = await fetch('/api/crm/listas/diagnostico-gemini')
      const data = await response.json()

      if (data.success === false && !data.diagnostico) {
        setError(data.error || 'Error al ejecutar diagnóstico')
        return
      }

      setDiagnostico(data)
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar diagnóstico')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ejecutarDiagnostico()
  }, [])

  return (
    <>
      <PageBreadcrumb title="Diagnóstico de Gemini AI" subtitle="CRM" />
      
      <div className="container-fluid">
        <Card>
          <CardBody>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>Diagnóstico de Configuración Gemini AI</h4>
              <Button 
                variant="primary" 
                onClick={ejecutarDiagnostico}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Ejecutando...
                  </>
                ) : (
                  <>
                    <TbRefresh className="me-2" />
                    Ejecutar Diagnóstico
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="danger" className="mt-3">
                <TbX className="me-2" />
                {error}
              </Alert>
            )}

            {diagnostico && (
              <div className="mt-4">
                {/* Resumen */}
                <Alert variant={diagnostico.success ? 'success' : 'warning'} className="mb-4">
                  <h5 className="mb-2">
                    {diagnostico.recomendacion}
                  </h5>
                  {diagnostico.modeloRecomendado && (
                    <p className="mb-0">
                      <strong>Modelo recomendado:</strong> <code>{diagnostico.modeloRecomendado}</code>
                    </p>
                  )}
                </Alert>

                {/* Estado de API Key */}
                <Card className="mb-3">
                  <CardBody>
                    <h5>Estado de API Key</h5>
                    <Table striped bordered hover size="sm">
                      <tbody>
                        <tr>
                          <td><strong>API Key Configurada</strong></td>
                          <td>
                            {diagnostico.diagnostico.apiKeyConfigurada ? (
                              <Badge bg="success"><TbCheck /> Sí</Badge>
                            ) : (
                              <Badge bg="danger"><TbX /> No</Badge>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Longitud</strong></td>
                          <td>{diagnostico.diagnostico.apiKeyLength} caracteres</td>
                        </tr>
                        <tr>
                          <td><strong>Preview</strong></td>
                          <td><code>{diagnostico.diagnostico.apiKeyPreview}</code></td>
                        </tr>
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>

                {/* Modelos desde API */}
                {diagnostico.diagnostico.modelosDesdeAPI.length > 0 && (
                  <Card className="mb-3">
                    <CardBody>
                      <h5>Modelos Encontrados en API ({diagnostico.diagnostico.modelosDesdeAPI.length})</h5>
                      <div className="table-responsive">
                        <Table striped bordered hover size="sm">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>Display Name</th>
                              <th>Métodos Soportados</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diagnostico.diagnostico.modelosDesdeAPI.map((modelo: any, idx: number) => (
                              <tr key={idx}>
                                <td><code>{modelo.name}</code></td>
                                <td>{modelo.displayName || '-'}</td>
                                <td>
                                  {modelo.supportedGenerationMethods?.join(', ') || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Modelos Probados */}
                {diagnostico.diagnostico.modelosProbados.length > 0 && (
                  <Card className="mb-3">
                    <CardBody>
                      <h5>Modelos Probados ({diagnostico.diagnostico.modelosProbados.length})</h5>
                      <div className="table-responsive">
                        <Table striped bordered hover size="sm">
                          <thead>
                            <tr>
                              <th>Modelo</th>
                              <th>Estado</th>
                              <th>Detalles</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diagnostico.diagnostico.modelosProbados.map((test: any, idx: number) => (
                              <tr key={idx}>
                                <td><code>{test.modelo}</code></td>
                                <td>
                                  {test.funcional ? (
                                    <Badge bg="success"><TbCheck /> Funcional</Badge>
                                  ) : test.es404 ? (
                                    <Badge bg="danger"><TbX /> 404 - No encontrado</Badge>
                                  ) : test.esQuota ? (
                                    <Badge bg="warning"><TbAlertCircle /> Cuota excedida</Badge>
                                  ) : (
                                    <Badge bg="secondary"><TbX /> Error</Badge>
                                  )}
                                </td>
                                <td>
                                  {test.respuesta && <div className="text-success">✓ {test.respuesta}</div>}
                                  {test.error && (
                                    <div className="text-danger small">
                                      {test.error.substring(0, 200)}
                                      {test.error.length > 200 && '...'}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Modelos Funcionales */}
                {diagnostico.diagnostico.modelosFuncionales.length > 0 && (
                  <Card className="mb-3">
                    <CardBody>
                      <h5>Modelos Funcionales ({diagnostico.diagnostico.modelosFuncionales.length})</h5>
                      <ul>
                        {diagnostico.diagnostico.modelosFuncionales.map((modelo: string, idx: number) => (
                          <li key={idx}><code>{modelo}</code></li>
                        ))}
                      </ul>
                    </CardBody>
                  </Card>
                )}

                {/* Errores */}
                {diagnostico.diagnostico.errores.length > 0 && (
                  <Card className="mb-3">
                    <CardBody>
                      <h5 className="text-danger">Errores Encontrados</h5>
                      <div className="table-responsive">
                        <Table striped bordered hover size="sm">
                          <thead>
                            <tr>
                              <th>Paso</th>
                              <th>Status</th>
                              <th>Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diagnostico.diagnostico.errores.map((err: any, idx: number) => (
                              <tr key={idx}>
                                <td>{err.paso}</td>
                                <td>{err.status || '-'}</td>
                                <td className="small">
                                  {err.error || err.message || 'Error desconocido'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Timestamp */}
                <div className="text-muted small mt-3">
                  Última ejecución: {new Date(diagnostico.diagnostico.timestamp).toLocaleString()}
                </div>
              </div>
            )}

            {!diagnostico && !loading && !error && (
              <Alert variant="info" className="mt-3">
                Haz clic en "Ejecutar Diagnóstico" para comenzar.
              </Alert>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
