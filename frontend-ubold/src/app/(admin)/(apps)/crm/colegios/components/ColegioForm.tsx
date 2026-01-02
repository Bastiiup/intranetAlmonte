'use client'

import { useState, useEffect } from 'react'
import { Form, FormGroup, FormLabel, FormControl, Button, Alert, Row, Col } from 'react-bootstrap'
import { LuSave, LuPlus, LuX } from 'react-icons/lu'

const DEPENDENCIAS = [
  'Municipal',
  'Particular Subvencionado',
  'Particular Pagado',
]

const ESTADOS = [
  'Por Verificar',
  'Verificado',
  'Aprobado',
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

interface DireccionItem {
  nombre_calle?: string
  numero_calle?: string
  complemento_direccion?: string
  tipo_direccion?: string
  direccion_principal_envio_facturacion?: string
  comuna?: string | number
  region?: string
}

interface ColegioFormData {
  rbd: string
  colegio_nombre: string
  estado: string
  dependencia: string
  region?: string
  zona?: string
  comunaId?: number | string
  telefonos: TelefonoItem[]
  emails: EmailItem[]
  direcciones: DireccionItem[]
}

interface ColegioFormProps {
  initialData?: Partial<ColegioFormData>
  onSubmit: (data: ColegioFormData) => Promise<void>
  onCancel?: () => void
  loading?: boolean
  error?: string | null
}

const ColegioForm = ({ initialData, onSubmit, onCancel, loading = false, error: externalError }: ColegioFormProps) => {
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState<ColegioFormData>({
    rbd: '',
    colegio_nombre: '',
    estado: 'Por Verificar',
    dependencia: '',
    region: '',
    zona: '',
    comunaId: undefined,
    telefonos: [],
    emails: [],
    direcciones: [],
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        rbd: initialData.rbd || '',
        colegio_nombre: initialData.colegio_nombre || '',
        estado: initialData.estado || 'Por Verificar',
        dependencia: initialData.dependencia || '',
        region: initialData.region || '',
        zona: initialData.zona || '',
        comunaId: initialData.comunaId,
        telefonos: initialData.telefonos || [],
        emails: initialData.emails || [],
        direcciones: initialData.direcciones || [],
      })
    }
  }, [initialData])

  const handleFieldChange = (field: keyof ColegioFormData, value: any) => {
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

  const handleDireccionChange = (index: number, field: keyof DireccionItem, value: any) => {
    const newDirecciones = [...formData.direcciones]
    newDirecciones[index] = { ...newDirecciones[index], [field]: value }
    setFormData((prev) => ({ ...prev, direcciones: newDirecciones }))
  }

  const addDireccion = () => {
    setFormData((prev) => ({
      ...prev,
      direcciones: [...prev.direcciones, { 
        nombre_calle: '', 
        numero_calle: '',
        tipo_direccion: 'Colegio',
        direccion_principal_envio_facturacion: 'Principal'
      }],
    }))
  }

  const removeDireccion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      direcciones: prev.direcciones.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    setFormError(null)
    if (!formData.rbd || !formData.rbd.trim()) {
      setFormError('El RBD es obligatorio')
      return
    }
    if (!formData.colegio_nombre || !formData.colegio_nombre.trim()) {
      setFormError('El nombre del colegio es obligatorio')
      return
    }

    try {
      await onSubmit(formData)
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el colegio')
    }
  }

  const displayError = externalError || formError

  return (
    <Form onSubmit={handleSubmit}>
      {displayError && (
        <Alert variant="danger" dismissible onClose={() => { setFormError(null) }}>
          {displayError}
        </Alert>
      )}

      <Row>
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
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>
              Nombre del Colegio <span className="text-danger">*</span>
            </FormLabel>
            <FormControl
              type="text"
              placeholder="Colegio San Juan"
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
            <FormLabel>Estado</FormLabel>
            <FormControl
              as="select"
              value={formData.estado}
              onChange={(e) => handleFieldChange('estado', e.target.value)}
              disabled={loading}
            >
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </FormControl>
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
            <FormLabel>Región</FormLabel>
            <FormControl
              type="text"
              placeholder="Metropolitana"
              value={formData.region}
              onChange={(e) => handleFieldChange('region', e.target.value)}
              disabled={loading}
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Zona</FormLabel>
            <FormControl
              type="text"
              placeholder="Centro, Oriente, Poniente..."
              value={formData.zona}
              onChange={(e) => handleFieldChange('zona', e.target.value)}
              disabled={loading}
            />
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
              placeholder="+56 2 1234 5678"
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
              placeholder="contacto@colegio.cl"
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

      {/* Direcciones */}
      <FormGroup className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <FormLabel>Direcciones</FormLabel>
          <Button variant="outline-primary" size="sm" onClick={addDireccion} type="button" disabled={loading}>
            <LuPlus size={16} /> Agregar Dirección
          </Button>
        </div>
        {formData.direcciones.map((direccion, index) => (
          <div key={index} className="mb-2 p-3 border rounded">
            <Row>
              <Col md={6}>
                <FormControl
                  type="text"
                  placeholder="Nombre de Calle"
                  value={direccion.nombre_calle || ''}
                  onChange={(e) => handleDireccionChange(index, 'nombre_calle', e.target.value)}
                  disabled={loading}
                  className="mb-2"
                />
              </Col>
              <Col md={6}>
                <FormControl
                  type="text"
                  placeholder="Número de Calle"
                  value={direccion.numero_calle || ''}
                  onChange={(e) => handleDireccionChange(index, 'numero_calle', e.target.value)}
                  disabled={loading}
                  className="mb-2"
                />
              </Col>
              <Col md={6}>
                <FormControl
                  type="text"
                  placeholder="Complemento"
                  value={direccion.complemento_direccion || ''}
                  onChange={(e) => handleDireccionChange(index, 'complemento_direccion', e.target.value)}
                  disabled={loading}
                  className="mb-2"
                />
              </Col>
              <Col md={6}>
                <FormControl
                  as="select"
                  value={direccion.tipo_direccion || ''}
                  onChange={(e) => handleDireccionChange(index, 'tipo_direccion', e.target.value)}
                  disabled={loading}
                  className="mb-2"
                >
                  <option value="">Tipo de Dirección</option>
                  <option value="Casa">Casa</option>
                  <option value="Departamento">Departamento</option>
                  <option value="Colegio">Colegio</option>
                  <option value="Comercial">Comercial</option>
                </FormControl>
              </Col>
              <Col md={6}>
                <FormControl
                  as="select"
                  value={direccion.direccion_principal_envio_facturacion || ''}
                  onChange={(e) => handleDireccionChange(index, 'direccion_principal_envio_facturacion', e.target.value)}
                  disabled={loading}
                  className="mb-2"
                >
                  <option value="">Tipo</option>
                  <option value="Principal">Principal</option>
                  <option value="Envío">Envío</option>
                  <option value="Facturación">Facturación</option>
                </FormControl>
              </Col>
            </Row>
            <div className="d-flex justify-content-end">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => removeDireccion(index)}
                type="button"
                disabled={loading}
              >
                <LuX size={16} /> Eliminar
              </Button>
            </div>
          </div>
        ))}
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

export default ColegioForm

