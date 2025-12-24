'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Table, Spinner, Alert, Form, InputGroup, Button } from 'react-bootstrap'
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
import { LuSearch, LuRefreshCw, LuFileText, LuUser, LuBug, LuX } from 'react-icons/lu'
import { useRouter } from 'next/navigation'

interface UsuarioLog {
  id: number
  nombre: string
  usuario: string
  email: string
  ultimoAcceso: string | null
  totalAcciones: number
}

export default function LogsList() {
  const [usuarios, setUsuarios] = useState<UsuarioLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const router = useRouter()

  // Interceptar console.log para capturar logs de depuración (solo cuando el panel está visible)
  useEffect(() => {
    if (!showDebugPanel) return

    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    console.log = (...args: any[]) => {
      originalLog(...args)
      if (showDebugPanel) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
        if ((message.includes('[API /logs/usuarios]') || message.includes('[LogsList]')) && !message.includes('[SERVER]')) {
          setDebugLogs(prev => {
            if (prev.length > 0 && prev[prev.length - 1] === `[LOG] ${message}`) {
              return prev
            }
            return [...prev.slice(-49), `[LOG] ${message}`]
          })
        }
      }
    }

    console.error = (...args: any[]) => {
      originalError(...args)
      if (showDebugPanel) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
        if ((message.includes('[API /logs/usuarios]') || message.includes('[LogsList]')) && !message.includes('[SERVER]')) {
          setDebugLogs(prev => {
            if (prev.length > 0 && prev[prev.length - 1] === `[ERROR] ${message}`) {
              return prev
            }
            return [...prev.slice(-49), `[ERROR] ${message}`]
          })
        }
      }
    }

    console.warn = (...args: any[]) => {
      originalWarn(...args)
      if (showDebugPanel) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
        if ((message.includes('[API /logs/usuarios]') || message.includes('[LogsList]')) && !message.includes('[SERVER]')) {
          setDebugLogs(prev => {
            if (prev.length > 0 && prev[prev.length - 1] === `[WARN] ${message}`) {
              return prev
            }
            return [...prev.slice(-49), `[WARN] ${message}`]
          })
        }
      }
    }

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
    }
  }, [showDebugPanel])

  const columnHelper = createColumnHelper<UsuarioLog>()

  const columns: ColumnDef<UsuarioLog>[] = [
    columnHelper.accessor('id', {
      header: 'Id',
      cell: ({ row }) => row.original.id,
    }),
    columnHelper.accessor('nombre', {
      header: 'Nombre',
      cell: ({ row }) => {
        const nombre = row.original.nombre
        const esAnonimo = nombre.includes('Usuario Anónimo')
        
        return (
          <div className={esAnonimo ? 'text-muted' : 'fw-medium'}>
            {nombre}
          </div>
        )
      },
    }),
    columnHelper.accessor('usuario', {
      header: 'Usuario / Email',
      cell: ({ row }) => {
        const usuario = row.original.usuario
        const email = row.original.email
        const esAnonimo = row.original.nombre.includes('Usuario Anónimo')
        
        // Si es usuario anónimo, mostrar IP
        if (esAnonimo) {
          return <div className="text-muted">{usuario || '-'}</div>
        }
        
        // Mostrar email_login (usuario)
        return <div>{usuario || email || '-'}</div>
      },
    }),
    {
      id: 'contraseña',
      header: 'Contraseña',
      cell: () => (
        <div className="d-flex align-items-center gap-2">
          <input
            type="password"
            value="*****"
            readOnly
            className="form-control form-control-sm"
            style={{ width: '80px' }}
          />
          <Button variant="link" size="sm" className="p-0" title="Mostrar contraseña">
            <LuUser size={16} className="text-primary" />
          </Button>
        </div>
      ),
    },
    columnHelper.accessor('ultimoAcceso', {
      header: 'Último acceso',
      cell: ({ row }) => {
        if (!row.original.ultimoAcceso) return '-'
        try {
          const fecha = new Date(row.original.ultimoAcceso)
          return fecha.toLocaleString('es-CL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        } catch {
          return row.original.ultimoAcceso
        }
      },
    }),
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="d-flex gap-2">
          <Button
            variant="link"
            size="sm"
            className="p-0"
            onClick={() => router.push(`/logs/usuario/${row.original.id}`)}
            title="Ver todas las acciones"
          >
            <LuFileText size={18} className="text-primary" />
          </Button>
        </div>
      ),
    },
  ]

  const fetchUsuarios = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('[LogsList] 🔄 Iniciando fetch de usuarios...')
              const response = await fetch('/api/logs/usuarios', {
                cache: 'no-store',
                credentials: 'include',
              })
      
      console.log('[LogsList] 📡 Respuesta recibida, status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[LogsList] ❌ Error HTTP:', response.status, errorText)
        throw new Error(`Error ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('[LogsList] 📊 Respuesta de API:', data)
      
      // Agregar logs de debug del servidor al panel
      if (data.debug && Array.isArray(data.debug)) {
        setDebugLogs(prev => [...prev.slice(-40), ...data.debug.map((log: string) => `[SERVER] ${log}`)])
      }
      
      if (data.success && data.data) {
        const usuariosArray = Array.isArray(data.data) ? data.data : [data.data]
        console.log('[LogsList] ✅ Usuarios recibidos:', usuariosArray.length)
        if (usuariosArray.length > 0) {
          console.log('[LogsList] 🔍 Primer usuario:', usuariosArray[0])
        } else {
          console.warn('[LogsList] ⚠️ No hay usuarios en la respuesta')
        }
        setUsuarios(usuariosArray)
      } else {
        console.error('[LogsList] ❌ Error en respuesta:', data.error)
        setError(data.error || 'Error al cargar usuarios')
      }
    } catch (err: any) {
      console.error('[LogsList] ❌ Error en fetchUsuarios:', err)
      setError(err.message || 'Error al conectar con la API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('[LogsList] 🔄 useEffect ejecutado, llamando fetchUsuarios...')
    fetchUsuarios()
  }, [])

  const table = useReactTable({
    data: usuarios,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
    },
    globalFilterFn: (row, columnId, filterValue) => {
      const usuario = row.original
      const search = filterValue.toLowerCase()
      return (
        usuario.nombre?.toLowerCase().includes(search) ||
        usuario.usuario?.toLowerCase().includes(search) ||
        usuario.email?.toLowerCase().includes(search) ||
        String(usuario.id).includes(search)
      )
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
      sorting: [
        {
          id: 'ultimoAcceso',
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
          <div className="mt-3">Cargando usuarios...</div>
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
        <div className="mt-2">
          <Button variant="outline-danger" size="sm" onClick={fetchUsuarios}>
            <LuRefreshCw className="me-1" />
            Reintentar
          </Button>
        </div>
        <div className="mt-2 small text-muted">
          <strong>Debug:</strong> Abre la consola del navegador (F12) para ver más detalles.
        </div>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <CardTitle as="h4" className="d-flex align-items-center mb-0">
          <LuFileText className="me-2" />
          Logs de Actividades
        </CardTitle>
        <div className="d-flex gap-2">
          <Button 
            variant={showDebugPanel ? "warning" : "outline-info"} 
            size="sm" 
            onClick={() => setShowDebugPanel(!showDebugPanel)}
          >
            <LuBug className="me-1" />
            {showDebugPanel ? 'Ocultar' : 'Mostrar'} Logs Debug
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={fetchUsuarios}>
            <LuRefreshCw className="me-1" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {showDebugPanel && (
          <Card className="mb-3 border-info">
            <CardHeader className="bg-info text-white d-flex justify-content-between align-items-center py-2">
              <h6 className="mb-0">🔍 Logs de Depuración</h6>
              <Button
                variant="link"
                size="sm"
                className="text-white p-0"
                onClick={() => setDebugLogs([])}
              >
                Limpiar
              </Button>
            </CardHeader>
            <CardBody className="p-2" style={{ maxHeight: '400px', overflowY: 'auto', backgroundColor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', fontSize: '12px' }}>
              {debugLogs.length === 0 ? (
                <div className="text-muted">No hay logs aún. Recarga la página o haz clic en "Actualizar".</div>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className={log.includes('[ERROR]') ? 'text-danger' : log.includes('[WARN]') ? 'text-warning' : 'text-info'}>
                      {log}
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        )}

        <div className="mb-3">
          <InputGroup>
            <InputGroup.Text>
              <LuSearch />
            </InputGroup.Text>
            <Form.Control
              placeholder="Buscar en logs..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </InputGroup>
        </div>

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
                  <td colSpan={table.getAllColumns().length} className="text-center py-4">
                    <div className="text-muted">No hay usuarios disponibles</div>
                    <div className="small text-muted mt-2">
                      {usuarios.length === 0 
                        ? 'No se encontraron usuarios con actividad registrada. Realiza algunas acciones en el sistema para generar logs.'
                        : 'No hay usuarios que coincidan con la búsqueda.'}
                    </div>
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
            Mostrando {table.getRowModel().rows.length} de {usuarios.length} usuarios
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
  )
}

