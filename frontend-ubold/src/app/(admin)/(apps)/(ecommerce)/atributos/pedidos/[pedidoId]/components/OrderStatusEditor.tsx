'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, Form, FormGroup, FormLabel, FormControl, Button, Alert } from 'react-bootstrap'
import { LuSave } from 'react-icons/lu'

interface OrderStatusEditorProps {
  pedidoId: string
  currentStatus: string
}

// Función para mapear estado de inglés (Strapi) a español (frontend)
const mapEstadoFromStrapi = (strapiStatus: string): string => {
  const mapping: Record<string, string> = {
    'pending': 'pendiente',
    'processing': 'procesando',
    'on-hold': 'en_espera',
    'completed': 'completado',
    'cancelled': 'cancelado',
    'refunded': 'reembolsado',
    'failed': 'fallido',
    'auto-draft': 'pendiente',
    'checkout-draft': 'pendiente',
  }
  
  const statusLower = strapiStatus.toLowerCase().trim()
  return mapping[statusLower] || strapiStatus
}

// Función para mapear estado de español (frontend) a inglés (Strapi)
const mapEstadoToStrapi = (frontendStatus: string): string => {
  const mapping: Record<string, string> = {
    'pendiente': 'pending',
    'procesando': 'processing',
    'en_espera': 'on-hold',
    'completado': 'completed',
    'cancelado': 'cancelled',
    'reembolsado': 'refunded',
    'fallido': 'failed',
  }
  
  const statusLower = frontendStatus.toLowerCase().trim()
  return mapping[statusLower] || frontendStatus
}

const OrderStatusEditor = ({ pedidoId, currentStatus }: OrderStatusEditorProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Mapear estado actual de inglés a español para el select
  const estadoActual = mapEstadoFromStrapi(currentStatus)
  const [selectedEstado, setSelectedEstado] = useState(estadoActual)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Mapear estado de español a inglés antes de enviar
      const estadoParaEnviar = mapEstadoToStrapi(selectedEstado)
      
      const response = await fetch(`/api/tienda/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            estado: estadoParaEnviar,
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el estado')
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar el estado')
      }

      setSuccess(true)
      // Actualizar el estado actual para reflejar el cambio
      setSelectedEstado(selectedEstado)
      
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err: any) {
      console.error('[OrderStatusEditor] Error al actualizar estado:', err)
      setError(err.message || 'Error al actualizar el estado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Cambiar Estado del Pedido</h5>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            ¡Estado actualizado exitosamente! Recargando...
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <FormLabel className="fw-semibold">Estado Actual</FormLabel>
            <FormControl
              as="select"
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              disabled={loading}
            >
              <option value="pendiente">Pendiente</option>
              <option value="procesando">Procesando</option>
              <option value="en_espera">En Espera</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
              <option value="reembolsado">Reembolsado</option>
              <option value="fallido">Fallido</option>
            </FormControl>
            <small className="text-muted">
              Estado actual: <strong>{estadoActual}</strong>
            </small>
          </FormGroup>

          <div className="d-flex gap-2 mt-3">
            <Button
              type="submit"
              variant="primary"
              disabled={loading || selectedEstado === estadoActual}
            >
              <LuSave className="fs-sm me-2" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

export default OrderStatusEditor

