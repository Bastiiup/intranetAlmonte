import { useState, useEffect } from 'react'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Form } from 'react-bootstrap'

type ConfirmStatusModalProps = {
  show: boolean
  onHide: () => void
  onConfirm: () => void
  action: 'approve' | 'reject'
  itemName?: string
}

const ConfirmStatusModal = ({
  show,
  onHide,
  onConfirm,
  action,
  itemName = 'item',
}: ConfirmStatusModalProps) => {
  const [confirmText, setConfirmText] = useState('')
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    if (show) {
      setConfirmText('')
      setIsValid(false)
    }
  }, [show])

  useEffect(() => {
    setIsValid(confirmText.toLowerCase().trim() === 'confirmar')
  }, [confirmText])

  const handleConfirm = () => {
    if (isValid) {
      onConfirm()
      onHide()
    }
  }

  const actionText = action === 'approve' ? 'Aprobar' : 'Rechazar'
  const actionMessage = action === 'approve' 
    ? `¿Estás seguro de que deseas aprobar esta ${itemName}?`
    : `¿Estás seguro de que deseas rechazar esta ${itemName}?`

  return (
    <Modal show={show} onHide={onHide} centered>
      <ModalHeader closeButton>
        <ModalTitle>{actionText} {itemName}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p>{actionMessage}</p>
        <p className="text-muted small mb-3">
          Escribe <strong>"confirmar"</strong> para continuar:
        </p>
        <Form.Control
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Escribe 'confirmar' aquí"
          className={confirmText && !isValid ? 'is-invalid' : ''}
        />
        {confirmText && !isValid && (
          <div className="invalid-feedback d-block">
            Debes escribir exactamente "confirmar"
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onClick={onHide}>
          Cancelar
        </Button>
        <Button 
          variant={action === 'approve' ? 'success' : 'danger'} 
          onClick={handleConfirm}
          disabled={!isValid}
        >
          {actionText}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default ConfirmStatusModal

