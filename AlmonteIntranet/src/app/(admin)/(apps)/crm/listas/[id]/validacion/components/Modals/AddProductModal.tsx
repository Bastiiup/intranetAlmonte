/**
 * Modal para agregar productos manualmente
 * Versión simplificada - puede expandirse después
 */

'use client'

import { Modal } from 'react-bootstrap'

interface AddProductModalProps {
  show: boolean
  onHide: () => void
  onAdd: (data: any) => Promise<void>
  loading?: boolean
}

export default function AddProductModal({
  show,
  onHide,
  onAdd,
  loading = false
}: AddProductModalProps) {
  // TODO: Implementar formulario completo de agregar producto
  // Por ahora, solo estructura básica
  
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Agregar Producto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted">Funcionalidad de agregar producto - Por implementar</p>
      </Modal.Body>
      <Modal.Footer>
        <button onClick={onHide}>Cerrar</button>
      </Modal.Footer>
    </Modal>
  )
}
