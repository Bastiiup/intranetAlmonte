'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Table, Badge, Spinner, Alert, Button, Row, Col } from 'react-bootstrap'
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  createColumnHelper,
} from '@tanstack/react-table'
import { LuArrowLeft, LuRefreshCw, LuUser, LuMail, LuFileText } from 'react-icons/lu'
import { useRouter } from 'next/navigation'

interface ActivityLog {
  id: string
  documentId?: string
  attributes?: {
    accion: string
    entidad: string
    entidad_id?: string
    descripcion: string
    fecha: string
    ip_address?: string
    user_agent?: string
    metadata?: string
  }
}

interface UsuarioInfo {
  id: number
  nombre: string
  email: string
}

const columnHelper = createColumnHelper<ActivityLog>()

interface UserActivityLogsProps {
  usuarioId: string
}

export default function UserActivityLogs({ usuarioId }: UserActivityLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [usuarioInfo, setUsuarioInfo] = useState<UsuarioInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Helper para obtener datos del log
  const getLogData = (log: ActivityLog) => {
    const attrs = log.attributes || {}
    const hasAttributes = log.attributes && Object.keys(log.attributes).length > 0
    return hasAttributes ? attrs : log
  }

  const columns: ColumnDef<ActivityLog>[] = [
    columnHelper.accessor((row) => {
      const data = getLogData(row)
      return data.fecha
    }, {
      id: 'fecha',
      header: 'Fecha',
      cell: ({ row }) => {
        const data = getLogData(row.original)
        const fecha = data.fecha
        if (!fecha) return '-'
        try {
          return new Date(fecha).toLocaleString('es-CL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        } catch {
          return fecha
        }
      },
    }),
    columnHelper.accessor((row) => {
      const data = getLogData(row)
      return data.accion
    }, {
      id: 'accion',
      header: 'Acción',
      cell: ({ row }) => {
        const data = getLogData(row.original)
        const accion = data.accion || 'desconocida'
        const variant = getAccionBadgeVariant(accion)
        return <Badge bg={variant}>{accion}</Badge>
      },
    }),
    columnHelper.accessor((row) => {
      const data = getLogData(row)
      return data.entidad
    }, {
      id: 'entidad',
      header: 'Entidad',
      cell: ({ row }) => {
        const data = getLogData(row.original)
        const entidad = data.entidad || '-'
        const entidadId = data.entidad_id
        return (
          <span>
            {entidad}
            {entidadId && <span className="text-muted ms-1">#{entidadId}</span>}
          </span>
        )
      },
    }),
    columnHelper.accessor((row) => {
      const data = getLogData(row)
      return data.descripcion
    }, {
      id: 'descripcion',
      header: 'Descripción',
      cell: ({ row }) => {
        const data = getLogData(row.original)
        return <span className="text-wrap">{data.descripcion || '-'}</span>
      },
    }),
    columnHelper.accessor((row) => {
      const data = getLogData(row)
      return data.ip_address
    }, {
      id: 'ip_address',
      header: 'IP',
      cell: ({ row }) => {
        const data = getLogData(row.original)
        return <span className="text-muted small">{data.ip_address || '-'}</span>
      },
    }),
  ]

  const getAccionBadgeVariant = (accion: string): string => {
    const accionLower = accion.toLowerCase()
    if (accionLower.includes('crear')) return 'success'
    if (accionLower.includes('actualizar') || accionLower.includes('cambiar')) return 'primary'
    if (accionLower.includes('eliminar')) return 'danger'
    if (accionLower.includes('ver')) return 'info'
    if (accionLower.includes('login') || accionLower.includes('logout')) return 'warning'
    return 'secondary'
  }

  const fetchUserLogs = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Obtener logs del usuario
      const logsResponse = await fetch(`/api/logs/usuario/${usuarioId}`, {
        cache: 'no-store',
      })
      
      const logsData = await logsResponse.json()
      
      if (logsData.success && logsData.data) {
        const logsArray = Array.isArray(logsData.data) ? logsData.data : [logsData.data]
        setLogs(logsArray)
        
        // Obtener información del usuario si está disponible
        if (logsArray.length > 0) {
          const firstLog = logsArray[0]
          const logData = getLogData(firstLog)
          const usuario = logData.usuario
          
          if (usuario) {
            let usuarioData: any = null
            if (usuario.data) {
              usuarioData = usuario.data.attributes || usuario.data
            } else if (typeof usuario === 'object') {
              usuarioData = usuario.attributes || usuario
            }
            
            if (usuarioData) {
              setUsuarioInfo({
                id: usuario.data?.id || usuario.id || parseInt(usuarioId),
                nombre: usuarioData.nombre || usuarioData.email_login || 'Usuario',
                email: usuarioData.email_login || usuarioData.email || 'Sin email',
              })
            }
          }
        }
      } else {
        setError(logsData.error || 'Error al cargar logs del usuario')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserLogs()
  }, [usuarioId])

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
      sorting: [
        {
          id: 'fecha',
          desc: true, // Más recientes primero
        },
      ],
    },
  })

  if (loading) {
    return (
      <Card>
        <CardBody className="text-center py-5">
          <Spinner animation="border" />
          <div className="mt-3">Cargando actividades del usuario...</div>
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
        <div className="mt-2">
          <Button variant="outline-danger" size="sm" onClick={fetchUserLogs}>
            <LuRefreshCw className="me-1" />
            Reintentar
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <>
      <Card className="mb-3">
        <CardBody>
          <Row>
            <Col md={6}>
              <h5 className="mb-3">Información del Usuario</h5>
              {usuarioInfo ? (
                <div>
                  <div className="mb-2">
                    <strong><LuUser className="me-2" />Nombre:</strong> {usuarioInfo.nombre}
                  </div>
                  <div className="mb-2">
                    <strong><LuMail className="me-2" />Email:</strong> {usuarioInfo.email}
                  </div>
                  <div className="mb-2">
                    <strong>ID:</strong> {usuarioInfo.id}
                  </div>
                </div>
              ) : (
                <p className="text-muted">ID de Usuario: {usuarioId}</p>
              )}
            </Col>
            <Col md={6} className="text-end">
              <Button variant="outline-secondary" onClick={() => router.push('/logs')}>
                <LuArrowLeft className="me-2" />
                Volver a Logs
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="d-flex justify-content-between align-items-center">
          <CardTitle as="h4" className="d-flex align-items-center mb-0">
            <LuFileText className="me-2" />
            Actividades ({logs.length})
          </CardTitle>
          <Button variant="outline-secondary" size="sm" onClick={fetchUserLogs}>
            <LuRefreshCw className="me-1" />
            Actualizar
          </Button>
        </CardHeader>
        <CardBody>
          <div className="table-responsive">
            <Table hover>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        style={{
                          cursor: header.column.getCanSort() ? 'pointer' : 'default',
                          userSelect: 'none',
                        }}
                      >
                        <div className="d-flex align-items-center">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="ms-1">
                              {{
                                asc: ' ↑',
                                desc: ' ↓',
                              }[header.column.getIsSorted() as string] ?? ' ↕'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-4 text-muted">
                      No hay actividades registradas para este usuario
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted small">
              Mostrando {table.getRowModel().rows.length} de {logs.length} actividades
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Anterior
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  )
}


