'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Form, Alert, Row, Col, FormGroup, FormLabel, FormControl, Spinner } from 'react-bootstrap'
import { LuSave, LuX, LuPlus, LuTrash2 } from 'react-icons/lu'
import { validarRUTChileno, formatearRUT } from '@/lib/utils/rut'
import { buildWooCommerceAddress, createAddressMetaData, parseWooCommerceAddress, type DetailedAddress } from '@/lib/woocommerce/address-utils'
import ChileRegionComuna, { CHILE_REGIONS } from '@/components/common/ChileRegionsComunas'

interface Cliente {
  id: number | string
  documentId?: string
  personaDocumentId?: string
  woocommerce_id?: number | string
  nombre?: string
  correo_electronico?: string
  telefono?: string
  rut?: string
}

interface EditClienteModalProps {
  show: boolean
  onHide: () => void
  cliente: Cliente | null
  onSave: () => void
}

interface EmailItem {
  email: string
  tipo: 'Personal' | 'Laboral' | 'Institucional'
}

interface TelefonoItem {
  numero: string
  tipo: 'Personal' | 'Laboral' | 'Institucional'
}

const EditClienteModal = ({ show, onHide, cliente, onSave }: EditClienteModalProps) => {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
  const [personaDocumentId, setPersonaDocumentId] = useState<string | null>(null)
  const [clienteDocumentId, setClienteDocumentId] = useState<string | null>(null)
  
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

  // Mapeo de regiones a códigos de provincia (WooCommerce necesita código de provincia, no región)
  const REGION_TO_PROVINCE_CODE: Record<string, string> = {
    '01': '011', // Tarapacá -> Iquique
    '02': '021', // Antofagasta -> Antofagasta
    '03': '031', // Atacama -> Chañaral
    '04': '041', // Coquimbo -> Elqui
    '05': '051', // Valparaíso -> Valparaíso
    '06': '061', // O'Higgins -> Cachapoal
    '07': '071', // Maule -> Talca
    '08': '081', // Biobío -> Concepción
    '09': '091', // La Araucanía -> Cautín
    '10': '101', // Los Lagos -> Llanquihue
    '11': '111', // Aysén -> Coyhaique
    '12': '121', // Magallanes -> Magallanes
    '13': '131', // Metropolitana -> Santiago
    '14': '141', // Los Ríos -> Valdivia
    '15': '151', // Arica y Parinacota -> Arica
    '16': '161', // Ñuble -> Chillán
  }

  // Helper para obtener el código de provincia desde el nombre de región
  const getProvinceCodeFromRegionName = (regionName: string): string => {
    if (!regionName) return ''
    const region = CHILE_REGIONS.find(r => r.name === regionName)
    if (region && REGION_TO_PROVINCE_CODE[region.id]) {
      return REGION_TO_PROVINCE_CODE[region.id]
    }
    return regionName // Si no se encuentra, devolver el nombre original como fallback
  }

  // Cargar datos completos del cliente desde la API cuando se abre el modal
  useEffect(() => {
    const loadClienteData = async () => {
      if (!cliente || !show) return

      setLoadingData(true)
      setError(null)

      try {
        // Si el cliente viene de WooCommerce (ID numérico), buscar en Strapi por email
        // Si tiene documentId (string), usarlo directamente
        const clienteId = cliente.documentId || cliente.id
        const email = cliente.correo_electronico
        
        let clienteData: any = null
        
        // Si tiene documentId (string de Strapi), buscar directamente
        if (cliente.documentId && typeof cliente.documentId === 'string') {
          console.log('[EditClienteModal] 🔍 Buscando cliente por documentId (Strapi):', cliente.documentId)
          const response = await fetch(`/api/tienda/clientes/${cliente.documentId}`)
          const result = await response.json()
          
          if (response.ok && result.success) {
            clienteData = result.data
          } else {
            console.log('[EditClienteModal] ⚠️ No se encontró por documentId, intentando por email...')
          }
        }
        
        // Si no se encontró y tenemos email, buscar en Strapi por email
        if (!clienteData && email) {
          console.log('[EditClienteModal] 🔍 Buscando cliente en Strapi por email:', email)
          try {
            // Obtener todos los clientes y buscar por email
            const allResponse = await fetch('/api/tienda/clientes')
            const allResult = await allResponse.json()
            
            if (allResponse.ok && allResult.success && allResult.data) {
              const clientes = Array.isArray(allResult.data) ? allResult.data : [allResult.data]
              
              // Buscar cliente que tenga el email en su correo_electronico o en Persona
              clienteData = clientes.find((c: any) => {
                const attrs = c.attributes || c
                const correo = attrs.correo_electronico || c.correo_electronico
                if (correo === email) return true
                
                // También buscar en Persona relacionada
                const persona = attrs.persona?.data || attrs.persona || c.persona?.data || c.persona
                if (persona) {
                  const personaAttrs = persona.attributes || persona
                  const emails = personaAttrs.emails || []
                  return emails.some((e: any) => (e.email || e) === email)
                }
                return false
              })
              
              if (clienteData) {
                console.log('[EditClienteModal] ✅ Cliente encontrado por email:', clienteData.documentId || clienteData.id)
              }
            }
          } catch (searchError: any) {
            console.error('[EditClienteModal] ❌ Error al buscar por email:', searchError)
          }
        }
        
        // Si aún no se encontró, intentar buscar directamente con el ID (puede ser documentId de Strapi)
        if (!clienteData && clienteId) {
          console.log('[EditClienteModal] 🔍 Intentando búsqueda directa con ID:', clienteId)
          const response = await fetch(`/api/tienda/clientes/${clienteId}`)
          const result = await response.json()
          
          if (response.ok && result.success) {
            clienteData = result.data
          }
        }
        
        if (!clienteData) {
          throw new Error(`No se encontró el cliente en Strapi. ${email ? `Email: ${email}` : `ID: ${clienteId}`}`)
        }

        const clienteAttrs = clienteData.attributes || clienteData
        
        // Guardar documentIds
        setClienteDocumentId(clienteData.documentId || clienteData.id?.toString() || null)
        
        // Extraer datos de Persona
        const persona = clienteAttrs.persona?.data || clienteAttrs.persona || clienteData.persona?.data || clienteData.persona
        if (!persona) {
          throw new Error('No se encontró información de Persona asociada al cliente')
        }

        const personaAttrs = persona.attributes || persona
        const personaDocId = persona.documentId || persona.id?.toString() || personaAttrs.documentId || personaAttrs.id?.toString()
        
        if (!personaDocId) {
          throw new Error('No se encontró documentId de Persona')
        }

        setPersonaDocumentId(personaDocId)
        console.log('[EditClienteModal] ✅ Persona documentId:', personaDocId)

        // Cargar nombres y apellidos
        setFormData({
          nombres: personaAttrs.nombres || '',
          primer_apellido: personaAttrs.primer_apellido || '',
          segundo_apellido: personaAttrs.segundo_apellido || '',
          rut: personaAttrs.rut || '',
          genero: personaAttrs.genero || '',
        })

        // Cargar emails
        const personaEmails = personaAttrs.emails || []
        if (personaEmails.length > 0) {
          const emailsData: EmailItem[] = personaEmails.map((e: any) => ({
            email: e.email || '',
            tipo: (e.tipo || 'Personal') as 'Personal' | 'Laboral' | 'Institucional',
          }))
          setEmails(emailsData)
        } else {
          // Si no hay emails en persona, usar el del cliente como fallback
          const emailCliente = clienteAttrs.correo_electronico || cliente.correo_electronico || ''
          setEmails([{ email: emailCliente, tipo: 'Personal' }])
        }

        // Cargar teléfonos
        const personaTelefonos = personaAttrs.telefonos || []
        if (personaTelefonos.length > 0) {
          const telefonosData: TelefonoItem[] = personaTelefonos.map((t: any) => {
            const numero = t.telefono_raw || t.telefono_norm || t.numero || t.telefono || ''
            return {
              numero: numero,
              tipo: (t.tipo || 'Personal') as 'Personal' | 'Laboral' | 'Institucional',
            }
          })
          setTelefonos(telefonosData)
        } else {
          // Si no hay teléfonos en persona, usar el del cliente como fallback
          const telefonoCliente = clienteAttrs.telefono || cliente.telefono || ''
          if (telefonoCliente && telefonoCliente !== 'Sin teléfono') {
            setTelefonos([{ numero: telefonoCliente, tipo: 'Personal' }])
          }
        }

        // Cargar datos de billing/shipping desde WooCommerce si hay woocommerce_id
        // Buscar en wooId (campo de Strapi) o woocommerce_id (compatibilidad)
        const woocommerceId = clienteAttrs.wooId || clienteAttrs.woocommerce_id || cliente.wooId || cliente.woocommerce_id
        if (woocommerceId && typeof woocommerceId === 'number') {
          try {
            console.log('[EditClienteModal] 🔍 Cargando datos de WooCommerce para cliente ID:', woocommerceId)
            const wooResponse = await fetch(`/api/woocommerce/customers/${woocommerceId}`)
            const wooResult = await wooResponse.json()
            
            if (wooResponse.ok && wooResult.success && wooResult.data) {
              const wooCustomer = wooResult.data
              
              // Cargar billing desde WooCommerce
              if (wooCustomer.billing) {
                const billingWoo = wooCustomer.billing
                const billingParsed = parseWooCommerceAddress(billingWoo.address_1 || '', billingWoo.address_2 || '')
                
                setBillingAddress({
                  calle: billingParsed.calle || '',
                  numero: billingParsed.numero || '',
                  dpto: billingParsed.dpto || '',
                  block: billingParsed.block || '',
                  condominio: billingParsed.condominio || '',
                  city: billingWoo.city || '',
                  state: billingWoo.state || '',
                  postcode: billingWoo.postcode || '',
                  country: billingWoo.country || 'CL',
                })
                setBillingPhone(billingWoo.phone || '')
                setBillingCompany(billingWoo.company || '')
              }
              
              // Cargar shipping desde WooCommerce
              if (wooCustomer.shipping) {
                const shippingWoo = wooCustomer.shipping
                const shippingParsed = parseWooCommerceAddress(shippingWoo.address_1 || '', shippingWoo.address_2 || '')
                
                setShippingAddress({
                  calle: shippingParsed.calle || '',
                  numero: shippingParsed.numero || '',
                  dpto: shippingParsed.dpto || '',
                  block: shippingParsed.block || '',
                  condominio: shippingParsed.condominio || '',
                  city: shippingWoo.city || '',
                  state: shippingWoo.state || '',
                  postcode: shippingWoo.postcode || '',
                  country: shippingWoo.country || 'CL',
                })
                
                // Verificar si las direcciones son iguales
                const isSame = JSON.stringify(billingAddress) === JSON.stringify(shippingAddress)
                setUseSameAddress(isSame)
              }
              
              console.log('[EditClienteModal] ✅ Datos de billing/shipping cargados desde WooCommerce')
            }
          } catch (wooError: any) {
            console.warn('[EditClienteModal] ⚠️ No se pudieron cargar datos de WooCommerce:', wooError.message)
            // No es crítico, continuar sin datos de WooCommerce
          }
        }

        console.log('[EditClienteModal] ✅ Datos cargados correctamente')
      } catch (err: any) {
        console.error('[EditClienteModal] ❌ Error al cargar datos:', err)
        setError(err.message || 'Error al cargar los datos del cliente')
      } finally {
        setLoadingData(false)
      }
    }

    loadClienteData()
  }, [cliente, show])
  
  // Sincronizar shipping con billing solo cuando se activa useSameAddress
  // No usar useEffect para evitar problemas de escritura en los campos
  // La sincronización se maneja manualmente cuando se activa el checkbox

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
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

      // Validar que tenemos personaDocumentId (CRÍTICO para evitar crear nuevos clientes)
      if (!personaDocumentId) {
        throw new Error('No se encontró el ID de Persona. No se puede editar sin este identificador.')
      }

      // Validar que tenemos clienteDocumentId
      const clienteId = clienteDocumentId || cliente?.documentId || cliente?.id
      if (!clienteId) {
        throw new Error('No se puede editar: el cliente no tiene ID válido')
      }

      console.log('[EditClienteModal] 🔍 IDs a usar:', {
        clienteId,
        personaDocumentId,
      })

      // Construir nombre completo
      const partesNombre = [formData.nombres.trim(), formData.primer_apellido.trim(), formData.segundo_apellido.trim()]
        .filter(p => p.length > 0)
      const nombreCompleto = partesNombre.join(' ')

      // Preparar datos para la API en formato Strapi
      const updateData: any = {
        data: {
          nombre: nombreCompleto,
          correo_electronico: emailsValidos[0].email.trim(),
          persona: {
            documentId: personaDocumentId, // CRÍTICO: usar documentId para editar, no crear
            nombre_completo: nombreCompleto,
            nombres: formData.nombres.trim(),
            primer_apellido: formData.primer_apellido.trim() || null,
            segundo_apellido: formData.segundo_apellido.trim() || null,
            rut: rutFormateado,
            emails: emailsValidos.map(e => ({
              email: e.email.trim(),
              tipo: e.tipo,
            })),
            telefonos: telefonos.filter(t => t.numero.trim()).map(t => ({
              numero: t.numero.trim(),
              tipo: t.tipo,
            })),
          },
        },
      }

      // Agregar género si se seleccionó
      if (formData.genero) {
        updateData.data.persona.genero = formData.genero
      }
      
      // Agregar datos de billing y shipping si están presentes
      const billingWooCommerce = buildWooCommerceAddress(billingAddress)
      const shippingWooCommerce = buildWooCommerceAddress(useSameAddress ? billingAddress : shippingAddress)
      const billingMetaData = createAddressMetaData('billing', billingAddress)
      const shippingMetaData = createAddressMetaData('shipping', useSameAddress ? billingAddress : shippingAddress)
      
      // Siempre enviar billing si hay cualquier dato (teléfono, empresa, o dirección)
      const hasBillingData = billingAddress.calle || billingAddress.city || billingAddress.state || billingPhone.trim() || billingCompany.trim()
      const hasShippingData = shippingAddress.calle || shippingAddress.city || shippingAddress.state
      
      // Siempre incluir woocommerce_data si hay cualquier dato de billing o shipping
      if (hasBillingData || hasShippingData) {
        // Obtener código de provincia para WooCommerce (necesita código de provincia, no nombre de región)
        const billingStateCode = billingAddress.state ? getProvinceCodeFromRegionName(billingAddress.state) : ''
        
        const billingData = hasBillingData ? {
          first_name: formData.nombres.trim(),
          last_name: [formData.primer_apellido.trim(), formData.segundo_apellido.trim()].filter(Boolean).join(' '),
          email: emailsValidos[0].email.trim(),
          phone: billingPhone.trim() || (telefonos.filter(t => t.numero.trim()).length > 0 ? telefonos.filter(t => t.numero.trim())[0].numero.trim() : ''),
          company: billingCompany.trim() || '',
          address_1: billingWooCommerce.address_1 || '',
          address_2: billingWooCommerce.address_2 || '',
          city: billingAddress.city || '',
          state: billingStateCode || billingAddress.state || '', // Usar código de región si está disponible
          postcode: billingAddress.postcode || '',
          country: billingAddress.country || 'CL',
        } : undefined

        // Obtener código de provincia para shipping (necesita código de provincia, no nombre de región)
        const shippingStateCode = (useSameAddress ? billingAddress.state : shippingAddress.state) 
          ? getProvinceCodeFromRegionName(useSameAddress ? billingAddress.state : shippingAddress.state) 
          : ''
        
        const shippingData = (hasShippingData || useSameAddress) ? {
          first_name: formData.nombres.trim(),
          last_name: [formData.primer_apellido.trim(), formData.segundo_apellido.trim()].filter(Boolean).join(' '),
          company: billingCompany.trim() || '',
          phone: billingPhone.trim() || (telefonos.filter(t => t.numero.trim()).length > 0 ? telefonos.filter(t => t.numero.trim())[0].numero.trim() : ''),
          address_1: shippingWooCommerce.address_1 || '',
          address_2: shippingWooCommerce.address_2 || '',
          city: (useSameAddress ? billingAddress : shippingAddress).city || '',
          state: shippingStateCode || (useSameAddress ? billingAddress : shippingAddress).state || '', // Usar código de región si está disponible
          postcode: (useSameAddress ? billingAddress : shippingAddress).postcode || '',
          country: (useSameAddress ? billingAddress : shippingAddress).country || 'CL',
        } : undefined

        updateData.data.woocommerce_data = {
          billing: billingData,
          shipping: shippingData,
          meta_data: [...billingMetaData, ...shippingMetaData],
        }

        console.log('[EditClienteModal] 📦 woocommerce_data preparado:', {
          hasBilling: !!billingData,
          hasShipping: !!shippingData,
          billing: billingData,
          shipping: shippingData,
          metaDataCount: [...billingMetaData, ...shippingMetaData].length,
          billingPostcode: billingData?.postcode,
          billingState: billingData?.state,
          shippingPostcode: shippingData?.postcode,
          shippingState: shippingData?.state,
        })
      } else {
        console.log('[EditClienteModal] ⚠️ No hay datos de billing/shipping para enviar:', {
          hasBillingData,
          hasShippingData,
          billingPhone: billingPhone.trim(),
          billingCompany: billingCompany.trim(),
          billingAddress,
          shippingAddress,
        })
      }

      console.log('[EditClienteModal] 📤 Enviando datos de actualización:', JSON.stringify(updateData, null, 2))
      
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

      // Llamar callback para refrescar la lista
      onSave()
      onHide()
    } catch (err: any) {
      console.error('[EditClienteModal] ❌ Error al actualizar cliente:', err)
      setError(err.message || 'Error al actualizar el cliente')
    } finally {
      setLoading(false)
    }
  }

  if (!cliente) return null

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Editar Cliente</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loadingData ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" className="me-2" />
            Cargando datos del cliente...
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
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
                          onChange={(e) => {
                            const newValue = e.target.value
                            setBillingAddress((prev) => {
                              const updated = { ...prev, calle: newValue }
                              // Si useSameAddress está activo, sincronizar shipping
                              if (useSameAddress) {
                                setShippingAddress((prevShipping) => ({ ...prevShipping, calle: newValue }))
                              }
                              return updated
                            })
                          }}
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
                          onChange={(e) => {
                            const newValue = e.target.value
                            setBillingAddress((prev) => {
                              const updated = { ...prev, numero: newValue }
                              // Si useSameAddress está activo, sincronizar shipping
                              if (useSameAddress) {
                                setShippingAddress((prevShipping) => ({ ...prevShipping, numero: newValue }))
                              }
                              return updated
                            })
                          }}
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
                          onChange={(e) => {
                            const newValue = e.target.value
                            setBillingAddress((prev) => {
                              const updated = { ...prev, dpto: newValue }
                              // Si useSameAddress está activo, sincronizar shipping
                              if (useSameAddress) {
                                setShippingAddress((prevShipping) => ({ ...prevShipping, dpto: newValue }))
                              }
                              return updated
                            })
                          }}
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
                          onChange={(e) => {
                            const newValue = e.target.value
                            setBillingAddress((prev) => {
                              const updated = { ...prev, block: newValue }
                              // Si useSameAddress está activo, sincronizar shipping
                              if (useSameAddress) {
                                setShippingAddress((prevShipping) => ({ ...prevShipping, block: newValue }))
                              }
                              return updated
                            })
                          }}
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
                          onChange={(e) => {
                            const newValue = e.target.value
                            setBillingAddress((prev) => {
                              const updated = { ...prev, condominio: newValue }
                              // Si useSameAddress está activo, sincronizar shipping
                              if (useSameAddress) {
                                setShippingAddress((prevShipping) => ({ ...prevShipping, condominio: newValue }))
                              }
                              return updated
                            })
                          }}
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                  <ChileRegionComuna
                    regionValue={billingAddress.state || ''}
                    comunaValue={billingAddress.city || ''}
                    onRegionChange={(region) => {
                      setBillingAddress((prev) => ({ ...prev, state: region, postcode: '' }))
                    }}
                    onComunaChange={(comuna) => {
                      setBillingAddress((prev) => ({ ...prev, city: comuna }))
                    }}
                    onPostalCodeChange={(postalCode) => {
                      console.log('[EditClienteModal] 📮 Código postal generado automáticamente:', postalCode)
                      setBillingAddress((prev) => ({ ...prev, postcode: postalCode }))
                    }}
                    regionLabel="Región"
                    comunaLabel="Ciudad/Comuna"
                    regionPlaceholder="Seleccione una región"
                    comunaPlaceholder="Seleccione una comuna"
                    autoGeneratePostalCode={true}
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
                          const checked = e.target.checked
                          setUseSameAddress(checked)
                          if (checked) {
                            // Sincronizar shipping con billing cuando se activa
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
                          onChange={(e) => {
                            const newValue = e.target.value
                            setShippingAddress((prev) => ({ ...prev, dpto: newValue }))
                          }}
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
                          onChange={(e) => {
                            const newValue = e.target.value
                            setShippingAddress((prev) => ({ ...prev, block: newValue }))
                          }}
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
                          onChange={(e) => {
                            const newValue = e.target.value
                            setShippingAddress((prev) => ({ ...prev, condominio: newValue }))
                          }}
                        />
                          </FormGroup>
                        </Col>
                      </Row>
                      <ChileRegionComuna
                        regionValue={shippingAddress.state || ''}
                        comunaValue={shippingAddress.city || ''}
                        onRegionChange={(region) => {
                          setShippingAddress((prev) => ({ ...prev, state: region, postcode: '' }))
                        }}
                        onComunaChange={(comuna) => {
                          setShippingAddress((prev) => ({ ...prev, city: comuna }))
                        }}
                        onPostalCodeChange={(postalCode) => {
                          console.log('[EditClienteModal] 📮 Código postal generado automáticamente (shipping):', postalCode)
                          setShippingAddress((prev) => ({ ...prev, postcode: postalCode }))
                        }}
                        regionLabel="Región"
                        comunaLabel="Ciudad/Comuna"
                        regionPlaceholder="Seleccione una región"
                        comunaPlaceholder="Seleccione una comuna"
                        autoGeneratePostalCode={true}
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
              <Button variant="secondary" onClick={onHide} disabled={loading}>
                <LuX className="me-1" /> Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <LuSave className="me-1" /> Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  )
}

export default EditClienteModal
