'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuCheck } from 'react-icons/lu'
import Select from 'react-select'
import { debounce } from 'lodash'
import type { ContactType } from '@/app/(admin)/(apps)/crm/types'

interface EmpresaOption {
  id: number | string
  documentId?: string
  empresa_nombre?: string
  nombre?: string
}

type EmpresaSelectOption = { value: number; label: string }

interface EditContactEmpresaModalProps {
  show: boolean
  onHide: () => void
  contact: ContactType | null
  onSuccess?: () => void
}

const EditContactEmpresaModal = ({ show, onHide, contact, onSuccess }: EditContactEmpresaModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  const [empresaSearchTerm, setEmpresaSearchTerm] = useState('')
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaSelectOption | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  const [formData, setFormData] = useState({
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    rut: '',
    email: '',
    telefono: '',
    cargo: '',
    empresaId: '',
  })

  useEffect(() => {
    if (show) {
      loadEmpresas('')
    }
  }, [show])

  const loadEmpresas = async (search: string = '') => {
    setLoadingEmpresas(true)
    try {
      const params = new URLSearchParams({
        pageSize: '1000',
      })
      if (search) {
        params.append('search', search)
      }
      const response = await fetch(`/api/crm/empresas?${params.toString()}`)
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        const empresasData = result.data.map((e: any) => {
          const attrs = e.attributes || e
          const empresaId = e.id || e.documentId
          return {
            id: typeof empresaId === 'number' ? empresaId : (typeof empresaId === 'string' && /^\d+$/.test(empresaId) ? parseInt(empresaId) : empresaId),
            documentId: e.documentId || e.id,
            empresa_nombre: attrs?.empresa_nombre || attrs?.nombre || e.empresa_nombre || e.nombre || 'Sin nombre',
            nombre: attrs?.empresa_nombre || attrs?.nombre || e.empresa_nombre || e.nombre || 'Sin nombre',
          }
        })
        setEmpresas(empresasData)
      }
    } catch (err) {
      console.error('Error al cargar empresas:', err)
    } finally {
      setLoadingEmpresas(false)
    }
  }

  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      if (searchTerm.trim().length >= 2 || searchTerm.trim().length === 0) {
        loadEmpresas(searchTerm.trim())
      }
    }, 300),
    []
  )

  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  const empresaOptions = useMemo<EmpresaSelectOption[]>(() => {
    return empresas
      .filter((e) => {
        const id = e.id || e.documentId
        return id && (typeof id === 'number' ? id > 0 : true)
      })
      .map((empresa) => {
        const nombre = empresa.empresa_nombre || empresa.nombre || 'Sin nombre'
        const id = typeof empresa.id === 'number' ? empresa.id : parseInt(String(empresa.id || empresa.documentId || 0))
        return {
          value: id,
          label: nombre,
        }
      })
  }, [empresas])

  useEffect(() => {
    if (contact && show && empresas.length > 0 && isInitialLoad) {
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
            
            const emails = attrs.emails || []
            const emailPrincipal = emails.find((e: any) => e.principal) || emails[0]
            
            const telefonos = attrs.telefonos || []
            const telefonoPrincipal = telefonos.find((t: any) => t.principal) || telefonos[0]

            let empresaId = ''
            let cargo = ''
            const personaIdNum = persona.id || persona.documentId
            
            if (personaIdNum) {
              try {
                const empresaContactosResponse = await fetch(
                  `/api/empresa-contactos?filters[persona][id][$eq]=${personaIdNum}`
                )
                const empresaContactosResult = await empresaContactosResponse.json()
                if (empresaContactosResult.success && empresaContactosResult.data) {
                  const empresaContactos = Array.isArray(empresaContactosResult.data) 
                    ? empresaContactosResult.data 
                    : [empresaContactosResult.data]
                  
                  if (empresaContactos.length > 0) {
                    const empresaContacto = empresaContactos[0]
                    const ecAttrs = empresaContacto.attributes || empresaContacto
                    const empresaData = ecAttrs.empresa?.data || ecAttrs.empresa
                    const empresaIdRaw = empresaData?.id
                    cargo = ecAttrs.cargo || ''
                    
                    if (empresaIdRaw) {
                      empresaId = String(empresaIdRaw)
                    }
                  }
                }
              } catch (err) {
                console.warn('Error al cargar empresa del contacto:', err)
              }
            }

            const formDataToSet = {
              nombres: attrs.nombres || contact.name?.split(' ')[0] || '',
              primer_apellido: attrs.primer_apellido || '',
              segundo_apellido: attrs.segundo_apellido || '',
              rut: attrs.rut || '',
              email: emailPrincipal?.email || contact.email || '',
              telefono: telefonoPrincipal?.telefono_norm || telefonoPrincipal?.telefono_raw || contact.phone || '',
              cargo: cargo,
              empresaId: empresaId || '',
            }

            setFormData(formDataToSet)
            
            if (empresaId && empresaId !== '' && empresaId !== '0') {
              const empresaEncontrada = empresas.find((e) => {
                const eId = typeof e.id === 'number' ? e.id : (typeof e.id === 'string' && /^\d+$/.test(e.id) ? parseInt(e.id) : e.id)
                const empresaIdNum = typeof empresaId === 'number' ? empresaId : (typeof empresaId === 'string' && /^\d+$/.test(empresaId) ? parseInt(empresaId) : empresaId)
                return String(eId) === String(empresaIdNum)
              })
              
              if (empresaEncontrada) {
                const value = typeof empresaEncontrada.id === 'number' 
                  ? empresaEncontrada.id 
                  : (typeof empresaEncontrada.id === 'string' && /^\d+$/.test(empresaEncontrada.id) 
                    ? parseInt(empresaEncontrada.id) 
                    : empresaEncontrada.id)
                
                setSelectedEmpresa({
                  value: value as number,
                  label: empresaEncontrada.empresa_nombre || empresaEncontrada.nombre || 'Empresa',
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
            cargo: '',
            empresaId: '',
          })
          setIsInitialLoad(false)
        }
      }

      loadContactData()
      setError(null)
    }
  }, [contact, show, empresas, isInitialLoad])

  useEffect(() => {
    if (!show) {
      setIsInitialLoad(true)
      setSelectedEmpresa(null)
    }
  }, [show])

  const handleEmpresaInputChange = (inputValue: string) => {
    setEmpresaSearchTerm(inputValue)
    debouncedSearch(inputValue)
  }

  const handleEmpresaChange = (option: EmpresaSelectOption | null) => {
    setIsInitialLoad(false)
    setSelectedEmpresa(option)
    if (option) {
      handleFieldChange('empresaId', String(option.value))
    } else {
      handleFieldChange('empresaId', '')
      handleFieldChange('cargo', '')
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

      if (formData.empresaId && formData.empresaId !== '' && formData.empresaId !== '0') {
        try {
          const personaResponse = await fetch(`/api/crm/contacts/${contactId}`)
          const personaResult = await personaResponse.json()
          const personaData = Array.isArray(personaResult.data) ? personaResult.data[0] : personaResult.data
          const personaIdNum = personaData?.id

          if (personaIdNum) {
            const empresaIdNum = parseInt(String(formData.empresaId))
            if (!isNaN(empresaIdNum)) {
              const empresaContactoResponse = await fetch('/api/empresa-contactos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  persona_id: personaIdNum,
                  empresa_id: empresaIdNum,
                  cargo: formData.cargo || null,
                }),
              })

              const empresaContactoResult = await empresaContactoResponse.json()
              if (!empresaContactoResponse.ok || !empresaContactoResult.success) {
                console.error('Error al crear/actualizar relación empresa-contacto:', empresaContactoResult.error)
                setError(
                  `El contacto se actualizó correctamente, pero hubo un error al asociarlo a la empresa: ${empresaContactoResult.error || 'Error desconocido'}. Puedes intentar editarlo nuevamente.`
                )
              }
            }
          }
        } catch (empresaError: any) {
          console.error('Error al actualizar relación empresa-contacto:', empresaError)
          setError(
            `El contacto se actualizó correctamente, pero hubo un error al asociarlo a la empresa: ${empresaError.message || 'Error de conexión'}. Puedes intentar editarlo nuevamente.`
          )
        }
      }

      onHide()
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 100)
      }
    } catch (err: any) {
      console.error('Error al actualizar contacto de empresa:', err)
      setError(err.message || 'Error al actualizar el contacto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <ModalHeader closeButton>
        <ModalTitle>Editar Contacto de Empresa</ModalTitle>
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
                <FormLabel>Empresa</FormLabel>
                <Select
                  options={empresaOptions}
                  value={selectedEmpresa}
                  onChange={handleEmpresaChange}
                  onInputChange={handleEmpresaInputChange}
                  isLoading={loadingEmpresas}
                  placeholder="Buscar y seleccionar empresa..."
                  isClearable
                  isSearchable
                  noOptionsMessage={() => 'No se encontraron empresas'}
                  loadingMessage={() => 'Buscando empresas...'}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Cargo en la Empresa</FormLabel>
                <FormControl
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => handleFieldChange('cargo', e.target.value)}
                  placeholder="Ej: Gerente de Ventas, Representante Comercial, etc."
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

export default EditContactEmpresaModal











