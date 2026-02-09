'use client'

import { useState, useEffect } from 'react'
import CargaMasivaPDFsPorColegioModal from '@/app/(admin)/(apps)/crm/listas/components/CargaMasivaPDFsPorColegioModal'

export default function CargaMasivaPDFsModalGlobal() {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Verificar si hay un proceso en curso al montar (al recargar la página)
    const checkAndRestoreModal = () => {
      if (typeof window !== 'undefined') {
        const isProcessing = localStorage.getItem('carga-masiva-pdfs-processing') === 'true'
        const isMinimized = localStorage.getItem('carga-masiva-pdfs-minimized') === 'true'
        const savedProgress = localStorage.getItem('carga-masiva-pdfs-progress')
        
        // Si hay un proceso en curso (procesando o minimizado con progreso), abrir el modal automáticamente
        if (isProcessing || (isMinimized && savedProgress)) {
          setShowModal(true)
          // Si estaba minimizado, remover el flag para que se restaure correctamente
          if (isMinimized) {
            localStorage.removeItem('carga-masiva-pdfs-minimized')
          }
        }
      }
    }

    // Verificar al montar
    checkAndRestoreModal()

    const handleOpenModal = (event: CustomEvent) => {
      // Verificar si hay un proceso en curso antes de abrir
      const isProcessing = localStorage.getItem('carga-masiva-pdfs-processing') === 'true'
      const isMinimized = localStorage.getItem('carga-masiva-pdfs-minimized') === 'true'
      
      // Solo abrir si hay un proceso en curso o si se solicita explícitamente
      if (event.detail?.restore || isProcessing || isMinimized) {
        setShowModal(true)
        // Si estaba minimizado, remover el flag
        if (isMinimized) {
          localStorage.removeItem('carga-masiva-pdfs-minimized')
        }
      }
    }

    window.addEventListener('carga-masiva-pdfs-open-modal', handleOpenModal as EventListener)

    return () => {
      window.removeEventListener('carga-masiva-pdfs-open-modal', handleOpenModal as EventListener)
    }
  }, [])

  const handleHide = () => {
    // Solo cerrar si no hay procesamiento en curso
    const isProcessing = localStorage.getItem('carga-masiva-pdfs-processing') === 'true'
    if (!isProcessing) {
      setShowModal(false)
    } else {
      // Si está procesando, minimizar en lugar de cerrar
      localStorage.setItem('carga-masiva-pdfs-minimized', 'true')
      setShowModal(false)
    }
  }

  const handleSuccess = () => {
    // No recargar automáticamente, dejar que el usuario decida
    setShowModal(false)
  }

  return (
    <CargaMasivaPDFsPorColegioModal
      show={showModal}
      onHide={handleHide}
      onSuccess={handleSuccess}
    />
  )
}
