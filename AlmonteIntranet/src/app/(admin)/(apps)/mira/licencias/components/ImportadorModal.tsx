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
import * as XLSX from 'xlsx'
import strapiClient from '@/lib/strapi/client'

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
      // Leer el archivo
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const data = XLSX.utils.sheet_to_json(worksheet) as any[]

      if (data.length === 0) {
        addLog('error', '❌ El archivo está vacío')
        setIsProcessing(false)
        return
      }

      addLog('info', `📊 Total de filas encontradas: ${data.length}`)
      addLog('info', '🚀 Iniciando procesamiento...')

      let successCount = 0
      let errorCount = 0
      let warningCount = 0

      // Procesar cada fila
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNum = i + 1

        addLog('info', `⏳ Procesando fila ${rowNum}/${data.length}...`)

        try {
          // 1. Limpieza de datos
          const isbnRaw = row.isbn || row.ISBN || row.Isbn
          const codigoRaw = row.Códigos || row.codigos || row.CODIGOS || row['Código'] || row.codigo

          if (!isbnRaw || !codigoRaw) {
            addLog('warning', `⚠️ Fila ${rowNum}: Faltan datos (ISBN o Código)`)
            warningCount++
            continue
          }

          const isbn = String(isbnRaw).trim()
          const codigo = String(codigoRaw).trim()

          if (!isbn || !codigo) {
            addLog('warning', `⚠️ Fila ${rowNum}: ISBN o Código vacío después de limpiar`)
            warningCount++
            continue
          }

          // 2. Buscar libro-mira por ISBN
          try {
            const libroResponse = await strapiClient.get<{
              data: Array<{ id: number | string }>
            }>(`/api/libros-mira?filters[libro][isbn_libro][$eq]=${encodeURIComponent(isbn)}&fields[0]=id`)

            if (!libroResponse.data || libroResponse.data.length === 0) {
              addLog('warning', `⚠️ Fila ${rowNum}: ISBN ${isbn} no encontrado en MIRA`)
              warningCount++
              continue
            }

            const libroMiraId = libroResponse.data[0].id

            // 3. Crear licencia
            try {
              await strapiClient.post('/api/licencias-estudiantes', {
                data: {
                  codigo_activacion: codigo,
                  libro_mira: libroMiraId,
                  activa: true,
                  fecha_vencimiento: '2026-12-31',
                },
              })

              const libroNombre = row.Libro || 'N/A'
              addLog('success', `✅ Fila ${rowNum}: Licencia creada - ${libroNombre} (${codigo})`)
              successCount++
            } catch (createError: any) {
              if (createError.status === 400 || createError.message?.includes('unique') || createError.message?.includes('duplicate')) {
                addLog('error', `❌ Fila ${rowNum}: Código ${codigo} ya existe`)
                errorCount++
              } else {
                addLog('error', `❌ Fila ${rowNum}: Error al crear licencia - ${createError.message || 'Error desconocido'}`)
                errorCount++
              }
            }
          } catch (libroError: any) {
            addLog('error', `❌ Fila ${rowNum}: Error al buscar libro - ${libroError.message || 'Error desconocido'}`)
            errorCount++
          }
        } catch (rowError: any) {
          addLog('error', `❌ Fila ${rowNum}: Error procesando fila - ${rowError.message || 'Error desconocido'}`)
          errorCount++
        }
      }

      // Resumen final
      const finalSummary = {
        total: data.length,
        success: successCount,
        errors: errorCount,
        warnings: warningCount,
      }
      setSummary(finalSummary)

      addLog('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addLog('info', `📊 RESUMEN FINAL:`)
      addLog('info', `   Total procesados: ${finalSummary.total}`)
      addLog('success', `   ✅ Exitosos: ${finalSummary.success}`)
      addLog('warning', `   ⚠️ Advertencias: ${finalSummary.warnings}`)
      addLog('error', `   ❌ Errores: ${finalSummary.errors}`)

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
          <Alert variant="info" className="mt-3">
            <strong>Resumen:</strong> Total: {summary.total} | ✅ Exitosos:{' '}
            {summary.success} | ⚠️ Advertencias: {summary.warnings} | ❌ Errores:{' '}
            {summary.errors}
          </Alert>
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
