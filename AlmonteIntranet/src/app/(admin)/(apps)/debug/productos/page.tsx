'use client'

import { useState } from 'react'
import { Container, Card, CardHeader, CardBody, Button, Form, Alert, Table, Badge } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function DebugProductosPage() {
  const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; message: string; data?: any }>>([])
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    nombre_libro: 'Producto de Prueba Debug',
    precio: '1000',
    isbn_libro: '',
    descripcion: 'Descripción de prueba',
    subtitulo_libro: 'Subtítulo de prueba',
    stock_quantity: '1',
    plataformas: [] as string[],
  })

  const handlePlatformChange = (platform: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        plataformas: [...prev.plataformas, platform]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        plataformas: prev.plataformas.filter(p => p !== platform)
      }))
    }
  }

  const testCrearProducto = async () => {
    setLoading(true)
    setTestResult(null)
    setLogs([])

    const newLog = (level: string, message: string, data?: any) => {
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level,
        message,
        data
      }])
    }

    try {
      newLog('info', 'Iniciando prueba de creación de producto...')
      newLog('info', 'Datos del formulario:', formData)

      const payload: Record<string, unknown> = {
        nombre_libro: formData.nombre_libro.trim(),
        descripcion: formData.descripcion?.trim() || '',
        subtitulo_libro: formData.subtitulo_libro?.trim() || formData.nombre_libro.trim().slice(0, 160),
        isbn_libro: formData.isbn_libro?.trim() || '',
        precio: String(parseFloat(formData.precio) || 0),
        stock_quantity: formData.stock_quantity?.trim() || '1',
      }

      // Si se seleccionaron plataformas, asignar los canales correspondientes
      if (formData.plataformas.length > 0) {
        newLog('info', 'Plataformas seleccionadas:', formData.plataformas)
        let canalesIds: string[] = []
        try {
          newLog('info', 'Obteniendo canales desde /api/tienda/canales...')
          const canalesRes = await fetch('/api/tienda/canales')
          const canalesData = await canalesRes.json()
          newLog('info', 'Respuesta de canales:', canalesData)
          
          if (canalesData.success && Array.isArray(canalesData.data)) {
            for (const key of ['woo_moraleja', 'woo_escolar']) {
              if (!formData.plataformas.includes(key)) continue
              const canal = canalesData.data.find(
                (c: any) =>
                  (c.attributes?.key || c.key) === key ||
                  (c.attributes?.nombre || c.nombre || '').toLowerCase().includes(key === 'woo_moraleja' ? 'moraleja' : 'escolar')
              )
              const docId = canal?.documentId ?? canal?.id
              if (docId) {
                canalesIds.push(String(docId))
                newLog('info', `Canal ${key} encontrado:`, { docId, canal })
              }
            }
          }
        } catch (error: any) {
          newLog('error', 'Error al obtener canales:', error.message)
          // Si hay error al obtener canales, usar IDs por defecto
          if (formData.plataformas.includes('woo_moraleja')) canalesIds.push('1')
          if (formData.plataformas.includes('woo_escolar')) canalesIds.push('2')
          newLog('warning', 'Usando IDs de canales por defecto:', canalesIds)
        }
        if (canalesIds.length > 0) {
          payload.canales = canalesIds
          newLog('info', 'Canales asignados:', canalesIds)
        }
      } else {
        newLog('info', 'No se seleccionaron plataformas - se guardará sin canales')
      }

      newLog('info', 'Payload final a enviar:', payload)

      newLog('info', 'Enviando petición POST a /api/tienda/productos...')
      const response = await fetch('/api/tienda/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      newLog('info', 'Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      const data = await response.json()
      newLog('info', 'Datos de respuesta:', data)

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}: ${response.statusText}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Error al crear producto')
      }

      setTestResult({
        success: true,
        data: data.data,
        message: data.message,
      })
      newLog('success', '✅ Producto creado exitosamente!', data.data)
    } catch (error: any) {
      newLog('error', '❌ Error al crear producto:', {
        message: error.message,
        stack: error.stack,
        error: error,
      })
      setTestResult({
        success: false,
        error: error.message,
        details: error.details || error,
      })
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
    setTestResult(null)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Debug - Creación de Productos" subtitle="Debug" />
      
      <div className="row">
        <div className="col-md-6">
          <Card className="mb-4">
            <CardHeader>
              <h5>Formulario de Prueba</h5>
            </CardHeader>
            <CardBody>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre del producto *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.nombre_libro}
                    onChange={(e) => setFormData({ ...formData, nombre_libro: e.target.value })}
                    placeholder="Ej: Producto de Prueba"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Precio *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Stock</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>ISBN / SKU</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.isbn_libro}
                    onChange={(e) => setFormData({ ...formData, isbn_libro: e.target.value })}
                    placeholder="Opcional"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Descripción</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Descripción breve</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.subtitulo_libro}
                    onChange={(e) => setFormData({ ...formData, subtitulo_libro: e.target.value })}
                  />
                </Form.Group>

                <div className="bg-light border rounded p-3 mb-3">
                  <Form.Label className="fw-bold mb-2">Plataformas de publicación</Form.Label>
                  <div className="d-flex gap-4">
                    <Form.Check
                      type="checkbox"
                      id="debug_platform_moraleja"
                      label="Moraleja"
                      checked={formData.plataformas.includes('woo_moraleja')}
                      onChange={(e) => handlePlatformChange('woo_moraleja', e.target.checked)}
                    />
                    <Form.Check
                      type="checkbox"
                      id="debug_platform_escolar"
                      label="Escolar"
                      checked={formData.plataformas.includes('woo_escolar')}
                      onChange={(e) => handlePlatformChange('woo_escolar', e.target.checked)}
                    />
                  </div>
                  <Form.Text className="text-muted">
                    Si seleccionas plataformas, el producto se enviará directamente a esos canales. 
                    Si no seleccionas ninguna, se guardará solo en Strapi sin canales.
                  </Form.Text>
                </div>

                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    onClick={testCrearProducto}
                    disabled={loading || !formData.nombre_libro.trim()}
                  >
                    {loading ? 'Probando...' : 'Probar Creación'}
                  </Button>
                  <Button variant="secondary" onClick={clearLogs}>
                    Limpiar Logs
                  </Button>
                </div>
              </Form>
            </CardBody>
          </Card>

          {testResult && (
            <Card className="mb-4">
              <CardHeader>
                <h5>Resultado</h5>
              </CardHeader>
              <CardBody>
                {testResult.success ? (
                  <Alert variant="success">
                    <strong>✅ Éxito!</strong>
                    <pre className="mt-2 mb-0" style={{ fontSize: '0.9rem' }}>
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </Alert>
                ) : (
                  <Alert variant="danger">
                    <strong>❌ Error:</strong> {testResult.error}
                    {testResult.details && (
                      <pre className="mt-2 mb-0" style={{ fontSize: '0.9rem' }}>
                        {JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    )}
                  </Alert>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="col-md-6">
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <h5>Logs de Debug</h5>
              <Badge bg="secondary">{logs.length} logs</Badge>
            </CardHeader>
            <CardBody>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {logs.length === 0 ? (
                  <p className="text-muted">No hay logs aún. Haz clic en "Probar Creación" para comenzar.</p>
                ) : (
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th style={{ width: '150px' }}>Timestamp</th>
                        <th style={{ width: '80px' }}>Nivel</th>
                        <th>Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, index) => (
                        <tr key={index}>
                          <td style={{ fontSize: '0.8rem' }}>
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td>
                            <Badge
                              bg={
                                log.level === 'error' ? 'danger' :
                                log.level === 'warning' ? 'warning' :
                                log.level === 'success' ? 'success' :
                                'info'
                              }
                            >
                              {log.level}
                            </Badge>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}>
                              <div>{log.message}</div>
                              {log.data && (
                                <pre className="mt-1 mb-0" style={{ fontSize: '0.75rem', maxHeight: '100px', overflow: 'auto' }}>
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}
