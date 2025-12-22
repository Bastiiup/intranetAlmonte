'use client'

import { useState, useEffect } from 'react'
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap'
import CustomerAddressForm from '@/app/tienda/pos/components/CustomerAddressForm'

interface Customer {
  id: number
  email: string
  first_name: string
  last_name: string
  billing?: any
  shipping?: any
  meta_data?: Array<{ key: string; value: string }>
}

export default function MiCuentaPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener ID del cliente desde la sesión o URL
  // Por ahora, usaremos un parámetro de URL o localStorage
  useEffect(() => {
    const loadCustomer = async () => {
      try {
        // Obtener customer_id desde localStorage o parámetros
        // En producción, esto debería venir de la sesión autenticada
        const customerId = localStorage.getItem('customer_id') || 
                          new URLSearchParams(window.location.search).get('id')

        if (!customerId) {
          setError('No se encontró ID de cliente. Por favor, inicia sesión.')
          setLoading(false)
          return
        }

        const response = await fetch(`/api/woocommerce/customers/${customerId}`)
        const data = await response.json()

        if (data.success) {
          setCustomer(data.data)
        } else {
          setError(data.error || 'Error al cargar datos del cliente')
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con la API')
      } finally {
        setLoading(false)
      }
    }

    loadCustomer()
  }, [])

  const handleSave = (updatedCustomer: Customer) => {
    setCustomer(updatedCustomer)
    // Mostrar mensaje de éxito
    alert('Datos guardados exitosamente')
  }

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" />
          <p className="mt-3">Cargando datos...</p>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="py-5">
      <Row>
        <Col md={12}>
          <h1 className="mb-4">Mi Cuenta - Datos de Dirección</h1>
          <p className="text-muted mb-4">
            Completa tus datos de dirección para que se rellenen automáticamente al realizar compras.
          </p>
          <CustomerAddressForm
            customer={customer}
            onSave={handleSave}
          />
        </Col>
      </Row>
    </Container>
  )
}
