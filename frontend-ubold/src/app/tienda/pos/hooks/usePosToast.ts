/**
 * Hook para mostrar notificaciones Toast en el POS
 */

'use client'

import { useState, useCallback } from 'react'
import { ToastContainer, Toast } from 'react-bootstrap'

export type ToastVariant = 'success' | 'danger' | 'warning' | 'info' | 'primary'

interface ToastState {
  show: boolean
  title: string
  message: string
  variant: ToastVariant
}

export function usePosToast() {
  const [toast, setToast] = useState<ToastState>({
    show: false,
    title: '',
    message: '',
    variant: 'info',
  })

  const showToast = useCallback((
    message: string,
    variant: ToastVariant = 'info',
    title?: string
  ) => {
    setToast({
      show: true,
      title: title || (variant === 'success' ? 'Éxito' : variant === 'danger' ? 'Error' : variant === 'warning' ? 'Advertencia' : 'Información'),
      message,
      variant,
    })
  }, [])

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }))
  }, [])

  // Helpers específicos
  const showSuccess = useCallback((message: string, title?: string) => {
    showToast(message, 'success', title)
  }, [showToast])

  const showError = useCallback((message: string, title?: string) => {
    showToast(message, 'danger', title)
  }, [showToast])

  const showWarning = useCallback((message: string, title?: string) => {
    showToast(message, 'warning', title)
  }, [showToast])

  const showInfo = useCallback((message: string, title?: string) => {
    showToast(message, 'info', title)
  }, [showToast])

  const ToastComponent = () => (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
      <Toast
        onClose={hideToast}
        show={toast.show}
        delay={3000}
        autohide
        bg={toast.variant}
        className="text-white"
      >
        <Toast.Header className={`bg-${toast.variant} text-white`}>
          <strong className="me-auto">{toast.title}</strong>
        </Toast.Header>
        <Toast.Body>{toast.message}</Toast.Body>
      </Toast>
    </ToastContainer>
  )

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
    ToastComponent,
  }
}
