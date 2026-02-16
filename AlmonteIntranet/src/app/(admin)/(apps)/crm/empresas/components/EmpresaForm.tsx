'use client'

import { useState, useEffect } from 'react'
import { Form, FormGroup, FormLabel, FormControl, FormCheck, Button, Alert, Row, Col, Card, CardHeader, CardBody } from 'react-bootstrap'
import { LuSave, LuPlus, LuX } from 'react-icons/lu'
import ChileRegionComuna from '@/components/common/ChileRegionsComunas'

const ESTADOS = [
  'Activa',
  'Inactiva',
  'En Proceso',
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

interface DatosFacturacion {
  first_name?: string
  last_name?: string
  company?: string
  email?: string
  phone?: string
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
}

interface EmpresaFormData {
  empresa_nombre: string
  razon_social?: string
  rut?: string
  giro?: string
  estado: string
  region?: string
  comunaId?: number | string
  telefonos: TelefonoItem[]
  emails: EmailItem[]
  direcciones: DireccionItem[]
  datos_facturacion?: DatosFacturacion
  es_empresa_propia?: boolean
}

interface EmpresaFormProps {
  initialData?: Partial<EmpresaFormData>
  onSubmit: (data: EmpresaFormData) => Promise<void>
  onCancel?: () => void
  loading?: boolean
  error?: string | null
}

const EmpresaForm = ({ initialData, onSubmit, onCancel, loading = false, error: externalError }: EmpresaFormProps) => {
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState<EmpresaFormData>({
    empresa_nombre: '',
    razon_social: '',
    rut: '',
    giro: '',
    estado: 'Activa',
    region: '',
    comunaId: undefined,
    telefonos: [],
    emails: [],
    direcciones: [],
    datos_facturacion: {
      country: 'CL',
    },
    es_empresa_propia: false,
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        empresa_nombre: initialData.empresa_nombre || '',
        razon_social: initialData.razon_social || '',
        rut: initialData.rut || '',
        giro: initialData.giro || '',
        estado: initialData.estado || 'Activa',
        region: initialData.region || '',
        comunaId: initialData.comunaId,
        telefonos: initialData.telefonos || [],
        emails: initialData.emails || [],
        direcciones: initialData.direcciones || [],
        datos_facturacion: initialData.datos_facturacion || { country: 'CL' },
        es_empresa_propia: initialData.es_empresa_propia || false,
      })
    }
  }, [initialData])

  const handleFieldChange = (field: keyof EmpresaFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFacturacionChange = (field: keyof DatosFacturacion, value: any) => {
    setFormData((prev) => ({
      ...prev,
      datos_facturacion: {
        ...prev.datos_facturacion,
        [field]: value,
      } as DatosFacturacion,
      ...(prev.datos_facturacion?.country === undefined && { country: 'CL' }),
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
        tipo_direccion: 'Principal',
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
    if (!formData.empresa_nombre || !formData.empresa_nombre.trim()) {
      setFormError('El nombre de la empresa es obligatorio')
      return
    }

    try {
      await onSubmit(formData)
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la empresa')
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

      {/* Información Básica */}
      <Card className="mb-3">
        <CardHeader>
          <h5 className="mb-0">Información Básica</h5>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Nombre de la Empresa <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Nombre Comercial"
                  value={formData.empresa_nombre}
                  onChange={(e) => handleFieldChange('empresa_nombre', e.target.value)}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Razón Social</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Razón Social Legal"
                  value={formData.razon_social}
                  onChange={(e) => handleFieldChange('razon_social', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>RUT</FormLabel>
                <FormControl
                  type="text"
                  placeholder="12.345.678-9"
                  value={formData.rut}
                  onChange={(e) => handleFieldChange('rut', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Giro</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Giro Comercial"
                  value={formData.giro}
                  onChange={(e) => handleFieldChange('giro', e.target.value)}
                  disabled={loading}
                />
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
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormCheck
                  type="checkbox"
                  id="es_empresa_propia"
                  checked={formData.es_empresa_propia || false}
                  onChange={(e) => handleFieldChange('es_empresa_propia', e.target.checked)}
                  disabled={loading}
                  label={
                    <div>
                      <strong>Empresa Propia (Compradora)</strong>
                      <small className="text-muted d-block">
                        Marca esta opción si esta empresa es propiedad de Almonte (Almonte, Moraleja, Escolar). 
                        Estas empresas aparecerán al seleccionar datos de facturación para órdenes de compra.
                      </small>
                    </div>
                  }
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Región y Comuna</FormLabel>
                <ChileRegionComuna
                  regionValue={formData.region}
                  comunaValue={formData.comunaId ? String(formData.comunaId) : ''}
                  onRegionChange={(value) => handleFieldChange('region', value)}
                  onComunaChange={(value) => {
                    const comunaId = value ? (isNaN(Number(value)) ? value : Number(value)) : undefined
                    handleFieldChange('comunaId', comunaId)
                  }}
                />
              </FormGroup>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Teléfonos y Emails */}
      <Card className="mb-3">
        <CardHeader>
          <h5 className="mb-0">Contacto</h5>
        </CardHeader>
        <CardBody>
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
                  placeholder="contacto@empresa.cl"
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
        </CardBody>
      </Card>

      {/* Direcciones */}
      <Card className="mb-3">
        <CardHeader>
          <h5 className="mb-0">Direcciones</h5>
        </CardHeader>
        <CardBody>
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
                      <option value="Principal">Principal</option>
                      <option value="Sucursal">Sucursal</option>
                      <option value="Almacén">Almacén</option>
                      <option value="Otra">Otra</option>
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
        </CardBody>
      </Card>

      {/* Datos de Facturación */}
      <Card className="mb-3">
        <CardHeader>
          <h5 className="mb-0">Datos de Facturación</h5>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Nombre de Contacto</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Nombre"
                  value={formData.datos_facturacion?.first_name || ''}
                  onChange={(e) => handleFacturacionChange('first_name', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Apellido de Contacto</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Apellido"
                  value={formData.datos_facturacion?.last_name || ''}
                  onChange={(e) => handleFacturacionChange('last_name', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Empresa (Facturación)</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Razón Social para Facturación"
                  value={formData.datos_facturacion?.company || ''}
                  onChange={(e) => handleFacturacionChange('company', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Email Facturación</FormLabel>
                <FormControl
                  type="email"
                  placeholder="facturacion@empresa.cl"
                  value={formData.datos_facturacion?.email || ''}
                  onChange={(e) => handleFacturacionChange('email', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Teléfono Facturación</FormLabel>
                <FormControl
                  type="text"
                  placeholder="+56 2 1234 5678"
                  value={formData.datos_facturacion?.phone || ''}
                  onChange={(e) => handleFacturacionChange('phone', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>País</FormLabel>
                <FormControl
                  type="text"
                  placeholder="CL"
                  value={formData.datos_facturacion?.country || 'CL'}
                  onChange={(e) => handleFacturacionChange('country', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Dirección Línea 1</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Calle y Número"
                  value={formData.datos_facturacion?.address_1 || ''}
                  onChange={(e) => handleFacturacionChange('address_1', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Dirección Línea 2</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Depto, Oficina, etc."
                  value={formData.datos_facturacion?.address_2 || ''}
                  onChange={(e) => handleFacturacionChange('address_2', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Ciudad</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ciudad"
                  value={formData.datos_facturacion?.city || ''}
                  onChange={(e) => handleFacturacionChange('city', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Región/Estado</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Región"
                  value={formData.datos_facturacion?.state || ''}
                  onChange={(e) => handleFacturacionChange('state', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Código Postal</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Código Postal"
                  value={formData.datos_facturacion?.postcode || ''}
                  onChange={(e) => handleFacturacionChange('postcode', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>
        </CardBody>
      </Card>

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

export default EmpresaForm





