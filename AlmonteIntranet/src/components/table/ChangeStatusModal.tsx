'use client'

import { useState } from 'react'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Form, Alert } from 'react-bootstrap'

type ChangeStatusModalProps = {
  show: boolean
  onHide: () => void
  onConfirm: (newStatus: string) => Promise<void>
  currentStatus: string
  productName: string
}

const statusOptions = [
  { value: 'Publicado', label: 'Publicado' },
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Borrador', label: 'Borrador' },
]

const ChangeStatusModal = ({
  show,
  onHide,
  onConfirm,
  currentStatus,
  productName,
}: ChangeStatusModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus)
  const [confirmationText, setConfirmationText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiredText = 'Confirmar'
  const isConfirmationValid = confirmationText.trim() === requiredText
  const canSubmit = selectedStatus !== currentStatus && isConfirmationValid && !isSubmitting

  const handleClose = () => {
    setSelectedStatus(currentStatus)
    setConfirmationText('')
    setError(null)
    onHide()
  }

  const handleSubmit = async () => {
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onConfirm(selectedStatus)
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Error al cambiar el estado del producto')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <ModalHeader closeButton>
        <ModalTitle>Cambiar Estado de Publicación</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="mb-3">
          <p className="mb-2">
            <strong>Producto:</strong> {productName}
          </p>
          <p className="mb-3 text-muted">
            <strong>Estado actual:</strong>{' '}
            <span className={`badge ${
              currentStatus === 'Publicado' ? 'badge-soft-success' :
              currentStatus === 'Pendiente' ? 'badge-soft-warning' :
              'badge-soft-secondary'
            }`}>
              {currentStatus}
            </span>
          </p>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>
            <strong>Nuevo Estado:</strong>
          </Form.Label>
          <Form.Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            disabled={isSubmitting}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {selectedStatus !== currentStatus && (
          <Form.Group className="mb-3">
            <Form.Label>
              <strong>Para confirmar, escribe "{requiredText}":</strong>
            </Form.Label>
            <Form.Control
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={`Escribe "${requiredText}" para confirmar`}
              disabled={isSubmitting}
              className={confirmationText && !isConfirmationValid ? 'is-invalid' : ''}
            />
            {confirmationText && !isConfirmationValid && (
              <Form.Text className="text-danger">
                Debes escribir exactamente "{requiredText}"
              </Form.Text>
            )}
          </Form.Group>
        )}

        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit}>
          {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default ChangeStatusModal

