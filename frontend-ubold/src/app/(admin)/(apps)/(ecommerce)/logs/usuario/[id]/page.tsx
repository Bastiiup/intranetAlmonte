'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardBody, CardHeader, CardTitle, Table, Spinner, Alert, Button, Badge } from 'react-bootstrap'
import { LuArrowLeft, LuCalendar, LuUser, LuActivity, LuFileText } from 'react-icons/lu'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface LogEntry {
  id: number
  accion: string
  entidad: string
  entidadId?: string | number
  descripcion: string
  fecha: string
  ip_address?: string
  user_agent?: string
  datosAnteriores?: any
  datosNuevos?: any
  metadata?: any
}

export default function UsuarioLogsPage() {
  const params = useParams()
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [usuario, setUsuario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const usuarioId = params.id as string

  useEffect(() => {
    if (usuarioId) {
      fetchLogs()
      fetchUsuario()
    }
  }, [usuarioId])

  const fetchUsuario = async () => {
    try {
      const response = await fetch('/api/logs/usuarios', { cache: 'no-store' })
      const data = await response.json()
      
      if (data.success && data.data) {
        const usuarioEncontrado = data.data.find((u: any) => u.id === parseInt(usuarioId))
        if (usuarioEncontrado) {
          setUsuario(usuarioEncontrado)
        }
      }
    } catch (err: any) {
      console.error('Error al obtener usuario:', err)
    }
  }

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/logs/usuario/${usuarioId}`, {
        cache: 'no-store',
      })
      
      const data = await response.json()
      
      if (data.success && data.data) {
        const logsArray = Array.isArray(data.data) ? data.data : [data.data]
        
        // Transformar logs a formato consistente
        const logsTransformados = logsArray.map((log: any) => {
          const logData = log.attributes || log
          return {
            id: log.id || logData.id,
            accion: logData.accion || 'desconocida',
            entidad: logData.entidad || 'desconocida',
            entidadId: logData.entidad_id || logData.entidadId,
            descripcion: logData.descripcion || '',
            fecha: logData.fecha || logData.createdAt || new Date().toISOString(),
            ip_address: logData.ip_address,
            user_agent: logData.user_agent,
            datosAnteriores: logData.datos_anteriores || logData.datosAnteriores,
            datosNuevos: logData.datos_nuevos || logData.datosNuevos,
            metadata: logData.metadata,
          }
        })
        
        setLogs(logsTransformados)
      } else {
        setError(data.error || 'Error al cargar logs')
      }
    } catch (err: any) {
      console.error('Error al obtener logs:', err)
      setError(err.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const getAccionBadge = (accion: string) => {
    const badges: Record<string, { variant: string; label: string }> = {
      crear: { variant: 'success', label: 'Crear' },
      actualizar: { variant: 'primary', label: 'Actualizar' },
      eliminar: { variant: 'danger', label: 'Eliminar' },
      ver: { variant: 'info', label: 'Ver' },
      login: { variant: 'success', label: 'Login' },
      logout: { variant: 'secondary', label: 'Logout' },
      cambiar_estado: { variant: 'warning', label: 'Cambiar Estado' },
      ocultar: { variant: 'dark', label: 'Ocultar' },
      mostrar: { variant: 'light', label: 'Mostrar' },
    }
    
    const badge = badges[accion] || { variant: 'secondary', label: accion }
    return <Badge bg={badge.variant}>{badge.label}</Badge>
  }

  const formatFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), 'dd/MM/yyyy HH:mm:ss', { locale: es })
    } catch {
      return fecha
    }
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Logs de Usuario" subtitle="Ecommerce" />
        <Card>
          <CardBody className="text-center py-5">
            <Spinner animation="border" />
            <div className="mt-3">Cargando logs...</div>
          </CardBody>
        </Card>
      </Container>
    )
  }

  if (error) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Logs de Usuario" subtitle="Ecommerce" />
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Logs de Usuario" subtitle="Ecommerce" />
      
      <div className="mb-3">
        <Button
          variant="link"
          onClick={() => router.push('/logs')}
          className="p-0"
        >
          <LuArrowLeft className="me-1" />
          Volver a lista de usuarios
        </Button>
      </div>

      {usuario && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="mb-0">
              <div className="d-flex align-items-center gap-2">
                <LuUser />
                <span>{usuario.nombre}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="row">
              <div className="col-md-6">
                <p className="mb-1"><strong>Usuario:</strong> {usuario.usuario}</p>
                <p className="mb-1"><strong>Email:</strong> {usuario.email}</p>
              </div>
              <div className="col-md-6">
                <p className="mb-1"><strong>Total de acciones:</strong> {usuario.totalAcciones}</p>
                <p className="mb-0">
                  <strong>Último acceso:</strong>{' '}
                  {usuario.ultimoAcceso ? format(new Date(usuario.ultimoAcceso), 'dd/MM/yyyy HH:mm:ss', { locale: es }) : 'N/A'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="mb-0">
            <div className="d-flex align-items-center gap-2">
              <LuActivity />
              <span>Actividades ({logs.length})</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardBody>
          {logs.length === 0 ? (
            <Alert variant="info">
              No se encontraron logs para este usuario.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Acción</th>
                    <th>Entidad</th>
                    <th>Descripción</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <LuCalendar size={14} className="text-muted" />
                          <small>{formatFecha(log.fecha)}</small>
                        </div>
                      </td>
                      <td>{getAccionBadge(log.accion)}</td>
                      <td>
                        <Badge bg="outline-secondary">{log.entidad}</Badge>
                        {log.entidadId && (
                          <small className="text-muted ms-1">#{log.entidadId}</small>
                        )}
                      </td>
                      <td>
                        <div className="text-wrap" style={{ maxWidth: '400px' }}>
                          {log.descripcion}
                        </div>
                        {log.datosAnteriores && (
                          <details className="mt-1">
                            <summary className="text-muted small">Ver datos anteriores</summary>
                            <pre className="small bg-light p-2 mt-1 rounded">
                              {JSON.stringify(log.datosAnteriores, null, 2)}
                            </pre>
                          </details>
                        )}
                        {log.datosNuevos && (
                          <details className="mt-1">
                            <summary className="text-muted small">Ver datos nuevos</summary>
                            <pre className="small bg-light p-2 mt-1 rounded">
                              {JSON.stringify(log.datosNuevos, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                      <td>
                        <small className="text-muted">{log.ip_address || 'N/A'}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </Container>
  )
}

