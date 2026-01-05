'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuCheck } from 'react-icons/lu'

interface AddOpportunityModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
  defaultEtapa?: string // Para Pipeline: etapa por defecto según la sección
}

interface ContactOption {
  id: number | string
  documentId?: string
  nombre_completo: string
}

interface LibroOption {
  id: number | string
  documentId?: string
  nombre_libro?: string
  name?: string // Para productos de WooCommerce
  sku?: string
  price?: string
  platform?: 'moraleja' | 'escolar' | 'strapi'
}

interface ColaboradorOption {
  id: number | string
  documentId?: string
  persona?: {
    nombre_completo?: string
  }
  email_login?: string
}

const ETAPAS = [
  { value: 'Qualification', label: 'Calificación' },
  { value: 'Proposal Sent', label: 'Propuesta Enviada' },
  { value: 'Negotiation', label: 'Negociación' },
  { value: 'Won', label: 'Ganada' },
  { value: 'Lost', label: 'Perdida' },
]

const ESTADOS = [
  { value: 'open', label: 'Abierto' },
  { value: 'in-progress', label: 'En Progreso' },
  { value: 'closed', label: 'Cerrado' },
]

const PRIORIDADES = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
]

const MONEDAS = [
  { value: 'CLP', label: 'CLP (Peso Chileno)' },
  { value: 'USD', label: 'USD (Dólar)' },
  { value: 'EUR', label: 'EUR (Euro)' },
]

const AddOpportunityModal = ({ show, onHide, onSuccess, defaultEtapa }: AddOpportunityModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contactos, setContactos] = useState<ContactOption[]>([])
  const [libros, setLibros] = useState<LibroOption[]>([])
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [productPlatform, setProductPlatform] = useState<'moraleja' | 'escolar' | 'strapi'>('strapi')
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    monto: '',
    moneda: 'CLP',
    etapa: defaultEtapa || 'Qualification',
    estado: 'open',
    prioridad: 'medium',
    fecha_cierre: '',
    fuente: 'Manual',
    contacto: '',
    producto: '',
    propietario: '',
  })

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (show) {
      loadData()
      // Resetear formulario
      setFormData({
        nombre: '',
        descripcion: '',
        monto: '',
        moneda: 'CLP',
        etapa: defaultEtapa || 'Qualification',
        estado: 'open',
        prioridad: 'medium',
        fecha_cierre: '',
        fuente: 'Manual',
        contacto: '',
        producto: '',
        propietario: '',
      })
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, defaultEtapa])

  const loadProducts = async (platform: 'moraleja' | 'escolar' | 'strapi') => {
    try {
      if (platform === 'strapi') {
        // Cargar libros desde Strapi
        const librosRes = await fetch('/api/tienda/productos?pagination[pageSize]=1000')
        const librosData = await librosRes.json()
        if (librosData.success && Array.isArray(librosData.data)) {
          setLibros(librosData.data.map((libro: any) => ({
            id: libro.documentId || libro.id,
            documentId: libro.documentId,
            nombre_libro: libro.nombre_libro || libro.attributes?.nombre_libro,
            platform: 'strapi',
          })))
        }
      } else {
        // Cargar productos desde WooCommerce
        const productosRes = await fetch(`/api/woocommerce/products?platform=${platform}&per_page=100&page=1`)
        const productosData = await productosRes.json()
        if (productosData.success && Array.isArray(productosData.data)) {
          setLibros(productosData.data.map((producto: any) => ({
            id: `woo_${platform}_${producto.id}`, // ID único para productos de WooCommerce
            nombre_libro: producto.name,
            name: producto.name,
            sku: producto.sku,
            price: producto.price,
            platform,
          })))
        }
      }
    } catch (err) {
      console.error('Error al cargar productos:', err)
      setLibros([])
    }
  }

  const loadData = async () => {
    setLoadingData(true)
    try {
      // Cargar contactos
      const contactosRes = await fetch('/api/crm/contacts?pageSize=100')
      const contactosData = await contactosRes.json()
      if (contactosData.success && Array.isArray(contactosData.data)) {
        setContactos(contactosData.data.map((c: any) => ({
          id: c.documentId || c.id,
          documentId: c.documentId,
          nombre_completo: c.nombre_completo || `${c.nombres || ''} ${c.primer_apellido || ''}`.trim(),
        })))
      }

      // Cargar colaboradores
      const colaboradoresRes = await fetch('/api/colaboradores?pageSize=100&populate[persona]=true')
      const colaboradoresData = await colaboradoresRes.json()
      if (colaboradoresData.success && Array.isArray(colaboradoresData.data)) {
        setColaboradores(colaboradoresData.data.map((c: any) => ({
          id: c.documentId || c.id,
          documentId: c.documentId,
          persona: c.persona || c.attributes?.persona,
          email_login: c.email_login || c.attributes?.email_login,
        })))
      }

      // Cargar productos según la plataforma seleccionada
      await loadProducts(productPlatform)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError(null)

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        throw new Error('El nombre de la oportunidad es obligatorio')
      }

      // Preparar datos para la API
      const opportunityData: any = {
        nombre: formData.nombre.trim(),
        ...(formData.descripcion && { descripcion: formData.descripcion.trim() }),
        ...(formData.monto && { monto: Number(formData.monto) }),
        moneda: formData.moneda,
        etapa: formData.etapa,
        estado: formData.estado,
        prioridad: formData.prioridad,
        ...(formData.fecha_cierre && { fecha_cierre: formData.fecha_cierre }),
        fuente: formData.fuente || 'Manual',
        activo: true,
      }

      // Relaciones
      if (formData.contacto) {
        opportunityData.contacto = formData.contacto
      }
      if (formData.propietario) {
        opportunityData.propietario = formData.propietario
      }
      // Solo relacionar producto si es de Strapi (no WooCommerce)
      if (formData.producto && !formData.producto.startsWith('woo_')) {
        opportunityData.producto = formData.producto
      }
      // Si es producto de WooCommerce, guardar la referencia en la descripción o como metadata
      if (formData.producto && formData.producto.startsWith('woo_')) {
        const productoWoo = libros.find(l => l.id === formData.producto)
        if (productoWoo) {
          opportunityData.descripcion = (opportunityData.descripcion || '') + `\n\nProducto WooCommerce: ${productoWoo.nombre_libro || productoWoo.name} (${productoWoo.platform}) - SKU: ${productoWoo.sku || 'N/A'}`
        }
      }

      // Crear la oportunidad
      const response = await fetch('/api/crm/oportunidades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opportunityData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.error || result.details?.errors?.[0]?.message || 'Error al crear oportunidad'
        throw new Error(errorMessage)
      }

      // Limpiar formulario
      setFormData({
        nombre: '',
        descripcion: '',
        monto: '',
        moneda: 'CLP',
        etapa: defaultEtapa || 'Qualification',
        estado: 'open',
        prioridad: 'medium',
        fecha_cierre: '',
        fuente: 'Manual',
        contacto: '',
        producto: '',
        propietario: '',
      })

      if (onSuccess) {
        onSuccess()
      }
      onHide()
    } catch (err: any) {
      console.error('Error al crear oportunidad:', err)
      setError(err.message || 'Error al crear oportunidad')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Agregar Nueva Oportunidad</ModalTitle>
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
                <FormLabel>Nombre de la Oportunidad <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleFieldChange('nombre', e.target.value)}
                  placeholder="Ej: Venta de libros - Colegio San José"
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Descripción</FormLabel>
                <FormControl
                  as="textarea"
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                  placeholder="Descripción detallada de la oportunidad..."
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Contacto</FormLabel>
                <FormControl
                  as="select"
                  value={formData.contacto}
                  onChange={(e) => handleFieldChange('contacto', e.target.value)}
                  disabled={loading || loadingData}
                >
                  <option value="">Seleccionar contacto...</option>
                  {contactos.map((contacto) => (
                    <option key={contacto.id} value={contacto.id}>
                      {contacto.nombre_completo}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Propietario</FormLabel>
                <FormControl
                  as="select"
                  value={formData.propietario}
                  onChange={(e) => handleFieldChange('propietario', e.target.value)}
                  disabled={loading || loadingData}
                >
                  <option value="">Seleccionar vendedor...</option>
                  {colaboradores.map((colab) => (
                    <option key={colab.id} value={colab.id}>
                      {colab.persona?.nombre_completo || colab.email_login || `Colaborador ${colab.id}`}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Origen del Producto</FormLabel>
                <FormControl
                  as="select"
                  value={productPlatform}
                  onChange={(e) => {
                    const newPlatform = e.target.value as 'moraleja' | 'escolar' | 'strapi'
                    setProductPlatform(newPlatform)
                    setFormData((prev) => ({ ...prev, producto: '' })) // Limpiar selección
                    loadProducts(newPlatform)
                  }}
                  disabled={loading || loadingData}
                >
                  <option value="strapi">Strapi (Libros)</option>
                  <option value="moraleja">WooCommerce - Moraleja</option>
                  <option value="escolar">WooCommerce - Escolar</option>
                </FormControl>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Producto/Libro</FormLabel>
                <FormControl
                  as="select"
                  value={formData.producto}
                  onChange={(e) => handleFieldChange('producto', e.target.value)}
                  disabled={loading || loadingData}
                >
                  <option value="">Seleccionar producto (opcional)...</option>
                  {libros.map((libro) => (
                    <option key={libro.id} value={libro.id}>
                      {libro.nombre_libro || libro.name} {libro.price ? `(${libro.price})` : ''}
                    </option>
                  ))}
                </FormControl>
                {libros.length === 0 && (
                  <small className="text-muted">No hay productos disponibles en {productPlatform === 'strapi' ? 'Strapi' : `WooCommerce ${productPlatform}`}.</small>
                )}
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Fuente</FormLabel>
                <FormControl
                  type="text"
                  value={formData.fuente}
                  onChange={(e) => handleFieldChange('fuente', e.target.value)}
                  placeholder="Ej: Manual, Web, Referido..."
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
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
            <Col md={4}>
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
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Fecha de Cierre</FormLabel>
                <FormControl
                  type="date"
                  value={formData.fecha_cierre}
                  onChange={(e) => handleFieldChange('fecha_cierre', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Etapa</FormLabel>
                <FormControl
                  as="select"
                  value={formData.etapa}
                  onChange={(e) => handleFieldChange('etapa', e.target.value)}
                  disabled={loading}
                >
                  {ETAPAS.map((etapa) => (
                    <option key={etapa.value} value={etapa.value}>
                      {etapa.label}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
            <Col md={4}>
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
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Prioridad</FormLabel>
                <FormControl
                  as="select"
                  value={formData.prioridad}
                  onChange={(e) => handleFieldChange('prioridad', e.target.value)}
                  disabled={loading}
                >
                  {PRIORIDADES.map((prioridad) => (
                    <option key={prioridad.value} value={prioridad.value}>
                      {prioridad.label}
                    </option>
                  ))}
                </FormControl>
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
            {loading ? 'Creando...' : 'Crear Oportunidad'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default AddOpportunityModal
