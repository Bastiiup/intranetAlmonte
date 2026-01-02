'use client'

import { useState } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuSave, LuCheck } from 'react-icons/lu'

const DEPENDENCIAS = [
  'Municipal',
  'Particular Subvencionado',
  'Particular Pagado',
]

// TIPOS_INSTITUCION, ORIGENES y ESTATUS_PIPELINE eliminados - no existen en Strapi para colegio

interface AddColegioModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

const AddColegioModal = ({ show, onHide, onSuccess }: AddColegioModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    colegio_nombre: '',
    dependencia: '',
    region: '',
    comuna: '',
    direccion: '',
    telefonos: '',
    emails: '',
    website: '',
  })

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
      if (!formData.colegio_nombre.trim()) {
        throw new Error('El nombre de la institución es obligatorio')
      }

      // Convertir teléfonos y emails separados por comas a arrays
      const telefonosArray = formData.telefonos
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .map((telefono, index) => ({
          telefono_raw: telefono,
          principal: index === 0,
        }))

      const emailsArray = formData.emails
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0)
        .map((email, index) => ({
          email: email,
          principal: index === 0,
        }))

      // Preparar direcciones
      const direccionesArray = formData.direccion
        ? [{
            calle: formData.direccion,
            comuna: formData.comuna,
            region: formData.region,
          }]
        : []

      // Preparar datos para Strapi (solo campos válidos según schema)
      const colegioData: any = {
        colegio_nombre: formData.colegio_nombre.trim(),
        ...(formData.dependencia && { dependencia: formData.dependencia }),
        ...(formData.region && { region: formData.region }),
        ...(formData.comuna && { comuna_texto: formData.comuna }), // Guardar como texto si no hay relación
        ...(formData.website && { website: formData.website.trim() }),
        ...(telefonosArray.length > 0 && { telefonos: telefonosArray }),
        ...(emailsArray.length > 0 && { emails: emailsArray }),
        ...(direccionesArray.length > 0 && { direcciones: direccionesArray }),
      }

      // Crear el colegio
      const response = await fetch('/api/crm/colegios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colegioData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.details?.errors?.[0]?.message || result.error || 'Error al crear la institución'
        throw new Error(errorMessage)
      }

      // Limpiar formulario
      setFormData({
        colegio_nombre: '',
        dependencia: '',
        region: '',
        comuna: '',
        direccion: '',
        telefonos: '',
        emails: '',
        website: '',
      })

      if (onSuccess) {
        onSuccess()
      } else {
        onHide()
      }
    } catch (err: any) {
      console.error('Error al crear institución:', err)
      setError(err.message || 'Error al crear la institución')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Añadir Nueva Institución</ModalTitle>
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
                  Nombre de la Institución <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Colegio San Juan"
                  value={formData.colegio_nombre}
                  onChange={(e) => handleFieldChange('colegio_nombre', e.target.value)}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
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
          </Row>

          <FormGroup className="mb-3">
            <FormLabel>Dirección</FormLabel>
            <FormControl
              type="text"
              placeholder="Av. Providencia 1234, Santiago"
              value={formData.direccion}
              onChange={(e) => handleFieldChange('direccion', e.target.value)}
              disabled={loading}
            />
          </FormGroup>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Teléfonos (separados por comas)</FormLabel>
                <FormControl
                  type="text"
                  placeholder="+56 2 2345 6789"
                  value={formData.telefonos}
                  onChange={(e) => handleFieldChange('telefonos', e.target.value)}
                  disabled={loading}
                />
                <small className="text-muted">Separar múltiples teléfonos con comas</small>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Emails (separados por comas)</FormLabel>
                <FormControl
                  type="text"
                  placeholder="contacto@colegio.cl"
                  value={formData.emails}
                  onChange={(e) => handleFieldChange('emails', e.target.value)}
                  disabled={loading}
                />
                <small className="text-muted">Separar múltiples emails con comas</small>
              </FormGroup>
            </Col>
          </Row>

          <FormGroup className="mb-3">
            <FormLabel>Website</FormLabel>
            <FormControl
              type="url"
              placeholder="https://www.colegio.cl"
              value={formData.website}
              onChange={(e) => handleFieldChange('website', e.target.value)}
              disabled={loading}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <LuCheck className="me-1" />
            {loading ? 'Creando...' : 'Crear Institución'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default AddColegioModal
