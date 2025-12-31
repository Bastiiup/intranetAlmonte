'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert, FormCheck, InputGroup } from 'react-bootstrap'
import { LuSave, LuX, LuEye, LuEyeOff, LuSearch } from 'react-icons/lu'

const ROLES = [
  'super_admin',
  'encargado_adquisiciones',
  'supervisor',
  'soporte',
]

interface PersonaOption {
  id: string
  rut: string
  nombre_completo: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  genero?: string
  cumpleagno?: string
}

const AddColaboradorForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [buscandoPersona, setBuscandoPersona] = useState(false)
  const [personaSeleccionada, setPersonaSeleccionada] = useState<PersonaOption | null>(null)
  const [rutBusqueda, setRutBusqueda] = useState('')
  
  const [formData, setFormData] = useState({
    email_login: '',
    password: '',
    rol_principal: '',
    rol_operativo: '',
    auth_provider: 'google' as 'google' | 'strapi' | 'otro',
    activo: true,
    // Campos de persona
    rut: '',
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    genero: '',
    cumpleagno: '',
    personaId: null as string | null,
  })

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Sincronizar RUT de búsqueda con el formulario
  useEffect(() => {
    if (rutBusqueda.trim() && !personaSeleccionada) {
      setFormData((prev) => ({
        ...prev,
        rut: rutBusqueda.trim(),
      }))
    }
  }, [rutBusqueda, personaSeleccionada])

  // Buscar persona por RUT
  const buscarPersonaPorRUT = async () => {
    if (!rutBusqueda.trim()) {
      setError('Por favor ingrese un RUT para buscar')
      return
    }

    setBuscandoPersona(true)
    setError(null)

    try {
      const response = await fetch(`/api/personas?filters[rut][$eq]=${encodeURIComponent(rutBusqueda.trim())}&pagination[pageSize]=1`)
      const result = await response.json()

      if (result.success && result.data && result.data.length > 0) {
        const persona = result.data[0]
        const attrs = persona.attributes || persona
        
        const personaData: PersonaOption = {
          id: persona.id || persona.documentId,
          rut: attrs.rut || rutBusqueda.trim(),
          nombre_completo: attrs.nombre_completo || '',
          nombres: attrs.nombres || '',
          primer_apellido: attrs.primer_apellido || '',
          segundo_apellido: attrs.segundo_apellido || '',
          genero: attrs.genero || '',
          cumpleagno: attrs.cumpleagno || '',
        }

        setPersonaSeleccionada(personaData)
        setFormData((prev) => ({
          ...prev,
          rut: personaData.rut, // Siempre usar el RUT encontrado o ingresado
          nombres: personaData.nombres || '',
          primer_apellido: personaData.primer_apellido || '',
          segundo_apellido: personaData.segundo_apellido || '',
          genero: personaData.genero || '',
          cumpleagno: personaData.cumpleagno || '',
          personaId: personaData.id,
        }))
      } else {
        // No se encontró, limpiar selección pero mantener RUT para crear nueva
        setPersonaSeleccionada(null)
        setFormData((prev) => ({
          ...prev,
          rut: rutBusqueda.trim(), // Usar el RUT ingresado
          personaId: null,
        }))
      }
    } catch (err: any) {
      console.error('Error al buscar persona:', err)
      setError('Error al buscar persona por RUT')
    } finally {
      setBuscandoPersona(false)
    }
  }

  // Limpiar selección de persona
  const limpiarPersona = () => {
    setPersonaSeleccionada(null)
    setRutBusqueda('')
    setFormData((prev) => ({
      ...prev,
      rut: '',
      nombres: '',
      primer_apellido: '',
      segundo_apellido: '',
      genero: '',
      cumpleagno: '',
      personaId: null,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validaciones
      if (!formData.email_login.trim()) {
        throw new Error('El email_login es obligatorio')
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email_login.trim())) {
        throw new Error('El email_login no tiene un formato válido')
      }

      // Validar contraseña
      if (!formData.password || formData.password.trim().length < 6) {
        throw new Error('La contraseña es obligatoria y debe tener al menos 6 caracteres')
      }

      // Validar que haya RUT
      if (!formData.rut.trim()) {
        throw new Error('El RUT es obligatorio')
      }

      // Preparar datos para enviar (incluye campos de persona)
      const colaboradorData: any = {
        email_login: formData.email_login.trim(),
        password: formData.password,
        rol_principal: formData.rol_principal || null,
        rol_operativo: formData.rol_operativo || null,
        auth_provider: formData.auth_provider,
        activo: formData.activo,
        // Datos de persona para crear/relacionar
        persona: {
          rut: formData.rut.trim(),
          nombres: formData.nombres.trim() || null,
          primer_apellido: formData.primer_apellido.trim() || null,
          segundo_apellido: formData.segundo_apellido.trim() || null,
          genero: formData.genero || null,
          cumpleagno: formData.cumpleagno || null,
          personaId: formData.personaId, // Si existe, usar este ID para relacionar
        },
      }

      // Crear el colaborador (la API manejará la creación/relación de persona)
      const response = await fetch('/api/colaboradores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colaboradorData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear el colaborador')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/colaboradores')
      }, 1500)
    } catch (err: any) {
      console.error('Error al crear colaborador:', err)
      setError(err.message || 'Error al crear el colaborador')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h4 className="card-title mb-0">Agregar Nuevo Colaborador</h4>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            ¡Colaborador creado exitosamente! Redirigiendo...
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* Sección: Información de Colaborador */}
          <h5 className="mb-3">Información de Colaborador</h5>
          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Email Login <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={formData.email_login}
                  onChange={(e) => handleFieldChange('email_login', e.target.value)}
                  required
                  disabled={loading}
                />
                <small className="text-muted">Email que usará para iniciar sesión</small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Contraseña <span className="text-danger">*</span>
                </FormLabel>
                <InputGroup>
                  <FormControl
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    type="button"
                  >
                    {showPassword ? <LuEyeOff /> : <LuEye />}
                  </Button>
                </InputGroup>
                <small className="text-muted">Mínimo 6 caracteres</small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Rol Principal</FormLabel>
                <FormControl
                  as="select"
                  value={formData.rol_principal}
                  onChange={(e) => handleFieldChange('rol_principal', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Seleccionar rol...</option>
                  <option value="comercial">Comercial</option>
                  <option value="soporte">Soporte</option>
                  <option value="comprobaciones">Comprobaciones</option>
                  <option value="otro">Otro</option>
                </FormControl>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Proveedor de Autenticación</FormLabel>
                <FormControl
                  as="select"
                  value={formData.auth_provider}
                  onChange={(e) => handleFieldChange('auth_provider', e.target.value as any)}
                  disabled={loading}
                >
                  <option value="google">Google</option>
                  <option value="strapi">Strapi</option>
                  <option value="otro">Otro</option>
                </FormControl>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup className="mb-3">
                <FormCheck
                  type="checkbox"
                  label="Activo"
                  checked={formData.activo}
                  onChange={(e) => handleFieldChange('activo', e.target.checked)}
                  disabled={loading}
                />
                <small className="text-muted d-block mt-1">
                  Los colaboradores inactivos no podrán iniciar sesión
                </small>
              </FormGroup>
            </Col>
          </Row>

          <hr className="my-4" />

          {/* Sección: Información de Persona */}
          <h5 className="mb-3">Información de Persona</h5>
          
          {/* Buscar persona existente por RUT */}
          <Row className="mb-3">
            <Col md={12}>
              <FormGroup>
                <FormLabel>Buscar Persona por RUT</FormLabel>
                <InputGroup>
                  <FormControl
                    type="text"
                    placeholder="Ingrese RUT (ej: 12345678-9)"
                    value={rutBusqueda}
                    onChange={(e) => {
                      const rutValue = e.target.value
                      setRutBusqueda(rutValue)
                      // Sincronizar automáticamente con formData.rut
                      if (!personaSeleccionada) {
                        setFormData((prev) => ({
                          ...prev,
                          rut: rutValue.trim(),
                        }))
                      }
                    }}
                    disabled={loading || buscandoPersona}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        buscarPersonaPorRUT()
                      }
                    }}
                  />
                  <Button
                    variant="outline-primary"
                    onClick={buscarPersonaPorRUT}
                    disabled={loading || buscandoPersona || !rutBusqueda.trim()}
                    type="button"
                  >
                    <LuSearch className="me-1" />
                    {buscandoPersona ? 'Buscando...' : 'Buscar'}
                  </Button>
                  {personaSeleccionada && (
                    <Button
                      variant="outline-secondary"
                      onClick={limpiarPersona}
                      disabled={loading}
                      type="button"
                    >
                      Limpiar
                    </Button>
                  )}
                </InputGroup>
                {personaSeleccionada && (
                  <Alert variant="info" className="mt-2 mb-0">
                    <strong>Persona encontrada:</strong> {personaSeleccionada.nombre_completo || `${personaSeleccionada.nombres} ${personaSeleccionada.primer_apellido}`.trim()}
                  </Alert>
                )}
                <small className="text-muted d-block mt-1">
                  Ingrese el RUT aquí. Este mismo RUT se usará para crear/relacionar la persona con el colaborador. Puede buscar una persona existente o completar los campos abajo para crear una nueva.
                </small>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  RUT <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="12345678-9"
                  value={formData.rut}
                  onChange={(e) => {
                    handleFieldChange('rut', e.target.value)
                    setRutBusqueda(e.target.value) // Sincronizar con el buscador
                  }}
                  required
                  disabled={loading || !!personaSeleccionada}
                  readOnly={!!personaSeleccionada} // Solo lectura si hay persona seleccionada
                />
                <small className="text-muted">
                  {personaSeleccionada ? 'El RUT se toma del buscador arriba' : 'El RUT también puede ingresarse aquí'}
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Nombres</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Juan"
                  value={formData.nombres}
                  onChange={(e) => handleFieldChange('nombres', e.target.value)}
                  disabled={loading || !!personaSeleccionada}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Primer Apellido</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Pérez"
                  value={formData.primer_apellido}
                  onChange={(e) => handleFieldChange('primer_apellido', e.target.value)}
                  disabled={loading || !!personaSeleccionada}
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
                  disabled={loading || !!personaSeleccionada}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Género</FormLabel>
                <FormControl
                  as="select"
                  value={formData.genero}
                  onChange={(e) => handleFieldChange('genero', e.target.value)}
                  disabled={loading || !!personaSeleccionada}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Mujer">Mujer</option>
                  <option value="Hombre">Hombre</option>
                </FormControl>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Fecha de Cumpleaños</FormLabel>
                <FormControl
                  type="date"
                  value={formData.cumpleagno}
                  onChange={(e) => handleFieldChange('cumpleagno', e.target.value)}
                  disabled={loading || !!personaSeleccionada}
                />
              </FormGroup>
            </Col>
          </Row>

          <div className="d-flex gap-2 justify-content-end">
            <Button
              variant="secondary"
              onClick={() => router.back()}
              disabled={loading}
            >
              <LuX className="me-1" /> Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              <LuSave className="me-1" />
              {loading ? 'Guardando...' : 'Guardar Colaborador'}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

export default AddColaboradorForm

