'use client'

import { useEffect, useState } from 'react'
import { Card, Badge, Button, Spinner, Alert, Table } from 'react-bootstrap'
import { LuRefreshCw, LuTrash2, LuFilter, LuClock, LuCheckCircle, LuX } from 'react-icons/lu'

interface ImportacionLog {
  timestamp: string
  tipo: 'inicio' | 'parseando' | 'grupo' | 'colegio' | 'curso' | 'lista' | 'error' | 'fin'
  mensaje: string
  datos?: any
}

interface ImportacionStats {
  total: number
  porTipo: {
    inicio: number
    parseando: number
    grupo: number
    colegio: number
    curso: number
    lista: number
    error: number
    fin: number
  }
  ultimaImportacion: string
}

export default function DebugImportacionPage() {
  const [logs, setLogs] = useState<ImportacionLog[]>([])
  const [stats, setStats] = useState<ImportacionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<string>('')

  const cargarLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const url = `/api/debug/importacion${filtroTipo ? `?tipo=${filtroTipo}` : ''}${filtroTipo ? '&' : '?'}limit=100`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.logs)
        setStats(data.stats)
      } else {
        setError(data.error || 'Error desconocido')
      }
    } catch (err: any) {
      console.error('Error al cargar logs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const limpiarLogs = async () => {
    if (!confirm('¿Estás seguro de limpiar todos los logs?')) return
    
    try {
      const response = await fetch('/api/debug/importacion', { method: 'DELETE' })
      const data = await response.json()
      
      if (data.success) {
        alert(data.mensaje)
        cargarLogs()
      }
    } catch (err: any) {
      console.error('Error al limpiar logs:', err)
      alert('Error al limpiar logs: ' + err.message)
    }
  }

  useEffect(() => {
    cargarLogs()
  }, [filtroTipo])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(cargarLogs, 2000) // Cada 2 segundos
      return () => clearInterval(interval)
    }
  }, [autoRefresh, filtroTipo])

  const getTipoBadge = (tipo: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      inicio: { bg: 'primary', text: '🚀 Inicio' },
      parseando: { bg: 'info', text: '📄 Parseando' },
      grupo: { bg: 'secondary', text: '📦 Grupo' },
      colegio: { bg: 'success', text: '🏫 Colegio' },
      curso: { bg: 'warning', text: '📚 Curso' },
      lista: { bg: 'info', text: '📋 Lista' },
      error: { bg: 'danger', text: '❌ Error' },
      fin: { bg: 'success', text: '✅ Fin' },
    }
    
    const badge = badges[tipo] || { bg: 'secondary', text: tipo }
    return <Badge bg={badge.bg}>{badge.text}</Badge>
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">🔍 Debug: Importación Excel</h2>
          <p className="text-muted mb-0">Monitoreo en tiempo real del proceso de importación</p>
        </div>
        
        <div className="d-flex gap-2">
          <Button
            variant={autoRefresh ? 'success' : 'outline-secondary'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            <LuClock className="me-1" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          
          <Button variant="primary" onClick={cargarLogs} disabled={loading} size="sm">
            <LuRefreshCw className={loading ? 'spinner-border spinner-border-sm' : ''} />
            {loading ? ' Cargando...' : ' Actualizar'}
          </Button>
          
          <Button variant="danger" onClick={limpiarLogs} size="sm">
            <LuTrash2 className="me-1" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <Card className="mb-4">
          <Card.Body>
            <h5 className="mb-3">📊 Estadísticas</h5>
            <div className="row">
              <div className="col-md-3">
                <div className="d-flex flex-column">
                  <span className="text-muted small">Total de Logs</span>
                  <h4 className="mb-0">{stats.total}</h4>
                </div>
              </div>
              <div className="col-md-3">
                <div className="d-flex flex-column">
                  <span className="text-muted small">Última Importación</span>
                  <h6 className="mb-0">{stats.ultimaImportacion !== 'N/A' ? formatTimestamp(stats.ultimaImportacion) : 'N/A'}</h6>
                </div>
              </div>
              <div className="col-md-6">
                <div className="d-flex flex-wrap gap-2">
                  <Badge bg="primary" className="cursor-pointer" onClick={() => setFiltroTipo(filtroTipo === 'inicio' ? '' : 'inicio')}>
                    Inicio: {stats.porTipo.inicio}
                  </Badge>
                  <Badge bg="info" className="cursor-pointer" onClick={() => setFiltroTipo(filtroTipo === 'parseando' ? '' : 'parseando')}>
                    Parseando: {stats.porTipo.parseando}
                  </Badge>
                  <Badge bg="success" className="cursor-pointer" onClick={() => setFiltroTipo(filtroTipo === 'colegio' ? '' : 'colegio')}>
                    Colegios: {stats.porTipo.colegio}
                  </Badge>
                  <Badge bg="warning" className="cursor-pointer" onClick={() => setFiltroTipo(filtroTipo === 'curso' ? '' : 'curso')}>
                    Cursos: {stats.porTipo.curso}
                  </Badge>
                  <Badge bg="info" className="cursor-pointer" onClick={() => setFiltroTipo(filtroTipo === 'lista' ? '' : 'lista')}>
                    Listas: {stats.porTipo.lista}
                  </Badge>
                  <Badge bg="danger" className="cursor-pointer" onClick={() => setFiltroTipo(filtroTipo === 'error' ? '' : 'error')}>
                    Errores: {stats.porTipo.error}
                  </Badge>
                  <Badge bg="success" className="cursor-pointer" onClick={() => setFiltroTipo(filtroTipo === 'fin' ? '' : 'fin')}>
                    Fin: {stats.porTipo.fin}
                  </Badge>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Filtro activo */}
      {filtroTipo && (
        <Alert variant="info" dismissible onClose={() => setFiltroTipo('')}>
          <LuFilter className="me-2" />
          Filtrando por tipo: <strong>{filtroTipo}</strong>
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert variant="danger">
          <LuX className="me-2" />
          {error}
        </Alert>
      )}

      {/* Logs */}
      <Card>
        <Card.Body className="p-0">
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <Table hover className="mb-0">
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                <tr>
                  <th style={{ width: '150px' }}>Timestamp</th>
                  <th style={{ width: '120px' }}>Tipo</th>
                  <th>Mensaje</th>
                  <th style={{ width: '100px' }}>Datos</th>
                </tr>
              </thead>
              <tbody>
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Cargando logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-muted">
                      No hay logs de importación.
                      <br />
                      <small>Los logs aparecerán cuando se realice una importación.</small>
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => (
                    <tr key={index}>
                      <td className="small text-muted">{formatTimestamp(log.timestamp)}</td>
                      <td>{getTipoBadge(log.tipo)}</td>
                      <td>
                        <code className="small">{log.mensaje}</code>
                      </td>
                      <td>
                        {log.datos && (
                          <details>
                            <summary className="cursor-pointer text-primary small">Ver</summary>
                            <pre className="small mt-2 p-2 bg-light rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                              {JSON.stringify(log.datos, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Instrucciones */}
      <Alert variant="info" className="mt-4">
        <h6>💡 Cómo usar este debug:</h6>
        <ol className="mb-0">
          <li>Deja esta página abierta</li>
          <li>Activa <strong>Auto-refresh ON</strong> para ver logs en tiempo real</li>
          <li>Ve a <code>/crm/listas</code> y haz una importación</li>
          <li>Vuelve aquí para ver el detalle completo del proceso</li>
          <li>Si hay errores, aparecerán en rojo con detalles</li>
        </ol>
      </Alert>
    </div>
  )
}
