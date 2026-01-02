'use client'

import { useState, useEffect } from 'react'
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'
import { buildWooCommerceAddress, type DetailedAddress } from '@/lib/woocommerce/address-utils'
import CommuneAutocomplete from './CommuneAutocomplete'

interface GuestAddressModalProps {
  show: boolean
  deliveryType: 'shipping' | 'pickup'
  onSave: (billingData: any, shippingData: any) => void
  onCancel: () => void
}

export default function GuestAddressModal({ show, deliveryType, onSave, onCancel }: GuestAddressModalProps) {
  // Estado del formulario - Datos básicos
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
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
  const [error, setError] = useState<string | null>(null)

  // Limpiar formulario al cerrar
  useEffect(() => {
    if (!show) {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
      })
      setBillingAddress({
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
      setShippingAddress({
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
      setUseSameAddress(true)
      setError(null)
    }
  }, [show])

  // Sincronizar shipping con billing si useSameAddress está activado
  useEffect(() => {
    if (useSameAddress) {
      setShippingAddress({ ...billingAddress })
    }
  }, [useSameAddress, billingAddress])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validaciones básicas
    if (!formData.first_name.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    if (!formData.email.trim()) {
      setError('El email es obligatorio')
      return
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      setError('El email no tiene un formato válido')
      return
    }

    // Si es envío, validar dirección de envío
    if (deliveryType === 'shipping') {
      if (!billingAddress.calle || !billingAddress.numero || !billingAddress.city) {
        setError('Para envío a domicilio, la dirección de facturación es obligatoria (calle, número y ciudad)')
        return
      }
      if (!useSameAddress) {
        if (!shippingAddress.calle || !shippingAddress.numero || !shippingAddress.city) {
          setError('La dirección de envío es obligatoria (calle, número y ciudad)')
          return
        }
      }
    }

    // Construir address_1 y address_2 para WooCommerce
    const billingWooCommerce = buildWooCommerceAddress(billingAddress)
    const shippingWooCommerce = buildWooCommerceAddress(useSameAddress ? billingAddress : shippingAddress)

    // Preparar datos de billing
    const billingData = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      company: formData.company.trim(),
      address_1: billingWooCommerce.address_1,
      address_2: billingWooCommerce.address_2,
      city: billingAddress.city || '',
      state: billingAddress.state || '',
      postcode: billingAddress.postcode || '',
      country: billingAddress.country || 'CL',
      // Campos detallados para meta_data
      calle: billingAddress.calle,
      numero: billingAddress.numero,
      dpto: billingAddress.dpto,
      block: billingAddress.block,
      condominio: billingAddress.condominio,
    }

    // Preparar datos de shipping
    const shippingData = deliveryType === 'pickup' ? {
      first_name: '',
      last_name: '',
      address_1: '',
      address_2: '',
      city: '',
      state: '',
      postcode: '',
      country: 'CL',
    } : {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      address_1: shippingWooCommerce.address_1,
      address_2: shippingWooCommerce.address_2,
      city: (useSameAddress ? billingAddress : shippingAddress).city || '',
      state: (useSameAddress ? billingAddress : shippingAddress).state || '',
      postcode: (useSameAddress ? billingAddress : shippingAddress).postcode || '',
      country: (useSameAddress ? billingAddress : shippingAddress).country || 'CL',
      // Campos detallados para meta_data
      calle: (useSameAddress ? billingAddress : shippingAddress).calle,
      numero: (useSameAddress ? billingAddress : shippingAddress).numero,
      dpto: (useSameAddress ? billingAddress : shippingAddress).dpto,
      block: (useSameAddress ? billingAddress : shippingAddress).block,
      condominio: (useSameAddress ? billingAddress : shippingAddress).condominio,
    }

    onSave(billingData, shippingData)
  }

  const renderAddressFields = (
    address: DetailedAddress,
    setAddress: (addr: DetailedAddress) => void,
    label: string
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
    </>
  )

  return (
    <Modal show={show} onHide={onCancel} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Datos de Facturación y Envío (Cliente Invitado)</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
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
                <Form.Label>Apellido</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
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
            Dirección de Facturación {deliveryType === 'shipping' ? '*' : ''}
          </h5>
          {renderAddressFields(billingAddress, setBillingAddress, 'billing')}

          {/* Dirección de Envío (solo si es envío) */}
          {deliveryType === 'shipping' && (
            <>
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
                    Dirección de Envío *
                  </h5>
                  {renderAddressFields(shippingAddress, setShippingAddress, 'shipping')}
                </>
              )}
            </>
          )}

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="secondary" onClick={onCancel}>
              <LuX className="me-2" />
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              <LuSave className="me-2" />
              Continuar con el Pedido
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  )
}

