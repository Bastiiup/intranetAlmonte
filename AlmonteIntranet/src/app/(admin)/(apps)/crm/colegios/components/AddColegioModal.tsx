'use client'

import { useState } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuSave, LuCheck } from 'react-icons/lu'
import ChileRegionComuna from '@/components/common/ChileRegionsComunas'

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
    rbd: '',
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
      if (!formData.rbd || !formData.rbd.trim()) {
        throw new Error('El RBD es obligatorio')
      }
      const rbdNumber = parseInt(formData.rbd.trim())
      if (isNaN(rbdNumber)) {
        throw new Error('El RBD debe ser un número válido')
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

      // Preparar direcciones con campos correctos
      // Nota: No incluir comuna si es un string (nombre), solo si es un ID numérico
      const direccionesArray = formData.direccion
        ? [{
            nombre_calle: formData.direccion,
            numero_calle: '',
            tipo_direccion: 'Colegio',
            direccion_principal_envio_facturacion: 'Principal',
            // No incluir comuna aquí - se maneja a nivel de colegio si es necesario
          }]
        : []

      // Preparar datos para Strapi (solo campos válidos según schema)
      const colegioData: any = {
        rbd: rbdNumber, // RBD es obligatorio
        colegio_nombre: formData.colegio_nombre.trim(),
        ...(formData.dependencia && { dependencia: formData.dependencia }),
        ...(formData.region && { region: formData.region }),
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
        rbd: '',
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
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  RBD <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="12345"
                  value={formData.rbd}
                  onChange={(e) => handleFieldChange('rbd', e.target.value)}
                  required
                  disabled={loading}
                />
                <small className="text-muted">El RBD debe ser único</small>
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
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Región y Comuna</FormLabel>
                <ChileRegionComuna
                  regionValue={formData.region}
                  comunaValue={formData.comuna}
                  onRegionChange={(value) => handleFieldChange('region', value)}
                  onComunaChange={(value) => handleFieldChange('comuna', value)}
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
