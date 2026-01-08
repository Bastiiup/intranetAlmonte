'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuCheck } from 'react-icons/lu'
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

  // Cargar datos del contacto cuando se abre el modal
  useEffect(() => {
    if (contact && show) {
      console.log('[EditContactModal] Cargando datos del contacto:', contact)
      
      // Cargar datos completos del contacto incluyendo trayectorias
      const loadContactData = async () => {
        try {
          const contactId = (contact as any).documentId || contact.id
          if (!contactId) return

          const response = await fetch(`/api/crm/contacts/${contactId}`)
          const result = await response.json()
          
          if (result.success && result.data) {
            const persona = result.data
            const attrs = persona.attributes || persona
            
            // Obtener la trayectoria actual
            const trayectorias = attrs.trayectorias?.data || attrs.trayectorias || []
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
              
              // Extraer datos del colegio
              const colegioData = tAttrs.colegio?.data || tAttrs.colegio
              const colegioAttrs = colegioData?.attributes || colegioData
              colegioId = colegioData?.id || colegioData?.documentId || ''
              region = colegioAttrs?.region || ''
              dependencia = colegioAttrs?.dependencia || ''
              
              // Extraer comuna
              const comunaData = colegioAttrs?.comuna?.data || colegioAttrs?.comuna
              const comunaAttrs = comunaData?.attributes || comunaData
              comuna = comunaAttrs?.nombre || comunaAttrs?.comuna_nombre || ''
            }

            // Obtener email principal
            const emails = attrs.emails || []
            const emailPrincipal = emails.find((e: any) => e.principal) || emails[0]
            
            // Obtener teléfono principal
            const telefonos = attrs.telefonos || []
            const telefonoPrincipal = telefonos.find((t: any) => t.principal) || telefonos[0]

            setFormData({
              nombres: attrs.nombres || contact.name || '',
              email: emailPrincipal?.email || contact.email || '',
              cargo: cargo,
              telefono: telefonoPrincipal?.telefono_norm || telefonoPrincipal?.telefono_raw || contact.phone || '',
              colegioId: String(colegioId) || '',
              empresa: contact.empresa || '',
              region: region,
              comuna: comuna,
              dependencia: dependencia,
            })
            
            console.log('✅ [EditContactModal] Datos del contacto cargados:', {
              nombres: attrs.nombres,
              email: emailPrincipal?.email,
              cargo,
              colegioId,
              region,
              comuna,
              dependencia,
            })
          }
        } catch (err) {
          console.error('❌ [EditContactModal] Error cargando datos completos del contacto:', err)
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
  }, [contact, show])

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
        // Agregar/actualizar trayectoria solo si se seleccionó un colegio válido (no vacío, no '0', no 0)
        // NOTA: Los campos region, comuna, dependencia son del colegio, no de la trayectoria
        // Estos se actualizan en el colegio, no en la trayectoria
        ...(formData.colegioId && 
            formData.colegioId !== '' && 
            formData.colegioId !== '0' && 
            formData.colegioId !== 0 && {
          trayectoria: {
            colegio: parseInt(String(formData.colegioId)),
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
        throw new Error(errorMessage)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        onHide()
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
                <FormControl
                  as="select"
                  value={formData.colegioId}
                  onChange={(e) => handleFieldChange('colegioId', e.target.value)}
                  disabled={loading || loadingColegios}
                >
                  <option value="">Seleccionar colegio...</option>
                  {colegios.map((colegio) => (
                    <option key={colegio.id} value={colegio.id}>
                      {colegio.nombre} {colegio.rbd ? `(RBD: ${colegio.rbd})` : ''}
                    </option>
                  ))}
                </FormControl>
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

