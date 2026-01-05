'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuCheck, LuArrowRight } from 'react-icons/lu'
import { LeadType } from '@/app/(admin)/(apps)/crm/types'

interface ConvertToOpportunityModalProps {
  show: boolean
  onHide: () => void
  lead: LeadType | null
  onSuccess?: () => void
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
  name?: string
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

// Mapeo de etiqueta de Lead a prioridad de Oportunidad
const etiquetaToPrioridad: Record<string, 'low' | 'medium' | 'high'> = {
  'baja': 'low',
  'media': 'medium',
  'alta': 'high',
}

// Mapeo de estado de Lead a etapa de Oportunidad
const estadoLeadToEtapa: Record<string, string> = {
  'in-progress': 'Qualification',
  'proposal-sent': 'Proposal Sent',
  'follow-up': 'Qualification',
  'pending': 'Qualification',
  'negotiation': 'Negotiation',
  'rejected': 'Lost',
}

const ConvertToOpportunityModal = ({ show, onHide, lead, onSuccess }: ConvertToOpportunityModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contactos, setContactos] = useState<ContactOption[]>([])
  const [libros, setLibros] = useState<LibroOption[]>([])
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [productPlatform, setProductPlatform] = useState<'moraleja' | 'escolar' | 'strapi'>('strapi')
  const [markLeadAsConverted, setMarkLeadAsConverted] = useState(true)
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    monto: '',
    moneda: 'CLP',
    etapa: 'Qualification',
    estado: 'open',
    prioridad: 'medium' as 'low' | 'medium' | 'high',
    fecha_cierre: '',
    fuente: 'Manual',
    contacto: '',
    producto: '',
    propietario: '',
  })

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (show && lead) {
      loadData()
      // Pre-llenar formulario con datos del Lead
      const leadId = lead.id.replace(/^#LD/, '').replace(/^#/, '')
      loadLeadDetails(leadId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, lead])

  // Cargar detalles completos del Lead desde la API
  const loadLeadDetails = async (leadId: string) => {
    try {
      const response = await fetch(`/api/crm/leads/${leadId}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const leadData = result.data
        const attrs = leadData.attributes || leadData
        
        // Mapear datos del Lead a Oportunidad
        setFormData({
          nombre: attrs.nombre || lead?.customer || 'Oportunidad desde Lead',
          descripcion: attrs.notas || `Convertido desde Lead: ${lead?.customer || ''} - ${lead?.company || ''}`,
          monto: attrs.monto_estimado ? attrs.monto_estimado.toString() : lead?.amount?.toString() || '',
          moneda: 'CLP',
          etapa: estadoLeadToEtapa[attrs.estado || lead?.status || 'in-progress'] || 'Qualification',
          estado: 'open',
          prioridad: etiquetaToPrioridad[attrs.etiqueta || 'media'] || 'medium',
          fecha_cierre: '',
          fuente: attrs.fuente || lead?.source || 'Lead',
          contacto: attrs.relacionado_con_persona?.data?.id || attrs.relacionado_con_persona?.id || attrs.relacionado_con_persona?.documentId || '',
          producto: '',
          propietario: attrs.asignado_a?.data?.id || attrs.asignado_a?.id || attrs.asignado_a?.documentId || '',
        })
      }
    } catch (err) {
      console.error('Error al cargar detalles del Lead:', err)
      // Usar datos básicos del Lead si falla la carga
      setFormData({
        nombre: lead?.customer || 'Oportunidad desde Lead',
        descripcion: `Convertido desde Lead: ${lead?.customer || ''} - ${lead?.company || ''}`,
        monto: lead?.amount?.toString() || '',
        moneda: 'CLP',
        etapa: 'Qualification',
        estado: 'open',
        prioridad: 'medium',
        fecha_cierre: '',
        fuente: 'Lead',
        contacto: '',
        producto: '',
        propietario: '',
      })
    }
  }

  const loadProducts = async (platform: 'moraleja' | 'escolar' | 'strapi') => {
    try {
      if (platform === 'strapi') {
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
        const productosRes = await fetch(`/api/woocommerce/products?platform=${platform}&per_page=100&page=1`)
        const productosData = await productosRes.json()
        if (productosData.success && Array.isArray(productosData.data)) {
          setLibros(productosData.data.map((producto: any) => ({
            id: `woo_${platform}_${producto.id}`,
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

      // Cargar productos
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

    if (!lead) {
      setError('No se ha seleccionado un Lead')
      return
    }

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
        fuente: formData.fuente || 'Lead',
        activo: true,
      }

      // Relaciones
      if (formData.contacto) {
        opportunityData.contacto = formData.contacto
      }
      if (formData.propietario) {
        opportunityData.propietario = formData.propietario
      }
      if (formData.producto && !formData.producto.startsWith('woo_')) {
        opportunityData.producto = formData.producto
      }
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

      // Si se marca como convertido, actualizar el Lead
      if (markLeadAsConverted && lead) {
        const leadId = lead.id.replace(/^#LD/, '').replace(/^#/, '')
        try {
          await fetch(`/api/crm/leads/${leadId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              activo: false, // Marcar como inactivo (convertido)
            }),
          })
        } catch (leadUpdateError) {
          console.error('Error al marcar Lead como convertido:', leadUpdateError)
          // No fallar si no se puede actualizar el Lead
        }
      }

      if (onSuccess) {
        onSuccess()
      }
      onHide()
    } catch (err: any) {
      console.error('Error al convertir Lead a Oportunidad:', err)
      setError(err.message || 'Error al convertir Lead a Oportunidad')
    } finally {
      setLoading(false)
    }
  }

  if (!lead) {
    return null
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>
            <LuArrowRight className="me-2" />
            Convertir Lead a Oportunidad
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Alert variant="info" className="mb-3">
            <strong>Lead:</strong> {lead.customer} - {lead.company}
            <br />
            <small>Los datos del Lead se han pre-llenado. Puedes ajustarlos antes de crear la oportunidad.</small>
          </Alert>

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
                    setFormData((prev) => ({ ...prev, producto: '' }))
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
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Fuente</FormLabel>
                <FormControl
                  type="text"
                  value={formData.fuente}
                  onChange={(e) => handleFieldChange('fuente', e.target.value)}
                  placeholder="Ej: Lead, Manual, Web..."
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
                  onChange={(e) => handleFieldChange('prioridad', e.target.value as 'low' | 'medium' | 'high')}
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

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={markLeadAsConverted}
                    onChange={(e) => setMarkLeadAsConverted(e.target.checked)}
                    id="markAsConverted"
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="markAsConverted">
                    Marcar Lead como convertido (desactivar después de crear la oportunidad)
                  </label>
                </div>
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
            {loading ? 'Convirtiendo...' : 'Convertir a Oportunidad'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default ConvertToOpportunityModal
