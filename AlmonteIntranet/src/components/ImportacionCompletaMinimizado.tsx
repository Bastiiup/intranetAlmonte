'use client'

import { useState, useEffect, useRef } from 'react'
import { Button, Spinner, ProgressBar, Badge } from 'react-bootstrap'
import { LuMaximize2, LuCircleCheck } from 'react-icons/lu'
import { useRouter } from 'next/navigation'

export default function ImportacionCompletaMinimizado() {
  const router = useRouter()
  const [showMinimized, setShowMinimized] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const hasNotifiedRef = useRef(false)

  // Solicitar permiso de notificaciones al montar
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission)
      })
    } else if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    const checkPersistedProcess = () => {
      if (typeof window !== 'undefined') {
        const isMinimized = localStorage.getItem('importacion-completa-minimized') === 'true'
        const isProcessing = localStorage.getItem('importacion-completa-processing') === 'true'
        const savedProgress = localStorage.getItem('importacion-completa-progress')
        
        // Si estaba procesando pero ya no está, significa que terminó
        if (showMinimized && !isProcessing && savedProgress && parseInt(savedProgress, 10) === 100) {
          setIsComplete(true)
          
          // Mostrar notificación solo una vez
          if (!hasNotifiedRef.current && notificationPermission === 'granted') {
            hasNotifiedRef.current = true
            mostrarNotificacion(
              '✅ Importación Completada',
              'La importación ha finalizado. Haz clic para ver los resultados.',
              'success'
            )
          }
        } else if (isMinimized && isProcessing) {
          setShowMinimized(true)
          setIsComplete(false)
          hasNotifiedRef.current = false
          if (savedProgress) {
            setProgress(parseInt(savedProgress, 10))
          }
        } else {
          setShowMinimized(false)
          setIsComplete(false)
          hasNotifiedRef.current = false
        }
      }
    }

    checkPersistedProcess()
    
    // Verificar periódicamente (cada 2 segundos) para actualizar el progreso
    const interval = setInterval(checkPersistedProcess, 2000)
    
    return () => clearInterval(interval)
  }, [showMinimized, notificationPermission])

  const mostrarNotificacion = (titulo: string, mensaje: string, tipo: 'success' | 'error' | 'info' = 'info') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const icon = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️'
      const notification = new Notification(`${icon} ${titulo}`, {
        body: mensaje,
        icon: '/favicon.ico',
        tag: 'importacion-completa-minimizado',
        requireInteraction: false,
      })

      notification.onclick = () => {
        window.focus()
        handleRestore()
        notification.close()
      }

      // Cerrar automáticamente después de 8 segundos
      setTimeout(() => {
        notification.close()
      }, 8000)
    }
  }

  const handleRestore = () => {
    // Navegar a la página de listas y abrir el modal
    router.push('/crm/listas')
    // El modal se abrirá automáticamente cuando se detecte el estado minimizado
    if (typeof window !== 'undefined') {
      // Marcar que queremos abrir el modal al llegar a la página
      localStorage.setItem('importacion-completa-restore-modal', 'true')
      // Si está completo, limpiar el estado minimizado
      if (isComplete) {
        localStorage.removeItem('importacion-completa-minimized')
        localStorage.removeItem('importacion-completa-processing')
        localStorage.removeItem('importacion-completa-progress')
      }
    }
  }

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('importacion-completa-minimized')
      localStorage.removeItem('importacion-completa-processing')
      localStorage.removeItem('importacion-completa-progress')
    }
    setShowMinimized(false)
    setIsComplete(false)
  }

  if (!showMinimized) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1050,
        backgroundColor: isComplete ? '#d1e7dd' : 'white',
        border: `1px solid ${isComplete ? '#badbcc' : '#dee2e6'}`,
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '12px 16px',
        minWidth: '300px',
        maxWidth: '400px',
      }}
    >
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center gap-2">
          {isComplete ? (
            <>
              <LuCircleCheck size={20} className="text-success" />
              <strong className="text-success">Importación Completada</strong>
            </>
          ) : (
            <>
              <Spinner size="sm" />
              <strong>Importación en Progreso</strong>
            </>
          )}
        </div>
        <div className="d-flex align-items-center gap-1">
          <Button
            variant="link"
            size="sm"
            onClick={handleRestore}
            className="p-0"
            title={isComplete ? "Ver resultados" : "Abrir ventana de importación"}
          >
            <LuMaximize2 size={18} />
          </Button>
          {isComplete && (
            <Button
              variant="link"
              size="sm"
              onClick={handleClose}
              className="p-0 text-muted"
              title="Cerrar"
            >
              ×
            </Button>
          )}
        </div>
      </div>
      <div className="mb-2">
        <ProgressBar 
          now={isComplete ? 100 : progress} 
          label={`${isComplete ? 100 : progress}%`}
          variant={isComplete ? 'success' : undefined}
        />
      </div>
      <small className={isComplete ? 'text-success' : 'text-muted'}>
        {isComplete 
          ? '✅ Proceso finalizado exitosamente. Haz clic para ver los resultados.'
          : 'Procesando grupos... Puedes continuar trabajando en otra pestaña.'
        }
      </small>
    </div>
  )
}
