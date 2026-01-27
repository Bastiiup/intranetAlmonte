'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardBody, Button, Badge, Row, Col, InputGroup, Form } from 'react-bootstrap'
import { LuRefreshCw, LuSearch, LuFilter, LuDownload, LuTrash2, LuPlay, LuPause } from 'react-icons/lu'

interface LogEntry {
  timestamp: string
  level: 'log' | 'error' | 'warn'
  message: string
  data?: any
  source?: 'client' | 'server'
}

export default function ImportacionCompletaLogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | 'log' | 'error' | 'warn'>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'client' | 'server'>('all')
  const [limit, setLimit] = useState(100)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: limit.toString(),
      })
      
      if (searchTerm) {
        params.append('filter', searchTerm)
      }

      const response = await fetch(`/api/crm/listas/importacion-completa-logs?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
      const data = await response.json()

      if (data.success && data.data) {
        const newLogs = data.data.logs || []
        console.log('[LogsViewer] Logs recibidos:', {
          total: newLogs.length,
          cliente: data.data.totalCliente || 0,
          servidor: data.data.totalServidor || 0,
          totalGeneral: data.data.total || 0,
        })
        setLogs(newLogs)
        setFilteredLogs(newLogs)
      } else {
        console.warn('[LogsViewer] Respuesta no exitosa:', data)
        if (data.error) {
          console.error('[LogsViewer] Error:', data.error)
        }
        // Si hay error, mostrar logs vacíos pero no fallar
        setLogs([])
        setFilteredLogs([])
      }
    } catch (error: any) {
      console.error('[LogsViewer] Error al obtener logs:', error)
      // En caso de error, mostrar mensaje pero no fallar
      setLogs([])
      setFilteredLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [limit])

  useEffect(() => {
    // Filtrar logs por nivel y origen
    let filtered = logs

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter)
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(log => {
        if (sourceFilter === 'server') {
          return log.source === 'server'
        } else if (sourceFilter === 'client') {
          return log.source === 'client' || !log.source // Los logs antiguos sin source son del cliente
        }
        return true
      })
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
      )
    }

    setFilteredLogs(filtered)
  }, [logs, levelFilter, sourceFilter, searchTerm])

  useEffect(() => {
    // Auto-refresh
    if (autoRefresh) {
      autoRefreshIntervalRef.current = setInterval(() => {
        fetchLogs()
      }, 2000) // Actualizar cada 2 segundos
    } else {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
        autoRefreshIntervalRef.current = null
      }
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [autoRefresh, limit])

  useEffect(() => {
    // Auto-scroll al final cuando hay nuevos logs
    if (autoRefresh && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [filteredLogs, autoRefresh])

  const clearLogs = async () => {
    if (confirm('¿Estás seguro de que deseas limpiar TODOS los logs? Esto limpiará tanto la vista como los logs del servidor.')) {
      try {
        // Limpiar logs del servidor
        const response = await fetch('/api/crm/listas/importacion-completa-logs', {
          method: 'DELETE',
        })
        const data = await response.json()
        
        if (data.success) {
          // Limpiar también la vista local
          setLogs([])
          setFilteredLogs([])
          console.log('[LogsViewer] ✅ Logs limpiados:', data.message)
          alert(`✅ ${data.message}`)
        } else {
          console.error('[LogsViewer] Error al limpiar logs:', data.error)
          alert(`Error al limpiar logs: ${data.error}`)
        }
      } catch (error: any) {
        console.error('[LogsViewer] Error al limpiar logs:', error)
        // Aún así limpiar la vista local
        setLogs([])
        setFilteredLogs([])
        alert(`Error al limpiar logs del servidor, pero se limpió la vista local.`)
      }
    }
  }

  const exportLogs = () => {
    const logText = filteredLogs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('es-CL')
      const level = log.level.toUpperCase().padEnd(5)
      const dataStr = log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''
      return `[${timestamp}] [${level}] ${log.message}${dataStr}`
    }).join('\n\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-importacion-completa-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getLogLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge bg="danger">ERROR</Badge>
      case 'warn':
        return <Badge bg="warning" text="dark">WARN</Badge>
      case 'log':
        return <Badge bg="info">LOG</Badge>
      default:
        return <Badge bg="secondary">{level.toUpperCase()}</Badge>
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-danger'
      case 'warn':
        return 'text-warning'
      case 'log':
        return 'text-info'
      default:
        return 'text-light'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const highlightText = (text: string, search: string) => {
    if (!search) return text
    
    const parts = text.split(new RegExp(`(${search})`, 'gi'))
    return parts.map((part, i) => 
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={i} className="bg-warning text-dark">{part}</mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className="container-fluid">
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">📋 Logs de Importación Completa</h4>
                <small className="text-muted">
                  Logs del sistema de importación completa de listas
                  {logs.length > 0 && (
                    <span className="ms-2">
                      • Última actualización: {new Date().toLocaleTimeString('es-CL')}
                    </span>
                  )}
                </small>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant={autoRefresh ? 'success' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  title={autoRefresh ? 'Pausar auto-refresh' : 'Activar auto-refresh'}
                >
                  {autoRefresh ? <LuPause /> : <LuPlay />}
                  <span className="ms-1 d-none d-md-inline">
                    {autoRefresh ? 'Pausar' : 'Auto-refresh'}
                  </span>
                </Button>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={fetchLogs}
                  disabled={loading}
                >
                  <LuRefreshCw className={loading ? 'spinning' : ''} />
                  <span className="ms-1 d-none d-md-inline">Actualizar</span>
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={exportLogs}
                  disabled={filteredLogs.length === 0}
                >
                  <LuDownload />
                  <span className="ms-1 d-none d-md-inline">Exportar</span>
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={clearLogs}
                  disabled={logs.length === 0}
                >
                  <LuTrash2 />
                  <span className="ms-1 d-none d-md-inline">Limpiar</span>
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {/* Filtros y búsqueda */}
              <Row className="mb-3">
                <Col md={4}>
                  <InputGroup>
                    <InputGroup.Text>
                      <LuSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Buscar en logs (PDF, versión, curso, upload, subir, etc.)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setSearchTerm('pdf')}
                      title="Filtrar solo PDFs"
                    >
                      📄 PDFs
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setSearchTerm('subiendo')}
                      title="Filtrar subidas de PDFs"
                    >
                      📤 Subir
                    </Button>
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <InputGroup>
                    <InputGroup.Text>
                      <LuFilter />
                    </InputGroup.Text>
                    <Form.Select
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value as any)}
                    >
                      <option value="all">Todos los niveles</option>
                      <option value="log">Log</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                    </Form.Select>
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <InputGroup>
                    <InputGroup.Text>Origen</InputGroup.Text>
                    <Form.Select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value as any)}
                    >
                      <option value="all">Todos</option>
                      <option value="client">💻 Cliente</option>
                      <option value="server">🖥️ Servidor</option>
                    </Form.Select>
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <InputGroup>
                    <InputGroup.Text>Límite</InputGroup.Text>
                    <Form.Select
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value))}
                    >
                      <option value="50">50 logs</option>
                      <option value="100">100 logs</option>
                      <option value="200">200 logs</option>
                      <option value="500">500 logs</option>
                    </Form.Select>
                  </InputGroup>
                </Col>
              </Row>

              {/* Estadísticas */}
              <div className="mb-3 d-flex gap-3 flex-wrap">
                <Badge bg="secondary">
                  Total: {logs.length}
                </Badge>
                <Badge bg="primary">
                  Cliente: {logs.filter(l => l.source === 'client' || !l.source).length}
                </Badge>
                <Badge bg="info">
                  Servidor: {logs.filter(l => l.source === 'server').length}
                </Badge>
                <Badge bg={filteredLogs.length === logs.length ? 'secondary' : 'info'}>
                  Mostrando: {filteredLogs.length}
                </Badge>
                <Badge bg="danger">
                  Errores: {logs.filter(l => l.level === 'error').length}
                </Badge>
                <Badge bg="warning" text="dark">
                  Warnings: {logs.filter(l => l.level === 'warn').length}
                </Badge>
                <Badge bg="success">
                  📄 PDFs: {logs.filter(l => 
                    l.message.toLowerCase().includes('pdf') || 
                    l.message.toLowerCase().includes('subiendo') ||
                    l.message.toLowerCase().includes('subido')
                  ).length}
                </Badge>
                {autoRefresh && (
                  <Badge bg="success">
                    🔄 Auto-refresh activo
                  </Badge>
                )}
              </div>

              {/* Lista de logs */}
              <div
                style={{
                  backgroundColor: '#1e1e1e',
                  color: '#d4d4d4',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '15px',
                  borderRadius: '4px',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  border: '1px solid #333',
                }}
              >
                {loading && logs.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <LuRefreshCw className="spinning mb-2" style={{ fontSize: '24px' }} />
                    <div>Cargando logs...</div>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div>No hay logs para mostrar</div>
                    <small>
                      {searchTerm || levelFilter !== 'all' 
                        ? 'Intenta ajustar los filtros' 
                        : 'Los logs aparecerán aquí cuando se ejecute una importación completa'}
                    </small>
                  </div>
                ) : (
                  filteredLogs.map((log, index) => (
                    <div
                      key={index}
                      className="mb-3 p-2 rounded"
                      style={{
                        backgroundColor: log.level === 'error' ? 'rgba(220, 53, 69, 0.1)' :
                                        log.level === 'warn' ? 'rgba(255, 193, 7, 0.1)' :
                                        'rgba(255, 255, 255, 0.02)',
                        borderLeft: `3px solid ${
                          log.level === 'error' ? '#dc3545' :
                          log.level === 'warn' ? '#ffc107' :
                          '#0dcaf0'
                        }`,
                        borderTop: log.source === 'server' ? '2px solid #0dcaf0' : 'none',
                      }}
                    >
                      <div className="d-flex align-items-start gap-2 mb-1">
                        <div className="flex-shrink-0">
                          {getLogLevelBadge(log.level)}
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start mb-1">
                            <div className="d-flex gap-2 align-items-center">
                              <span className="text-muted" style={{ fontSize: '11px' }}>
                                {formatTimestamp(log.timestamp)}
                              </span>
                              {log.source && (
                                <Badge bg={log.source === 'server' ? 'info' : 'primary'} style={{ fontSize: '9px' }}>
                                  {log.source === 'server' ? '🖥️ SERVIDOR' : '💻 CLIENTE'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className={getLogLevelColor(log.level)}>
                            {highlightText(log.message, searchTerm)}
                          </div>
                          {log.data && (
                            <details className="mt-2">
                              <summary className="text-muted" style={{ cursor: 'pointer', fontSize: '11px' }}>
                                Ver datos adicionales
                              </summary>
                              <pre
                                className="mt-2 p-2 rounded"
                                style={{
                                  backgroundColor: '#0d1117',
                                  color: '#c9d1d9',
                                  fontSize: '11px',
                                  overflowX: 'auto',
                                  maxHeight: '300px',
                                  overflowY: 'auto',
                                }}
                              >
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
