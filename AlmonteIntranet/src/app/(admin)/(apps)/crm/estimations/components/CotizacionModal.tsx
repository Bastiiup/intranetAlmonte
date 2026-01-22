'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col, Badge } from 'react-bootstrap'
import { LuCheck, LuX, LuPlus } from 'react-icons/lu'

interface EmpresaOption {
  id: number | string
  documentId?: string
  empresa_nombre?: string
  nombre?: string
  emails?: Array<{ email: string }>
}

interface ProductoOption {
  id: number | string
  documentId?: string
  nombre_libro?: string
  nombre?: string
  sku?: string
}

interface CotizacionModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
  cotizacion?: any // Para edición
}

const ESTADOS = [
  { value: 'Borrador', label: 'Borrador' },
  { value: 'Enviada', label: 'Enviada' },
  { value: 'Aprobada', label: 'Aprobada' },
  { value: 'Rechazada', label: 'Rechazada' },
  { value: 'Vencida', label: 'Vencida' },
]

const MONEDAS = [
  { value: 'CLP', label: 'CLP (Peso Chileno)' },
  { value: 'USD', label: 'USD (Dólar)' },
  { value: 'EUR', label: 'EUR (Euro)' },
]

const CotizacionModal = ({ show, onHide, onSuccess, cotizacion }: CotizacionModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [productos, setProductos] = useState<ProductoOption[]>([])
  const [loadingData, setLoadingData] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    monto: '',
    moneda: 'CLP',
    estado: 'Borrador',
    fecha_vencimiento: '',
    notas: '',
    empresasSeleccionadas: [] as string[],
    productosSeleccionados: [] as string[],
  })

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (show) {
      loadData()
      if (cotizacion) {
        // Modo edición: cargar datos de la cotización
        const attrs = cotizacion.attributes || cotizacion
        const empresasData = attrs.empresas?.data || attrs.empresas || []
        const productosData = attrs.productos?.data || attrs.productos || []
        
        setFormData({
          nombre: attrs.nombre || '',
          descripcion: attrs.descripcion || '',
          monto: attrs.monto ? String(attrs.monto) : '',
          moneda: attrs.moneda || 'CLP',
          estado: attrs.estado || 'Borrador',
          fecha_vencimiento: attrs.fecha_vencimiento || '',
          notas: attrs.notas || '',
          empresasSeleccionadas: empresasData.map((e: any) => String(e.id || e.documentId || e)),
          productosSeleccionados: productosData.map((p: any) => String(p.id || p.documentId || p)),
        })
      } else {
        // Modo creación: resetear formulario
        setFormData({
          nombre: '',
          descripcion: '',
          monto: '',
          moneda: 'CLP',
          estado: 'Borrador',
          fecha_vencimiento: '',
          notas: '',
          empresasSeleccionadas: [],
          productosSeleccionados: [],
        })
      }
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, cotizacion])

  const loadData = async () => {
    setLoadingData(true)
    try {
      // Cargar empresas
      const empresasRes = await fetch('/api/crm/empresas?pageSize=1000')
      const empresasData = await empresasRes.json()
      if (empresasData.success && Array.isArray(empresasData.data)) {
        setEmpresas(empresasData.data.map((e: any) => ({
          id: e.documentId || e.id,
          documentId: e.documentId,
          empresa_nombre: e.attributes?.empresa_nombre || e.empresa_nombre || e.attributes?.nombre || e.nombre,
          nombre: e.attributes?.nombre || e.nombre,
          emails: e.attributes?.emails || e.emails || [],
        })))
      }

      // Cargar productos (libros desde Strapi)
      const productosRes = await fetch('/api/tienda/productos?pagination[pageSize]=1000')
      const productosData = await productosRes.json()
      if (productosData.success && Array.isArray(productosData.data)) {
        setProductos(productosData.data.map((p: any) => ({
          id: p.documentId || p.id,
          documentId: p.documentId,
          nombre_libro: p.attributes?.nombre_libro || p.nombre_libro || p.attributes?.nombre || p.nombre,
          nombre: p.attributes?.nombre || p.nombre,
          sku: p.attributes?.sku || p.sku,
        })))
      }
    } catch (err) {
      console.error('Error al cargar datos:', err)
    } finally {
      setLoadingData(false)
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const toggleEmpresa = (empresaId: string) => {
    setFormData((prev) => {
      const empresas = prev.empresasSeleccionadas
      const index = empresas.indexOf(empresaId)
      if (index >= 0) {
        return {
          ...prev,
          empresasSeleccionadas: empresas.filter((id) => id !== empresaId),
        }
      } else {
        return {
          ...prev,
          empresasSeleccionadas: [...empresas, empresaId],
        }
      }
    })
  }

  const toggleProducto = (productoId: string) => {
    setFormData((prev) => {
      const productos = prev.productosSeleccionados
      const index = productos.indexOf(productoId)
      if (index >= 0) {
        return {
          ...prev,
          productosSeleccionados: productos.filter((id) => id !== productoId),
        }
      } else {
        return {
          ...prev,
          productosSeleccionados: [...productos, productoId],
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError(null)

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        throw new Error('El nombre de la cotización es obligatorio')
      }

      if (formData.empresasSeleccionadas.length === 0) {
        throw new Error('Debe seleccionar al menos una empresa')
      }

      // Preparar datos para la API
      const cotizacionData: any = {
        nombre: formData.nombre.trim(),
        ...(formData.descripcion && { descripcion: formData.descripcion.trim() }),
        ...(formData.monto && { monto: Number(formData.monto) }),
        moneda: formData.moneda,
        estado: formData.estado,
        ...(formData.fecha_vencimiento && { fecha_vencimiento: formData.fecha_vencimiento }),
        ...(formData.notas && { notas: formData.notas.trim() }),
        empresas: formData.empresasSeleccionadas,
        productos: formData.productosSeleccionados,
      }

      // Crear o actualizar
      const url = cotizacion 
        ? `/api/crm/cotizaciones/${cotizacion.documentId || cotizacion.id}`
        : '/api/crm/cotizaciones'
      
      const method = cotizacion ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cotizacionData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.error || result.details?.errors?.[0]?.message || 'Error al guardar cotización'
        throw new Error(errorMessage)
      }

      if (onSuccess) {
        onSuccess()
      }
      onHide()
    } catch (err: any) {
      console.error('Error al guardar cotización:', err)
      setError(err.message || 'Error al guardar cotización')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>{cotizacion ? 'Editar Cotización' : 'Nueva Cotización'}</ModalTitle>
        </ModalHeader>
        <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Row className="g-3">
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Nombre de la Cotización <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleFieldChange('nombre', e.target.value)}
                  placeholder="Ej: Cotización - Libros Educativos 2026"
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Descripción</FormLabel>
                <FormControl
                  as="textarea"
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                  placeholder="Descripción detallada de la cotización..."
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Monto</FormLabel>
                <FormControl
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monto}
                  onChange={(e) => handleFieldChange('monto', e.target.value)}
                  placeholder="0"
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Moneda</FormLabel>
                <FormControl
                  as="select"
                  value={formData.moneda}
                  onChange={(e) => handleFieldChange('moneda', e.target.value)}
                  disabled={loading}
                >
                  {MONEDAS.map((moneda) => (
                    <option key={moneda.value} value={moneda.value}>
                      {moneda.label}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Estado</FormLabel>
                <FormControl
                  as="select"
                  value={formData.estado}
                  onChange={(e) => handleFieldChange('estado', e.target.value)}
                  disabled={loading}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Fecha de Vencimiento</FormLabel>
                <FormControl
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => handleFieldChange('fecha_vencimiento', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Notas</FormLabel>
                <FormControl
                  as="textarea"
                  rows={2}
                  value={formData.notas}
                  onChange={(e) => handleFieldChange('notas', e.target.value)}
                  placeholder="Notas o comentarios adicionales..."
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Empresas <span className="text-danger">*</span>
                  {formData.empresasSeleccionadas.length > 0 && (
                    <Badge bg="primary" className="ms-2">
                      {formData.empresasSeleccionadas.length} seleccionada(s)
                    </Badge>
                  )}
                </FormLabel>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem', padding: '0.5rem' }}>
                  {loadingData ? (
                    <div className="text-center py-3">
                      <small className="text-muted">Cargando empresas...</small>
                    </div>
                  ) : empresas.length === 0 ? (
                    <div className="text-center py-3">
                      <small className="text-muted">No hay empresas disponibles</small>
                    </div>
                  ) : (
                    empresas.map((empresa) => {
                      const isSelected = formData.empresasSeleccionadas.includes(String(empresa.id))
                      const empresaNombre = empresa.empresa_nombre || empresa.nombre || `Empresa ${empresa.id}`
                      const empresaEmail = empresa.emails?.[0]?.email || 'Sin email'
                      return (
                        <div
                          key={empresa.id}
                          onClick={() => !loading && toggleEmpresa(String(empresa.id))}
                          style={{
                            padding: '0.5rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            backgroundColor: isSelected ? '#e7f3ff' : 'transparent',
                            borderRadius: '0.25rem',
                            marginBottom: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => !loading && toggleEmpresa(String(empresa.id))}
                            disabled={loading}
                            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{empresaNombre}</div>
                            <small className="text-muted">{empresaEmail}</small>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <small className="text-muted">Seleccione una o más empresas para esta cotización</small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Productos
                  {formData.productosSeleccionados.length > 0 && (
                    <Badge bg="primary" className="ms-2">
                      {formData.productosSeleccionados.length} seleccionado(s)
                    </Badge>
                  )}
                </FormLabel>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem', padding: '0.5rem' }}>
                  {loadingData ? (
                    <div className="text-center py-3">
                      <small className="text-muted">Cargando productos...</small>
                    </div>
                  ) : productos.length === 0 ? (
                    <div className="text-center py-3">
                      <small className="text-muted">No hay productos disponibles</small>
                    </div>
                  ) : (
                    productos.map((producto) => {
                      const isSelected = formData.productosSeleccionados.includes(String(producto.id))
                      const productoNombre = producto.nombre_libro || producto.nombre || `Producto ${producto.id}`
                      return (
                        <div
                          key={producto.id}
                          onClick={() => !loading && toggleProducto(String(producto.id))}
                          style={{
                            padding: '0.5rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            backgroundColor: isSelected ? '#e7f3ff' : 'transparent',
                            borderRadius: '0.25rem',
                            marginBottom: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => !loading && toggleProducto(String(producto.id))}
                            disabled={loading}
                            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{productoNombre}</div>
                            {producto.sku && (
                              <small className="text-muted">SKU: {producto.sku}</small>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <small className="text-muted">Seleccione los productos incluidos en esta cotización (opcional)</small>
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <LuCheck className="me-1" />
            {loading ? 'Guardando...' : cotizacion ? 'Actualizar Cotización' : 'Crear Cotización'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default CotizacionModal

