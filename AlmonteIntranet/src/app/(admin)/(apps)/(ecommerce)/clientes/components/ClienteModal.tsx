'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Form, Alert, Spinner, Row, Col } from 'react-bootstrap'
import { validarRUTChileno, formatearRUT, limpiarRUT } from '@/lib/utils/rut'
import PlatformSelector from './PlatformSelector'

interface EmailItem {
  email: string
  tipo: 'Personal' | 'Laboral' | 'Institucional'
}

interface TelefonoItem {
  telefono_raw: string
  tipo: 'Personal' | 'Laboral' | 'Institucional' | null
  principal?: boolean
}

interface Cliente {
  id?: number | string
  documentId?: string
  personaDocumentId?: string
  nombre?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  correo_electronico?: string
  telefono?: string
  rut?: string
  genero?: string
  emails?: EmailItem[]
  telefonos?: TelefonoItem[]
}

interface ClienteModalProps {
  show: boolean
  onHide: () => void
  cliente?: Cliente | null // Si es null/undefined, es modo creación; si tiene valor, es modo edición
  onSave: () => void
}

const ClienteModal = ({ show, onHide, cliente, onSave }: ClienteModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    rut: string
    nombres: string
    primer_apellido: string
    segundo_apellido: string
    genero: string
    emails: EmailItem[]
    telefonos: TelefonoItem[]
  }>({
    rut: '',
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    genero: '',
    emails: [{ email: '', tipo: 'Personal' }],
    telefonos: [{ telefono_raw: '', tipo: null }],
  })
  const [rutError, setRutError] = useState<string | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const isEditMode = !!cliente

  // Función auxiliar para cargar datos básicos del cliente
  const loadBasicClienteData = (cliente: Cliente) => {
    // Parsear nombre completo si solo hay nombre_completo
    let nombres = cliente.nombres || ''
    let primerApellido = cliente.primer_apellido || ''
    let segundoApellido = cliente.segundo_apellido || ''
    
    if (!nombres && cliente.nombre) {
      // Si no hay nombres separados pero hay nombre completo, intentar parsear
      const partes = cliente.nombre.trim().split(' ')
      nombres = partes[0] || ''
      primerApellido = partes[1] || ''
      segundoApellido = partes.slice(2).join(' ') || ''
    }

    // Cargar emails
    const emails: EmailItem[] = cliente.emails && Array.isArray(cliente.emails) && cliente.emails.length > 0
      ? cliente.emails.map((e: any) => ({
          email: typeof e === 'string' ? e : (e.email || ''),
          tipo: (typeof e === 'object' && e.tipo && ['Personal', 'Laboral', 'Institucional'].includes(e.tipo))
            ? e.tipo as 'Personal' | 'Laboral' | 'Institucional'
            : 'Personal'
        }))
      : [{ email: cliente.correo_electronico || '', tipo: 'Personal' }]

    // Cargar teléfonos
    const telefonos: TelefonoItem[] = cliente.telefonos && Array.isArray(cliente.telefonos) && cliente.telefonos.length > 0
      ? cliente.telefonos.map((t: any, index: number) => ({
          telefono_raw: typeof t === 'string' ? t : (t.telefono_raw || t.telefono_norm || t.numero || t.telefono || ''),
          tipo: (typeof t === 'object' && t.tipo && ['Personal', 'Laboral', 'Institucional'].includes(t.tipo))
            ? t.tipo as 'Personal' | 'Laboral' | 'Institucional'
            : null,
          principal: index === 0 || t.principal === true,
        }))
      : cliente.telefono && cliente.telefono !== 'Sin teléfono'
        ? [{ telefono_raw: cliente.telefono, tipo: null, principal: true }]
        : [{ telefono_raw: '', tipo: null, principal: true }]

    setFormData({
      rut: cliente.rut || '',
      nombres,
      primer_apellido: primerApellido,
      segundo_apellido: segundoApellido,
      genero: cliente.genero || '',
      emails: emails.length > 0 ? emails : [{ email: '', tipo: 'Personal' }],
      telefonos: telefonos.length > 0 ? telefonos : [{ telefono_raw: '', tipo: null, principal: true }],
    })
  }

  // Cargar datos del cliente cuando se abre el modal en modo edición
  useEffect(() => {
    if (show) {
      if (isEditMode && cliente) {
        // Si tenemos personaDocumentId, cargar los datos completos de la persona
        if (cliente.personaDocumentId) {
          // Hacer llamada GET para obtener los datos completos de la persona
          fetch(`/api/tienda/clientes/${cliente.id || cliente.documentId}`)
            .then(res => res.json())
            .then(result => {
              if (result.success && result.data) {
                const clienteCompleto = result.data
                const persona = clienteCompleto.attributes?.persona?.data || 
                              clienteCompleto.attributes?.persona || 
                              clienteCompleto.persona?.data || 
                              clienteCompleto.persona
                
                if (persona) {
                  const personaAttrs = persona.attributes || persona
                  
                  // Cargar nombres y apellidos
                  const nombres = personaAttrs.nombres || ''
                  const primerApellido = personaAttrs.primer_apellido || ''
                  const segundoApellido = personaAttrs.segundo_apellido || ''
                  
                  // Cargar emails
                  const emails: EmailItem[] = personaAttrs.emails && Array.isArray(personaAttrs.emails) && personaAttrs.emails.length > 0
                    ? personaAttrs.emails.map((e: any) => ({
                        email: typeof e === 'string' ? e : (e.email || ''),
                        tipo: (typeof e === 'object' && e.tipo && ['Personal', 'Laboral', 'Institucional'].includes(e.tipo))
                          ? e.tipo as 'Personal' | 'Laboral' | 'Institucional'
                          : 'Personal'
                      }))
                    : [{ email: cliente.correo_electronico || '', tipo: 'Personal' }]

                  // Cargar teléfonos
                  const telefonos: TelefonoItem[] = personaAttrs.telefonos && Array.isArray(personaAttrs.telefonos) && personaAttrs.telefonos.length > 0
                    ? personaAttrs.telefonos.map((t: any, index: number) => ({
                        telefono_raw: typeof t === 'string' ? t : (t.telefono_raw || t.telefono_norm || t.numero || t.telefono || ''),
                        tipo: (typeof t === 'object' && t.tipo && ['Personal', 'Laboral', 'Institucional'].includes(t.tipo))
                          ? t.tipo as 'Personal' | 'Laboral' | 'Institucional'
                          : null,
                        principal: index === 0 || t.principal === true,
                      }))
                    : cliente.telefono && cliente.telefono !== 'Sin teléfono'
                      ? [{ telefono_raw: cliente.telefono, tipo: null, principal: true }]
                      : [{ telefono_raw: '', tipo: null, principal: true }]

                  setFormData({
                    rut: personaAttrs.rut || cliente.rut || '',
                    nombres,
                    primer_apellido: primerApellido,
                    segundo_apellido: segundoApellido,
                    genero: personaAttrs.genero || '',
                    emails: emails.length > 0 ? emails : [{ email: '', tipo: 'Personal' }],
                    telefonos: telefonos.length > 0 ? telefonos : [{ telefono_raw: '', tipo: null, principal: true }],
                  })
                  
                  return // Salir temprano después de cargar datos completos
                }
              }
              
              // Si no se pudieron cargar los datos completos, usar los datos básicos del cliente
              loadBasicClienteData(cliente)
            })
            .catch(err => {
              console.error('Error al cargar datos completos del cliente:', err)
              setLoadingData(false)
              // Si falla, usar los datos básicos del cliente
              loadBasicClienteData(cliente)
            })
        } else {
          // Cargar datos básicos del cliente (si no hay personaDocumentId)
          loadBasicClienteData(cliente)
        }
      } else {
        // Resetear formulario para modo creación
        setFormData({
          rut: '',
          nombres: '',
          primer_apellido: '',
          segundo_apellido: '',
          genero: '',
          emails: [{ email: '', tipo: 'Personal' }],
          telefonos: [{ telefono_raw: '', tipo: null, principal: true }],
        })
        setSelectedPlatforms([])
      }
      setError(null)
      setRutError(null)
    }
  }, [show, isEditMode, cliente])

  const handleRUTChange = (value: string) => {
    // Permitir solo números y guión
    const cleaned = value.replace(/[^0-9-]/g, '')
    
    // Si el usuario está escribiendo, solo validar cuando termine (al perder el foco o al enviar)
    setFormData((prev) => ({ ...prev, rut: cleaned }))
    
    // Solo validar si tiene al menos 8 caracteres (7 dígitos + guión)
    if (cleaned.length >= 8) {
      // Si no tiene guión, intentar formatearlo automáticamente
      if (!cleaned.includes('-') && cleaned.length >= 7) {
        const rutFormateado = formatearRUT(cleaned)
        setFormData((prev) => ({ ...prev, rut: rutFormateado }))
      }
    }
    
    // Limpiar error cuando el usuario está escribiendo
    if (rutError) {
      setRutError(null)
    }
  }

  const handleEmailChange = (index: number, field: 'email' | 'tipo', value: string) => {
    setFormData((prev) => ({
      ...prev,
      emails: prev.emails.map((email, i) =>
        i === index ? { ...email, [field]: value } : email
      ),
    }))
  }

  const addEmail = () => {
    setFormData((prev) => ({
      ...prev,
      emails: [...prev.emails, { email: '', tipo: 'Personal' }],
    }))
  }

  const removeEmail = (index: number) => {
    if (formData.emails.length > 1) {
      setFormData((prev) => ({
        ...prev,
        emails: prev.emails.filter((_, i) => i !== index),
      }))
    }
  }

  const handleTelefonoChange = (index: number, field: 'telefono_raw' | 'tipo', value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      telefonos: prev.telefonos.map((telefono, i) =>
        i === index ? { ...telefono, [field]: value } : telefono
      ),
    }))
  }

  const addTelefono = () => {
    setFormData((prev) => ({
      ...prev,
      telefonos: [...prev.telefonos, { telefono_raw: '', tipo: null, principal: false }],
    }))
  }

  const removeTelefono = (index: number) => {
    if (formData.telefonos.length > 1) {
      setFormData((prev) => ({
        ...prev,
        telefonos: prev.telefonos.filter((_, i) => i !== index),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validar campos obligatorios
      if (!formData.nombres.trim()) {
        throw new Error('Los nombres son obligatorios')
      }
      
      // Validar que al menos haya un email válido
      const emailsValidos = formData.emails.filter(e => e.email.trim())
      if (emailsValidos.length === 0) {
        throw new Error('Al menos un correo electrónico es obligatorio')
      }

      // Validar formato de emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      for (const emailItem of emailsValidos) {
        if (!emailRegex.test(emailItem.email.trim())) {
          throw new Error(`El correo electrónico "${emailItem.email}" no tiene un formato válido`)
        }
      }

      // Validar RUT si se proporciona
      let rutFormateado: string | undefined = undefined
      if (formData.rut.trim()) {
        const rutLimpio = limpiarRUT(formData.rut.trim())
        // Si tiene menos de 8 caracteres (7 dígitos + dígito verificador), es inválido
        if (rutLimpio.length < 8) {
          throw new Error('El RUT debe tener al menos 8 caracteres')
        }
        
        const validacionRUT = validarRUTChileno(formData.rut.trim())
        if (!validacionRUT.valid) {
          setRutError(validacionRUT.error || 'El RUT no es válido')
          throw new Error(validacionRUT.error || 'El RUT no es válido')
        }
        rutFormateado = validacionRUT.formatted
      }

      // Construir nombre completo
      const nombreCompleto = [
        formData.nombres.trim(),
        formData.primer_apellido.trim(),
        formData.segundo_apellido.trim()
      ].filter(Boolean).join(' ')

      // Preparar datos para la API
      const personaData: any = {
        nombre_completo: nombreCompleto,
        nombres: formData.nombres.trim(),
        primer_apellido: formData.primer_apellido.trim() || null,
        segundo_apellido: formData.segundo_apellido.trim() || null,
        emails: emailsValidos.map(e => ({
          email: e.email.trim(),
          tipo: e.tipo,
        })),
      }

      if (rutFormateado) {
        personaData.rut = rutFormateado
      }

      if (formData.genero) {
        personaData.genero = formData.genero
      }

      // Filtrar teléfonos válidos
      const telefonosValidos = formData.telefonos
        .filter(t => t.telefono_raw.trim())
        .map((t, index) => ({
          telefono_raw: t.telefono_raw.trim(),
          telefono_norm: t.telefono_raw.trim(),
          tipo: t.tipo,
          principal: index === 0 || t.principal === true,
          status: true,
        }))

      if (telefonosValidos.length > 0) {
        personaData.telefonos = telefonosValidos
      }

      if (isEditMode && cliente) {
        // Modo edición
        const clienteId = cliente.documentId || cliente.id
        if (!clienteId) {
          throw new Error('No se puede editar: el cliente no tiene ID válido')
        }

        const updateData: any = {
          data: {
            nombre: nombreCompleto,
            correo_electronico: emailsValidos[0].email.trim(),
            persona: {
              documentId: cliente.personaDocumentId,
              ...personaData,
              telefonos: telefonosValidos.length > 0 ? telefonosValidos : undefined,
            },
          },
        }

        const response = await fetch(`/api/tienda/clientes/${clienteId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Error al actualizar el cliente')
        }

        onSave()
        onHide()
      } else {
        // Modo creación
        const dataToSend: any = {
          data: {
            persona: personaData,
          },
        }

        // Agregar plataformas seleccionadas
        if (selectedPlatforms.length > 0) {
          dataToSend.data.canales = selectedPlatforms
        }

        const response = await fetch('/api/tienda/clientes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Error al crear el cliente')
        }

        onSave()
        onHide()
      }
    } catch (err: any) {
      console.error('Error al guardar cliente:', err)
      setError(err.message || 'Error al guardar el cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{isEditMode ? 'Editar Cliente' : 'Crear Cliente'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {!isEditMode && (
            <PlatformSelector
              selectedPlatforms={selectedPlatforms}
              onChange={setSelectedPlatforms}
            />
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  RUT
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: 12345678-9"
                  value={formData.rut}
                  onChange={(e) => handleRUTChange(e.target.value)}
                  onBlur={() => {
                    // Validar RUT cuando pierde el foco
                    if (formData.rut.trim()) {
                      const validacion = validarRUTChileno(formData.rut.trim())
                      if (!validacion.valid) {
                        setRutError(validacion.error || 'RUT inválido')
                      } else {
                        setRutError(null)
                        setFormData((prev) => ({ ...prev, rut: validacion.formatted }))
                      }
                    }
                  }}
                  isInvalid={!!rutError}
                />
                {rutError && (
                  <Form.Control.Feedback type="invalid">
                    {rutError}
                  </Form.Control.Feedback>
                )}
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Género
                </Form.Label>
                <Form.Select
                  value={formData.genero}
                  onChange={(e) => setFormData((prev) => ({ ...prev, genero: e.target.value }))}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Nombres <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: Juan Carlos"
                  value={formData.nombres}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nombres: e.target.value }))}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Primer Apellido
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: Pérez"
                  value={formData.primer_apellido}
                  onChange={(e) => setFormData((prev) => ({ ...prev, primer_apellido: e.target.value }))}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Segundo Apellido
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: González"
                  value={formData.segundo_apellido}
                  onChange={(e) => setFormData((prev) => ({ ...prev, segundo_apellido: e.target.value }))}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>
              Correos Electrónicos <span className="text-danger">*</span>
            </Form.Label>
            {formData.emails.map((emailItem, index) => (
              <Row key={index} className="mb-2">
                <Col md={6}>
                  <Form.Control
                    type="email"
                    placeholder="Ej: juan.perez@ejemplo.com"
                    value={emailItem.email}
                    onChange={(e) => handleEmailChange(index, 'email', e.target.value)}
                    required={index === 0}
                  />
                </Col>
                <Col md={4}>
                  <Form.Select
                    value={emailItem.tipo}
                    onChange={(e) => handleEmailChange(index, 'tipo', e.target.value)}
                  >
                    <option value="Personal">Personal</option>
                    <option value="Laboral">Laboral</option>
                    <option value="Institucional">Institucional</option>
                  </Form.Select>
                </Col>
                <Col md={2}>
                  {formData.emails.length > 1 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeEmail(index)}
                    >
                      ×
                    </Button>
                  )}
                </Col>
              </Row>
            ))}
            <Button variant="outline-primary" size="sm" onClick={addEmail}>
              + Agregar Email
            </Button>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Teléfonos
            </Form.Label>
            {formData.telefonos.map((telefonoItem, index) => (
              <Row key={index} className="mb-2">
                <Col md={6}>
                  <Form.Control
                    type="tel"
                    placeholder="Ej: +56 9 1234 5678"
                    value={telefonoItem.telefono_raw}
                    onChange={(e) => handleTelefonoChange(index, 'telefono_raw', e.target.value)}
                  />
                </Col>
                <Col md={4}>
                  <Form.Select
                    value={telefonoItem.tipo || ''}
                    onChange={(e) => handleTelefonoChange(index, 'tipo', e.target.value || null)}
                  >
                    <option value="">Sin tipo</option>
                    <option value="Personal">Personal</option>
                    <option value="Laboral">Laboral</option>
                    <option value="Institucional">Institucional</option>
                  </Form.Select>
                </Col>
                <Col md={2}>
                  {formData.telefonos.length > 1 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeTelefono(index)}
                    >
                      ×
                    </Button>
                  )}
                </Col>
              </Row>
            ))}
            <Button variant="outline-primary" size="sm" onClick={addTelefono}>
              + Agregar Teléfono
            </Button>
          </Form.Group>

          <div className="d-flex gap-2 justify-content-end">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {isEditMode ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                isEditMode ? 'Guardar Cambios' : 'Crear Cliente'
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  )
}

export default ClienteModal

