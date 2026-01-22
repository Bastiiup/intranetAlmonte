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

type ColegioSelectOption = { value: number; label: string }

interface EditContactColegioModalProps {
  show: boolean
  onHide: () => void
  contact: ContactType | null
  onSuccess?: () => void
}

const EditContactColegioModal = ({ show, onHide, contact, onSuccess }: EditContactColegioModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [colegioSearchTerm, setColegioSearchTerm] = useState('')
  const [selectedColegio, setSelectedColegio] = useState<ColegioSelectOption | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  const [formData, setFormData] = useState({
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    rut: '',
    email: '',
    telefono: '',
    cargo: '',
    colegioId: '',
  })

  useEffect(() => {
    if (show) {
      loadColegios('')
    }
  }, [show])

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

  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      if (searchTerm.trim().length >= 2 || searchTerm.trim().length === 0) {
        loadColegios(searchTerm.trim())
      }
    }, 300),
    []
  )

  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  const colegioOptions = useMemo<ColegioSelectOption[]>(() => {
    return colegios
      .filter((c) => c.id && c.id > 0)
      .map((colegio) => ({
        value: colegio.id,
        label: `${colegio.nombre}${colegio.rbd ? ` (RBD: ${colegio.rbd})` : ''}`,
      }))
  }, [colegios])

  useEffect(() => {
    if (contact && show && colegios.length > 0 && isInitialLoad) {
      const loadContactData = async () => {
        try {
          const contactId = (contact as any).documentId || contact.id
          if (!contactId) return

          const response = await fetch(`/api/crm/contacts/${contactId}`)
          const result = await response.json()
          
          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Error al cargar contacto')
          }

          if (result.success && result.data) {
            const persona = result.data
            const attrs = persona.attributes || persona
            
            const trayectorias = attrs.trayectorias?.data || attrs.trayectorias || []
            const trayectoriaActual = trayectorias.find((t: any) => {
              const tAttrs = t.attributes || t
              return tAttrs.is_current === true
            }) || trayectorias[0]

            let colegioId = ''
            let cargo = ''

            if (trayectoriaActual) {
              const tAttrs = trayectoriaActual.attributes || trayectoriaActual
              cargo = tAttrs.cargo || ''
              
              const colegioData = tAttrs.colegio?.data || tAttrs.colegio
              const colegioIdRaw = colegioData?.id
              
              if (colegioIdRaw) {
                colegioId = String(colegioIdRaw)
              } else {
                const colegioDocumentId = colegioData?.documentId
                const colegioEncontrado = colegios.find(
                  (c) => c.documentId === colegioDocumentId
                )
                if (colegioEncontrado) {
                  colegioId = String(colegioEncontrado.id)
                }
              }
            }

            const emails = attrs.emails || []
            const emailPrincipal = emails.find((e: any) => e.principal) || emails[0]
            
            const telefonos = attrs.telefonos || []
            const telefonoPrincipal = telefonos.find((t: any) => t.principal) || telefonos[0]

            const formDataToSet = {
              nombres: attrs.nombres || contact.name?.split(' ')[0] || '',
              primer_apellido: attrs.primer_apellido || '',
              segundo_apellido: attrs.segundo_apellido || '',
              rut: attrs.rut || '',
              email: emailPrincipal?.email || contact.email || '',
              telefono: telefonoPrincipal?.telefono_norm || telefonoPrincipal?.telefono_raw || contact.phone || '',
              cargo: cargo,
              colegioId: colegioId || '',
            }

            setFormData(formDataToSet)
            
            if (colegioId && colegioId !== '' && colegioId !== '0') {
              const colegioEncontrado = colegios.find((c) => String(c.id) === String(colegioId))
              if (colegioEncontrado) {
                setSelectedColegio({
                  value: colegioEncontrado.id,
                  label: `${colegioEncontrado.nombre}${colegioEncontrado.rbd ? ` (RBD: ${colegioEncontrado.rbd})` : ''}`,
                })
              }
            }
            
            setIsInitialLoad(false)
          }
        } catch (err: any) {
          console.error('Error cargando datos del contacto:', err)
          setFormData({
            nombres: contact.name?.split(' ')[0] || '',
            primer_apellido: '',
            segundo_apellido: '',
            rut: '',
            email: contact.email || '',
            telefono: contact.phone || '',
            cargo: contact.cargo || '',
            colegioId: '',
          })
          setIsInitialLoad(false)
        }
      }

      loadContactData()
      setError(null)
    }
  }, [contact, show, colegios, isInitialLoad])

  useEffect(() => {
    if (!show) {
      setIsInitialLoad(true)
      setSelectedColegio(null)
    }
  }, [show])

  const handleColegioInputChange = (inputValue: string) => {
    setColegioSearchTerm(inputValue)
    debouncedSearch(inputValue)
  }

  const handleColegioChange = (option: ColegioSelectOption | null) => {
    setIsInitialLoad(false)
    setSelectedColegio(option)
    if (option) {
      handleFieldChange('colegioId', String(option.value))
    } else {
      handleFieldChange('colegioId', '')
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
    if (!contact) return

    setLoading(true)
    setError(null)

    try {
      if (!formData.nombres.trim()) {
        throw new Error('El nombre es obligatorio')
      }
      if (!formData.email.trim()) {
        throw new Error('El email es obligatorio')
      }

      const contactId = (contact as any).documentId || contact.id
      if (!contactId) {
        throw new Error('ID de contacto no válido')
      }

      const contactData: any = {
        nombres: formData.nombres.trim(),
        ...(formData.primer_apellido && { primer_apellido: formData.primer_apellido.trim() }),
        ...(formData.segundo_apellido && { segundo_apellido: formData.segundo_apellido.trim() }),
        ...(formData.rut && { rut: formData.rut.trim() }),
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
      }

      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar contacto')
      }

      if (formData.colegioId && formData.colegioId !== '' && formData.colegioId !== '0') {
        const colegioIdNum = parseInt(String(formData.colegioId))
        if (colegioIdNum && colegioIdNum > 0 && !isNaN(colegioIdNum)) {
          try {
            const personaResponse = await fetch(`/api/crm/contacts/${contactId}`)
            const personaResult = await personaResponse.json()
            const personaData = Array.isArray(personaResult.data) ? personaResult.data[0] : personaResult.data
            const personaIdNum = personaData?.id

            if (personaIdNum) {
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
                console.error('Error al crear/actualizar trayectoria:', trayectoriaResult.error)
                setError(
                  `El contacto se actualizó correctamente, pero hubo un error al asociarlo al colegio: ${trayectoriaResult.error || 'Error desconocido'}. Puedes intentar editarlo nuevamente.`
                )
              }
            }
          } catch (trayectoriaError: any) {
            console.error('Error al actualizar trayectoria:', trayectoriaError)
            setError(
              `El contacto se actualizó correctamente, pero hubo un error al asociarlo al colegio: ${trayectoriaError.message || 'Error de conexión'}. Puedes intentar editarlo nuevamente.`
            )
          }
        }
      }

      onHide()
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 100)
      }
    } catch (err: any) {
      console.error('Error al actualizar contacto de colegio:', err)
      setError(err.message || 'Error al actualizar el contacto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <ModalHeader closeButton>
        <ModalTitle>Editar Contacto de Colegio</ModalTitle>
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
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
                  Nombres <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  value={formData.nombres}
                  onChange={(e) => handleFieldChange('nombres', e.target.value)}
                  required
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Primer Apellido</FormLabel>
                <FormControl
                  type="text"
                  value={formData.primer_apellido}
                  onChange={(e) => handleFieldChange('primer_apellido', e.target.value)}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Segundo Apellido</FormLabel>
                <FormControl
                  type="text"
                  value={formData.segundo_apellido}
                  onChange={(e) => handleFieldChange('segundo_apellido', e.target.value)}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>RUT</FormLabel>
                <FormControl
                  type="text"
                  value={formData.rut}
                  onChange={(e) => handleFieldChange('rut', e.target.value)}
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
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  required
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Teléfono</FormLabel>
                <FormControl
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => handleFieldChange('telefono', e.target.value)}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Colegio</FormLabel>
                <Select
                  options={colegioOptions}
                  value={selectedColegio}
                  onChange={handleColegioChange}
                  onInputChange={handleColegioInputChange}
                  isLoading={loadingColegios}
                  placeholder="Buscar y seleccionar colegio..."
                  isClearable
                  isSearchable
                  noOptionsMessage={() => 'No se encontraron colegios'}
                  loadingMessage={() => 'Buscando colegios...'}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Cargo en el Colegio</FormLabel>
                <FormControl
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => handleFieldChange('cargo', e.target.value)}
                  placeholder="Ej: Profesor de Matemáticas, Director, etc."
                />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : (
              <>
                <LuCheck className="me-1" />
                Guardar Cambios
              </>
            )}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EditContactColegioModal

