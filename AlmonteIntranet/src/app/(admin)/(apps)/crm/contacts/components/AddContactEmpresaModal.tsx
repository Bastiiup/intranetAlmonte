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
  { value: 'baja', label: 'Cold Lead' },
  { value: 'media', label: 'Prospect' },
  { value: 'alta', label: 'Hot Lead' },
]

interface AddContactEmpresaModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

interface EmpresaOption {
  id: number | string
  documentId?: string
  empresa_nombre?: string
  nombre?: string
}

type EmpresaSelectOption = { value: number; label: string }

const AddContactEmpresaModal = ({ show, onHide, onSuccess }: AddContactEmpresaModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  const [empresaSearchTerm, setEmpresaSearchTerm] = useState('')
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaSelectOption | null>(null)
  
  const [formData, setFormData] = useState({
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    rut: '',
    email: '',
    telefono: '',
    cargo: '',
    empresaId: '',
    origen: 'manual',
    etiqueta: 'media',
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
        setEmpresas(result.data)
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

  const handleEmpresaInputChange = (inputValue: string) => {
    setEmpresaSearchTerm(inputValue)
    debouncedSearch(inputValue)
  }

  const handleEmpresaChange = (option: EmpresaSelectOption | null) => {
    setSelectedEmpresa(option)
    if (option) {
      handleFieldChange('empresaId', String(option.value))
    } else {
      handleFieldChange('empresaId', '')
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
      if (!formData.nombres.trim()) {
        throw new Error('El nombre es obligatorio')
      }
      if (!formData.email.trim()) {
        throw new Error('El email es obligatorio')
      }
      if (!formData.empresaId || formData.empresaId === '') {
        throw new Error('Debes seleccionar una empresa')
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
        origen: formData.origen || 'manual',
        nivel_confianza: formData.etiqueta || 'media',
        activo: true,
      }

      const response = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.details?.errors?.[0]?.message || result.error || 'Error al crear contacto'
        throw new Error(errorMessage)
      }

      let personaId: string | number | undefined = undefined
      let personaIdNum: number | null = null
      
      if (result.data) {
        const personaData = Array.isArray(result.data) ? result.data[0] : result.data
        const attrs = personaData.attributes || personaData
        
        personaId = personaData.documentId || attrs.documentId
        personaIdNum = personaData.id || attrs.id || null
        
        if (!personaIdNum && personaId) {
          const isDocumentId = typeof personaId === 'string' && !/^\d+$/.test(personaId)
          if (!isDocumentId) {
            personaIdNum = parseInt(String(personaId))
          }
        }
      }
      
      if (!personaId) {
        throw new Error('No se pudo obtener el ID de la persona creada')
      }

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
              }
            }
          } catch (err) {
            console.error('[AddContactEmpresaModal] ❌ Error obteniendo ID numérico:', err)
          }
        } else {
          personaIdNum = parseInt(String(personaId))
        }
      }

      if (!personaIdNum || isNaN(personaIdNum)) {
        throw new Error('No se pudo obtener el ID numérico de la persona para crear la relación con la empresa')
      }

      const empresaIdNum = parseInt(String(formData.empresaId))
      
      if (!empresaIdNum || empresaIdNum === 0 || isNaN(empresaIdNum)) {
        throw new Error('ID de empresa inválido')
      }

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
        console.error('[AddContactEmpresaModal] ❌ Error al crear relación empresa-contacto:', empresaContactoResult.error)
        setError(
          `El contacto se creó correctamente, pero hubo un error al asociarlo a la empresa: ${empresaContactoResult.error || 'Error desconocido'}. Puedes editarlo después.`
        )
      } else {
        console.log('[AddContactEmpresaModal] ✅ Contacto de empresa creado exitosamente')
      }

      setFormData({
        nombres: '',
        primer_apellido: '',
        segundo_apellido: '',
        rut: '',
        email: '',
        telefono: '',
        cargo: '',
        empresaId: '',
        origen: 'manual',
        etiqueta: 'media',
      })
      setSelectedEmpresa(null)
      setEmpresaSearchTerm('')

      await new Promise(resolve => setTimeout(resolve, 500))

      if (onSuccess) {
        onSuccess()
      } else {
        onHide()
      }
    } catch (err: any) {
      console.error('Error al crear contacto de empresa:', err)
      setError(err.message || 'Error al crear el contacto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <ModalHeader closeButton>
        <ModalTitle>Agregar Contacto de Empresa</ModalTitle>
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
                  placeholder="Ej: Juan"
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
                  placeholder="Ej: Pérez"
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
                  placeholder="Ej: González"
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
                  placeholder="Ej: 12.345.678-9"
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
                  placeholder="ejemplo@empresa.cl"
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
                  placeholder="+56 9 1234 5678"
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Empresa <span className="text-danger">*</span>
                </FormLabel>
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

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Origen</FormLabel>
                <FormControl
                  as="select"
                  value={formData.origen}
                  onChange={(e) => handleFieldChange('origen', e.target.value)}
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
                <FormLabel>Etiqueta de Confianza</FormLabel>
                <FormControl
                  as="select"
                  value={formData.etiqueta}
                  onChange={(e) => handleFieldChange('etiqueta', e.target.value)}
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
            {loading ? 'Creando...' : (
              <>
                <LuCheck className="me-1" />
                Crear Contacto
              </>
            )}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default AddContactEmpresaModal

