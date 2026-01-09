'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuCheck } from 'react-icons/lu'
import Select from 'react-select'
import { debounce } from 'lodash'
import type { ContactType } from '@/app/(admin)/(apps)/crm/types'

interface ColegioOption {
  id: number
  documentId?: string
  nombre: string
  rbd?: number | null
}

const DEPENDENCIAS = [
  'Municipal',
  'Particular Subvencionado',
  'Particular Pagado',
]

interface EditContactModalProps {
  show: boolean
  onHide: () => void
  contact: ContactType | null
  onSuccess?: () => void
}

const EditContactModal = ({ show, onHide, contact, onSuccess }: EditContactModalProps) => {
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
    email: '',
    cargo: '',
    telefono: '',
    colegioId: '',
    empresa: '',
    region: '',
    comuna: '',
    dependencia: '',
  })

  // Cargar lista de colegios cuando se abre el modal (sin búsqueda inicial para mostrar todos)
  useEffect(() => {
    if (show) {
      loadColegios('') // Cargar todos los colegios inicialmente
    }
  }, [show])

  const loadColegios = async (search: string = '') => {
    setLoadingColegios(true)
    try {
      const url = search 
        ? `/api/crm/colegios/list?search=${encodeURIComponent(search)}`
        : '/api/crm/colegios/list' // Sin búsqueda para cargar todos
      const response = await fetch(url)
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setColegios(result.data)
        console.log(`✅ [EditContactModal] ${result.data.length} colegios cargados`)
      }
    } catch (err) {
      console.error('❌ [EditContactModal] Error al cargar colegios:', err)
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
          
          console.log('[EditContactModal] ✅ Datos del colegio auto-completados:', {
            region: attrs.region || comunaAttrs?.region_nombre,
            comuna: comunaAttrs?.nombre || comunaAttrs?.comuna_nombre,
            dependencia: attrs.dependencia,
          })
        }
      } catch (err) {
        console.error('[EditContactModal] ❌ Error obteniendo datos del colegio:', err)
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

  // Cargar datos del contacto cuando se abre el modal
  // IMPORTANTE: Esperar a que los colegios se carguen primero
  useEffect(() => {
    if (contact && show && colegios.length > 0) {
      console.log('[EditContactModal] Cargando datos del contacto:', contact)
      console.log('[EditContactModal] Colegios disponibles:', colegios.length)
      
      // Cargar datos completos del contacto incluyendo trayectorias
      const loadContactData = async () => {
        try {
          const contactId = (contact as any).documentId || contact.id
          if (!contactId) {
            console.warn('[EditContactModal] ⚠️ No hay contactId disponible')
            return
          }

          console.log('[EditContactModal] 📤 Fetching contact data for ID:', contactId)
          const response = await fetch(`/api/crm/contacts/${contactId}`)
          const result = await response.json()
          
          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Error al cargar contacto')
          }

          if (result.success && result.data) {
            const persona = result.data
            const attrs = persona.attributes || persona
            
            console.log('[EditContactModal] 📥 Persona recibida:', {
              id: persona.id,
              documentId: persona.documentId,
              nombres: attrs.nombres,
            })
            
            // Obtener la trayectoria actual
            const trayectorias = attrs.trayectorias?.data || attrs.trayectorias || []
            console.log('[EditContactModal] Trayectorias encontradas:', trayectorias.length)
            
            const trayectoriaActual = trayectorias.find((t: any) => {
              const tAttrs = t.attributes || t
              return tAttrs.is_current === true
            }) || trayectorias[0] // Si no hay actual, tomar la primera

            let colegioId = ''
            let cargo = ''
            let region = ''
            let comuna = ''
            let dependencia = ''

            if (trayectoriaActual) {
              const tAttrs = trayectoriaActual.attributes || trayectoriaActual
              cargo = tAttrs.cargo || ''
              
              console.log('[EditContactModal] Trayectoria actual encontrada:', {
                cargo,
                colegio: tAttrs.colegio,
              })
              
              // Extraer datos del colegio
              const colegioData = tAttrs.colegio?.data || tAttrs.colegio
              const colegioAttrs = colegioData?.attributes || colegioData
              
              // IMPORTANTE: Obtener el ID numérico del colegio
              const colegioIdRaw = colegioData?.id
              const colegioDocumentId = colegioData?.documentId
              
              console.log('[EditContactModal] Datos del colegio en trayectoria:', {
                colegioIdRaw,
                colegioDocumentId,
                colegioNombre: colegioAttrs?.colegio_nombre,
              })
              
              // Si tenemos documentId pero no id numérico, buscar en la lista de colegios
              if (colegioDocumentId && !colegioIdRaw) {
                const colegioEncontrado = colegios.find(
                  (c) => c.documentId === colegioDocumentId || String(c.id) === String(colegioDocumentId)
                )
                if (colegioEncontrado) {
                  colegioId = String(colegioEncontrado.id)
                  console.log('[EditContactModal] ✅ Colegio encontrado por documentId, usando id numérico:', colegioId)
                } else {
                  // Intentar obtener el ID numérico desde Strapi
                  try {
                    const colegioResponse = await fetch(`/api/crm/colegios/${colegioDocumentId}?fields=id`)
                    const colegioResult = await colegioResponse.json()
                    if (colegioResult.success && colegioResult.data) {
                      const colegioIdNum = colegioResult.data.id || colegioResult.data.documentId
                      colegioId = String(colegioIdNum)
                      console.log('[EditContactModal] ✅ ID numérico obtenido desde API:', colegioId)
                    }
                  } catch (err) {
                    console.error('[EditContactModal] ❌ Error obteniendo ID numérico del colegio:', err)
                  }
                }
              } else if (colegioIdRaw) {
                colegioId = String(colegioIdRaw)
                console.log('[EditContactModal] ✅ Usando ID numérico directo:', colegioId)
              } else {
                colegioId = String(colegioDocumentId || '')
                console.warn('[EditContactModal] ⚠️ Solo documentId disponible, intentando usar:', colegioId)
              }
              
              region = colegioAttrs?.region || ''
              dependencia = colegioAttrs?.dependencia || ''
              
              // Extraer comuna
              const comunaData = colegioAttrs?.comuna?.data || colegioAttrs?.comuna
              const comunaAttrs = comunaData?.attributes || comunaData
              comuna = comunaAttrs?.nombre || comunaAttrs?.comuna_nombre || ''
            } else {
              console.log('[EditContactModal] ⚠️ No hay trayectoria actual')
            }

            // Obtener email principal
            const emails = attrs.emails || []
            const emailPrincipal = emails.find((e: any) => e.principal) || emails[0]
            
            // Obtener teléfono principal
            const telefonos = attrs.telefonos || []
            const telefonoPrincipal = telefonos.find((t: any) => t.principal) || telefonos[0]

            const formDataToSet = {
              nombres: attrs.nombres || contact.name || '',
              email: emailPrincipal?.email || contact.email || '',
              cargo: cargo,
              telefono: telefonoPrincipal?.telefono_norm || telefonoPrincipal?.telefono_raw || contact.phone || '',
              colegioId: colegioId || '',
              empresa: contact.empresa || '',
              region: region,
              comuna: comuna,
              dependencia: dependencia,
            }

            console.log('✅ [EditContactModal] Datos del contacto cargados:', formDataToSet)
            
            setFormData(formDataToSet)
            
            // Establecer el colegio seleccionado en el Select si hay un colegioId válido
            if (colegioId && colegioId !== '' && colegioId !== '0') {
              // Buscar el colegio en la lista cargada
              const colegioEncontrado = colegios.find((c) => String(c.id) === String(colegioId))
              if (colegioEncontrado) {
                setSelectedColegio({
                  value: colegioEncontrado.id,
                  label: `${colegioEncontrado.nombre}${colegioEncontrado.rbd ? ` (RBD: ${colegioEncontrado.rbd})` : ''}`,
                })
                console.log('[EditContactModal] ✅ Colegio seleccionado establecido:', colegioEncontrado.nombre)
              } else {
                // Si no está en la lista, intentar obtenerlo
                console.log('[EditContactModal] ⚠️ Colegio no encontrado en lista, intentando obtener...')
              }
            } else {
              setSelectedColegio(null)
            }
          } else {
            console.warn('[EditContactModal] ⚠️ No se encontraron datos del contacto')
          }
        } catch (err: any) {
          console.error('❌ [EditContactModal] Error cargando datos completos del contacto:', {
            message: err.message,
            stack: err.stack,
          })
          // Fallback a datos básicos
          setFormData({
            nombres: contact.name || '',
            email: contact.email || '',
            cargo: contact.cargo || '',
            telefono: contact.phone || '',
            colegioId: (contact as any).colegioId || '',
            empresa: contact.empresa || '',
            region: contact.region || '',
            comuna: contact.comuna || '',
            dependencia: contact.dependencia || '',
          })
        }
      }

      loadContactData()
      setError(null) // Limpiar errores previos
    }
  }, [contact, show, colegios]) // ⚠️ Agregar colegios como dependencia

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contact) return

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

      // Preparar datos para Strapi
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
        // Agregar/actualizar trayectoria solo si se seleccionó un colegio válido
        // NOTA: Los campos region, comuna, dependencia son del colegio, no de la trayectoria
        // Estos se actualizan en el colegio, no en la trayectoria
        ...(formData.colegioId && 
            formData.colegioId !== '' && 
            formData.colegioId !== '0' && {
          trayectoria: {
            colegio: (() => {
              // Asegurar que sea un número válido
              const colegioIdNum = parseInt(String(formData.colegioId))
              if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
                console.error('[EditContactModal] ⚠️ ID de colegio inválido:', formData.colegioId)
                return null
              }
              // Usar formato { connect: [id] } para relaciones manyToOne (igual que en AddContactModal)
              return { connect: [colegioIdNum] }
            })(),
            cargo: formData.cargo || null,
            is_current: true,
          },
        }),
      }

      // Obtener el ID correcto (usar la misma lógica que en data.ts)
      console.log('[EditContactModal] Contacto recibido:', contact)
      console.log('[EditContactModal] contact.id:', contact.id)
      console.log('[EditContactModal] contact.documentId:', (contact as any).documentId)
      
      let contactId: number | string | undefined = undefined
      
      // Intentar obtener documentId primero (identificador principal en Strapi)
      const documentId = (contact as any).documentId
      if (documentId) {
        contactId = typeof documentId === 'number' ? documentId.toString() : String(documentId)
      } else if (contact.id !== undefined && contact.id !== null) {
        // Si no hay documentId, usar id
        if (typeof contact.id === 'number') {
          contactId = contact.id.toString()
        } else if (typeof contact.id === 'string') {
          contactId = contact.id
        } else {
          contactId = String(contact.id)
        }
      }
      
      console.log('[EditContactModal] contactId final:', contactId)
      
      if (!contactId || contactId === '0' || contactId === 'undefined' || contactId === 'null') {
        console.error('[EditContactModal] Error: No se pudo obtener un ID válido del contacto', {
          contact,
          documentId,
          id: contact.id,
        })
        throw new Error('No se pudo obtener el ID del contacto. Por favor, recarga la página e intenta nuevamente.')
      }
      
      // Asegurar que sea string para la URL
      const contactIdStr = String(contactId)

      // Actualizar el contacto
      const response = await fetch(`/api/crm/contacts/${contactIdStr}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.details?.errors?.[0]?.message || result.error || 'Error al actualizar contacto'
        console.error('[EditContactModal] ❌ Error en respuesta:', {
          status: response.status,
          error: errorMessage,
          details: result.details,
        })
        throw new Error(errorMessage)
      }

      console.log('[EditContactModal] ✅ Contacto actualizado exitosamente:', result)

      // Cerrar modal primero
      onHide()
      
      // Luego ejecutar callback si existe
      if (onSuccess) {
        // Usar setTimeout para evitar problemas con el refresh del router
        setTimeout(() => {
          onSuccess()
        }, 100)
      }
    } catch (err: any) {
      console.error('Error al actualizar contacto:', err)
      setError(err.message || 'Error al actualizar contacto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Editar Contacto</ModalTitle>
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
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Cargo</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Profesor de Matemáticas"
                  value={formData.cargo}
                  onChange={(e) => handleFieldChange('cargo', e.target.value)}
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

export default EditContactModal

