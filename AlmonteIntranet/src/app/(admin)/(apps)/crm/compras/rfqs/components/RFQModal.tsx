'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col, Badge } from 'react-bootstrap'
import { LuCheck, LuX, LuPlus } from 'react-icons/lu'

interface EmpresaOption {
  id: number | string
  internalId?: number
  documentId?: string
  empresa_nombre?: string
  nombre?: string
  emails?: Array<{ email: string }>
}

interface ProductoOption {
  id: number | string
  internalId?: number
  documentId?: string
  nombre_libro?: string
  nombre?: string
  sku?: string
}

interface RFQModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
  rfq?: any // Para edición
}

const MONEDAS = [
  { value: 'CLP', label: 'CLP (Peso Chileno)' },
  { value: 'USD', label: 'USD (Dólar)' },
  { value: 'EUR', label: 'EUR (Euro)' },
]

const RFQModal = ({ show, onHide, onSuccess, rfq }: RFQModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [productos, setProductos] = useState<ProductoOption[]>([])
  const [loadingData, setLoadingData] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    moneda: 'CLP',
    notas_internas: '',
    empresasSeleccionadas: [] as string[],
    productosSeleccionados: [] as string[],
  })

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (show) {
      loadData()
      if (rfq) {
        // Modo edición: cargar datos de la RFQ
        const attrs = rfq.attributes || rfq
        const empresasData = attrs.empresas?.data || attrs.empresas || []
        const productosData = attrs.productos?.data || attrs.productos || []
        
        setFormData({
          nombre: attrs.nombre || '',
          descripcion: attrs.descripcion || '',
          fecha_solicitud: attrs.fecha_solicitud || new Date().toISOString().split('T')[0],
          fecha_vencimiento: attrs.fecha_vencimiento || '',
          moneda: attrs.moneda || 'CLP',
          notas_internas: attrs.notas_internas || '',
          empresasSeleccionadas: empresasData.map((e: any) => String(e.id || e.documentId || e)),
          productosSeleccionados: productosData.map((p: any) => String(p.id || p.documentId || p)),
        })
      } else {
        // Modo creación: resetear formulario
        setFormData({
          nombre: '',
          descripcion: '',
          fecha_solicitud: new Date().toISOString().split('T')[0],
          fecha_vencimiento: '',
          moneda: 'CLP',
          notas_internas: '',
          empresasSeleccionadas: [],
          productosSeleccionados: [],
        })
      }
      setError(null)
    }
  }, [show, rfq])

  const loadData = async () => {
    setLoadingData(true)
    try {
      // Cargar empresas
      const empresasRes = await fetch('/api/crm/empresas?pageSize=1000')
      const empresasData = await empresasRes.json()
      if (empresasData.success && Array.isArray(empresasData.data)) {
        setEmpresas(empresasData.data.map((e: any) => {
          const attrs = e.attributes || e
          // Usar ID interno de Strapi (no documentId) para relaciones
          return {
            id: e.id || e.documentId, // Preferir ID interno
            internalId: e.id, // Guardar ID interno separadamente
            documentId: e.documentId,
            empresa_nombre: attrs.empresa_nombre || attrs.nombre || e.empresa_nombre || e.nombre,
            nombre: attrs.nombre || e.nombre,
            emails: attrs.emails || e.emails || [],
          }
        }))
      }

      // Cargar productos (libros desde Strapi)
      const productosRes = await fetch('/api/tienda/productos?pagination[pageSize]=1000')
      const productosData = await productosRes.json()
      if (productosData.success && Array.isArray(productosData.data)) {
        setProductos(productosData.data.map((p: any) => {
          const attrs = p.attributes || p
          // Usar ID interno de Strapi (no documentId) para relaciones
          return {
            id: p.id || p.documentId, // Preferir ID interno
            internalId: p.id, // Guardar ID interno separadamente
            documentId: p.documentId,
            nombre_libro: attrs.nombre_libro || attrs.nombre || p.nombre_libro || p.nombre,
            nombre: attrs.nombre || p.nombre,
            sku: attrs.sku || p.sku,
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
        throw new Error('El nombre es obligatorio')
      }

      if (formData.empresasSeleccionadas.length === 0) {
        throw new Error('Debe seleccionar al menos una empresa')
      }

      if (formData.productosSeleccionados.length === 0) {
        throw new Error('Debe seleccionar al menos un producto')
      }

      // Obtener IDs internos de empresas y productos seleccionados
      const empresasIds = formData.empresasSeleccionadas.map((selectedId) => {
        const empresa = empresas.find((e) => String(e.id) === selectedId || String(e.documentId) === selectedId)
        // Preferir ID interno, si no existe usar el ID seleccionado
        return empresa?.internalId ? Number(empresa.internalId) : Number(selectedId)
      }).filter((id) => !isNaN(id) && id > 0)
      
      const productosIds = formData.productosSeleccionados.map((selectedId) => {
        const producto = productos.find((p) => String(p.id) === selectedId || String(p.documentId) === selectedId)
        // Preferir ID interno, si no existe usar el ID seleccionado
        return producto?.internalId ? Number(producto.internalId) : Number(selectedId)
      }).filter((id) => !isNaN(id) && id > 0)
      
      if (empresasIds.length === 0) {
        throw new Error('No se pudieron obtener IDs válidos de las empresas seleccionadas')
      }
      
      if (productosIds.length === 0) {
        throw new Error('No se pudieron obtener IDs válidos de los productos seleccionados')
      }
      
      const rfqData = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        fecha_solicitud: formData.fecha_solicitud,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        moneda: formData.moneda,
        notas_internas: formData.notas_internas?.trim() || null,
        empresas: empresasIds,
        productos: productosIds,
        estado: 'draft',
      }

      console.log('[RFQModal] Enviando datos:', {
        isEdit: !!rfq,
        rfqData: {
          nombre: rfqData.nombre,
          empresasCount: rfqData.empresas.length,
          productosCount: rfqData.productos.length,
        },
      })

      let response
      if (rfq) {
        // Editar
        const rfqId = rfq.id || rfq.documentId
        const url = `/api/compras/rfqs/${rfqId}`
        console.log('[RFQModal] Editando RFQ:', url)
        response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rfqData),
        })
      } else {
        // Crear
        const url = '/api/compras/rfqs'
        console.log('[RFQModal] Creando RFQ:', url)
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rfqData),
        })
      }

      console.log('[RFQModal] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      })

      let result
      try {
        const responseText = await response.text()
        console.log('[RFQModal] Texto de respuesta:', responseText)
        result = JSON.parse(responseText)
      } catch (jsonError: any) {
        console.error('[RFQModal] Error al parsear JSON:', jsonError)
        // Si la respuesta no es JSON, usar el texto de la respuesta
        throw new Error(`Error ${response.status}: ${response.statusText}. La respuesta no es JSON válido.`)
      }

      console.log('[RFQModal] Resultado parseado:', result)

      if (!response.ok || !result.success) {
        const errorMessage = result.error || result.message || `Error ${response.status}: ${response.statusText}`
        console.error('[RFQModal] Error en respuesta:', errorMessage)
        throw new Error(errorMessage)
      }

      if (onSuccess) {
        onSuccess()
      }
      onHide()
    } catch (err: any) {
      console.error('Error al guardar RFQ:', err)
      
      // Mensajes de error más específicos
      let errorMessage = err.message || 'Error al guardar RFQ'
      
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        errorMessage = 'El content type "rfqs" no existe en Strapi. Por favor, créalo primero según la documentación en docs/crm/STRAPI-SCHEMA-COMPRAS-PROVEEDORES.md'
      } else if (errorMessage.includes('relation') || errorMessage.includes('no existe')) {
        errorMessage = 'Una o más empresas/productos seleccionados no existen en Strapi. Por favor, verifica que estén creados correctamente.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>{rfq ? 'Editar RFQ' : 'Nueva Solicitud de Cotización'}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Nombre <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: RFQ - Libros Educativos Q1 2026"
                  value={formData.nombre}
                  onChange={(e) => handleFieldChange('nombre', e.target.value)}
                  required
                  disabled={loading || loadingData}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Fecha de Solicitud <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="date"
                  value={formData.fecha_solicitud}
                  onChange={(e) => handleFieldChange('fecha_solicitud', e.target.value)}
                  required
                  disabled={loading || loadingData}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Fecha de Vencimiento</FormLabel>
                <FormControl
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => handleFieldChange('fecha_vencimiento', e.target.value)}
                  disabled={loading || loadingData}
                />
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
                  disabled={loading || loadingData}
                >
                  {MONEDAS.map((moneda) => (
                    <option key={moneda.value} value={moneda.value}>
                      {moneda.label}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
          </Row>

          <FormGroup className="mb-3">
            <FormLabel>Descripción</FormLabel>
            <FormControl
              as="textarea"
              rows={3}
              placeholder="Descripción detallada de la solicitud de cotización..."
              value={formData.descripcion}
              onChange={(e) => handleFieldChange('descripcion', e.target.value)}
              disabled={loading || loadingData}
            />
          </FormGroup>

          <FormGroup className="mb-3">
            <FormLabel>
              Empresas/Proveedores <span className="text-danger">*</span>
            </FormLabel>
            {loadingData ? (
              <p className="text-muted">Cargando empresas...</p>
            ) : (
              <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {empresas.length === 0 ? (
                  <p className="text-muted mb-0">No hay empresas disponibles</p>
                ) : (
                  empresas.map((empresa) => {
                    const isSelected = formData.empresasSeleccionadas.includes(String(empresa.id))
                    return (
                      <div key={empresa.id} className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEmpresa(String(empresa.id))}
                          id={`empresa-${empresa.id}`}
                          disabled={loading || loadingData}
                        />
                        <label className="form-check-label" htmlFor={`empresa-${empresa.id}`}>
                          {empresa.empresa_nombre || empresa.nombre || 'Empresa'}
                          {isSelected && <Badge bg="primary" className="ms-2">Seleccionada</Badge>}
                        </label>
                      </div>
                    )
                  })
                )}
              </div>
            )}
            {formData.empresasSeleccionadas.length > 0 && (
              <small className="text-muted">
                {formData.empresasSeleccionadas.length} empresa(s) seleccionada(s)
              </small>
            )}
          </FormGroup>

          <FormGroup className="mb-3">
            <FormLabel>
              Productos <span className="text-danger">*</span>
            </FormLabel>
            {loadingData ? (
              <p className="text-muted">Cargando productos...</p>
            ) : (
              <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {productos.length === 0 ? (
                  <p className="text-muted mb-0">No hay productos disponibles</p>
                ) : (
                  productos.map((producto) => {
                    const isSelected = formData.productosSeleccionados.includes(String(producto.id))
                    return (
                      <div key={producto.id} className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProducto(String(producto.id))}
                          id={`producto-${producto.id}`}
                          disabled={loading || loadingData}
                        />
                        <label className="form-check-label" htmlFor={`producto-${producto.id}`}>
                          {producto.nombre_libro || producto.nombre || 'Producto'}
                          {producto.sku && <span className="text-muted ms-2">({producto.sku})</span>}
                          {isSelected && <Badge bg="primary" className="ms-2">Seleccionado</Badge>}
                        </label>
                      </div>
                    )
                  })
                )}
              </div>
            )}
            {formData.productosSeleccionados.length > 0 && (
              <small className="text-muted">
                {formData.productosSeleccionados.length} producto(s) seleccionado(s)
              </small>
            )}
          </FormGroup>

          <FormGroup className="mb-3">
            <FormLabel>Notas Internas</FormLabel>
            <FormControl
              as="textarea"
              rows={2}
              placeholder="Notas internas (no visibles para proveedores)..."
              value={formData.notas_internas}
              onChange={(e) => handleFieldChange('notas_internas', e.target.value)}
              disabled={loading || loadingData}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            <LuX className="me-1" />
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading || loadingData}>
            <LuCheck className="me-1" />
            {loading ? 'Guardando...' : rfq ? 'Actualizar' : 'Crear RFQ'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default RFQModal

