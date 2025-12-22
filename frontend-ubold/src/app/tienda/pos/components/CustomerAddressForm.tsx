'use client'

import { useState, useEffect } from 'react'
import { Form, Button, Row, Col, Alert, Spinner, Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'
import { LuSave, LuMapPin } from 'react-icons/lu'
import { buildWooCommerceAddress, createAddressMetaData, type DetailedAddress } from '@/lib/woocommerce/address-utils'
import CommuneAutocomplete from './CommuneAutocomplete'

interface Customer {
  id: number
  email: string
  first_name: string
  last_name: string
  billing?: any
  shipping?: any
  meta_data?: Array<{ key: string; value: string }>
}

interface CustomerAddressFormProps {
  customer: Customer | null
  onSave?: (customer: Customer) => void
  onCancel?: () => void
}

export default function CustomerAddressForm({ customer, onSave, onCancel }: CustomerAddressFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Estado del formulario - Datos básicos
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '', // Nombre de la empresa
  })

  // Estado del formulario - Dirección de facturación (billing)
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

  // Estado del formulario - Dirección de envío (shipping)
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

  // Cargar datos del cliente si existe
  useEffect(() => {
    if (customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.billing?.phone || '',
        company: customer.billing?.company || '',
      })

      // Cargar dirección de facturación desde billing o meta_data
      const billingCalle = customer.billing?.calle || 
        customer.meta_data?.find((m: any) => m.key === '_billing_calle')?.value || ''
      const billingNumero = customer.billing?.numero || 
        customer.meta_data?.find((m: any) => m.key === '_billing_numero')?.value || ''
      const billingDpto = customer.billing?.dpto || 
        customer.meta_data?.find((m: any) => m.key === '_billing_dpto')?.value || ''
      const billingBlock = customer.billing?.block || 
        customer.meta_data?.find((m: any) => m.key === '_billing_block')?.value || ''
      const billingCondominio = customer.billing?.condominio || 
        customer.meta_data?.find((m: any) => m.key === '_billing_condominio')?.value || ''

      setBillingAddress({
        calle: billingCalle || customer.billing?.address_1?.split(/\s+(\d+)/)[0] || '',
        numero: billingNumero || customer.billing?.address_1?.match(/\d+/)?.[0] || '',
        dpto: billingDpto || '',
        block: billingBlock || '',
        condominio: billingCondominio || customer.billing?.address_2 || '',
        city: customer.billing?.city || '',
        state: customer.billing?.state || '',
        postcode: customer.billing?.postcode || '',
        country: customer.billing?.country || 'CL',
      })

      // Cargar dirección de envío
      const shippingCalle = customer.shipping?.calle || 
        customer.meta_data?.find((m: any) => m.key === '_shipping_calle')?.value || ''
      const shippingNumero = customer.shipping?.numero || 
        customer.meta_data?.find((m: any) => m.key === '_shipping_numero')?.value || ''
      const shippingDpto = customer.shipping?.dpto || 
        customer.meta_data?.find((m: any) => m.key === '_shipping_dpto')?.value || ''
      const shippingBlock = customer.shipping?.block || 
        customer.meta_data?.find((m: any) => m.key === '_shipping_block')?.value || ''
      const shippingCondominio = customer.shipping?.condominio || 
        customer.meta_data?.find((m: any) => m.key === '_shipping_condominio')?.value || ''

      setShippingAddress({
        calle: shippingCalle || customer.shipping?.address_1?.split(/\s+(\d+)/)[0] || '',
        numero: shippingNumero || customer.shipping?.address_1?.match(/\d+/)?.[0] || '',
        dpto: shippingDpto || '',
        block: shippingBlock || '',
        condominio: shippingCondominio || customer.shipping?.address_2 || '',
        city: customer.shipping?.city || '',
        state: customer.shipping?.state || '',
        postcode: customer.shipping?.postcode || '',
        country: customer.shipping?.country || 'CL',
      })

      // Verificar si las direcciones son iguales
      setUseSameAddress(
        billingCalle === shippingCalle &&
        billingNumero === shippingNumero &&
        billingDpto === shippingDpto &&
        billingBlock === shippingBlock &&
        billingCondominio === shippingCondominio
      )
    }
  }, [customer])

  // Sincronizar shipping con billing si useSameAddress está activado
  useEffect(() => {
    if (useSameAddress) {
      setShippingAddress({ ...billingAddress })
    }
  }, [useSameAddress, billingAddress])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!customer) {
        throw new Error('No hay cliente seleccionado')
      }

      // Construir address_1 y address_2 para WooCommerce
      const billingWooCommerce = buildWooCommerceAddress(billingAddress)
      const shippingWooCommerce = buildWooCommerceAddress(useSameAddress ? billingAddress : shippingAddress)

      // Crear meta_data para direcciones detalladas
      const billingMetaData = createAddressMetaData('billing', billingAddress)
      const shippingMetaData = createAddressMetaData('shipping', useSameAddress ? billingAddress : shippingAddress)

      // Preparar datos para actualizar o crear
      const updateData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        billing: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company || '',
          address_1: billingWooCommerce.address_1,
          address_2: billingWooCommerce.address_2,
          city: billingAddress.city || '',
          state: billingAddress.state || '',
          postcode: billingAddress.postcode || '',
          country: billingAddress.country || 'CL',
        },
        shipping: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          address_1: shippingWooCommerce.address_1,
          address_2: shippingWooCommerce.address_2,
          city: (useSameAddress ? billingAddress : shippingAddress).city || '',
          state: (useSameAddress ? billingAddress : shippingAddress).state || '',
          postcode: (useSameAddress ? billingAddress : shippingAddress).postcode || '',
          country: (useSameAddress ? billingAddress : shippingAddress).country || 'CL',
        },
        meta_data: [...billingMetaData, ...shippingMetaData],
      }

      let response: Response
      let data: any

      // Si el cliente no tiene ID o es 0, crear nuevo cliente
      if (!customer.id || customer.id === 0) {
        response = await fetch('/api/woocommerce/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })
        data = await response.json()
      } else {
        // Actualizar cliente existente
        response = await fetch(`/api/woocommerce/customers/${customer.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })
        data = await response.json()
      }

      if (data.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        if (onSave) {
          onSave(data.data)
        }
      } else {
        throw new Error(data.error || 'Error al guardar datos')
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar datos del cliente')
    } finally {
      setLoading(false)
    }
  }

  const renderAddressFields = (
    address: DetailedAddress,
    setAddress: (addr: DetailedAddress) => void,
    prefix: string
  ) => (
    <>
      <Row>
        <Col md={8}>
          <Form.Group className="mb-3">
            <Form.Label>Calle *</Form.Label>
            <Form.Control
              type="text"
              value={address.calle || ''}
              onChange={(e) => setAddress({ ...address, calle: e.target.value })}
              placeholder="Ej: Av. Providencia"
              required
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Número *</Form.Label>
            <Form.Control
              type="text"
              value={address.numero || ''}
              onChange={(e) => setAddress({ ...address, numero: e.target.value })}
              placeholder="Ej: 123"
              required
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Departamento</Form.Label>
            <Form.Control
              type="text"
              value={address.dpto || ''}
              onChange={(e) => setAddress({ ...address, dpto: e.target.value })}
              placeholder="Ej: 101"
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Block</Form.Label>
            <Form.Control
              type="text"
              value={address.block || ''}
              onChange={(e) => setAddress({ ...address, block: e.target.value })}
              placeholder="Ej: A"
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Condominio</Form.Label>
            <Form.Control
              type="text"
              value={address.condominio || ''}
              onChange={(e) => setAddress({ ...address, condominio: e.target.value })}
              placeholder="Ej: Los Rosales"
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <CommuneAutocomplete
              value={address.city || ''}
              onChange={(value) => setAddress({ ...address, city: value })}
              placeholder="Ej: Las Condes, Santiago, Providencia..."
              required
              label="Ciudad/Comuna *"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Región</Form.Label>
            <Form.Control
              type="text"
              value={address.state || ''}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
              placeholder="Ej: Región Metropolitana"
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label>País</Form.Label>
            <Form.Control
              type="text"
              value={address.country || 'CL'}
              onChange={(e) => setAddress({ ...address, country: e.target.value })}
              required
            />
          </Form.Group>
        </Col>
      </Row>
    </>
  )

  if (!customer) {
    return (
      <Alert variant="info">
        Por favor selecciona un cliente para editar sus datos
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h4" className="d-flex align-items-center">
          <LuMapPin className="me-2" />
          Datos de Dirección - {customer.first_name} {customer.last_name}
        </CardTitle>
      </CardHeader>
      <CardBody>
        <Form onSubmit={handleSubmit}>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess(false)}>
              Datos guardados exitosamente
            </Alert>
          )}

          {/* Datos Básicos */}
          <h5 className="mb-3 text-uppercase bg-light-subtle p-2 border-dashed border rounded border-light">
            Datos Básicos
          </h5>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nombre *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Apellido *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Teléfono</Form.Label>
                <Form.Control
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Nombre de la Empresa</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Ej: Mi Empresa S.A."
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Dirección de Facturación */}
          <h5 className="mb-3 mt-4 text-uppercase bg-light-subtle p-2 border-dashed border rounded border-light">
            Dirección de Facturación
          </h5>
          {renderAddressFields(billingAddress, setBillingAddress, 'billing')}

          {/* Dirección de Envío */}
          <div className="mb-3 mt-4">
            <Form.Check
              type="checkbox"
              id="useSameAddress"
              label="Usar la misma dirección para envío"
              checked={useSameAddress}
              onChange={(e) => setUseSameAddress(e.target.checked)}
            />
          </div>

          {!useSameAddress && (
            <>
              <h5 className="mb-3 mt-4 text-uppercase bg-light-subtle p-2 border-dashed border rounded border-light">
                Dirección de Envío
              </h5>
              {renderAddressFields(shippingAddress, setShippingAddress, 'shipping')}
            </>
          )}

          <div className="d-flex justify-content-end gap-2 mt-4">
            {onCancel && (
              <Button variant="secondary" onClick={onCancel} disabled={loading}>
                Cancelar
              </Button>
            )}
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <LuSave className="me-2" />
                  Guardar Datos
                </>
              )}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}
