'use client'

import { useState, useEffect } from 'react'
import { Container, Card, CardBody, Alert, Spinner, Form, FormGroup, FormLabel, FormControl, Button, Badge, Row, Col } from 'react-bootstrap'
import { TbCheck, TbX, TbCurrencyDollar } from 'react-icons/tb'

export default function CotizacionPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string>('')
  const [cotizacion, setCotizacion] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    valor_empresa: '',
    empresa_id: '',
    notas: '',
  })

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params
      setToken(resolvedParams.token)
    }
    loadParams()
  }, [params])

  useEffect(() => {
    if (!token) return

    const fetchCotizacion = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/cotizacion/${token}`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Error al cargar la cotización')
        }

        const data = result.data
        const attrs = data.attributes || data
        
        setCotizacion(data)
        
        // Si hay empresas, seleccionar la primera por defecto
        const empresas = attrs.empresas?.data || attrs.empresas || []
        if (empresas.length > 0) {
          const primeraEmpresa = empresas[0]
          setFormData(prev => ({
            ...prev,
            empresa_id: primeraEmpresa.id || primeraEmpresa.documentId || '',
          }))
        }

        // Si ya hay una respuesta de esta empresa, prellenar el formulario
        const respuestas = attrs.respuestas_empresas || []
        if (respuestas.length > 0 && empresas.length > 0) {
          const empresaId = empresas[0].id || empresas[0].documentId
          const respuestaExistente = respuestas.find(
            (r: any) => String(r.empresa_id) === String(empresaId)
          )
          if (respuestaExistente) {
            setFormData(prev => ({
              ...prev,
              valor_empresa: String(respuestaExistente.valor_empresa || ''),
              notas: respuestaExistente.notas || '',
            }))
            setSuccess(true)
          }
        }
      } catch (err: any) {
        console.error('Error al cargar cotización:', err)
        setError(err.message || 'Error al cargar la cotización')
      } finally {
        setLoading(false)
      }
    }

    fetchCotizacion()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (!formData.valor_empresa || isNaN(Number(formData.valor_empresa))) {
        throw new Error('Por favor, ingrese un valor válido')
      }

      const response = await fetch(`/api/cotizacion/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valor_empresa: Number(formData.valor_empresa),
          empresa_id: formData.empresa_id,
          notas: formData.notas,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al enviar la respuesta')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Error al enviar la respuesta')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (monto?: number, moneda?: string) => {
    if (!monto) return '-'
    const currency = moneda || 'CLP'
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: currency === 'CLP' ? 'CLP' : currency === 'USD' ? 'USD' : 'EUR',
    }).format(monto)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <Container fluid className="py-5">
        <div className="text-center">
          <Spinner animation="border" className="mb-3" />
          <p>Cargando cotización...</p>
        </div>
      </Container>
    )
  }

  if (error && !cotizacion) {
    return (
      <Container fluid className="py-5" style={{ maxWidth: '800px' }}>
        <Alert variant="danger">
          <h4>Error</h4>
          <p>{error}</p>
        </Alert>
      </Container>
    )
  }

  if (!cotizacion) {
    return null
  }

  const attrs = cotizacion.attributes || cotizacion
  const empresas = attrs.empresas?.data || attrs.empresas || []
  const productos = attrs.productos?.data || attrs.productos || []
  const estado = attrs.estado || 'Borrador'

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Aprobada':
        return 'success'
      case 'Enviada':
        return 'info'
      case 'Rechazada':
        return 'danger'
      case 'Vencida':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  return (
    <Container fluid className="py-5" style={{ maxWidth: '900px' }}>
      <div className="text-center mb-4">
        <h1 className="h2 mb-2">Cotización de Productos</h1>
        <Badge bg={getEstadoColor(estado)} className="fs-6">
          {estado}
        </Badge>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <TbCheck className="me-2" />
          <strong>¡Respuesta enviada exitosamente!</strong> Gracias por proporcionar su valor estimado.
        </Alert>
      )}

      <Card className="mb-4">
        <CardBody>
          <h3 className="h4 mb-3">{attrs.nombre || 'Cotización'}</h3>
          
          {attrs.descripcion && (
            <p className="text-muted mb-4">{attrs.descripcion}</p>
          )}

          <Row className="mb-4">
            {attrs.monto && (
              <Col md={6}>
                <div className="mb-3">
                  <strong>Monto Estimado:</strong>
                  <div className="h5 text-primary mt-1">
                    {formatCurrency(attrs.monto, attrs.moneda)}
                  </div>
                </div>
              </Col>
            )}
            {attrs.fecha_vencimiento && (
              <Col md={6}>
                <div className="mb-3">
                  <strong>Válida hasta:</strong>
                  <div className="mt-1">{formatDate(attrs.fecha_vencimiento)}</div>
                </div>
              </Col>
            )}
          </Row>

          {productos.length > 0 && (
            <div className="mb-4">
              <h4 className="h5 mb-3">Productos incluidos:</h4>
              <div className="list-group">
                {productos.map((prod: any, index: number) => {
                  const prodAttrs = prod.attributes || prod
                  const prodNombre = prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto'
                  return (
                    <div key={index} className="list-group-item">
                      <div className="d-flex align-items-center">
                        <TbCheck className="text-success me-2" size={20} />
                        <span>{prodNombre}</span>
                        {prodAttrs.sku && (
                          <Badge bg="secondary" className="ms-auto">
                            SKU: {prodAttrs.sku}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {empresas.length > 0 && (
            <div className="mb-4">
              <h4 className="h5 mb-3">Empresa destinataria:</h4>
              <p className="mb-0">
                <strong>{empresas[0].attributes?.empresa_nombre || empresas[0].empresa_nombre || empresas[0].nombre || 'Empresa'}</strong>
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="h4 mb-4">
            <TbCurrencyDollar className="me-2" />
            Proporcione su Valor Estimado
          </h3>

          <Form onSubmit={handleSubmit}>
            <FormGroup className="mb-3">
              <FormLabel>
                Valor Estimado <span className="text-danger">*</span>
              </FormLabel>
              <FormControl
                type="number"
                placeholder="Ingrese el valor en CLP"
                value={formData.valor_empresa}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_empresa: e.target.value }))}
                required
                disabled={submitting || success}
                min="0"
                step="0.01"
              />
              <small className="text-muted">
                Ingrese el valor que su empresa puede ofrecer para esta cotización
              </small>
            </FormGroup>

            <FormGroup className="mb-3">
              <FormLabel>Notas o Comentarios</FormLabel>
              <FormControl
                as="textarea"
                rows={4}
                placeholder="Agregue cualquier comentario, condición o información adicional..."
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                disabled={submitting || success}
              />
            </FormGroup>

            <div className="d-grid gap-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={submitting || success}
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Enviando...
                  </>
                ) : success ? (
                  <>
                    <TbCheck className="me-2" />
                    Respuesta Enviada
                  </>
                ) : (
                  <>
                    <TbCurrencyDollar className="me-2" />
                    Enviar Valor Estimado
                  </>
                )}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>

      <div className="mt-4 p-3 bg-light rounded text-center">
        <p className="text-muted mb-0 small">
          Esta cotización es confidencial. Sus datos están protegidos y solo se utilizarán para procesar esta cotización.
        </p>
      </div>
    </Container>
  )
}





