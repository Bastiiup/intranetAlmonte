'use client'

import { useState } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Alert, Spinner } from 'react-bootstrap'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { SincronizedOrder } from '@/lib/operaciones/types'

interface SincronizarPedidoModalProps {
  show: boolean
  onHide: () => void
  pedido: SincronizedOrder
  onSuccess: () => void
}

export default function SincronizarPedidoModal({
  show,
  onHide,
  pedido,
  onSuccess,
}: SincronizarPedidoModalProps) {
  const { showNotification } = useNotificationContext()
  const [loading, setLoading] = useState(false)

  const handleSync = async () => {
    const orderId = pedido.jumpseller_order?.id || pedido.wearecloud_order?.id || pedido.id
    
    setLoading(true)
    try {
      const response = await fetch(`/api/operaciones/pedidos/${orderId}/sincronizar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true }),
      })

      const data = await response.json()

      if (data.success) {
        showNotification('success', 'Pedido sincronizado', 'El pedido se sincronizó exitosamente desde WeareCloud')
        onSuccess()
        onHide()
      } else {
        showNotification('error', 'Error al sincronizar', data.error || 'Error desconocido')
      }
    } catch (err: any) {
      showNotification('error', 'Error al sincronizar', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide}>
      <ModalHeader closeButton>
        <ModalTitle>Sincronizar Pedido desde WeareCloud</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <Alert variant="info">
          Esta acción obtendrá la información más reciente del pedido desde WeareCloud y la comparará con JumpSeller.
        </Alert>

        <div className="mb-3">
          <strong>Pedido WeareCloud:</strong>{' '}
          {pedido.wearecloud_order?.order_number || 'No disponible'}
        </div>
        <div className="mb-3">
          <strong>Pedido JumpSeller:</strong>{' '}
          {pedido.jumpseller_order?.order_number || pedido.jumpseller_order?.id || 'No disponible'}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSync} disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Sincronizando...
            </>
          ) : (
            'Sincronizar'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}


