'use client'

import { useState } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, Alert, Spinner } from 'react-bootstrap'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { SincronizedOrder } from '@/lib/operaciones/types'

interface ActualizarPedidoModalProps {
  show: boolean
  onHide: () => void
  pedido: SincronizedOrder
  onSuccess: () => void
}

const ESTADOS_JUMPSELLER = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'processing', label: 'Procesando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
]

export default function ActualizarPedidoModal({
  show,
  onHide,
  pedido,
  onSuccess,
}: ActualizarPedidoModalProps) {
  const { showNotification } = useNotificationContext()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    status: pedido.jumpseller_order?.status || '',
    customer_note: pedido.jumpseller_order?.customer_note || '',
    internal_note: pedido.jumpseller_order?.internal_note || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!pedido.jumpseller_order?.id) {
      showNotification('error', 'Error', 'No se puede actualizar: el pedido no tiene ID de JumpSeller')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/operaciones/pedidos/${pedido.jumpseller_order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        showNotification(
          'success',
          'Pedido actualizado',
          'El pedido se actualizó exitosamente en JumpSeller. El cliente recibirá un correo automático.'
        )
        onSuccess()
        onHide()
      } else {
        showNotification('error', 'Error al actualizar', data.error || 'Error desconocido')
      }
    } catch (err: any) {
      showNotification('error', 'Error al actualizar', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle>Actualizar Pedido en JumpSeller</ModalTitle>
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody>
          <Alert variant="info">
            <strong>Nota:</strong> Al actualizar el pedido en JumpSeller, el cliente recibirá un correo automático con la actualización.
          </Alert>

          <div className="mb-3">
            <strong>Pedido JumpSeller:</strong> #{pedido.jumpseller_order?.order_number || pedido.jumpseller_order?.id}
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Estado del Pedido</Form.Label>
            <Form.Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
            >
              <option value="">Seleccionar estado...</option>
              {ESTADOS_JUMPSELLER.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Nota para el Cliente</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.customer_note}
              onChange={(e) => setFormData({ ...formData, customer_note: e.target.value })}
              placeholder="Esta nota será visible para el cliente..."
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Nota Interna</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.internal_note}
              onChange={(e) => setFormData({ ...formData, internal_note: e.target.value })}
              placeholder="Esta nota solo es visible internamente..."
            />
          </Form.Group>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Actualizando...
              </>
            ) : (
              'Actualizar Pedido'
            )}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}


