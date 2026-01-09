'use client'

import { useState, useEffect, useCallback } from 'react'
import { Form, InputGroup, Button, ListGroup, Badge, Modal, Alert, Spinner, Row, Col } from 'react-bootstrap'
import { LuSearch, LuUserPlus, LuUser, LuX, LuPlus, LuTrash2 } from 'react-icons/lu'
import CustomerAddressForm from './CustomerAddressForm'
import { validarRUTChileno, formatearRUT } from '@/lib/utils/rut'

interface Customer {
  id: number
  email: string
  first_name: string
  last_name: string
  username?: string
  billing?: {
    phone?: string
    address_1?: string
    address_2?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
    calle?: string
    numero?: string
    dpto?: string
    block?: string
    condominio?: string
    [key: string]: any
  }
  shipping?: {
    address_1?: string
    address_2?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
    calle?: string
    numero?: string
    dpto?: string
    block?: string
    condominio?: string
    [key: string]: any
  }
  meta_data?: Array<{
    key: string
    value: string
  }>
}

interface CustomerSelectorProps {
  selectedCustomer: Customer | null
  onSelect: (customer: Customer | null) => void
}

export default function CustomerSelector({ selectedCustomer, onSelect }: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [creating, setCreating] = useState(false)
  
  // Interfaces para emails y teléfonos
  interface EmailItem {
    email: string
    tipo: 'Personal' | 'Laboral' | 'Institucional'
  }

  interface TelefonoItem {
    numero: string
    tipo: 'Personal' | 'Laboral' | 'Institucional'
  }
  
  // Formulario de nuevo cliente (estructura completa)
  const [formData, setFormData] = useState({
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    rut: '',
    genero: '' as 'Hombre' | 'Mujer' | '',
  })
  const [emails, setEmails] = useState<EmailItem[]>([{ email: '', tipo: 'Personal' }])
  const [telefonos, setTelefonos] = useState<TelefonoItem[]>([{ numero: '', tipo: 'Personal' }])
  const [rutError, setRutError] = useState<string | null>(null)

  // Buscar clientes
  const searchCustomers = useCallback(async (search: string) => {
    if (search.length < 2) {
      setCustomers([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/woocommerce/customers?search=${encodeURIComponent(search)}&per_page=10`)
      const data = await response.json()

      if (data.success) {
        // Cargar datos completos de cada cliente para obtener meta_data
        const customersWithDetails = await Promise.all(
          (data.data || []).map(async (customer: Customer) => {
            try {
              const detailResponse = await fetch(`/api/woocommerce/customers/${customer.id}`)
              const detailData = await detailResponse.json()
              return detailData.success ? detailData.data : customer
            } catch {
              return customer
            }
          })
        )
        setCustomers(customersWithDetails)
      } else {
        setError(data.error || 'Error al buscar clientes')
        setCustomers([])
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce de búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchCustomers(searchTerm)
      } else {
        setCustomers([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, searchCustomers])

  // Handlers para formulario completo
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    
    // Validar RUT en tiempo real
    if (field === 'rut' && value.trim()) {
      const validacion = validarRUTChileno(value.trim())
      if (!validacion.valid) {
        setRutError(validacion.error || 'RUT inválido')
      } else {
        setRutError(null)
        // Formatear el RUT mientras se escribe
        const rutFormateado = formatearRUT(value.trim())
        if (rutFormateado !== value) {
          setFormData((prev) => ({
            ...prev,
            rut: rutFormateado,
          }))
        }
      }
    } else if (field === 'rut' && !value.trim()) {
      setRutError(null)
    }
  }

  const handleEmailChange = (index: number, field: 'email' | 'tipo', value: string) => {
    const newEmails = [...emails]
    newEmails[index] = { ...newEmails[index], [field]: value }
    setEmails(newEmails)
  }

  const handleTelefonoChange = (index: number, field: 'numero' | 'tipo', value: string) => {
    const newTelefonos = [...telefonos]
    newTelefonos[index] = { ...newTelefonos[index], [field]: value }
    setTelefonos(newTelefonos)
  }

  const addEmail = () => {
    setEmails([...emails, { email: '', tipo: 'Personal' }])
  }

  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index))
    }
  }

  const addTelefono = () => {
    setTelefonos([...telefonos, { numero: '', tipo: 'Personal' }])
  }

  const removeTelefono = (index: number) => {
    if (telefonos.length > 1) {
      setTelefonos(telefonos.filter((_, i) => i !== index))
    }
  }

  // Crear cliente completo (usando API de Strapi)
  const handleCreateCustomer = async () => {
    setCreating(true)
    setError(null)

    try {
      // Validar campos obligatorios
      if (!formData.nombres.trim()) {
        throw new Error('Los nombres del cliente son obligatorios')
      }
      
      // Validar RUT (obligatorio)
      if (!formData.rut.trim()) {
        throw new Error('El RUT es obligatorio')
      }
      
      const validacionRUT = validarRUTChileno(formData.rut.trim())
      if (!validacionRUT.valid) {
        setRutError(validacionRUT.error || 'El RUT no es válido')
        throw new Error(validacionRUT.error || 'El RUT no es válido')
      }
      const rutFormateado = validacionRUT.formatted

      // Validar emails (debe haber al menos uno)
      const emailsValidos = emails.filter(e => e.email.trim())
      if (emailsValidos.length === 0) {
        throw new Error('Debe proporcionar al menos un correo electrónico')
      }

      // Validar formato de emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      for (const emailItem of emailsValidos) {
        if (!emailRegex.test(emailItem.email.trim())) {
          throw new Error(`El correo electrónico "${emailItem.email}" no tiene un formato válido`)
        }
      }

      // Construir nombre completo
      const partesNombre = [formData.nombres.trim(), formData.primer_apellido.trim(), formData.segundo_apellido.trim()]
        .filter(p => p.length > 0)
      const nombreCompleto = partesNombre.join(' ')

      // Preparar datos para la API en formato Strapi
      const personaData: any = {
        nombre_completo: nombreCompleto,
        nombres: formData.nombres.trim(),
        primer_apellido: formData.primer_apellido.trim() || null,
        segundo_apellido: formData.segundo_apellido.trim() || null,
        rut: rutFormateado,
        emails: emailsValidos.map(e => ({
          email: e.email.trim(),
          tipo: e.tipo,
        })),
      }

      // Agregar género si se seleccionó
      if (formData.genero) {
        personaData.genero = formData.genero
      }

      // Agregar teléfonos si existen (filtrar vacíos)
      const telefonosValidos = telefonos.filter(t => t.numero.trim())
      if (telefonosValidos.length > 0) {
        personaData.telefonos = telefonosValidos.map(t => ({
          numero: t.numero.trim(),
          tipo: t.tipo,
        }))
      }

      // ⚠️ IMPORTANTE: POS solo envía a escolar (woo_escolar)
      const dataToSend: any = {
        data: {
          persona: personaData,
          canales: ['woo_escolar'], // POS siempre usa escolar
        },
      }

      // Crear el cliente en Strapi (se sincronizará con WooCommerce Escolar)
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

      // Buscar el cliente recién creado en WooCommerce para obtener su ID
      // Usamos el primer email para buscarlo
      const emailPrincipal = emailsValidos[0].email.trim()
      try {
        const searchResponse = await fetch(`/api/woocommerce/customers?search=${encodeURIComponent(emailPrincipal)}&per_page=1`)
        const searchData = await searchResponse.json()
        
        if (searchData.success && searchData.data && searchData.data.length > 0) {
          // Cargar datos completos del cliente
          const detailResponse = await fetch(`/api/woocommerce/customers/${searchData.data[0].id}`)
          const detailData = await detailResponse.json()
          if (detailData.success) {
            onSelect(detailData.data)
          } else {
            onSelect(searchData.data[0])
          }
        } else {
          // Si no se encuentra, esperar un momento y buscar de nuevo (puede tardar la sincronización)
          setTimeout(async () => {
            const retryResponse = await fetch(`/api/woocommerce/customers?search=${encodeURIComponent(emailPrincipal)}&per_page=1`)
            const retryData = await retryResponse.json()
            if (retryData.success && retryData.data && retryData.data.length > 0) {
              const detailResponse = await fetch(`/api/woocommerce/customers/${retryData.data[0].id}`)
              const detailData = await detailResponse.json()
              if (detailData.success) {
                onSelect(detailData.data)
              }
            }
          }, 2000)
        }
      } catch (searchErr) {
        console.warn('No se pudo buscar el cliente en WooCommerce inmediatamente:', searchErr)
        // Continuar de todas formas, el cliente se creó en Strapi
      }

      // Limpiar formulario
      setShowCreateModal(false)
      setFormData({
        nombres: '',
        primer_apellido: '',
        segundo_apellido: '',
        rut: '',
        genero: '',
      })
      setEmails([{ email: '', tipo: 'Personal' }])
      setTelefonos([{ numero: '', tipo: 'Personal' }])
      setRutError(null)
      setSearchTerm('')
      setCustomers([])
    } catch (err: any) {
      setError(err.message || 'Error al crear el cliente')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="customer-selector">
      <InputGroup>
        <InputGroup.Text>
          <LuSearch />
        </InputGroup.Text>
        <Form.Control
          type="text"
          placeholder={selectedCustomer ? selectedCustomer.first_name + ' ' + selectedCustomer.last_name : 'Buscar cliente...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (selectedCustomer) {
              setSearchTerm('')
            }
          }}
        />
        {selectedCustomer && (
          <Button
            variant="outline-secondary"
            onClick={() => {
              onSelect(null)
              setSearchTerm('')
            }}
          >
            <LuX />
          </Button>
        )}
        {selectedCustomer && (
          <Button
            variant="outline-info"
            onClick={() => setShowEditModal(true)}
            title="Editar datos del cliente"
          >
            <LuUser />
          </Button>
        )}
        <Button
          variant="outline-primary"
          onClick={() => {
            // Limpiar formulario al abrir
            setFormData({
              nombres: '',
              primer_apellido: '',
              segundo_apellido: '',
              rut: '',
              genero: '',
            })
            setEmails([{ email: '', tipo: 'Personal' }])
            setTelefonos([{ numero: '', tipo: 'Personal' }])
            setRutError(null)
            setError(null)
            setShowCreateModal(true)
          }}
          title="Crear cliente nuevo"
        >
          <LuUserPlus />
        </Button>
      </InputGroup>

      {/* Lista de resultados */}
      {searchTerm && !selectedCustomer && (
        <div className="position-relative">
          <div
            className="position-absolute w-100 bg-white border rounded shadow-lg"
            style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto', marginTop: '4px' }}
          >
            {loading ? (
              <div className="text-center p-3">
                <Spinner animation="border" size="sm" />
              </div>
            ) : error ? (
              <Alert variant="danger" className="m-2 mb-0">
                {error}
              </Alert>
            ) : customers.length === 0 ? (
              <div className="p-3 text-muted text-center">
                No se encontraron clientes
              </div>
            ) : (
              <ListGroup variant="flush">
                {customers.map((customer) => (
                  <ListGroup.Item
                    key={customer.id}
                    action
                    onClick={async () => {
                      // Cargar datos completos del cliente antes de seleccionarlo
                      try {
                        const detailResponse = await fetch(`/api/woocommerce/customers/${customer.id}`)
                        const detailData = await detailResponse.json()
                        if (detailData.success) {
                          onSelect(detailData.data)
                        } else {
                          onSelect(customer)
                        }
                      } catch {
                        onSelect(customer)
                      }
                      setSearchTerm('')
                      setCustomers([])
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold">
                          {customer.first_name} {customer.last_name}
                        </div>
                        <small className="text-muted">{customer.email}</small>
                        {customer.billing?.phone && (
                          <div>
                            <small className="text-muted">{customer.billing.phone}</small>
                          </div>
                        )}
                      </div>
                      <Badge bg="primary">
                        <LuUser />
                      </Badge>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>
        </div>
      )}

      {/* Modal para crear cliente */}
      <Modal 
        show={showCreateModal} 
        onHide={() => {
          setShowCreateModal(false)
          setError(null)
          setRutError(null)
        }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Crear Cliente Nuevo (POS - Escolar)</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Nombres <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: Juan Carlos"
                    value={formData.nombres}
                    onChange={(e) => handleFieldChange('nombres', e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Primer Apellido</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: Pérez"
                    value={formData.primer_apellido}
                    onChange={(e) => handleFieldChange('primer_apellido', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Segundo Apellido</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: González"
                    value={formData.segundo_apellido}
                    onChange={(e) => handleFieldChange('segundo_apellido', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    RUT <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: 12345678-9"
                    value={formData.rut}
                    onChange={(e) => handleFieldChange('rut', e.target.value)}
                    isInvalid={!!rutError}
                    required
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
                  <Form.Label>Género</Form.Label>
                  <Form.Control
                    as="select"
                    value={formData.genero}
                    onChange={(e) => handleFieldChange('genero', e.target.value)}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col xs={12}>
                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Label className="mb-0">
                      Email/s <span className="text-danger">*</span>
                    </Form.Label>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      type="button"
                      onClick={addEmail}
                    >
                      <LuPlus className="me-1" /> Agregar Email
                    </Button>
                  </div>
                  {emails.map((emailItem, index) => (
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
                        <Form.Control
                          as="select"
                          value={emailItem.tipo}
                          onChange={(e) => handleEmailChange(index, 'tipo', e.target.value as 'Personal' | 'Laboral' | 'Institucional')}
                        >
                          <option value="Personal">Personal</option>
                          <option value="Laboral">Laboral</option>
                          <option value="Institucional">Institucional</option>
                        </Form.Control>
                      </Col>
                      <Col md={2}>
                        {emails.length > 1 && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            type="button"
                            onClick={() => removeEmail(index)}
                            className="w-100"
                          >
                            <LuTrash2 />
                          </Button>
                        )}
                      </Col>
                    </Row>
                  ))}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col xs={12}>
                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Label className="mb-0">Teléfono/s</Form.Label>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      type="button"
                      onClick={addTelefono}
                    >
                      <LuPlus className="me-1" /> Agregar Teléfono
                    </Button>
                  </div>
                  {telefonos.map((telefonoItem, index) => (
                    <Row key={index} className="mb-2">
                      <Col md={6}>
                        <Form.Control
                          type="tel"
                          placeholder="Ej: +56 9 1234 5678"
                          value={telefonoItem.numero}
                          onChange={(e) => handleTelefonoChange(index, 'numero', e.target.value)}
                        />
                      </Col>
                      <Col md={4}>
                        <Form.Control
                          as="select"
                          value={telefonoItem.tipo}
                          onChange={(e) => handleTelefonoChange(index, 'tipo', e.target.value as 'Personal' | 'Laboral' | 'Institucional')}
                        >
                          <option value="Personal">Personal</option>
                          <option value="Laboral">Laboral</option>
                          <option value="Institucional">Institucional</option>
                        </Form.Control>
                      </Col>
                      <Col md={2}>
                        {telefonos.length > 1 && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            type="button"
                            onClick={() => removeTelefono(index)}
                            className="w-100"
                          >
                            <LuTrash2 />
                          </Button>
                        )}
                      </Col>
                    </Row>
                  ))}
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowCreateModal(false)
              setError(null)
              setRutError(null)
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateCustomer}
            disabled={creating || !formData.nombres.trim() || !formData.rut.trim() || emails.filter(e => e.email.trim()).length === 0}
          >
            {creating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Creando...
              </>
            ) : (
              'Crear Cliente'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para editar cliente */}
      {selectedCustomer && (
        <Modal 
          show={showEditModal} 
          onHide={() => setShowEditModal(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Editar Datos del Cliente</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <CustomerAddressForm
              customer={selectedCustomer}
              onSave={(updatedCustomer) => {
                onSelect(updatedCustomer)
                setShowEditModal(false)
              }}
              onCancel={() => setShowEditModal(false)}
            />
          </Modal.Body>
        </Modal>
      )}
    </div>
  )
}

