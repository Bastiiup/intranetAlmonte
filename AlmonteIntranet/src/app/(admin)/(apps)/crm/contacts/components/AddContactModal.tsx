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

      // Preparar datos para Strapi (sin trayectoria, la crearemos después)
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
      }

      console.log('[AddContactModal] 📤 Enviando datos de contacto:', contactData)

      // PASO 1: Crear el contacto primero
      const response = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      const result = await response.json()

      console.log('[AddContactModal] 📥 Respuesta del servidor:', result)

      if (!response.ok || !result.success) {
        const errorMessage = result.details?.errors?.[0]?.message || result.error || 'Error al crear contacto'
        throw new Error(errorMessage)
      }

      // PASO 2: Obtener ID de la persona creada
      const personaId = result.data?.documentId || result.data?.id
      if (!personaId) {
        throw new Error('No se pudo obtener el ID de la persona creada')
      }

      console.log('[AddContactModal] ✅ Persona creada con ID:', personaId)

      // PASO 3: Crear trayectoria si se seleccionó un colegio válido
      console.log('[AddContactModal] Verificando colegioId para trayectoria:', {
        colegioId: formData.colegioId,
        tipo: typeof formData.colegioId,
        esValido: formData.colegioId && formData.colegioId !== '' && formData.colegioId !== '0',
      })
      if (formData.colegioId && formData.colegioId !== '' && formData.colegioId !== '0') {
        try {
          // Obtener el ID numérico de la persona si es documentId
          let personaIdNum: number | null = null
          const isDocumentId = typeof personaId === 'string' && !/^\d+$/.test(personaId)
          
          if (isDocumentId) {
            try {
              const personaResponse = await fetch(`/api/crm/contacts/${personaId}?fields=id`)
              const personaResult = await personaResponse.json()
              if (personaResult.success && personaResult.data) {
                const personaData = Array.isArray(personaResult.data) ? personaResult.data[0] : personaResult.data
                if (personaData && typeof personaData === 'object' && 'id' in personaData) {
                  personaIdNum = personaData.id as number
                  console.log('[AddContactModal] ✅ ID numérico de persona obtenido:', personaIdNum)
                }
              }
            } catch (err) {
              console.error('[AddContactModal] ❌ Error obteniendo ID numérico de persona:', err)
            }
          } else {
            personaIdNum = parseInt(String(personaId))
          }

          if (!personaIdNum || isNaN(personaIdNum)) {
            console.error('[AddContactModal] ❌ No se pudo obtener ID numérico de persona:', personaId)
            throw new Error('No se pudo obtener el ID numérico de la persona para crear la trayectoria')
          }

          // Validar y obtener colegioId numérico
          let colegioIdNum: number | null = null
          
          if (formData.colegioId && formData.colegioId !== '' && formData.colegioId !== '0') {
            // Intentar parsear directamente
            colegioIdNum = parseInt(String(formData.colegioId))
            
            // Si no es un número válido, intentar obtenerlo del colegio seleccionado
            if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
              const colegioSeleccionado = colegios.find(
                (c) => String(c.id || c.documentId) === String(formData.colegioId)
              )
              
              if (colegioSeleccionado) {
                // Intentar obtener ID numérico del colegio
                if (typeof colegioSeleccionado.id === 'number') {
                  colegioIdNum = colegioSeleccionado.id
                } else if (colegioSeleccionado.documentId) {
                  // Si solo tenemos documentId, necesitamos obtener el ID numérico
                  try {
                    const colegioResponse = await fetch(`/api/crm/colegios/${colegioSeleccionado.documentId}`)
                    const colegioResult = await colegioResponse.json()
                    if (colegioResult.success && colegioResult.data) {
                      const colegioData = colegioResult.data
                      colegioIdNum = colegioData.id || null
                    }
                  } catch (err) {
                    console.error('[AddContactModal] Error obteniendo ID numérico del colegio:', err)
                  }
                }
              }
            }
          }
          
          if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
            console.warn('[AddContactModal] ⚠️ ID de colegio inválido, omitiendo creación de trayectoria:', {
              colegioId: formData.colegioId,
              colegioIdNum,
              cargo: formData.cargo,
            })
            // Mostrar advertencia al usuario pero no fallar
            if (formData.cargo) {
              setError('El contacto se creó correctamente, pero no se pudo asociar al colegio. Puedes editarlo después.')
            }
          } else {
            console.log('[AddContactModal] 📤 Creando trayectoria:', {
              personaId: personaIdNum,
              colegioId: colegioIdNum,
              cargo: formData.cargo,
            })

            try {
              const trayectoriaResponse = await fetch('/api/persona-trayectorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  data: {
                    persona: { connect: [personaIdNum] },
                    colegio: { connect: [colegioIdNum] },
                    cargo: formData.cargo || null,
                    is_current: true,
                    activo: true,
                  },
                }),
              })

              const trayectoriaResult = await trayectoriaResponse.json()

              if (!trayectoriaResponse.ok || !trayectoriaResult.success) {
                console.error('[AddContactModal] ❌ Error al crear trayectoria:', trayectoriaResult)
                setError(
                  `El contacto se creó correctamente, pero hubo un error al asociarlo al colegio: ${trayectoriaResult.error || 'Error desconocido'}. Puedes editarlo después.`
                )
              } else {
                console.log('[AddContactModal] ✅ Trayectoria creada exitosamente:', trayectoriaResult)
              }
            } catch (trayectoriaFetchError: any) {
              console.error('[AddContactModal] ❌ Error en fetch de trayectoria:', trayectoriaFetchError)
              setError(
                `El contacto se creó correctamente, pero hubo un error al asociarlo al colegio: ${trayectoriaFetchError.message || 'Error de conexión'}. Puedes editarlo después.`
              )
            }
          }
        } catch (trayectoriaError: any) {
          console.error('[AddContactModal] ❌ Error al crear trayectoria:', trayectoriaError)
          // No lanzar error, solo loguear - el contacto ya fue creado
        }
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
                  value={formData.colegioId || ''}
                  onChange={(e) => {
                    const selectedValue = e.target.value
                    console.log('[AddContactModal] Colegio seleccionado:', selectedValue)
                    handleFieldChange('colegioId', selectedValue)
                  }}
                  disabled={loading || loadingColegios}
                >
                  <option value="">Seleccionar colegio...</option>
                  {colegios.map((colegio) => {
                    const colegioValue = String(colegio.id || colegio.documentId || '')
                    return (
                      <option key={colegioValue} value={colegioValue}>
                        {colegio.nombre} {colegio.rbd ? `(RBD: ${colegio.rbd})` : ''}
                      </option>
                    )
                  })}
                </FormControl>
                {loadingColegios && (
                  <small className="text-muted">Cargando colegios...</small>
                )}
                {!loadingColegios && colegios.length === 0 && (
                  <small className="text-muted">No hay colegios disponibles</small>
                )}
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

