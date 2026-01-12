'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert, FormCheck, InputGroup } from 'react-bootstrap'
import { LuSave, LuX, LuEye, LuEyeOff, LuSearch } from 'react-icons/lu'

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

interface ColaboradorType {
  id: number | string
  documentId?: string
  email_login?: string
  rol?: string
  rol_principal?: string
  rol_operativo?: string
  activo?: boolean
  persona?: any
  usuario?: any
  attributes?: any
}

interface EditColaboradorFormProps {
  colaborador: any
  error?: string | null
}

const EditColaboradorForm = ({ colaborador: propsColaborador, error: propsError }: EditColaboradorFormProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(propsError || null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [buscandoPersona, setBuscandoPersona] = useState(false)
  const [personaSeleccionada, setPersonaSeleccionada] = useState<PersonaOption | null>(null)
  const [rutBusqueda, setRutBusqueda] = useState('')

  // Obtener datos del colaborador - manejar diferentes estructuras de Strapi
  const getColaboradorData = () => {
    if (!propsColaborador) return null
    
    // Caso 1: datos en attributes (estructura estándar de Strapi)
    if (propsColaborador.attributes) {
      return propsColaborador.attributes
    }
    
    // Caso 2: datos directamente en el objeto
    if (propsColaborador.email_login || propsColaborador.rol !== undefined) {
      return propsColaborador
    }
    
    // Caso 3: datos en data.attributes
    if ((propsColaborador as any).data?.attributes) {
      return (propsColaborador as any).data.attributes
    }
    
    // Caso 4: datos en data directamente
    if ((propsColaborador as any).data) {
      return (propsColaborador as any).data
    }
    
    return null
  }

  const colaboradorData = getColaboradorData()
  // Obtener el ID correcto (documentId si existe, sino id)
  const colaboradorId = (propsColaborador as any)?.documentId || propsColaborador?.id || (propsColaborador as any)?.data?.id

  // Obtener datos de persona del colaborador
  const getPersonaData = () => {
    if (!colaboradorData) return null
    const persona = colaboradorData.persona?.data || colaboradorData.persona
    if (!persona) return null
    return persona.attributes || persona
  }

  const personaData = getPersonaData()

  const [formData, setFormData] = useState({
    email_login: colaboradorData?.email_login || '',
    password: '', // Campo opcional para cambiar contraseña
    rol: colaboradorData?.rol || '',
    plataforma: colaboradorData?.plataforma || 'general', // Plataforma del colaborador
    activo: false, // Siempre false - no se puede cambiar desde aquí, solo desde solicitudes
    // Campos de persona
    rut: personaData?.rut || '',
    nombres: personaData?.nombres || '',
    primer_apellido: personaData?.primer_apellido || '',
    segundo_apellido: personaData?.segundo_apellido || '',
    genero: personaData?.genero || '',
    cumpleagno: personaData?.cumpleagno ? personaData.cumpleagno.split('T')[0] : '', // Formato date para input
    personaId: personaData ? (personaData.id || (personaData as any).documentId) : null,
  })

  useEffect(() => {
    if (colaboradorData) {
      const persona = colaboradorData.persona?.data || colaboradorData.persona
      const personaAttrs = persona?.attributes || persona || {}
      
      setFormData({
        email_login: colaboradorData.email_login || '',
        password: '', // No prellenar contraseña por seguridad
        rol: colaboradorData.rol || '',
        plataforma: colaboradorData.plataforma || 'general', // Plataforma del colaborador
        activo: false, // Siempre false - no se puede cambiar desde aquí
        rut: personaAttrs.rut || '',
        nombres: personaAttrs.nombres || '',
        primer_apellido: personaAttrs.primer_apellido || '',
        segundo_apellido: personaAttrs.segundo_apellido || '',
        genero: personaAttrs.genero || '',
        cumpleagno: personaAttrs.cumpleagno ? personaAttrs.cumpleagno.split('T')[0] : '',
        personaId: persona ? (persona.id || persona.documentId || personaAttrs.id) : null,
      })

      // Si hay persona, establecerla como seleccionada
      if (personaAttrs.rut) {
        setPersonaSeleccionada({
          id: persona?.id || persona?.documentId || personaAttrs.id,
          rut: personaAttrs.rut,
          nombre_completo: personaAttrs.nombre_completo || '',
          nombres: personaAttrs.nombres || '',
          primer_apellido: personaAttrs.primer_apellido || '',
          segundo_apellido: personaAttrs.segundo_apellido || '',
          genero: personaAttrs.genero || '',
          cumpleagno: personaAttrs.cumpleagno || '',
        })
        setRutBusqueda(personaAttrs.rut)
      }
    }
  }, [colaboradorData])

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
          cumpleagno: personaData.cumpleagno ? personaData.cumpleagno.split('T')[0] : '',
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
    
    if (!colaboradorId) {
      setError('No se pudo obtener el ID del colaborador')
      return
    }

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

      // Validar contraseña si se proporciona
      if (formData.password && formData.password.trim().length > 0 && formData.password.trim().length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres')
      }

      // Preparar datos para Strapi
      // IMPORTANTE: No enviar activo - no se puede cambiar desde aquí
      const colaboradorUpdateData: any = {
        email_login: formData.email_login.trim(),
        plataforma: formData.plataforma || 'general', // Plataforma del colaborador
        // activo no se envía - solo se puede cambiar desde solicitudes
        // Solo enviar password si se proporcionó (no vacío)
        ...(formData.password && formData.password.trim().length > 0 && { password: formData.password }),
        // Solo enviar rol si tiene valor válido
        ...(formData.rol && formData.rol.trim() && { rol: formData.rol.trim() }),
        // Datos de persona para actualizar/relacionar
        persona: {
          rut: formData.rut.trim() || null,
          nombres: formData.nombres.trim() || null,
          primer_apellido: formData.primer_apellido.trim() || null,
          segundo_apellido: formData.segundo_apellido.trim() || null,
          genero: formData.genero || null,
          cumpleagno: formData.cumpleagno || null,
          personaId: formData.personaId, // Si existe, usar este ID para relacionar
        },
      }

      // Actualizar el colaborador
      const response = await fetch(`/api/colaboradores/${colaboradorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colaboradorUpdateData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar el colaborador')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/colaboradores')
      }, 1500)
    } catch (err: any) {
      console.error('Error al actualizar colaborador:', err)
      setError(err.message || 'Error al actualizar el colaborador')
    } finally {
      setLoading(false)
    }
  }

  if (!colaboradorData) {
    return (
      <Card>
        <CardBody>
          <Alert variant="warning">
            No se pudo cargar la información del colaborador.
            {propsError && (
              <div className="mt-2">
                <small>Error: {propsError}</small>
              </div>
            )}
            {!propsColaborador && (
              <div className="mt-2">
                <small>No se recibieron datos del colaborador.</small>
              </div>
            )}
          </Alert>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h4 className="card-title mb-0">Editar Colaborador</h4>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            ¡Colaborador actualizado exitosamente! Redirigiendo...
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
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Rol</FormLabel>
                <FormControl
                  as="select"
                  value={formData.rol}
                  onChange={(e) => handleFieldChange('rol', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Seleccionar rol...</option>
                  <option value="soporte">Soporte</option>
                  <option value="encargado_adquisiciones">Encargado Adquisiciones</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="supervisor">Supervisor</option>
                </FormControl>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Plataforma <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  as="select"
                  value={formData.plataforma}
                  onChange={(e) => handleFieldChange('plataforma', e.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="general">General (Ambas plataformas)</option>
                  <option value="moraleja">Moraleja</option>
                  <option value="escolar">Escolar</option>
                </FormControl>
                <small className="text-muted">
                  Define qué plataforma puede ver este colaborador. "General" permite ver ambas.
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Nueva Contraseña</FormLabel>
                <InputGroup>
                  <FormControl
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Dejar vacío para no cambiar"
                    value={formData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
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
                <small className="text-muted">Dejar vacío para mantener la contraseña actual. Mínimo 6 caracteres si se cambia.</small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <Alert variant="info" className="mb-0">
                <small>
                  <strong>Nota:</strong> El estado activo/inactivo no se puede cambiar desde aquí. 
                  Para activar o desactivar colaboradores, diríjase a la sección de Solicitudes de Colaboradores.
                </small>
              </Alert>
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
                  Ingrese el RUT aquí. Este mismo RUT se usará para actualizar/relacionar la persona con el colaborador. Puede buscar una persona existente o completar los campos abajo para actualizar/crear una nueva.
                </small>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>RUT</FormLabel>
                <FormControl
                  type="text"
                  placeholder="12345678-9"
                  value={formData.rut}
                  onChange={(e) => {
                    handleFieldChange('rut', e.target.value)
                    setRutBusqueda(e.target.value) // Sincronizar con el buscador
                  }}
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
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

export default EditColaboradorForm

