'use client'

import { useState } from 'react'
import { Container, Card, CardHeader, CardBody, Button, Form, FormGroup, FormLabel, FormControl, Alert, Spinner, Row, Col, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function DebugPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [personaId, setPersonaId] = useState('')
  const [colegioId, setColegioId] = useState('')
  const [trayectoriaId, setTrayectoriaId] = useState('')
  
  const [createPersonaId, setCreatePersonaId] = useState('')
  const [createColegioId, setCreateColegioId] = useState('')
  const [createCargo, setCreateCargo] = useState('')

  const [listLoading, setListLoading] = useState(false)
  const [listResult, setListResult] = useState<any>(null)
  const [listType, setListType] = useState<'personas' | 'colegios' | 'trayectorias'>('personas')

  const consultarTrayectorias = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const params = new URLSearchParams()
      if (personaId) params.append('personaId', personaId)
      if (colegioId) params.append('colegioId', colegioId)
      if (trayectoriaId) params.append('trayectoriaId', trayectoriaId)
      
      const url = `/api/debug/strapi-trayectorias?${params.toString()}`
      console.log('Consultando:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en la consulta')
      }
      
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Error al consultar')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const crearTrayectoria = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      if (!createPersonaId || !createColegioId) {
        throw new Error('PersonaId y ColegioId son requeridos')
      }
      
      const response = await fetch('/api/debug/strapi-create-trayectoria', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personaId: parseInt(createPersonaId),
          colegioId: parseInt(createColegioId),
          cargo: createCargo || null,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear trayectoria')
      }
      
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Error al crear trayectoria')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const listarIds = async () => {
    setListLoading(true)
    setListResult(null)
    
    try {
      const response = await fetch(`/api/debug/list-ids?tipo=${listType}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al listar')
      }
      
      setListResult(data)
    } catch (err: any) {
      setError(err.message || 'Error al listar')
      console.error('Error:', err)
    } finally {
      setListLoading(false)
    }
  }

  return (
    <Container fluid>
      <PageBreadcrumb
        title="Diagnóstico Strapi - Trayectorias"
        subtitle="Herramientas de diagnóstico para consultar y crear trayectorias"
      />

      <Row>
        <Col md={6}>
          <Card>
            <CardHeader>
              <h5>🔍 Consultar Trayectorias</h5>
            </CardHeader>
            <CardBody>
              <Form>
                <FormGroup className="mb-3">
                  <FormLabel>Persona ID (opcional)</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: 12345"
                    value={personaId}
                    onChange={(e) => setPersonaId(e.target.value)}
                  />
                  <small className="text-muted">ID numérico o documentId de la persona</small>
                </FormGroup>

                <FormGroup className="mb-3">
                  <FormLabel>Colegio ID (opcional)</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: 67890"
                    value={colegioId}
                    onChange={(e) => setColegioId(e.target.value)}
                  />
                  <small className="text-muted">ID numérico o documentId del colegio</small>
                </FormGroup>

                <FormGroup className="mb-3">
                  <FormLabel>Trayectoria ID (opcional)</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: abc123"
                    value={trayectoriaId}
                    onChange={(e) => setTrayectoriaId(e.target.value)}
                  />
                  <small className="text-muted">ID o documentId de la trayectoria específica</small>
                </FormGroup>

                <Button
                  variant="primary"
                  onClick={consultarTrayectorias}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Consultando...
                    </>
                  ) : (
                    'Consultar Trayectorias'
                  )}
                </Button>

                <small className="d-block text-muted mt-2">
                  💡 Deja los campos vacíos para ver la estructura general de trayectorias
                </small>
              </Form>
            </CardBody>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <CardHeader>
              <h5>➕ Probar Crear Trayectoria</h5>
            </CardHeader>
            <CardBody>
              <Form>
                <FormGroup className="mb-3">
                  <FormLabel>Persona ID *</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: 12345"
                    value={createPersonaId}
                    onChange={(e) => setCreatePersonaId(e.target.value)}
                    required
                  />
                  <small className="text-muted">ID numérico de la persona</small>
                </FormGroup>

                <FormGroup className="mb-3">
                  <FormLabel>Colegio ID *</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: 67890"
                    value={createColegioId}
                    onChange={(e) => setCreateColegioId(e.target.value)}
                    required
                  />
                  <small className="text-muted">ID numérico del colegio</small>
                </FormGroup>

                <FormGroup className="mb-3">
                  <FormLabel>Cargo (opcional)</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Profesor"
                    value={createCargo}
                    onChange={(e) => setCreateCargo(e.target.value)}
                  />
                </FormGroup>

                <Button
                  variant="success"
                  onClick={crearTrayectoria}
                  disabled={loading || !createPersonaId || !createColegioId}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Creando...
                    </>
                  ) : (
                    'Probar Crear Trayectoria'
                  )}
                </Button>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mt-3">
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {result && (
        <Card className="mt-3">
          <CardHeader>
            <h5>📊 Resultado</h5>
          </CardHeader>
          <CardBody>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '15px', 
              borderRadius: '5px',
              overflow: 'auto',
              maxHeight: '600px',
              fontSize: '12px'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
            
            <div className="mt-3">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(result, null, 2))
                  alert('Resultado copiado al portapapeles')
                }}
              >
                📋 Copiar Resultado
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="mt-3">
        <CardHeader>
          <h5>📋 Listar IDs Disponibles</h5>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Tipo</FormLabel>
                <Form.Select value={listType} onChange={(e) => setListType(e.target.value as any)}>
                  <option value="personas">Personas</option>
                  <option value="colegios">Colegios</option>
                  <option value="trayectorias">Trayectorias</option>
                </Form.Select>
              </FormGroup>
            </Col>
            <Col md={8} className="d-flex align-items-end">
              <Button
                variant="info"
                onClick={listarIds}
                disabled={listLoading}
              >
                {listLoading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Listando...
                  </>
                ) : (
                  'Listar IDs'
                )}
              </Button>
            </Col>
          </Row>

          {listResult && (
            <div className="mt-3">
              <Alert variant="info">
                <strong>Total encontrados:</strong> {listResult.total || listResult.data?.length || 0}
                {listResult.contentTypeName && (
                  <><br /><strong>Content Type:</strong> {listResult.contentTypeName}</>
                )}
              </Alert>
              
              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>ID Numérico</th>
                      <th>Document ID</th>
                      {listType === 'personas' && (
                        <>
                          <th>Nombre</th>
                          <th>RUT</th>
                        </>
                      )}
                      {listType === 'colegios' && (
                        <>
                          <th>Nombre</th>
                          <th>RBD</th>
                          <th>Dependencia</th>
                          <th>Estado</th>
                        </>
                      )}
                      {listType === 'trayectorias' && (
                        <>
                          <th>Cargo</th>
                          <th>Año</th>
                          <th>Persona</th>
                          <th>Colegio</th>
                          <th>Curso</th>
                          <th>Asignatura</th>
                          <th>Actual</th>
                        </>
                      )}
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listResult.data?.map((item: any) => (
                      <tr key={item.id || item.documentId}>
                        <td>{item.id || '-'}</td>
                        <td><small>{item.documentId || '-'}</small></td>
                        {listType === 'personas' && (
                          <>
                            <td>{item.nombre || '-'}</td>
                            <td>{item.rut || '-'}</td>
                          </>
                        )}
                        {listType === 'colegios' && (
                          <>
                            <td>{item.nombre || '-'}</td>
                            <td>{item.rbd || '-'}</td>
                            <td>{item.dependencia || '-'}</td>
                            <td>{item.estado || '-'}</td>
                          </>
                        )}
                        {listType === 'trayectorias' && (
                          <>
                            <td>{item.cargo || '-'}</td>
                            <td>{item.anio || '-'}</td>
                            <td><small>{item.persona?.nombre || '-'} (ID: {item.persona?.id || item.persona?.documentId || '-'})</small></td>
                            <td><small>{item.colegio?.nombre || '-'} (ID: {item.colegio?.id || item.colegio?.documentId || '-'})</small></td>
                            <td><small>{item.curso?.nombre || '-'}</small></td>
                            <td><small>{item.asignatura?.nombre || '-'}</small></td>
                            <td>{item.is_current ? '✅' : '❌'}</td>
                          </>
                        )}
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              const idToUse = item.id || item.documentId
                              if (listType === 'personas') {
                                setPersonaId(String(idToUse))
                                setCreatePersonaId(String(item.id || ''))
                              } else if (listType === 'colegios') {
                                setColegioId(String(idToUse))
                                setCreateColegioId(String(item.id || ''))
                              } else if (listType === 'trayectorias') {
                                setTrayectoriaId(String(idToUse))
                              }
                            }}
                          >
                            Usar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          {listResult?.errors && listResult.errors.length > 0 && (
            <Alert variant="warning" className="mt-3">
              <strong>Errores:</strong>
              <ul>
                {listResult.errors.map((err: any, idx: number) => (
                  <li key={idx}>{err.error || err.message}</li>
                ))}
              </ul>
            </Alert>
          )}
        </CardBody>
      </Card>

      <Card className="mt-3">
        <CardHeader>
          <h5>📝 Instrucciones</h5>
        </CardHeader>
        <CardBody>
          <ol>
            <li>
              <strong>Para consultar trayectorias:</strong>
              <ul>
                <li>Deja todos los campos vacíos para ver la estructura general</li>
                <li>Ingresa un Persona ID para ver las trayectorias de esa persona</li>
                <li>Ingresa un Colegio ID para ver las trayectorias de ese colegio</li>
                <li>Ingresa un Trayectoria ID para ver una trayectoria específica</li>
              </ul>
            </li>
            <li>
              <strong>Para probar crear una trayectoria:</strong>
              <ul>
                <li>Necesitas el ID numérico de una persona existente</li>
                <li>Necesitas el ID numérico de un colegio existente</li>
                <li>El cargo es opcional</li>
                <li>Esto creará una trayectoria de prueba en Strapi</li>
              </ul>
            </li>
            <li>
              <strong>Para obtener IDs:</strong>
              <ul>
                <li>Ve a la página de Contactos y abre la consola (F12)</li>
                <li>Busca en los logs el ID de un contacto</li>
                <li>O ve a la página de Colegios y busca un ID</li>
              </ul>
            </li>
          </ol>
        </CardBody>
      </Card>
    </Container>
  )
}
