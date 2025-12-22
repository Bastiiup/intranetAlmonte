'use client'

import { useState, useEffect } from 'react'
import { Container, Alert, Spinner } from 'react-bootstrap'
import CustomerAddressForm from '@/app/tienda/pos/components/CustomerAddressForm'

/**
 * Página pública para que clientes completen sus datos mediante código QR
 * Accesible desde: /cliente/[codigo]
 * El código puede ser el email del cliente o un código único
 */
export default function ClienteFormPage({ params }: { params: Promise<{ codigo: string }> }) {
  const [codigo, setCodigo] = useState<string>('')
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params
      setCodigo(resolvedParams.codigo)
    }
    loadParams()
  }, [params])

  // Buscar cliente por código (email o ID)
  useEffect(() => {
    if (!codigo) return

    const buscarCliente = async () => {
      setLoading(true)
      setError(null)

      try {
        // Intentar buscar por email primero
        const response = await fetch(`/api/woocommerce/customers?search=${encodeURIComponent(codigo)}&per_page=1`)
        const data = await response.json()

        if (data.success && data.data && data.data.length > 0) {
          // Obtener datos completos del cliente
          const customerId = data.data[0].id
          const detailResponse = await fetch(`/api/woocommerce/customers/${customerId}`)
          const detailData = await detailResponse.json()

          if (detailData.success) {
            setCustomer(detailData.data)
          } else {
            setCustomer(data.data[0])
          }
        } else {
          // Si no existe, crear un cliente nuevo con el email como código
          setCustomer({
            id: 0, // Nuevo cliente
            email: codigo.includes('@') ? codigo : `${codigo}@temp.cl`,
            first_name: '',
            last_name: '',
            billing: {},
            shipping: {},
            meta_data: [],
          })
        }
      } catch (err: any) {
        console.error('Error al buscar cliente:', err)
        setError('Error al cargar datos del cliente')
        // Crear cliente nuevo en caso de error
        setCustomer({
          id: 0,
          email: codigo.includes('@') ? codigo : `${codigo}@temp.cl`,
          first_name: '',
          last_name: '',
          billing: {},
          shipping: {},
          meta_data: [],
        })
      } finally {
        setLoading(false)
      }
    }

    buscarCliente()
  }, [codigo])

  const handleSave = async (updatedCustomer: any) => {
    try {
      if (updatedCustomer.id === 0 || !updatedCustomer.id) {
        // Crear nuevo cliente
        const response = await fetch('/api/woocommerce/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: updatedCustomer.email,
            first_name: updatedCustomer.first_name,
            last_name: updatedCustomer.last_name,
            phone: updatedCustomer.billing?.phone || '',
            billing: updatedCustomer.billing,
            shipping: updatedCustomer.shipping,
          }),
        })

        const data = await response.json()
        if (data.success) {
          alert('¡Datos guardados exitosamente! Gracias por completar tu información.')
          setCustomer(data.data)
        } else {
          throw new Error(data.error || 'Error al guardar')
        }
      } else {
        // Actualizar cliente existente
        const response = await fetch(`/api/woocommerce/customers/${updatedCustomer.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first_name: updatedCustomer.first_name,
            last_name: updatedCustomer.last_name,
            email: updatedCustomer.email,
            billing: updatedCustomer.billing,
            shipping: updatedCustomer.shipping,
          }),
        })

        const data = await response.json()
        if (data.success) {
          alert('¡Datos actualizados exitosamente! Gracias por completar tu información.')
          setCustomer(data.data)
        } else {
          throw new Error(data.error || 'Error al actualizar')
        }
      }
    } catch (err: any) {
      console.error('Error al guardar:', err)
      alert('Error al guardar los datos. Por favor, intenta nuevamente.')
    }
  }

  if (loading) {
    return (
      <Container fluid className="py-5">
        <div className="text-center">
          <Spinner animation="border" className="mb-3" />
          <p>Cargando formulario...</p>
        </div>
      </Container>
    )
  }

  return (
    <Container fluid className="py-4" style={{ maxWidth: '900px' }}>
      <div className="mb-4 text-center">
        <h1 className="h3 mb-2">Completa tus Datos</h1>
        <p className="text-muted">
          Por favor, completa la siguiente información para procesar tu pedido correctamente.
        </p>
        {error && (
          <Alert variant="warning" className="mt-3">
            {error}
          </Alert>
        )}
      </div>

      {customer && (
        <CustomerAddressForm
          customer={customer}
          onSave={handleSave}
        />
      )}

      <div className="mt-4 p-3 bg-light rounded text-center">
        <p className="text-muted mb-0 small">
          Tus datos están protegidos y solo se utilizarán para procesar tu pedido.
        </p>
      </div>
    </Container>
  )
}
