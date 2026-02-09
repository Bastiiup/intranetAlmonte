'use client'

import { useState, useEffect } from 'react'
import { Button, Alert, Spinner, ProgressBar } from 'react-bootstrap'
import { LuMaximize2 } from 'react-icons/lu'
import { useRouter } from 'next/navigation'

export default function CargaMasivaPDFsMinimized() {
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [colegio, setColegio] = useState<{ label: string; rbd?: number } | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Verificar si hay un proceso en curso
    const checkProcess = () => {
      if (typeof window !== 'undefined') {
        const isProcessing = localStorage.getItem('carga-masiva-pdfs-processing') === 'true'
        const isMinimized = localStorage.getItem('carga-masiva-pdfs-minimized') === 'true'
        const savedProgress = localStorage.getItem('carga-masiva-pdfs-progress')
        const savedColegio = localStorage.getItem('carga-masiva-pdfs-colegio')

        const progressValue = savedProgress ? parseInt(savedProgress, 10) : 0
        
        // Verificar si el procesamiento terminó
        // Se considera completado si:
        // 1. No está procesando Y el progreso es 100%
        // 2. O no hay datos de procesamiento en localStorage (todo limpio)
        const hasNoData = !isProcessing && !savedProgress && !isMinimized
        const isCompleted = (!isProcessing && progressValue >= 100) || hasNoData
        
        if (isCompleted || hasNoData) {
          // Si el procesamiento terminó o no hay datos, ocultar inmediatamente
          setIsVisible(false)
          return
        }
        
        // Mostrar solo si está procesando activamente O está minimizado con progreso < 100
        const shouldShow = (isMinimized && (isProcessing || (savedProgress && progressValue < 100))) || (isProcessing && savedProgress && progressValue < 100)
        
        if (shouldShow) {
          setIsVisible(true)
          setProgress(progressValue)
          if (savedColegio) {
            try {
              setColegio(JSON.parse(savedColegio))
            } catch (e) {
              setColegio(null)
            }
          }
        } else {
          setIsVisible(false)
        }
      }
    }

    // Verificar al montar
    checkProcess()

    // Escuchar cambios en localStorage
    const interval = setInterval(checkProcess, 500) // Actualizar cada 500ms para mejor respuesta

    // Escuchar eventos personalizados
    const handleStorageChange = () => checkProcess()
    const handleUpdate = () => checkProcess()
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('carga-masiva-pdfs-update', handleUpdate)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('carga-masiva-pdfs-update', handleUpdate)
    }
  }, [])

  const handleRestore = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('carga-masiva-pdfs-minimized')
      // Disparar evento para que el modal se abra globalmente
      window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-open-modal', {
        detail: { restore: true }
      }))
    }
  }

  if (!isVisible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1050,
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '12px 16px',
        minWidth: '300px',
        maxWidth: '400px',
      }}
    >
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center gap-2">
          <Spinner size="sm" />
          <strong>Carga Masiva en Progreso</strong>
        </div>
        <Button
          variant="link"
          size="sm"
          onClick={handleRestore}
          className="p-0"
          title="Restaurar ventana"
        >
          <LuMaximize2 size={18} />
        </Button>
      </div>
      <div className="mb-2">
        <ProgressBar 
          now={progress} 
          label={`${progress}%`}
          variant={progress >= 100 ? 'success' : 'primary'}
          animated={progress < 100}
        />
      </div>
      {colegio && (
        <Alert variant="primary" className="mb-2" style={{ fontSize: '0.95rem' }}>
          <div className="d-flex align-items-center justify-content-center gap-3">
            <div>
              <strong>🏫 Colegio:</strong> <span className="fw-bold">{colegio.label}</span>
            </div>
            {colegio.rbd && (
              <div>
                <strong>🔢 RBD:</strong> <span className="fw-bold">{colegio.rbd}</span>
              </div>
            )}
          </div>
        </Alert>
      )}
      <small className="text-muted">
        Procesando PDFs... Puedes continuar trabajando en otra pestaña.
      </small>
    </div>
  )
}
