'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuCheck } from 'react-icons/lu'
import Select from 'react-select'
import { debounce } from 'lodash'

const ORIGENES = [
  { value: 'mineduc', label: 'MINEDUC' },
  { value: 'csv', label: 'CSV' },
  { value: 'manual', label: 'Manual' },
  { value: 'crm', label: 'CRM' },
  { value: 'web', label: 'Web' },
  { value: 'otro', label: 'Otro' },
]

const ETIQUETAS = [
  { value: 'baja', label: 'Lead Frío' },
  { value: 'media', label: 'Prospecto' },
  { value: 'alta', label: 'Lead Caliente' },
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
  const [colegioSearchTerm, setColegioSearchTerm] = useState('')
  
  // Tipo para las opciones de react-select
  type ColegioSelectOption = { value: number; label: string }
  const [selectedColegio, setSelectedColegio] = useState<ColegioSelectOption | null>(null)
  const [formData, setFormData] = useState({
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
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

  // Cargar lista inicial de colegios cuando se abre el modal
  useEffect(() => {
    if (show) {
      loadColegios('') // Cargar todos inicialmente
    }
  }, [show])

  // Función para cargar colegios con búsqueda
  const loadColegios = async (search: string = '') => {
    setLoadingColegios(true)
    try {
      const url = search 
        ? `/api/crm/colegios/list?search=${encodeURIComponent(search)}`
        : '/api/crm/colegios/list'
      const response = await fetch(url)
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

  // Debounce para búsqueda de colegios mientras el usuario escribe
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      if (searchTerm.trim().length >= 2 || searchTerm.trim().length === 0) {
        loadColegios(searchTerm.trim())
      }
    }, 300),
    []
  )

  // Limpiar debounce al desmontar
  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  // Opciones para react-select (solo value y label, sin colegio)
  const colegioOptions = useMemo<ColegioSelectOption[]>(() => {
    return colegios
      .filter((c) => c.id && c.id > 0)
      .map((colegio) => ({
        value: colegio.id,
        label: `${colegio.nombre}${colegio.rbd ? ` (RBD: ${colegio.rbd})` : ''}`,
      }))
  }, [colegios])

  // Manejar cambio en el input de búsqueda
  const handleColegioInputChange = (inputValue: string) => {
    setColegioSearchTerm(inputValue)
    debouncedSearch(inputValue)
  }

  // Manejar selección de colegio
  const handleColegioChange = async (option: ColegioSelectOption | null) => {
    setSelectedColegio(option)
    if (option) {
      handleFieldChange('colegioId', String(option.value))
      
      // Buscar el colegio completo en la lista para obtener documentId si es necesario
      const colegioCompleto = colegios.find((c) => c.id === option.value)
      
      // Auto-completar datos del colegio obteniendo información completa
      try {
        const colegioId = colegioCompleto?.documentId || String(option.value)
        const response = await fetch(`/api/crm/colegios/${colegioId}?populate[comuna]=true`)
        const result = await response.json()
        
        if (result.success && result.data) {
          const colegioData = result.data
          const attrs = colegioData.attributes || colegioData
          
          // Extraer comuna
          const comunaData = attrs.comuna?.data || attrs.comuna
          const comunaAttrs = comunaData?.attributes || comunaData
          
          // Auto-completar campos del formulario
          setFormData((prev) => ({
            ...prev,
            colegioId: String(option.value),
            region: attrs.region || comunaAttrs?.region_nombre || prev.region,
            comuna: comunaAttrs?.nombre || comunaAttrs?.comuna_nombre || prev.comuna,
            dependencia: attrs.dependencia || prev.dependencia,
          }))
          
          console.log('[AddContactModal] ✅ Datos del colegio auto-completados:', {
            region: attrs.region || comunaAttrs?.region_nombre,
            comuna: comunaAttrs?.nombre || comunaAttrs?.comuna_nombre,
            dependencia: attrs.dependencia,
          })
        }
      } catch (err) {
        console.error('[AddContactModal] ❌ Error obteniendo datos del colegio:', err)
        // No fallar, solo loguear - el usuario puede completar manualmente
      }
    } else {
      handleFieldChange('colegioId', '')
      // Limpiar campos relacionados si se deselecciona el colegio
      setFormData((prev) => ({
        ...prev,
        region: '',
        comuna: '',
        dependencia: '',
      }))
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
        ...(formData.primer_apellido && { primer_apellido: formData.primer_apellido.trim() }),
        ...(formData.segundo_apellido && { segundo_apellido: formData.segundo_apellido.trim() }),
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
      console.log('[AddContactModal] 📥 Respuesta completa del servidor:', JSON.stringify(result, null, 2))
      
      // Extraer ID de diferentes formatos posibles de respuesta de Strapi
      let personaId: string | number | undefined = undefined
      let personaIdNum: number | null = null
      
      if (result.data) {
        const personaData = Array.isArray(result.data) ? result.data[0] : result.data
        const attrs = personaData.attributes || personaData
        
        // Intentar obtener documentId primero (identificador principal)
        personaId = personaData.documentId || attrs.documentId
        
        // Intentar obtener ID numérico directamente
        personaIdNum = personaData.id || attrs.id || null
        
        // Si no hay ID numérico pero hay documentId, intentar obtenerlo
        if (!personaIdNum && personaId) {
          const isDocumentId = typeof personaId === 'string' && !/^\d+$/.test(personaId)
          if (!isDocumentId) {
            // Si personaId es numérico, usarlo directamente
            personaIdNum = parseInt(String(personaId))
          }
        }
      }
      
      if (!personaId) {
        console.error('[AddContactModal] ❌ No se pudo obtener ID de la persona creada:', {
          result,
          data: result.data,
        })
        throw new Error('No se pudo obtener el ID de la persona creada')
      }

      console.log('[AddContactModal] ✅ Persona creada:', {
        personaId,
        personaIdNum,
        esDocumentId: typeof personaId === 'string' && !/^\d+$/.test(personaId),
      })

      // PASO 3: Crear trayectoria si se seleccionó un colegio válido
      console.log('[AddContactModal] Verificando colegioId para trayectoria:', {
        colegioId: formData.colegioId,
        tipo: typeof formData.colegioId,
        esValido: formData.colegioId && formData.colegioId !== '' && formData.colegioId !== '0',
      })
      if (formData.colegioId && formData.colegioId !== '' && formData.colegioId !== '0') {
        try {
          // Si no tenemos ID numérico aún, intentar obtenerlo
          if (!personaIdNum) {
            const isDocumentId = typeof personaId === 'string' && !/^\d+$/.test(personaId)
            
            if (isDocumentId) {
              try {
                const personaResponse = await fetch(`/api/crm/contacts/${personaId}`)
                const personaResult = await personaResponse.json()
                if (personaResult.success && personaResult.data) {
                  const personaData = Array.isArray(personaResult.data) ? personaResult.data[0] : personaResult.data
                  const attrs = personaData.attributes || personaData
                  if (attrs && typeof attrs === 'object' && 'id' in attrs) {
                    personaIdNum = attrs.id as number
                    console.log('[AddContactModal] ✅ ID numérico de persona obtenido desde API:', personaIdNum)
                  }
                }
              } catch (err) {
                console.error('[AddContactModal] ❌ Error obteniendo ID numérico de persona:', err)
              }
            } else {
              personaIdNum = parseInt(String(personaId))
              console.log('[AddContactModal] ✅ ID numérico parseado desde personaId:', personaIdNum)
            }
          }

          if (!personaIdNum || isNaN(personaIdNum)) {
            console.error('[AddContactModal] ❌ No se pudo obtener ID numérico de persona:', {
              personaId,
              personaIdNum,
              resultData: result.data,
            })
            throw new Error('No se pudo obtener el ID numérico de la persona para crear la trayectoria')
          }

          // Validar y obtener colegioId numérico
          let colegioIdNum: number | null = null
          
          if (formData.colegioId && formData.colegioId !== '' && formData.colegioId !== '0') {
            // Intentar parsear directamente (debería ser un número válido del select)
            colegioIdNum = parseInt(String(formData.colegioId))
            
            // Si no es un número válido, intentar obtenerlo del colegio seleccionado
            if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
              console.warn('[AddContactModal] ⚠️ ID parseado inválido, buscando en lista de colegios:', {
                colegioId: formData.colegioId,
                colegioIdNum,
              })
              
              const colegioSeleccionado = colegios.find(
                (c) => String(c.id) === String(formData.colegioId) || String(c.documentId) === String(formData.colegioId)
              )
              
              if (colegioSeleccionado && colegioSeleccionado.id && colegioSeleccionado.id > 0) {
                colegioIdNum = colegioSeleccionado.id
                console.log('[AddContactModal] ✅ ID numérico obtenido de lista de colegios:', colegioIdNum)
              } else if (colegioSeleccionado?.documentId) {
                // Si solo tenemos documentId, necesitamos obtener el ID numérico desde Strapi
                try {
                  console.log('[AddContactModal] 📤 Obteniendo ID numérico desde Strapi para documentId:', colegioSeleccionado.documentId)
                  const colegioResponse = await fetch(`/api/crm/colegios/${colegioSeleccionado.documentId}`)
                  const colegioResult = await colegioResponse.json()
                  if (colegioResult.success && colegioResult.data) {
                    const colegioData = colegioResult.data
                    colegioIdNum = colegioData.id || null
                    console.log('[AddContactModal] ✅ ID numérico obtenido desde Strapi:', colegioIdNum)
                  }
                } catch (err) {
                  console.error('[AddContactModal] ❌ Error obteniendo ID numérico del colegio:', err)
                }
              }
            } else {
              console.log('[AddContactModal] ✅ ID numérico válido desde parse:', colegioIdNum)
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
                console.error('[AddContactModal] ❌ Error al crear trayectoria:', {
                  status: trayectoriaResponse.status,
                  error: trayectoriaResult.error,
                  details: trayectoriaResult.details,
                })
                setError(
                  `El contacto se creó correctamente, pero hubo un error al asociarlo al colegio: ${trayectoriaResult.error || 'Error desconocido'}. Puedes editarlo después.`
                )
              } else {
                console.log('[AddContactModal] ✅ Trayectoria creada exitosamente:', {
                  id: trayectoriaResult.data?.id || trayectoriaResult.data?.documentId,
                  personaId: personaIdNum,
                  colegioId: colegioIdNum,
                })
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
        primer_apellido: '',
        segundo_apellido: '',
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
      setSelectedColegio(null)
      setColegioSearchTerm('')

      // Esperar un momento para que Strapi procese la trayectoria antes de refrescar
      await new Promise(resolve => setTimeout(resolve, 500))

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
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Nombres <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Juan Carlos"
                  value={formData.nombres}
                  onChange={(e) => handleFieldChange('nombres', e.target.value)}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Primer Apellido
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Pérez"
                  value={formData.primer_apellido}
                  onChange={(e) => handleFieldChange('primer_apellido', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Segundo Apellido
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: González"
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
                <Select
                  value={selectedColegio}
                  onChange={handleColegioChange}
                  onInputChange={handleColegioInputChange}
                  options={colegioOptions}
                  isSearchable
                  isClearable
                  placeholder="Escribe para buscar colegio..."
                  isLoading={loadingColegios}
                  noOptionsMessage={({ inputValue }) => 
                    inputValue.length < 2 
                      ? 'Escribe al menos 2 caracteres para buscar...'
                      : 'No se encontraron colegios'
                  }
                  loadingMessage={() => 'Buscando colegios...'}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '38px',
                      borderColor: '#ced4da',
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
                {selectedColegio && (
                  <small className="text-muted mt-1 d-block">
                    Colegio seleccionado: {selectedColegio.label}
                  </small>
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

