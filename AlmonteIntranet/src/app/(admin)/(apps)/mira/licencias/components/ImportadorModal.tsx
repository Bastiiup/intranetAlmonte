'use client'

import { useState, useRef } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
} from 'react-bootstrap'
import { LuUpload, LuX } from 'react-icons/lu'

interface ImportadorModalProps {
  show: boolean
  onHide: () => void
  onImportComplete?: () => void
}

interface LogEntry {
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: Date
}

export default function ImportadorModal({
  show,
  onHide,
  onImportComplete,
}: ImportadorModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [summary, setSummary] = useState<{
    total: number
    success: number
    errors: number
    warnings: number
    librosNoEncontrados?: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const addLog = (type: LogEntry['type'], message: string) => {
    const newLog: LogEntry = {
      type,
      message,
      timestamp: new Date(),
    }
    setLogs((prev) => [...prev, newLog])
    // Auto-scroll al final
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        setFile(selectedFile)
        addLog('info', `📄 Archivo seleccionado: ${selectedFile.name}`)
      } else {
        addLog('error', '❌ Formato no válido. Solo se aceptan .csv, .xlsx o .xls')
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop()?.toLowerCase()
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        setFile(droppedFile)
        addLog('info', `📄 Archivo seleccionado: ${droppedFile.name}`)
      } else {
        addLog('error', '❌ Formato no válido. Solo se aceptan .csv, .xlsx o .xls')
      }
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const processFile = async () => {
    if (!file) {
      addLog('error', '❌ No hay archivo seleccionado')
      return
    }

    setIsProcessing(true)
    setLogs([])
    setSummary(null)

    try {
      // Subir archivo a la API del servidor
      const formData = new FormData()
      formData.append('file', file)

      addLog('info', '📤 Subiendo archivo al servidor...')

      const response = await fetch('/api/mira/importar', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al procesar archivo')
      }

      // Mostrar logs recibidos del servidor
      if (result.logs && Array.isArray(result.logs)) {
        result.logs.forEach((log: LogEntry) => {
          addLog(log.type, log.message)
        })
      }

      // Mostrar resumen
      if (result.summary) {
        setSummary(result.summary)
      }

      if (onImportComplete) {
        onImportComplete()
      }
    } catch (error: any) {
      addLog('error', `❌ Error fatal al procesar archivo: ${error.message || 'Error desconocido'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      setFile(null)
      setLogs([])
      setSummary(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onHide()
    }
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return '#28a745'
      case 'warning':
        return '#ffc107'
      case 'error':
        return '#dc3545'
      default:
        return '#6c757d'
    }
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <ModalHeader closeButton={!isProcessing}>
        <ModalTitle>Importar Licencias MIRA</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {/* Dropzone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{
            border: '2px dashed #dee2e6',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: file ? '#f8f9fa' : '#fff',
            cursor: 'pointer',
            transition: 'all 0.3s',
          }}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />
          {file ? (
            <div>
              <LuUpload size={48} color="#28a745" />
              <p className="mt-3 mb-0">
                <strong>{file.name}</strong>
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                disabled={isProcessing}
              >
                <LuX /> Cambiar archivo
              </Button>
            </div>
          ) : (
            <div>
              <LuUpload size={48} color="#6c757d" />
              <p className="mt-3 mb-0">
                <strong>Arrastra un archivo aquí</strong>
              </p>
              <p className="text-muted mb-0">o haz clic para seleccionar</p>
              <p className="text-muted small mt-2">
                Formatos aceptados: .csv, .xlsx, .xls
              </p>
            </div>
          )}
        </div>

        {/* Resumen */}
        {summary && (
          <div className="mt-3">
            <Alert variant="info">
              <strong>Resumen:</strong> Total: {summary.total} | ✅ Exitosos:{' '}
              {summary.success} | ⚠️ Advertencias: {summary.warnings} | ❌ Errores:{' '}
              {summary.errors}
            </Alert>
            
            {/* Recuadro de libros no encontrados */}
            {summary.librosNoEncontrados && summary.librosNoEncontrados.length > 0 && (
              <Alert variant="warning" className="mt-2">
                <strong>⚠️ Libros no encontrados en MIRA:</strong>
                <p className="mb-2">
                  Los siguientes ISBNs no están activados en MIRA. Actívalos primero antes de importar sus licencias:
                </p>
                <ul className="mb-0">
                  {summary.librosNoEncontrados.map((isbn, idx) => (
                    <li key={idx}><code>{isbn}</code></li>
                  ))}
                </ul>
                <p className="mt-2 mb-0 small">
                  <strong>Total:</strong> {summary.librosNoEncontrados.length} ISBN(s) único(s) no encontrado(s)
                </p>
              </Alert>
            )}
          </div>
        )}

        {/* Consola de logs */}
        {logs.length > 0 && (
          <div className="mt-3">
            <h6>Consola de Procesamiento:</h6>
            <div
              style={{
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                padding: '1rem',
                borderRadius: '4px',
                maxHeight: '400px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: '1.5',
              }}
            >
              {logs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    color: getLogColor(log.type),
                    marginBottom: '0.25rem',
                  }}
                >
                  {log.message}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isProcessing}>
          {isProcessing ? 'Procesando...' : 'Cerrar'}
        </Button>
        <Button
          variant="primary"
          onClick={processFile}
          disabled={!file || isProcessing}
        >
          {isProcessing ? 'Procesando...' : 'Importar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
