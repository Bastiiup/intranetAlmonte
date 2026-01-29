'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Form, FormGroup, FormLabel, FormControl, Button, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap'
import { LuSend, LuUpload, LuFileText, LuCheck } from 'react-icons/lu'

interface RFQData {
  id: string | number
  numero_rfq: string
  nombre: string
  descripcion?: string
  fecha_vencimiento?: string
  moneda: string
  productos: Array<{ 
    id: string | number
    documentId?: string
    nombre: string
    isbn?: string
    sku?: string
  }>
  empresas: Array<{ id: string | number; nombre: string }>
  productos_cantidades?: Record<string, number>
}

export default function QuoteReplyPage() {
  const params = useParams()
  const token = params.token as string

  const [rfq, setRfq] = useState<RFQData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    empresa_id: '',
    contacto_id: '',
    moneda: 'CLP',
    notas: '',
    fecha_validez: '',
    archivo_pdf: null as File | null,
  })
  
  // Estado para precios unitarios por producto
  const [productosPrecios, setProductosPrecios] = useState<Record<string, number>>({})

  // Cargar datos de RFQ
  useEffect(() => {
    const loadRFQ = async () => {
      try {
        const response = await fetch(`/api/public/quote-reply/${token}`)
        const result = await response.json()

        if (!result.success) {
          setError(result.error || 'No se pudo cargar la solicitud de cotización')
          return
        }

        setRfq(result.data)
        
        // Si solo hay una empresa, seleccionarla automáticamente
        if (result.data.empresas && result.data.empresas.length === 1) {
          setFormData(prev => ({
            ...prev,
            empresa_id: String(result.data.empresas[0].id),
            moneda: result.data.moneda || 'CLP',
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            moneda: result.data.moneda || 'CLP',
          }))
        }
        
        // Inicializar precios en 0 para cada producto
        if (result.data.productos && result.data.productos_cantidades) {
          const preciosIniciales: Record<string, number> = {}
          result.data.productos.forEach((prod: any) => {
            const prodId = String(prod.documentId || prod.id)
            preciosIniciales[prodId] = 0
          })
          setProductosPrecios(preciosIniciales)
        }
      } catch (err: any) {
        console.error('Error al cargar RFQ:', err)
        setError('Error al cargar la solicitud de cotización')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      loadRFQ()
    }
  }, [token])

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }
  
  const handleProductoPrecioChange = (productoId: string, precio: number) => {
    setProductosPrecios(prev => ({
      ...prev,
      [productoId]: precio,
    }))
  }
  
  // Calcular total automáticamente
  const calcularTotal = (): number => {
    if (!rfq || !rfq.productos || !rfq.productos_cantidades) return 0
    
    let total = 0
    rfq.productos.forEach((producto) => {
      const prodId = String(producto.documentId || producto.id)
      const cantidad = rfq.productos_cantidades?.[prodId] || rfq.productos_cantidades?.[String(producto.id)] || 1
      const precioUnitario = productosPrecios[prodId] || 0
      total += cantidad * precioUnitario
    })
    
    return total
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF')
        return
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setError('El archivo PDF no puede ser mayor a 10MB')
        return
      }
      setFormData(prev => ({
        ...prev,
        archivo_pdf: file,
      }))
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Validaciones
      if (!formData.empresa_id) {
        throw new Error('Debe seleccionar una empresa')
      }

      const totalCalculado = calcularTotal()
      if (totalCalculado <= 0) {
        throw new Error('Debe ingresar precios unitarios para al menos un producto')
      }

      // Preparar items para enviar
      const items: Array<{
        producto: string
        cantidad: number
        precio_unitario: number
        subtotal: number
      }> = []
      
      if (rfq && rfq.productos && rfq.productos_cantidades) {
        rfq.productos.forEach((producto) => {
          const prodId = String(producto.documentId || producto.id)
          const cantidad = rfq.productos_cantidades?.[prodId] || rfq.productos_cantidades?.[String(producto.id)] || 1
          const precioUnitario = productosPrecios[prodId] || 0
          
          if (precioUnitario > 0) {
            items.push({
              producto: prodId,
              cantidad: cantidad,
              precio_unitario: precioUnitario,
              subtotal: cantidad * precioUnitario,
            })
          }
        })
      }
      
      if (items.length === 0) {
        throw new Error('Debe ingresar precios para al menos un producto')
      }

      // Preparar FormData para enviar
      const submitFormData = new FormData()
      submitFormData.append('empresa_id', formData.empresa_id)
      if (formData.contacto_id) submitFormData.append('contacto_id', formData.contacto_id)
      submitFormData.append('precio_total', totalCalculado.toString())
      submitFormData.append('moneda', formData.moneda)
      if (formData.notas) submitFormData.append('notas', formData.notas)
      if (formData.fecha_validez) submitFormData.append('fecha_validez', formData.fecha_validez)
      if (formData.archivo_pdf) submitFormData.append('archivo_pdf', formData.archivo_pdf)
      submitFormData.append('items', JSON.stringify(items))

      const response = await fetch(`/api/public/quote-reply/${token}`, {
        method: 'POST',
        body: submitFormData,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al enviar la cotización')
      }

      setSuccess(true)
    } catch (err: any) {
      console.error('Error al enviar cotización:', err)
      setError(err.message || 'Error al enviar la cotización')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando solicitud de cotización...</p>
        </div>
      </Container>
    )
  }

  if (error && !rfq) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    )
  }

  if (success) {
    return (
      <Container className="py-5">
        <Card className="border-success">
          <CardBody className="text-center py-5">
            <div className="mb-4">
              <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle" style={{ width: '80px', height: '80px' }}>
                <LuCheck size={40} className="text-success" />
              </div>
            </div>
            <h2 className="text-success mb-3">¡Cotización Enviada Exitosamente!</h2>
            <p className="text-muted mb-4">
              Su cotización ha sido recibida y será revisada por nuestro equipo.
              Nos pondremos en contacto con usted a la brevedad.
            </p>
            <p className="text-muted small">
              Puede cerrar esta ventana.
            </p>
          </CardBody>
        </Card>
      </Container>
    )
  }

  if (!rfq) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <Alert.Heading>Solicitud no encontrada</Alert.Heading>
          <p>No se pudo cargar la solicitud de cotización. Verifique que el enlace sea correcto.</p>
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="py-5">
      <Card className="mb-4">
        <CardHeader className="bg-primary text-white">
          <h3 className="mb-0">Responder Solicitud de Cotización</h3>
        </CardHeader>
        <CardBody>
          <div className="mb-4">
            <h4>{rfq.numero_rfq}</h4>
            <h5 className="text-muted">{rfq.nombre}</h5>
            {rfq.descripcion && (
              <p className="mt-3">{rfq.descripcion}</p>
            )}
            {rfq.fecha_vencimiento && (
              <p className="text-muted mt-2">
                <strong>Fecha límite:</strong> {new Date(rfq.fecha_vencimiento).toLocaleDateString('es-CL')}
              </p>
            )}
          </div>

          {rfq.productos && rfq.productos.length > 0 && (
            <div className="mb-4">
              <h5>Productos Solicitados:</h5>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>ISBN/SKU</th>
                      <th>Cantidad</th>
                      <th>Precio Unitario *</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.productos.map((producto) => {
                      const prodId = String(producto.documentId || producto.id)
                      const cantidad = rfq.productos_cantidades?.[prodId] || rfq.productos_cantidades?.[String(producto.id)] || 1
                      const precioUnitario = productosPrecios[prodId] || 0
                      const subtotal = cantidad * precioUnitario
                      
                      return (
                        <tr key={producto.id}>
                          <td>
                            <strong>{producto.nombre}</strong>
                          </td>
                          <td>
                            <small className="text-muted">
                              {producto.isbn || producto.sku || '-'}
                            </small>
                          </td>
                          <td>
                            <Badge bg="primary">{cantidad}</Badge>
                          </td>
                          <td>
                            <FormControl
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={precioUnitario || ''}
                              onChange={(e) => handleProductoPrecioChange(prodId, parseFloat(e.target.value) || 0)}
                              disabled={submitting}
                              style={{ width: '120px' }}
                            />
                          </td>
                          <td>
                            <strong>
                              {subtotal > 0 
                                ? `${formData.moneda} ${subtotal.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '-'}
                            </strong>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={4} className="text-end">Total:</th>
                      <th>
                        {calcularTotal() > 0 
                          ? `${formData.moneda} ${calcularTotal().toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '-'}
                      </th>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <small className="text-muted">* Ingrese el precio unitario para cada producto</small>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h5 className="mb-0">Completar Cotización</h5>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>
                    Empresa <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    as="select"
                    value={formData.empresa_id}
                    onChange={(e) => handleFieldChange('empresa_id', e.target.value)}
                    required
                    disabled={submitting || (rfq.empresas && rfq.empresas.length === 1)}
                  >
                    <option value="">Seleccionar empresa...</option>
                    {rfq.empresas?.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre}
                      </option>
                    ))}
                  </FormControl>
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>Moneda</FormLabel>
                  <FormControl
                    as="select"
                    value={formData.moneda}
                    onChange={(e) => handleFieldChange('moneda', e.target.value)}
                    disabled={submitting}
                  >
                    <option value="CLP">CLP (Peso Chileno)</option>
                    <option value="USD">USD (Dólar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </FormControl>
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>Fecha de Validez (Opcional)</FormLabel>
                  <FormControl
                    type="date"
                    value={formData.fecha_validez}
                    onChange={(e) => handleFieldChange('fecha_validez', e.target.value)}
                    disabled={submitting}
                  />
                </FormGroup>
              </Col>
            </Row>

            <FormGroup className="mb-3">
              <FormLabel>Notas o Comentarios</FormLabel>
              <FormControl
                as="textarea"
                rows={4}
                placeholder="Agregue cualquier información adicional sobre su cotización..."
                value={formData.notas}
                onChange={(e) => handleFieldChange('notas', e.target.value)}
                disabled={submitting}
              />
            </FormGroup>

            <FormGroup className="mb-3">
              <FormLabel>
                <LuFileText className="me-2" />
                Subir PDF de Cotización (Opcional)
              </FormLabel>
              <FormControl
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={submitting}
              />
              <small className="text-muted">
                Máximo 10MB. Si sube un PDF, puede omitir llenar los campos anteriores.
              </small>
              {formData.archivo_pdf && (
                <div className="mt-2">
                  <Alert variant="info" className="mb-0 py-2">
                    <LuUpload className="me-2" />
                    Archivo seleccionado: {formData.archivo_pdf.name}
                  </Alert>
                </div>
              )}
            </FormGroup>

            <div className="d-grid gap-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <LuSend className="me-2" />
                    Enviar Cotización
                  </>
                )}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
    </Container>
  )
}


