'use client'

import { useState, useEffect } from 'react'
import { Form, FormGroup, FormLabel, FormControl, Button, Alert, Row, Col } from 'react-bootstrap'
import { LuSave, LuPlus, LuX } from 'react-icons/lu'

const GENEROS = ['Hombre', 'Mujer']

const ORIGENES = [
  { value: 'mineduc', label: 'MINEDUC' },
  { value: 'csv', label: 'CSV' },
  { value: 'manual', label: 'Manual' },
  { value: 'crm', label: 'CRM' },
  { value: 'web', label: 'Web' },
  { value: 'otro', label: 'Otro' },
]

const NIVELES_CONFIANZA = [
  { value: 'baja', label: 'Cold Lead' },
  { value: 'media', label: 'Prospect' },
  { value: 'alta', label: 'Hot Lead' },
]

interface TelefonoItem {
  telefono_raw: string
  tipo?: string
  principal?: boolean
}

interface EmailItem {
  email: string
  tipo?: string
  principal?: boolean
}

interface PersonaFormData {
  rut: string
  nombres: string
  primer_apellido: string
  segundo_apellido: string
  nombre_completo: string
  genero: string
  cumpleagno: string
  activo: boolean
  origen: string
  nivel_confianza: string
  telefonos: TelefonoItem[]
  emails: EmailItem[]
}

interface PersonaFormProps {
  initialData?: Partial<PersonaFormData>
  onSubmit: (data: PersonaFormData) => Promise<void>
  onCancel?: () => void
  loading?: boolean
  error?: string | null
}

const PersonaForm = ({ initialData, onSubmit, onCancel, loading = false, error }: PersonaFormProps) => {
  const [formData, setFormData] = useState<PersonaFormData>({
    rut: '',
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    nombre_completo: '',
    genero: '',
    cumpleagno: '',
    activo: true,
    origen: 'manual',
    nivel_confianza: 'media',
    telefonos: [],
    emails: [],
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        rut: initialData.rut || '',
        nombres: initialData.nombres || '',
        primer_apellido: initialData.primer_apellido || '',
        segundo_apellido: initialData.segundo_apellido || '',
        nombre_completo: initialData.nombre_completo || '',
        genero: initialData.genero || '',
        cumpleagno: initialData.cumpleagno || '',
        activo: initialData.activo !== undefined ? initialData.activo : true,
        origen: initialData.origen || 'manual',
        nivel_confianza: initialData.nivel_confianza || 'media',
        telefonos: initialData.telefonos || [],
        emails: initialData.emails || [],
      })
    }
  }, [initialData])

  // Actualizar nombre_completo cuando cambian nombres o apellidos
  useEffect(() => {
    const nombreCompleto = [
      formData.nombres,
      formData.primer_apellido,
      formData.segundo_apellido,
    ]
      .filter(Boolean)
      .join(' ')
    setFormData((prev) => ({ ...prev, nombre_completo: nombreCompleto }))
  }, [formData.nombres, formData.primer_apellido, formData.segundo_apellido])

  const handleFieldChange = (field: keyof PersonaFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleTelefonoChange = (index: number, field: keyof TelefonoItem, value: any) => {
    const newTelefonos = [...formData.telefonos]
    newTelefonos[index] = { ...newTelefonos[index], [field]: value }
    setFormData((prev) => ({ ...prev, telefonos: newTelefonos }))
  }

  const addTelefono = () => {
    setFormData((prev) => ({
      ...prev,
      telefonos: [...prev.telefonos, { telefono_raw: '', principal: prev.telefonos.length === 0 }],
    }))
  }

  const removeTelefono = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      telefonos: prev.telefonos.filter((_, i) => i !== index),
    }))
  }

  const handleEmailChange = (index: number, field: keyof EmailItem, value: any) => {
    const newEmails = [...formData.emails]
    newEmails[index] = { ...newEmails[index], [field]: value }
    setFormData((prev) => ({ ...prev, emails: newEmails }))
  }

  const addEmail = () => {
    setFormData((prev) => ({
      ...prev,
      emails: [...prev.emails, { email: '', principal: prev.emails.length === 0 }],
    }))
  }

  const removeEmail = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!formData.nombres || !formData.nombres.trim()) {
      throw new Error('El nombre es obligatorio')
    }

    await onSubmit(formData)
  }

  return (
    <Form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="danger" dismissible onClose={() => {}}>
          {error}
        </Alert>
      )}

      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>RUT</FormLabel>
            <FormControl
              type="text"
              placeholder="12345678-9"
              value={formData.rut}
              onChange={(e) => handleFieldChange('rut', e.target.value)}
              disabled={loading}
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>
              Nombres <span className="text-danger">*</span>
            </FormLabel>
            <FormControl
              type="text"
              placeholder="Juan"
              value={formData.nombres}
              onChange={(e) => handleFieldChange('nombres', e.target.value)}
              required
              disabled={loading}
            />
          </FormGroup>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Primer Apellido</FormLabel>
            <FormControl
              type="text"
              placeholder="Pérez"
              value={formData.primer_apellido}
              onChange={(e) => handleFieldChange('primer_apellido', e.target.value)}
              disabled={loading}
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Segundo Apellido</FormLabel>
            <FormControl
              type="text"
              placeholder="González"
              value={formData.segundo_apellido}
              onChange={(e) => handleFieldChange('segundo_apellido', e.target.value)}
              disabled={loading}
            />
          </FormGroup>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Género</FormLabel>
            <FormControl
              as="select"
              value={formData.genero}
              onChange={(e) => handleFieldChange('genero', e.target.value)}
              disabled={loading}
            >
              <option value="">Seleccionar...</option>
              {GENEROS.map((genero) => (
                <option key={genero} value={genero}>
                  {genero}
                </option>
              ))}
            </FormControl>
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Fecha de Nacimiento</FormLabel>
            <FormControl
              type="date"
              value={formData.cumpleagno}
              onChange={(e) => handleFieldChange('cumpleagno', e.target.value)}
              disabled={loading}
            />
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
            <FormLabel>Nivel de Confianza</FormLabel>
            <FormControl
              as="select"
              value={formData.nivel_confianza}
              onChange={(e) => handleFieldChange('nivel_confianza', e.target.value)}
              disabled={loading}
            >
              {NIVELES_CONFIANZA.map((nivel) => (
                <option key={nivel.value} value={nivel.value}>
                  {nivel.label}
                </option>
              ))}
            </FormControl>
          </FormGroup>
        </Col>
      </Row>

      {/* Teléfonos */}
      <FormGroup className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <FormLabel>Teléfonos</FormLabel>
          <Button variant="outline-primary" size="sm" onClick={addTelefono} type="button" disabled={loading}>
            <LuPlus size={16} /> Agregar Teléfono
          </Button>
        </div>
        {formData.telefonos.map((telefono, index) => (
          <div key={index} className="d-flex gap-2 mb-2">
            <FormControl
              type="text"
              placeholder="+56 9 1234 5678"
              value={telefono.telefono_raw}
              onChange={(e) => handleTelefonoChange(index, 'telefono_raw', e.target.value)}
              disabled={loading}
            />
            <FormControl
              type="text"
              placeholder="Tipo (opcional)"
              value={telefono.tipo || ''}
              onChange={(e) => handleTelefonoChange(index, 'tipo', e.target.value)}
              disabled={loading}
              style={{ width: '150px' }}
            />
            <div className="d-flex align-items-center">
              <FormControl
                type="checkbox"
                checked={telefono.principal || false}
                onChange={(e) => handleTelefonoChange(index, 'principal', (e.target as HTMLInputElement).checked)}
                disabled={loading}
                className="me-2"
              />
              <small className="text-muted">Principal</small>
            </div>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => removeTelefono(index)}
              type="button"
              disabled={loading}
            >
              <LuX size={16} />
            </Button>
          </div>
        ))}
      </FormGroup>

      {/* Emails */}
      <FormGroup className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <FormLabel>Emails</FormLabel>
          <Button variant="outline-primary" size="sm" onClick={addEmail} type="button" disabled={loading}>
            <LuPlus size={16} /> Agregar Email
          </Button>
        </div>
        {formData.emails.map((email, index) => (
          <div key={index} className="d-flex gap-2 mb-2">
            <FormControl
              type="email"
              placeholder="juan.perez@email.com"
              value={email.email}
              onChange={(e) => handleEmailChange(index, 'email', e.target.value)}
              disabled={loading}
            />
            <FormControl
              type="text"
              placeholder="Tipo (opcional)"
              value={email.tipo || ''}
              onChange={(e) => handleEmailChange(index, 'tipo', e.target.value)}
              disabled={loading}
              style={{ width: '150px' }}
            />
            <div className="d-flex align-items-center">
              <FormControl
                type="checkbox"
                checked={email.principal || false}
                onChange={(e) => handleEmailChange(index, 'principal', (e.target as HTMLInputElement).checked)}
                disabled={loading}
                className="me-2"
              />
              <small className="text-muted">Principal</small>
            </div>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => removeEmail(index)}
              type="button"
              disabled={loading}
            >
              <LuX size={16} />
            </Button>
          </div>
        ))}
      </FormGroup>

      <FormGroup className="mb-3">
        <FormControl
          type="checkbox"
          checked={formData.activo}
          onChange={(e) => handleFieldChange('activo', (e.target as HTMLInputElement).checked)}
          disabled={loading}
        />
        <FormLabel className="ms-2">Activo</FormLabel>
      </FormGroup>

      <div className="d-flex gap-2 justify-content-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button variant="primary" type="submit" disabled={loading}>
          <LuSave className="me-1" />
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </Form>
  )
}

export default PersonaForm

