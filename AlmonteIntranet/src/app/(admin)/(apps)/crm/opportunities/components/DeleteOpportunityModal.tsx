'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Alert } from 'react-bootstrap'
import { LuTrash2, LuX } from 'react-icons/lu'
import type { OpportunitiesType } from '@/app/(admin)/(apps)/crm/types'

interface DeleteOpportunityModalProps {
  show: boolean
  onHide: () => void
  opportunity: OpportunitiesType | null
  onSuccess?: () => void
}

const DeleteOpportunityModal = ({ show, onHide, opportunity, onSuccess }: DeleteOpportunityModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!opportunity?.realId) {
      setError('No se pudo obtener el ID de la oportunidad')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/oportunidades/${opportunity.realId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Error al eliminar oportunidad'
        throw new Error(errorMessage)
      }

      if (onSuccess) {
        onSuccess()
      }
      onHide()
    } catch (err: any) {
      console.error('Error al eliminar oportunidad:', err)
      setError(err.message || 'Error al eliminar oportunidad')
    } finally {
      setLoading(false)
    }
  }

  if (!opportunity) return null

  return (
    <Modal show={show} onHide={onHide} centered>
      <ModalHeader closeButton>
        <ModalTitle>Eliminar Oportunidad</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <p>¿Estás seguro de que deseas eliminar la oportunidad <strong>{opportunity.productName}</strong>?</p>
        <p className="text-muted small">Esta acción no se puede deshacer.</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          <LuX className="me-1" />
          Cancelar
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={loading}>
          <LuTrash2 className="me-1" />
          {loading ? 'Eliminando...' : 'Eliminar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default DeleteOpportunityModal
