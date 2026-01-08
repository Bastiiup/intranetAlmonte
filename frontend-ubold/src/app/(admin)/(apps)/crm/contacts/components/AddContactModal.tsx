'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuCheck } from 'react-icons/lu'

const ORIGENES = [
  { value: 'mineduc', label: 'MINEDUC' },
  { value: 'csv', label: 'CSV' },
  { value: 'manual', label: 'Manual' },
  { value: 'crm', label: 'CRM' },
  { value: 'web', label: 'Web' },
  { value: 'otro', label: 'Otro' },
]

const ETIQUETAS = [
  { value: 'baja', label: 'Cold Lead' },
  { value: 'media', label: 'Prospect' },
  { value: 'alta', label: 'Hot Lead' },
]

const DEPENDENCIAS = [
  'Municipal',
  'Particular Subvencionado',
  'Particular Pagado',
]

interface AddContactModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

interface ColegioOption {
  id: number
  documentId?: string
  nombre: string
  rbd?: number | null
}

const AddContactModal = ({ show, onHide, onSuccess }: AddContactModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [formData, setFormData] = useState({
    nombres: '',
    email: '',
    cargo: '',
    telefono: '',
    colegioId: '',
    region: '',
    comuna: '',
    dependencia: '',
    origen: 'manual',
    etiqueta: 'media',
  })

  // Cargar lista de colegios cuando se abre el modal
  useEffect(() => {
    if (show) {
      loadColegios()
    }
  }, [show])

  const loadColegios = async () => {
    setLoadingColegios(true)
    try {
      const response = await fetch('/api/crm/colegios/list')
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setColegios(result.data)
      }
    } catch (err) {
      console.error('Error al cargar colegios:', err)
    } finally {
      setLoadingColegios(false)
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
      if (!formData.nombres.trim()) {
        throw new Error('El nombre es obligatorio')
      }
      if (!formData.email.trim()) {
        throw new Error('El email es obligatorio')
      }

      // Preparar datos para Strapi
      const contactData: any = {
        nombres: formData.nombres.trim(),
        emails: [{
          email: formData.email.trim(),
          principal: true,
        }],
        ...(formData.telefono && {
          telefonos: [{
            telefono_raw: formData.telefono.trim(),
            principal: true,
          }],
        }),
        origen: formData.origen || 'manual',
        nivel_confianza: formData.etiqueta || 'media',
        activo: true,
        // Agregar trayectoria solo si se seleccionó un colegio válido (no vacío, no '0')
        ...(formData.colegioId && 
            formData.colegioId !== '' && 
            formData.colegioId !== '0' && {
          trayectoria: {
            colegio: parseInt(String(formData.colegioId)),
            cargo: formData.cargo || null,
            is_current: true,
          },
        }),
      }

      // Crear el contacto
      const response = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.details?.errors?.[0]?.message || result.error || 'Error al crear contacto'
        throw new Error(errorMessage)
      }

      // Limpiar formulario
      setFormData({
        nombres: '',
        email: '',
        cargo: '',
        telefono: '',
        colegioId: '',
        region: '',
        comuna: '',
        dependencia: '',
        origen: 'manual',
        etiqueta: 'media',
      })

      if (onSuccess) {
        onSuccess()
      } else {
        onHide()
      }
    } catch (err: any) {
      console.error('Error al crear contacto:', err)
      setError(err.message || 'Error al crear contacto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Añadir Nuevo Contacto</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Nombre <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Nombre completo"
                  value={formData.nombres}
                  onChange={(e) => handleFieldChange('nombres', e.target.value)}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Cargo
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Profesor de Matemáticas"
                  value={formData.cargo}
                  onChange={(e) => handleFieldChange('cargo', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Email <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="email"
                  placeholder="email@ejemplo.cl"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Teléfono</FormLabel>
                <FormControl
                  type="text"
                  placeholder="+569 1234 5678"
                  value={formData.telefono}
                  onChange={(e) => handleFieldChange('telefono', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Institución (Colegio)</FormLabel>
                <FormControl
                  as="select"
                  value={formData.colegioId}
                  onChange={(e) => handleFieldChange('colegioId', e.target.value)}
                  disabled={loading || loadingColegios}
                >
                  <option value="">Seleccionar colegio...</option>
                  {colegios.map((colegio) => (
                    <option key={colegio.id} value={colegio.id}>
                      {colegio.nombre} {colegio.rbd ? `(RBD: ${colegio.rbd})` : ''}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Región</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Región Metropolitana"
                  value={formData.region}
                  onChange={(e) => handleFieldChange('region', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Comuna</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Santiago"
                  value={formData.comuna}
                  onChange={(e) => handleFieldChange('comuna', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Dependencia</FormLabel>
                <FormControl
                  as="select"
                  value={formData.dependencia}
                  onChange={(e) => handleFieldChange('dependencia', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  {DEPENDENCIAS.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Origen</FormLabel>
                <FormControl
                  as="select"
                  value={formData.origen}
                  onChange={(e) => handleFieldChange('origen', e.target.value)}
                  disabled={loading}
                >
                  {ORIGENES.map((origen) => (
                    <option key={origen.value} value={origen.value}>
                      {origen.label}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Etiqueta</FormLabel>
                <FormControl
                  as="select"
                  value={formData.etiqueta}
                  onChange={(e) => handleFieldChange('etiqueta', e.target.value)}
                  disabled={loading}
                >
                  {ETIQUETAS.map((etiqueta) => (
                    <option key={etiqueta.value} value={etiqueta.value}>
                      {etiqueta.label}
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
            {loading ? 'Creando...' : 'Crear Contacto'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default AddContactModal

