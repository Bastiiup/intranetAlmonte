'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Row, Col, Form, ModalHeader, ModalTitle, ModalBody, FormGroup, FormLabel, FormControl, ModalFooter, Alert, Badge } from 'react-bootstrap'
import FlatPicker from 'react-flatpickr'
import { LuX, LuCheck } from 'react-icons/lu'

interface EmpresaOption {
  id: string | number
  documentId?: string
  empresa_nombre: string
  razon_social?: string
}

interface ProductoOption {
  id: string | number
  documentId?: string
  nombre_libro?: string
  nombre?: string
  sku?: string
}

interface CreateCotizacionModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

const CreateCotizacionModal = ({ show, onHide, onSuccess }: CreateCotizacionModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [productos, setProductos] = useState<ProductoOption[]>([])
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([])
  const [selectedProductos, setSelectedProductos] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    monto: '',
    moneda: 'CLP',
    estado: 'Borrador',
    fecha_envio: '',
    fecha_vencimiento: '',
    notas: '',
  })

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (show) {
      loadData()
      setFormData({
        nombre: '',
        descripcion: '',
        monto: '',
        moneda: 'CLP',
        estado: 'Borrador',
        fecha_envio: '',
        fecha_vencimiento: '',
        notas: '',
      })
      setSelectedEmpresas([])
      setSelectedProductos([])
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  const loadData = async () => {
    setLoadingData(true)
    try {
      // Cargar empresas
      const empresasRes = await fetch('/api/crm/empresas?pageSize=100')
      const empresasData = await empresasRes.json()
      if (empresasData.success && Array.isArray(empresasData.data)) {
        setEmpresas(empresasData.data.map((e: any) => {
          const attrs = e.attributes || e
          return {
            id: e.documentId || e.id,
            documentId: e.documentId,
            empresa_nombre: attrs.empresa_nombre || attrs.nombre || 'Sin nombre',
            razon_social: attrs.razon_social,
          }
        }))
      }

      // Cargar productos/libros (desde Strapi)
      const productosRes = await fetch('/api/tienda/productos?pageSize=100')
      const productosData = await productosRes.json()
      if (productosData.success && Array.isArray(productosData.data)) {
        setProductos(productosData.data.map((p: any) => {
          const attrs = p.attributes || p
          return {
            id: p.documentId || p.id,
            documentId: p.documentId,
            nombre_libro: attrs.nombre_libro || attrs.nombre || 'Sin nombre',
            nombre: attrs.nombre || attrs.nombre_libro,
            sku: attrs.sku,
          }
        }))
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
    setSelectedEmpresas((prev) => {
      if (prev.includes(empresaId)) {
        return prev.filter((id) => id !== empresaId)
      } else {
        return [...prev, empresaId]
      }
    })
  }

  const toggleProducto = (productoId: string) => {
    setSelectedProductos((prev) => {
      if (prev.includes(productoId)) {
        return prev.filter((id) => id !== productoId)
      } else {
        return [...prev, productoId]
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

      if (selectedEmpresas.length === 0) {
        throw new Error('Debes seleccionar al menos una empresa')
      }

      if (selectedProductos.length === 0) {
        throw new Error('Debes seleccionar al menos un producto/libro')
      }

      // Preparar datos para la API
      const cotizacionData = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || '',
        monto: formData.monto ? parseFloat(formData.monto) : 0,
        moneda: formData.moneda,
        estado: formData.estado,
        fecha_envio: formData.fecha_envio || null,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        notas: formData.notas?.trim() || '',
        empresas: selectedEmpresas,
        productos: selectedProductos,
      }

      const response = await fetch('/api/crm/cotizaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cotizacionData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear la cotización')
      }

      if (onSuccess) {
        onSuccess()
      }
      onHide()
    } catch (err: any) {
      setError(err.message || 'Error al crear la cotización')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <ModalHeader closeButton>
        <ModalTitle as="h5">Crear Nueva Cotización</ModalTitle>
      </ModalHeader>

      <Form onSubmit={handleSubmit}>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Row className="g-3">
            {/* Información Básica */}
            <Col md={12}>
              <h6 className="mb-3">Información Básica</h6>
            </Col>
            
            <Col md={6}>
              <FormGroup>
                <FormLabel>
                  Nombre de la Cotización <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Cotización - Libros Educativos 2026"
                  value={formData.nombre}
                  onChange={(e) => handleFieldChange('nombre', e.target.value)}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Estado</FormLabel>
                <Form.Select
                  value={formData.estado}
                  onChange={(e) => handleFieldChange('estado', e.target.value)}
                  disabled={loading}
                >
                  <option value="Borrador">Borrador</option>
                  <option value="Enviada">Enviada</option>
                  <option value="Aprobada">Aprobada</option>
                  <option value="Rechazada">Rechazada</option>
                  <option value="Vencida">Vencida</option>
                </Form.Select>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Descripción</FormLabel>
                <FormControl
                  as="textarea"
                  rows={3}
                  placeholder="Descripción detallada de la cotización..."
                  value={formData.descripcion}
                  onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            {/* Monto */}
            <Col md={4}>
              <FormGroup>
                <FormLabel>Monto</FormLabel>
                <FormControl
                  type="number"
                  placeholder="0"
                  value={formData.monto}
                  onChange={(e) => handleFieldChange('monto', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={4}>
              <FormGroup>
                <FormLabel>Moneda</FormLabel>
                <Form.Select
                  value={formData.moneda}
                  onChange={(e) => handleFieldChange('moneda', e.target.value)}
                  disabled={loading}
                >
                  <option value="CLP">CLP (Peso Chileno)</option>
                  <option value="USD">USD (Dólar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </Form.Select>
              </FormGroup>
            </Col>

            {/* Fechas */}
            <Col md={6}>
              <FormGroup>
                <FormLabel>Fecha de Envío</FormLabel>
                <FlatPicker
                  className="form-control"
                  value={formData.fecha_envio}
                  onChange={(dates) => {
                    if (dates && dates.length > 0) {
                      handleFieldChange('fecha_envio', new Date(dates[0]).toISOString().split('T')[0])
                    }
                  }}
                  options={{
                    dateFormat: 'Y-m-d',
                  }}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Fecha de Vencimiento</FormLabel>
                <FlatPicker
                  className="form-control"
                  value={formData.fecha_vencimiento}
                  onChange={(dates) => {
                    if (dates && dates.length > 0) {
                      handleFieldChange('fecha_vencimiento', new Date(dates[0]).toISOString().split('T')[0])
                    }
                  }}
                  options={{
                    dateFormat: 'Y-m-d',
                  }}
                />
              </FormGroup>
            </Col>

            {/* Empresas - Selección Múltiple */}
            <Col md={12}>
              <h6 className="mb-3 mt-3">Empresas Destinatarias <span className="text-danger">*</span></h6>
              <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {loadingData ? (
                  <div className="text-center text-muted">Cargando empresas...</div>
                ) : empresas.length === 0 ? (
                  <div className="text-center text-muted">No hay empresas disponibles</div>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {empresas.map((empresa) => {
                      const isSelected = selectedEmpresas.includes(String(empresa.id))
                      return (
                        <Badge
                          key={empresa.id}
                          bg={isSelected ? 'primary' : 'secondary'}
                          className="p-2 cursor-pointer"
                          onClick={() => !loading && toggleEmpresa(String(empresa.id))}
                          style={{ cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                        >
                          {isSelected && <LuCheck className="me-1" />}
                          {empresa.empresa_nombre}
                          {!isSelected && <LuX className="ms-2" />}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
              {selectedEmpresas.length > 0 && (
                <small className="text-muted mt-2 d-block">
                  {selectedEmpresas.length} empresa(s) seleccionada(s)
                </small>
              )}
            </Col>

            {/* Productos - Selección Múltiple */}
            <Col md={12}>
              <h6 className="mb-3 mt-3">Productos/Libros <span className="text-danger">*</span></h6>
              <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {loadingData ? (
                  <div className="text-center text-muted">Cargando productos...</div>
                ) : productos.length === 0 ? (
                  <div className="text-center text-muted">No hay productos disponibles</div>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {productos.map((producto) => {
                      const isSelected = selectedProductos.includes(String(producto.id))
                      return (
                        <Badge
                          key={producto.id}
                          bg={isSelected ? 'success' : 'secondary'}
                          className="p-2 cursor-pointer"
                          onClick={() => !loading && toggleProducto(String(producto.id))}
                          style={{ cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                        >
                          {isSelected && <LuCheck className="me-1" />}
                          {producto.nombre_libro || producto.nombre || 'Sin nombre'}
                          {producto.sku && ` (${producto.sku})`}
                          {!isSelected && <LuX className="ms-2" />}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
              {selectedProductos.length > 0 && (
                <small className="text-muted mt-2 d-block">
                  {selectedProductos.length} producto(s) seleccionado(s)
                </small>
              )}
            </Col>

            {/* Notas */}
            <Col md={12}>
              <FormGroup>
                <FormLabel>Notas Adicionales</FormLabel>
                <FormControl
                  as="textarea"
                  rows={2}
                  placeholder="Notas o comentarios adicionales..."
                  value={formData.notas}
                  onChange={(e) => handleFieldChange('notas', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading || loadingData}>
            {loading ? 'Creando...' : 'Crear Cotización'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default CreateCotizacionModal





