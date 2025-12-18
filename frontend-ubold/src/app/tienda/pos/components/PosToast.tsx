'use client'

import ToastContainer from 'react-bootstrap/ToastContainer'
import Toast from 'react-bootstrap/Toast'
import ToastHeader from 'react-bootstrap/ToastHeader'
import ToastBody from 'react-bootstrap/ToastBody'
import type { ToastState } from '../hooks/usePosToast'

interface PosToastProps {
  toast: ToastState
  onClose: () => void
}

export default function PosToast({ toast, onClose }: PosToastProps) {
  return (
    <ToastContainer className="p-3 position-fixed" position="top-end" style={{ zIndex: 9999 }}>
      <Toast
        onClose={onClose}
        show={toast.show}
        delay={3000}
        autohide
        bg={toast.variant}
        className="text-white"
      >
        <ToastHeader className={`bg-${toast.variant} text-white`}>
          <strong className="me-auto">{toast.title}</strong>
        </ToastHeader>
        <ToastBody>{toast.message}</ToastBody>
      </Toast>
    </ToastContainer>
  )
}
