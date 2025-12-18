/**
 * Hook para mostrar notificaciones Toast en el POS
 */

'use client'

import { useState, useCallback } from 'react'

export type ToastVariant = 'success' | 'danger' | 'warning' | 'info' | 'primary'

export interface ToastState {
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

  return {
    toast,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
  }
}
