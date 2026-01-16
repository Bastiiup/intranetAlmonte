'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX, LuPlus, LuTrash2 } from 'react-icons/lu'
import PlatformSelector from './PlatformSelector'
import { validarRUTChileno, formatearRUT } from '@/lib/utils/rut'
import { buildWooCommerceAddress, createAddressMetaData, type DetailedAddress } from '@/lib/woocommerce/address-utils'
import ChileRegionComuna from '@/components/common/ChileRegionsComunas'

interface AddClienteFormProps {
  onSave?: () => void
  onCancel?: () => void
  showCard?: boolean
}

interface EmailItem {
  email: string
  tipo: 'Personal' | 'Laboral' | 'Institucional'
}

interface TelefonoItem {
  numero: string
  tipo: 'Personal' | 'Laboral' | 'Institucional'
}

const AddClienteForm = ({ onSave, onCancel, showCard = true }: AddClienteFormProps = {}) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
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
  
  // Estados para direcciones de facturación y envío
  const [billingAddress, setBillingAddress] = useState<DetailedAddress>({
    calle: '',
    numero: '',
    dpto: '',
    block: '',
    condominio: '',
    city: '',
    state: '',
    postcode: '',
    country: 'CL',
  })
  const [shippingAddress, setShippingAddress] = useState<DetailedAddress>({
    calle: '',
    numero: '',
    dpto: '',
    block: '',
    condominio: '',
    city: '',
    state: '',
    postcode: '',
    country: 'CL',
  })
  const [useSameAddress, setUseSameAddress] = useState(true)
  const [billingPhone, setBillingPhone] = useState('')
  const [billingCompany, setBillingCompany] = useState('')

  // Sincronizar shipping con billing si useSameAddress está activado
  useEffect(() => {
    if (useSameAddress) {
      setShippingAddress({ ...billingAddress })
    }
  }, [useSameAddress, billingAddress])

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
          // Actualizar el campo con el formato correcto
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

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

      const dataToSend: any = {
        data: {
          persona: personaData,
        },
      }

      // Agregar plataformas seleccionadas (se usarán para determinar a qué WordPress enviar)
      // Si no se selecciona ninguna, se enviará a ambas por defecto
      if (selectedPlatforms.length > 0) {
        // Convertir nombres de plataformas a formato que entienda el servidor
        dataToSend.data.canales = selectedPlatforms // Se usa el nombre de la plataforma directamente
        console.log('[AddCliente] 📡 Plataformas seleccionadas:', selectedPlatforms)
      }
      
      // Agregar datos de billing y shipping si están presentes
      const billingWooCommerce = buildWooCommerceAddress(billingAddress)
      const shippingWooCommerce = buildWooCommerceAddress(useSameAddress ? billingAddress : shippingAddress)
      const billingMetaData = createAddressMetaData('billing', billingAddress)
      const shippingMetaData = createAddressMetaData('shipping', useSameAddress ? billingAddress : shippingAddress)
      
      // Solo agregar billing/shipping si hay al menos un campo completado
      const hasBillingData = billingAddress.calle || billingAddress.city || billingAddress.state || billingPhone || billingCompany
      const hasShippingData = shippingAddress.calle || shippingAddress.city || shippingAddress.state
      
      if (hasBillingData || hasShippingData) {
        dataToSend.data.woocommerce_data = {
          billing: hasBillingData ? {
            first_name: formData.nombres.trim(),
            last_name: [formData.primer_apellido.trim(), formData.segundo_apellido.trim()].filter(Boolean).join(' '),
            email: emailsValidos[0].email.trim(),
            phone: billingPhone.trim() || (telefonosValidos.length > 0 ? telefonosValidos[0].numero.trim() : ''),
            company: billingCompany.trim(),
            address_1: billingWooCommerce.address_1,
            address_2: billingWooCommerce.address_2,
            city: billingAddress.city || '',
            state: billingAddress.state || '',
            postcode: billingAddress.postcode || '',
            country: billingAddress.country || 'CL',
          } : undefined,
          shipping: (hasShippingData || useSameAddress) ? {
            first_name: formData.nombres.trim(),
            last_name: [formData.primer_apellido.trim(), formData.segundo_apellido.trim()].filter(Boolean).join(' '),
            company: billingCompany.trim(),
            address_1: shippingWooCommerce.address_1,
            address_2: shippingWooCommerce.address_2,
            city: (useSameAddress ? billingAddress : shippingAddress).city || '',
            state: (useSameAddress ? billingAddress : shippingAddress).state || '',
            postcode: (useSameAddress ? billingAddress : shippingAddress).postcode || '',
            country: (useSameAddress ? billingAddress : shippingAddress).country || 'CL',
          } : undefined,
          meta_data: [...billingMetaData, ...shippingMetaData],
        }
      }

      // Crear el cliente en Strapi (se sincronizará con WordPress según los canales)
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

      setSuccess(true)
      
      // Si hay callback onSave, usarlo (modal), sino redirigir (página completa)
      if (onSave) {
        setTimeout(() => {
          onSave()
          router.refresh()
        }, 1500)
      } else {
        setTimeout(() => {
          router.push('/clientes')
        }, 1500)
      }
    } catch (err: any) {
      console.error('Error al crear cliente:', err)
      setError(err.message || 'Error al crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  const formContent = (
    <>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                Cliente creado exitosamente. Se sincronizará con las plataformas seleccionadas según los canales asignados. Redirigiendo...
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <PlatformSelector
                selectedPlatforms={selectedPlatforms}
                onChange={setSelectedPlatforms}
              />
              
              <Row>
                <Col md={6}>
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
                    />
                    <FormControl.Feedback type="invalid">
                      Los nombres son obligatorios
                    </FormControl.Feedback>
                  </FormGroup>
                </Col>
                <Col md={3}>
                  <FormGroup className="mb-3">
                    <FormLabel>Primer Apellido</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Pérez"
                      value={formData.primer_apellido}
                      onChange={(e) => handleFieldChange('primer_apellido', e.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col md={3}>
                  <FormGroup className="mb-3">
                    <FormLabel>Segundo Apellido</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: González"
                      value={formData.segundo_apellido}
                      onChange={(e) => handleFieldChange('segundo_apellido', e.target.value)}
                    />
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>
                      RUT <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: 12345678-9"
                      value={formData.rut}
                      onChange={(e) => handleFieldChange('rut', e.target.value)}
                      isInvalid={!!rutError}
                      required
                    />
                    {rutError && (
                      <FormControl.Feedback type="invalid">
                        {rutError}
                      </FormControl.Feedback>
                    )}
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Género</FormLabel>
                    <FormControl
                      as="select"
                      value={formData.genero}
                      onChange={(e) => handleFieldChange('genero', e.target.value)}
                    >
                      <option value="">Seleccione...</option>
                      <option value="Hombre">Hombre</option>
                      <option value="Mujer">Mujer</option>
                    </FormControl>
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col xs={12}>
                  <FormGroup className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <FormLabel className="mb-0">
                        Email/s <span className="text-danger">*</span>
                      </FormLabel>
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
                          <FormControl
                            type="email"
                            placeholder="Ej: juan.perez@ejemplo.com"
                            value={emailItem.email}
                            onChange={(e) => handleEmailChange(index, 'email', e.target.value)}
                            required={index === 0}
                          />
                        </Col>
                        <Col md={4}>
                          <FormControl
                            as="select"
                            value={emailItem.tipo}
                            onChange={(e) => handleEmailChange(index, 'tipo', e.target.value)}
                          >
                            <option value="Personal">Personal</option>
                            <option value="Laboral">Laboral</option>
                            <option value="Institucional">Institucional</option>
                          </FormControl>
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
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col xs={12}>
                  <FormGroup className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <FormLabel className="mb-0">Teléfono/s</FormLabel>
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
                          <FormControl
                            type="tel"
                            placeholder="Ej: +56 9 1234 5678"
                            value={telefonoItem.numero}
                            onChange={(e) => handleTelefonoChange(index, 'numero', e.target.value)}
                          />
                        </Col>
                        <Col md={4}>
                          <FormControl
                            as="select"
                            value={telefonoItem.tipo}
                            onChange={(e) => handleTelefonoChange(index, 'tipo', e.target.value)}
                          >
                            <option value="Personal">Personal</option>
                            <option value="Laboral">Laboral</option>
                            <option value="Institucional">Institucional</option>
                          </FormControl>
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
                  </FormGroup>
                </Col>
              </Row>

              {/* Dirección de Facturación */}
              <Row>
                <Col xs={12}>
                  <div className="mb-3 mt-4">
                    <h5 className="text-uppercase bg-light-subtle p-2 border-dashed border rounded border-light mb-3">
                      Dirección de Facturación
                    </h5>
                    <Row>
                      <Col md={6}>
                        <FormGroup className="mb-3">
                          <FormLabel>Teléfono de Facturación</FormLabel>
                          <FormControl
                            type="tel"
                            placeholder="Ej: +56 9 1234 5678"
                            value={billingPhone}
                            onChange={(e) => setBillingPhone(e.target.value)}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={6}>
                        <FormGroup className="mb-3">
                          <FormLabel>Empresa</FormLabel>
                          <FormControl
                            type="text"
                            placeholder="Ej: Mi Empresa S.A."
                            value={billingCompany}
                            onChange={(e) => setBillingCompany(e.target.value)}
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={8}>
                        <FormGroup className="mb-3">
                          <FormLabel>Calle</FormLabel>
                          <FormControl
                            type="text"
                            placeholder="Ej: Av. Providencia"
                            value={billingAddress.calle || ''}
                            onChange={(e) => setBillingAddress({ ...billingAddress, calle: e.target.value })}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Número</FormLabel>
                          <FormControl
                            type="text"
                            placeholder="Ej: 123"
                            value={billingAddress.numero || ''}
                            onChange={(e) => setBillingAddress({ ...billingAddress, numero: e.target.value })}
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Departamento</FormLabel>
                          <FormControl
                            type="text"
                            placeholder="Ej: 101"
                            value={billingAddress.dpto || ''}
                            onChange={(e) => setBillingAddress({ ...billingAddress, dpto: e.target.value })}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Block</FormLabel>
                          <FormControl
                            type="text"
                            placeholder="Ej: A"
                            value={billingAddress.block || ''}
                            onChange={(e) => setBillingAddress({ ...billingAddress, block: e.target.value })}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Condominio</FormLabel>
                          <FormControl
                            type="text"
                            placeholder="Ej: Los Rosales"
                            value={billingAddress.condominio || ''}
                            onChange={(e) => setBillingAddress({ ...billingAddress, condominio: e.target.value })}
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <ChileRegionComuna
                      regionValue={billingAddress.state || ''}
                      comunaValue={billingAddress.city || ''}
                      onRegionChange={(region) => setBillingAddress({ ...billingAddress, state: region })}
                      onComunaChange={(comuna) => setBillingAddress({ ...billingAddress, city: comuna })}
                      regionLabel="Región"
                      comunaLabel="Ciudad/Comuna"
                      regionPlaceholder="Seleccione una región"
                      comunaPlaceholder="Seleccione una comuna"
                    />
                    <Row>
                      <Col md={6}>
                        <FormGroup className="mb-3">
                          <FormLabel>Código Postal</FormLabel>
                          <FormControl
                            type="text"
                            placeholder="Ej: 7500000"
                            value={billingAddress.postcode || ''}
                            onChange={(e) => setBillingAddress({ ...billingAddress, postcode: e.target.value })}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={6}>
                        <FormGroup className="mb-3">
                          <FormLabel>País</FormLabel>
                          <FormControl
                            type="text"
                            value={billingAddress.country || 'CL'}
                            onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                  </div>
                </Col>
              </Row>

              {/* Dirección de Envío */}
              <Row>
                <Col xs={12}>
                  <div className="mb-3 mt-4">
                    <div className="mb-3">
                      <FormGroup>
                        <FormControl
                          type="checkbox"
                          checked={useSameAddress}
                          onChange={(e) => {
                            const checked = (e.target as HTMLInputElement).checked
                            setUseSameAddress(checked)
                            if (checked) {
                              setShippingAddress({ ...billingAddress })
                            }
                          }}
                          className="form-check-input"
                        />
                        <FormLabel className="ms-2 mb-0">Usar la misma dirección para envío</FormLabel>
                      </FormGroup>
                    </div>
                    {!useSameAddress && (
                      <>
                        <h5 className="text-uppercase bg-light-subtle p-2 border-dashed border rounded border-light mb-3">
                          Dirección de Envío
                        </h5>
                        <Row>
                          <Col md={8}>
                            <FormGroup className="mb-3">
                              <FormLabel>Calle</FormLabel>
                              <FormControl
                                type="text"
                                placeholder="Ej: Av. Providencia"
                                value={shippingAddress.calle || ''}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, calle: e.target.value })}
                              />
                            </FormGroup>
                          </Col>
                          <Col md={4}>
                            <FormGroup className="mb-3">
                              <FormLabel>Número</FormLabel>
                              <FormControl
                                type="text"
                                placeholder="Ej: 123"
                                value={shippingAddress.numero || ''}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, numero: e.target.value })}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={4}>
                            <FormGroup className="mb-3">
                              <FormLabel>Departamento</FormLabel>
                              <FormControl
                                type="text"
                                placeholder="Ej: 101"
                                value={shippingAddress.dpto || ''}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, dpto: e.target.value })}
                              />
                            </FormGroup>
                          </Col>
                          <Col md={4}>
                            <FormGroup className="mb-3">
                              <FormLabel>Block</FormLabel>
                              <FormControl
                                type="text"
                                placeholder="Ej: A"
                                value={shippingAddress.block || ''}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, block: e.target.value })}
                              />
                            </FormGroup>
                          </Col>
                          <Col md={4}>
                            <FormGroup className="mb-3">
                              <FormLabel>Condominio</FormLabel>
                              <FormControl
                                type="text"
                                placeholder="Ej: Los Rosales"
                                value={shippingAddress.condominio || ''}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, condominio: e.target.value })}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <ChileRegionComuna
                          regionValue={shippingAddress.state || ''}
                          comunaValue={shippingAddress.city || ''}
                          onRegionChange={(region) => setShippingAddress({ ...shippingAddress, state: region })}
                          onComunaChange={(comuna) => setShippingAddress({ ...shippingAddress, city: comuna })}
                          regionLabel="Región"
                          comunaLabel="Ciudad/Comuna"
                          regionPlaceholder="Seleccione una región"
                          comunaPlaceholder="Seleccione una comuna"
                        />
                        <Row>
                          <Col md={6}>
                            <FormGroup className="mb-3">
                              <FormLabel>Código Postal</FormLabel>
                              <FormControl
                                type="text"
                                placeholder="Ej: 7500000"
                                value={shippingAddress.postcode || ''}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, postcode: e.target.value })}
                              />
                            </FormGroup>
                          </Col>
                          <Col md={6}>
                            <FormGroup className="mb-3">
                              <FormLabel>País</FormLabel>
                              <FormControl
                                type="text"
                                value={shippingAddress.country || 'CL'}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                      </>
                    )}
                  </div>
                </Col>
              </Row>

              <div className="d-flex gap-2 justify-content-end">
                <Button
                  variant="light"
                  onClick={() => {
                    if (onCancel) {
                      onCancel()
                    } else {
                      router.back()
                    }
                  }}
                  disabled={loading}
                >
                  <LuX className="me-1" /> Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <LuSave className="me-1" /> Guardar Cliente
                    </>
                  )}
                </Button>
              </div>
            </Form>
    </>
  )

  if (!showCard) {
    return formContent
  }

  return (
    <Row>
      <Col xs={12}>
        <Card>
          <CardHeader>
            <h4 className="card-title mb-0">Agregar Cliente</h4>
          </CardHeader>
          <CardBody>
            {formContent}
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default AddClienteForm

