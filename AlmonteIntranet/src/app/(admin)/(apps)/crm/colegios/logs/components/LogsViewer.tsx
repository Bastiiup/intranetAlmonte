'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardBody, CardTitle, Button, Alert, Badge, Form, InputGroup } from 'react-bootstrap'
import { LuRefreshCw, LuTrash2, LuSearch, LuDownload, LuFileText, LuFilter } from 'react-icons/lu'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface LogEntry {
  timestamp: string
  level: 'log' | 'error' | 'warn'
  message: string
  data?: any
}

export default function LogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 segundos
  const logsEndRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      // Obtener logs del servidor
      const response = await fetch('/api/crm/colegios/logs?t=' + Date.now())
      
      // Verificar que la respuesta sea JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('[LogsViewer] Respuesta no es JSON:', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          preview: text.substring(0, 200),
        })
        setError(`Error: El servidor devolvió ${contentType || 'text/html'} en lugar de JSON. Status: ${response.status}`)
        return
      }

      const result = await response.json()

      if (result.success) {
        // El endpoint devuelve { success: true, logs: [...] } o { success: true, data: { logs: [...] } }
        const logsArray = result.logs || result.data?.logs || []
        setLogs(logsArray)
      } else {
        setError(result.error || 'No se pudieron obtener los logs')
      }
    } catch (err: any) {
      console.error('[LogsViewer] Error al obtener logs:', err)
      setError(err.message || 'Error al obtener logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchLogs()
      }, refreshInterval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, refreshInterval])

  useEffect(() => {
    // Auto-scroll al final cuando hay nuevos logs
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const clearLogs = async () => {
    try {
      const response = await fetch('/api/crm/colegios/logs', {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        setLogs([])
      }
    } catch (err: any) {
      setError(err.message || 'Error al limpiar logs')
    }
  }

  const exportLogs = () => {
    const logText = logs
      .map((log) => {
        const timestamp = format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: es })
        const level = log.level.toUpperCase().padEnd(5)
        const message = log.message
        const data = log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''
        return `[${timestamp}] ${level} ${message}${data}`
      })
      .join('\n\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-importacion-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredLogs = logs.filter((log) => {
    if (!filter) return true
    const searchTerm = filter.toLowerCase()
    return (
      log.message.toLowerCase().includes(searchTerm) ||
      log.level.toLowerCase().includes(searchTerm) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm))
    )
  })

  const logCounts = {
    total: logs.length,
    log: logs.filter((l) => l.level === 'log').length,
    error: logs.filter((l) => l.level === 'error').length,
    warn: logs.filter((l) => l.level === 'warn').length,
  }

  // Verificar si hay un proceso activo
  const ultimoLog = logs.length > 0 ? logs[0] : null
  const ultimoLogTime = ultimoLog ? new Date(ultimoLog.timestamp).getTime() : 0
  const tiempoDesdeUltimoLog = Date.now() - ultimoLogTime
  const hayProcesoActivo = ultimoLog && 
    ultimoLog.message.includes('import-niveles-asignaturas') && 
    !ultimoLog.message.includes('IMPORTACIÓN COMPLETADA') &&
    tiempoDesdeUltimoLog < 60000 // Si el último log es de hace menos de 1 minuto, asumir que está activo

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <CardTitle as="h4" className="d-flex align-items-center mb-0">
          <LuFileText className="me-2" />
          Logs de Importación de Niveles y Asignaturas
        </CardTitle>
        <div className="d-flex gap-2 flex-wrap">
          <Form.Check
            type="switch"
            id="autoRefresh"
            label="Auto-refresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <Form.Select
            size="sm"
            style={{ width: '120px' }}
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
          >
            <option value={2000}>2 seg</option>
            <option value={5000}>5 seg</option>
            <option value={10000}>10 seg</option>
            <option value={30000}>30 seg</option>
          </Form.Select>
          <Button variant="outline-secondary" size="sm" onClick={fetchLogs} disabled={loading}>
            <LuRefreshCw className={`me-1 ${loading ? 'spinning' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline-danger" size="sm" onClick={clearLogs}>
            <LuTrash2 className="me-1" />
            Limpiar
          </Button>
          <Button variant="outline-primary" size="sm" onClick={exportLogs} disabled={logs.length === 0}>
            <LuDownload className="me-1" />
            Exportar
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {/* Estadísticas */}
        <div className="d-flex gap-3 mb-3 flex-wrap align-items-center">
          <Badge bg="secondary">Total: {logCounts.total}</Badge>
          <Badge bg="info">Info: {logCounts.log}</Badge>
          <Badge bg="warning">Warn: {logCounts.warn}</Badge>
          <Badge bg="danger">Error: {logCounts.error}</Badge>
          {hayProcesoActivo && (
            <Badge bg="success" className="d-flex align-items-center gap-1">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              Procesando...
            </Badge>
          )}
          {ultimoLog && !hayProcesoActivo && ultimoLog.message.includes('IMPORTACIÓN COMPLETADA') && (
            <Badge bg="success">✅ Completado</Badge>
          )}
        </div>

        {/* Filtro */}
        <InputGroup className="mb-3">
          <InputGroup.Text>
            <LuSearch />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Filtrar logs (mensaje, nivel, datos)..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter && (
            <Button variant="outline-secondary" onClick={() => setFilter('')}>
              Limpiar
            </Button>
          )}
        </InputGroup>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            <strong>Error:</strong> {error}
          </Alert>
        )}

        {/* Lista de logs */}
        <div
          style={{
            maxHeight: '600px',
            overflowY: 'auto',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '15px',
            borderRadius: '4px',
            border: '1px solid #3e3e3e',
          }}
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center text-muted py-5">
              {logs.length === 0 ? 'No hay logs disponibles' : 'No hay logs que coincidan con el filtro'}
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              const timestamp = format(new Date(log.timestamp), 'HH:mm:ss.SSS', { locale: es })
              const date = format(new Date(log.timestamp), 'yyyy-MM-dd', { locale: es })

              let levelColor = '#d4d4d4'
              let levelBg = 'transparent'
              if (log.level === 'error') {
                levelColor = '#f48771'
                levelBg = 'rgba(244, 135, 113, 0.1)'
              } else if (log.level === 'warn') {
                levelColor = '#dcdcaa'
                levelBg = 'rgba(220, 220, 170, 0.1)'
              } else if (log.level === 'log') {
                levelColor = '#4ec9b0'
                levelBg = 'rgba(78, 201, 176, 0.1)'
              }

              return (
                <div
                  key={index}
                  style={{
                    marginBottom: '8px',
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: levelBg,
                    borderLeft: `3px solid ${levelColor}`,
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#808080' }}>{date}</span>
                    <span style={{ color: '#808080' }}>{timestamp}</span>
                    <span
                      style={{
                        color: levelColor,
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                      }}
                    >
                      [{log.level}]
                    </span>
                  </div>
                  <div style={{ marginTop: '4px', color: '#d4d4d4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {log.message}
                  </div>
                  {log.data && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ color: '#808080', cursor: 'pointer' }}>Ver datos</summary>
                      <pre
                        style={{
                          marginTop: '8px',
                          padding: '8px',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '4px',
                          overflow: 'auto',
                          fontSize: '11px',
                        }}
                      >
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </CardBody>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </Card>
  )
}
