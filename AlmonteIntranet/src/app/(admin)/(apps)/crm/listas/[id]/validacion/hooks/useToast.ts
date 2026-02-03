/**
 * Hook para mostrar toast notifications usando react-hot-toast
 * Toast minimalistas en la esquina superior derecha
 */

import { useCallback } from 'react'
import hotToast from 'react-hot-toast'

export function useToast() {
  const success = useCallback((title: string, description?: string) => {
    hotToast.success(description ? `${title}: ${description}` : title, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#10b981',
        color: 'white',
        fontWeight: 500,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      iconTheme: {
        primary: 'white',
        secondary: '#10b981',
      },
    })
  }, [])

  const error = useCallback((title: string, description?: string) => {
    hotToast.error(description ? `${title}: ${description}` : title, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#ef4444',
        color: 'white',
        fontWeight: 500,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      iconTheme: {
        primary: 'white',
        secondary: '#ef4444',
      },
    })
  }, [])

  const warning = useCallback((title: string, description?: string) => {
    hotToast(description ? `${title}: ${description}` : title, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: 'white',
        fontWeight: 500,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    })
  }, [])

  const info = useCallback((title: string, description?: string) => {
    hotToast(description ? `${title}: ${description}` : title, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: 'white',
        fontWeight: 500,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    })
  }, [])

  // Confirmación usando SweetAlert2 (mantenemos para diálogos de confirmación)
  const confirm = useCallback(async (options: {
    title: string
    text?: string
    confirmText?: string
    cancelText?: string
    type?: 'warning' | 'question' | 'info'
  }): Promise<boolean> => {
    // Importación dinámica de Swal para confirmaciones
    const Swal = (await import('sweetalert2')).default
    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.type || 'question',
      showCancelButton: true,
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#6c757d',
      confirmButtonText: options.confirmText || 'Confirmar',
      cancelButtonText: options.cancelText || 'Cancelar',
      reverseButtons: true
    })
    return result.isConfirmed
  }, [])

  // Loading toast
  const loading = useCallback((message: string = 'Procesando...') => {
    return hotToast.loading(message, {
      position: 'top-right',
      style: {
        background: '#1f2937',
        color: 'white',
        fontWeight: 500,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    })
  }, [])

  // Dismiss toast
  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      hotToast.dismiss(toastId)
    } else {
      hotToast.dismiss()
    }
  }, [])

  return {
    success,
    error,
    warning,
    info,
    confirm,
    loading,
    dismiss
  }
}

// Export para uso directo sin hook
export const toast = {
  success: (title: string, description?: string) => {
    hotToast.success(description ? `${title}: ${description}` : title, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#10b981',
        color: 'white',
        fontWeight: 500,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      iconTheme: {
        primary: 'white',
        secondary: '#10b981',
      },
    })
  },
  error: (title: string, description?: string) => {
    hotToast.error(description ? `${title}: ${description}` : title, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#ef4444',
        color: 'white',
        fontWeight: 500,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      iconTheme: {
        primary: 'white',
        secondary: '#ef4444',
      },
    })
  },
  warning: (title: string, description?: string) => {
    hotToast(description ? `${title}: ${description}` : title, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: 'white',
        fontWeight: 500,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    })
  },
  info: (title: string, description?: string) => {
    hotToast(description ? `${title}: ${description}` : title, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: 'white',
        fontWeight: 500,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    })
  },
  loading: (message: string = 'Procesando...') => {
    return hotToast.loading(message, {
      position: 'top-right',
      style: {
        background: '#1f2937',
        color: 'white',
        fontWeight: 500,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    })
  },
  dismiss: (toastId?: string) => {
    if (toastId) {
      hotToast.dismiss(toastId)
    } else {
      hotToast.dismiss()
    }
  }
}
