'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardBody, Button, Form, Badge, Alert } from 'react-bootstrap'
import { LuRefreshCw, LuDownload, LuSearch, LuFilter, LuInfo } from 'react-icons/lu'

interface LogEntry {
  level: string
  message: string
  timestamp: string
  source?: string
}

export default function LogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Filtrar logs relacionados con listas
  const isListasRelated = (log: LogEntry): boolean => {
    const message = log.message?.toLowerCase() || ''
    const source = log.source?.toLowerCase() || ''
    
    return (
      message.includes('listas') ||
      message.includes('por-colegio') ||
      message.includes('versiones_materiales') ||
      message.includes('curso') ||
      message.includes('colegio') ||
      source.includes('listas') ||
      source.includes('cursos')
    )
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        limit: '500',
        filter: 'listas',
      })
      
      const response = await fetch(`/api/crm/listas/logs?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('[LogsViewer] Respuesta no es JSON:', text.substring(0, 200))
        throw new Error('La respuesta del servidor no es JSON válido')
      }

      const data = await response.json()
      
      if (data.success && Array.isArray(data.logs)) {
        // Filtrar solo logs relacionados con listas
        const listasLogs = data.logs.filter(isListasRelated)
        setLogs(listasLogs)
        setFilteredLogs(listasLogs)
      } else {
        throw new Error(data.error || 'Formato de respuesta inválido')
      }
    } catch (err: any) {
      console.error('[LogsViewer] Error al obtener logs:', err)
      setError(err.message || 'Error al cargar logs')
      setLogs([])
      setFilteredLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Filtrar logs según búsqueda y nivel
  useEffect(() => {
    let filtered = [...logs]

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(log => 
        log.message?.toLowerCase().includes(searchLower) ||
        log.source?.toLowerCase().includes(searchLower) ||
        log.timestamp?.toLowerCase().includes(searchLower)
      )
    }

    // Filtrar por nivel
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter)
    }

    setFilteredLogs(filtered)
  }, [logs, searchTerm, levelFilter])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      fetchLogs()
      const interval = setInterval(fetchLogs, 3000) // Cada 3 segundos
      setRefreshInterval(interval)
      
      return () => {
        if (interval) clearInterval(interval)
      }
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }
  }, [autoRefresh, fetchLogs])

  // Cargar logs al montar
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const exportLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp}] [${log.level}] ${log.source ? `[${log.source}] ` : ''}${log.message}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `listas-logs-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getLevelBadgeVariant = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'danger'
      case 'warn':
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      case 'debug':
        return 'secondary'
      default:
        return 'primary'
    }
  }

  const levelCounts = {
    all: logs.length,
    error: logs.filter(l => l.level === 'error').length,
    warn: logs.filter(l => l.level === 'warn' || l.level === 'warning').length,
    info: logs.filter(l => l.level === 'info').length,
    debug: logs.filter(l => l.level === 'debug').length,
  }

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Logs de Listas</h5>
          <small className="text-muted">Logs relacionados con listas de útiles y cursos</small>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant={autoRefresh ? 'success' : 'outline-secondary'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <LuRefreshCw className={autoRefresh ? 'me-1' : ''} />
            {autoRefresh ? 'Auto-actualizando' : 'Activar auto-actualización'}
          </Button>
          <Button variant="outline-primary" size="sm" onClick={fetchLogs} disabled={loading}>
            <LuRefreshCw className={loading ? 'spinning' : ''} />
            Actualizar
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={exportLogs}>
            <LuDownload className="me-1" />
            Exportar
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            <strong>Error:</strong> {error}
          </Alert>
        )}

        <div className="mb-3">
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>
                  <LuSearch className="me-1" />
                  Buscar
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Buscar en logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>
                  <LuFilter className="me-1" />
                  Nivel
                </Form.Label>
                <Form.Select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                  <option value="all">Todos ({levelCounts.all})</option>
                  <option value="error">Error ({levelCounts.error})</option>
                  <option value="warn">Warning ({levelCounts.warn})</option>
                  <option value="info">Info ({levelCounts.info})</option>
                  <option value="debug">Debug ({levelCounts.debug})</option>
                </Form.Select>
              </Form.Group>
            </div>
          </div>
        </div>

        <div className="mb-2 d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Mostrando {filteredLogs.length} de {logs.length} logs
          </small>
          {autoRefresh && (
            <Badge bg="success" className="d-flex align-items-center gap-1">
              <span className="spinner-border spinner-border-sm" role="status" />
              Auto-actualizando cada 3s
            </Badge>
          )}
        </div>

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
            border: '1px solid #333',
          }}
        >
          {loading && filteredLogs.length === 0 ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-2 text-muted">Cargando logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <LuInfo size={24} className="mb-2" />
              <p>No hay logs disponibles</p>
              <p className="small">Los logs aparecerán aquí cuando haya actividad relacionada con listas</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '8px',
                  padding: '4px 0',
                  borderBottom: index < filteredLogs.length - 1 ? '1px solid #333' : 'none',
                }}
              >
                <div className="d-flex align-items-start gap-2">
                  <Badge bg={getLevelBadgeVariant(log.level)} className="mt-1">
                    {log.level.toUpperCase()}
                  </Badge>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <span style={{ color: '#9cdcfe' }}>{log.timestamp}</span>
                      {log.source && (
                        <Badge bg="secondary" className="text-nowrap">
                          {log.source}
                        </Badge>
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: '4px',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {log.message}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardBody>
    </Card>
  )
}
