/**
 * Modal para importar productos desde Excel
 * Versión simplificada - puede expandirse después
 */

'use client'

import { Modal } from 'react-bootstrap'

interface ExcelImportModalProps {
  show: boolean
  onHide: () => void
  onImport: (file: File) => Promise<void>
  loading?: boolean
}

export default function ExcelImportModal({
  show,
  onHide,
  onImport,
  loading = false
}: ExcelImportModalProps) {
  // TODO: Implementar importación desde Excel
  // Por ahora, solo estructura básica
  
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Importar desde Excel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted">Funcionalidad de importación desde Excel - Por implementar</p>
      </Modal.Body>
      <Modal.Footer>
        <button onClick={onHide}>Cerrar</button>
      </Modal.Footer>
    </Modal>
  )
}
