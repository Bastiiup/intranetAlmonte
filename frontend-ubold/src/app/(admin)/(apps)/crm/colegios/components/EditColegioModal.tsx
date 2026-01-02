'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuSave, LuCheck } from 'react-icons/lu'

const DEPENDENCIAS = [
  'Municipal',
  'Particular Subvencionado',
  'Particular Pagado',
]

const TIPOS_INSTITUCION = [
  'Colegio',
  'Escuela',
  'Liceo',
  'Jardín Infantil',
  'Otro',
]

const ORIGENES = [
  'Manual',
  'MINEDUC',
  'CSV',
  'CRM',
  'Web',
  'Otro',
]

const ESTATUS_PIPELINE = [
  'Calificado',
  'Contactado',
  'Propuesta Enviada',
  'Negociación',
  'Cerrado',
  'Perdido',
]

interface ColegioType {
  id?: number | string
  documentId?: string
  colegio_nombre?: string
  rbd?: number | string
  rut?: string
  dependencia?: string
  tipo_institucion?: string
  region?: string
  comuna?: string
  direccion?: string
  telefonos?: string[] | any[]
  emails?: string[] | any[]
  website?: string
  origen?: string
  representante_comercial?: string
  estatus_pipeline?: string
  attributes?: any
  [key: string]: any
}

interface EditColegioModalProps {
  show: boolean
  onHide: () => void
  colegio: ColegioType | null
  onSuccess?: () => void
}

const EditColegioModal = ({ show, onHide, colegio, onSuccess }: EditColegioModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    colegio_nombre: '',
    rut: '',
    dependencia: '',
    tipo_institucion: '',
    region: '',
    comuna: '',
    direccion: '',
    telefonos: '',
    emails: '',
    website: '',
    origen: 'Manual',
    representante_comercial: '',
    estatus_pipeline: '',
  })

  // Cargar datos del colegio cuando se abre el modal
  useEffect(() => {
    if (colegio) {
      // Los datos pueden venir en attributes o directamente
      const attrs = (colegio as any).attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : colegio

      // Convertir arrays de telefonos y emails a strings separados por comas
      const telefonosStr = Array.isArray(data.telefonos)
        ? data.telefonos
            .map((t: any) => t.telefono_raw || t.telefono_norm || t.numero || t)
            .filter((t: any) => t)
            .join(', ')
        : ''

      const emailsStr = Array.isArray(data.emails)
        ? data.emails
            .map((e: any) => e.email || e)
            .filter((e: any) => e)
            .join(', ')
        : ''

      // Obtener dirección de direcciones array o campo directo
      const direccionStr = Array.isArray(data.direcciones) && data.direcciones.length > 0
        ? `${data.direcciones[0].calle || ''} ${data.direcciones[0].numero || ''}`.trim()
        : data.direccion || ''

      // Obtener comuna de direcciones o relación comuna
      const comunaStr = data.comuna?.comuna_nombre || data.comuna?.nombre || data.comuna || ''

      setFormData({
        colegio_nombre: data.colegio_nombre || colegio.colegio_nombre || '',
        rut: data.rut || '',
        dependencia: data.dependencia || colegio.dependencia || '',
        tipo_institucion: data.tipo_institucion || '',
        region: data.region || data.comuna?.region_nombre || '',
        comuna: comunaStr,
        direccion: direccionStr,
        telefonos: telefonosStr,
        emails: emailsStr,
        website: data.website || '',
        origen: data.origen || 'Manual',
        representante_comercial: data.representante_comercial || '',
        estatus_pipeline: data.estatus_pipeline || '',
      })
    }
  }, [colegio])

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!colegio) return

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

      // Preparar datos para Strapi
      const colegioData: any = {
        colegio_nombre: formData.colegio_nombre.trim(),
        ...(formData.rut && { rut: formData.rut.trim() }),
        ...(formData.dependencia && { dependencia: formData.dependencia }),
        ...(formData.tipo_institucion && { tipo_institucion: formData.tipo_institucion }),
        ...(formData.region && { region: formData.region }),
        ...(formData.comuna && { comuna_texto: formData.comuna }),
        ...(formData.website && { website: formData.website.trim() }),
        ...(formData.origen && { origen: formData.origen }),
        ...(formData.representante_comercial && { representante_comercial: formData.representante_comercial.trim() }),
        ...(formData.estatus_pipeline && { estatus_pipeline: formData.estatus_pipeline }),
        ...(telefonosArray.length > 0 && { telefonos: telefonosArray }),
        ...(emailsArray.length > 0 && { emails: emailsArray }),
        ...(direccionesArray.length > 0 && { direcciones: direccionesArray }),
      }

      // Obtener el ID correcto (documentId es el identificador principal en Strapi)
      const colegioId = (colegio as any).documentId || colegio.id
      
      if (!colegioId) {
        throw new Error('No se pudo obtener el ID del colegio')
      }

      // Actualizar el colegio
      const response = await fetch(`/api/crm/colegios/${colegioId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colegioData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.details?.errors?.[0]?.message || result.error || 'Error al actualizar la institución'
        throw new Error(errorMessage)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        onHide()
      }
    } catch (err: any) {
      console.error('Error al actualizar institución:', err)
      setError(err.message || 'Error al actualizar la institución')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Editar Institución</ModalTitle>
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
                <FormLabel>RUT</FormLabel>
                <FormControl
                  type="text"
                  placeholder="76.123.456-7"
                  value={formData.rut}
                  onChange={(e) => handleFieldChange('rut', e.target.value)}
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
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Tipo Institución</FormLabel>
                <FormControl
                  as="select"
                  value={formData.tipo_institucion}
                  onChange={(e) => handleFieldChange('tipo_institucion', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_INSTITUCION.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
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

          <Row>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Origen</FormLabel>
                <FormControl
                  as="select"
                  value={formData.origen}
                  onChange={(e) => handleFieldChange('origen', e.target.value)}
                  disabled={loading}
                >
                  {ORIGENES.map((origen) => (
                    <option key={origen} value={origen}>
                      {origen}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Representante Comercial</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Nombre del representante"
                  value={formData.representante_comercial}
                  onChange={(e) => handleFieldChange('representante_comercial', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Estatus Pipeline</FormLabel>
                <FormControl
                  as="select"
                  value={formData.estatus_pipeline}
                  onChange={(e) => handleFieldChange('estatus_pipeline', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  {ESTATUS_PIPELINE.map((estatus) => (
                    <option key={estatus} value={estatus}>
                      {estatus}
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
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EditColegioModal
