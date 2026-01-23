'use client'

import {
  ColumnDef,
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  Row as TableRow,
  Table as TableType,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert, Badge } from 'react-bootstrap'
import { LuSearch, LuRefreshCw, LuUpload } from 'react-icons/lu'
import { TbEdit, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'

interface LicenciaType {
  id: number | string
  documentId?: string
  codigo_activacion: string
  fecha_activacion: string | null
  activa: boolean
  fecha_vencimiento: string | null
  libro_mira: {
    id: number | string
    documentId?: string
    activo: boolean
    tiene_omr: boolean
    libro: {
      id: number | string
      isbn_libro: string
      nombre_libro: string
      portada_libro?: {
        url: string
      } | null
    } | null
  } | null
  estudiante: {
    id: number | string
    email: string
    activo: boolean
    nivel: string
    curso: string
    persona: {
      id: number | string
      nombres: string
      primer_apellido: string
      segundo_apellido: string
    } | null
    colegio: {
      id: number | string
      nombre: string
    } | null
  } | null
  createdAt?: string | null
  updatedAt?: string | null
}

const columnHelper = createColumnHelper<LicenciaType>()

interface LicenciasListingProps {
  licencias: any[]
  error: string | null
}

export default function LicenciasListing({ licencias: licenciasProp, error }: LicenciasListingProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedLicenciaId, setSelectedLicenciaId] = useState<string | number | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Los datos ya vienen transformados desde la API /api/mira/licencias
  const mappedLicencias = useMemo(() => {
    if (!licenciasProp || !Array.isArray(licenciasProp)) return []
    
    return licenciasProp.map((licencia: any) => ({
      id: licencia.id || licencia.documentId,
      documentId: licencia.documentId || String(licencia.id || ''),
      codigo_activacion: licencia.codigo_activacion || '',
      fecha_activacion: licencia.fecha_activacion || null,
      activa: licencia.activa !== false,
      fecha_vencimiento: licencia.fecha_vencimiento || null,
      libro_mira: licencia.libro_mira || null,
      estudiante: licencia.estudiante || null,
      createdAt: licencia.createdAt || null,
      updatedAt: licencia.updatedAt || null,
    } as LicenciaType))
  }, [licenciasProp])

  const columns: ColumnDef<LicenciaType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<LicenciaType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<LicenciaType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      id: 'codigo_activacion',
      header: 'Código de Activación',
      accessorKey: 'codigo_activacion',
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <h6 className="mb-0">{row.original.codigo_activacion || 'Sin código'}</h6>
        </div>
      ),
    },
    {
      id: 'libro',
      header: 'Libro',
      accessorFn: (row) => row.libro_mira?.libro?.nombre_libro || '',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
      cell: ({ row }) => {
        const libro = row.original.libro_mira?.libro
        if (!libro) return '-'
        return (
          <div>
            <div className="fw-semibold">{libro.nombre_libro || '-'}</div>
            {libro.isbn_libro && (
              <small className="text-muted d-block">ISBN: {libro.isbn_libro}</small>
            )}
          </div>
        )
      },
    },
    {
      id: 'estudiante',
      header: 'Estudiante',
      accessorFn: (row) => {
        const persona = row.original.estudiante?.persona
        if (!persona) return ''
        return `${persona.nombres} ${persona.primer_apellido} ${persona.segundo_apellido || ''}`.trim()
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
      cell: ({ row }) => {
        const estudiante = row.original.estudiante
        if (!estudiante) return '-'
        const persona = estudiante.persona
        const nombreCompleto = persona
          ? `${persona.nombres} ${persona.primer_apellido} ${persona.segundo_apellido || ''}`.trim()
          : '-'
        return (
          <div>
            <div className="fw-semibold">{nombreCompleto}</div>
            {estudiante.email && (
              <small className="text-muted d-block">{estudiante.email}</small>
            )}
            {estudiante.colegio?.nombre && (
              <small className="text-muted d-block">{estudiante.colegio.nombre}</small>
            )}
            {(estudiante.nivel || estudiante.curso) && (
              <small className="text-muted d-block">
                {estudiante.nivel} {estudiante.curso ? `- ${estudiante.curso}` : ''}
              </small>
            )}
          </div>
        )
      },
    },
    {
      id: 'fecha_activacion',
      header: 'Fecha Activación',
      accessorKey: 'fecha_activacion',
      enableSorting: true,
      cell: ({ row }) => {
        const fecha = row.original.fecha_activacion
        if (!fecha) return '-'
        try {
          const date = new Date(fecha)
          return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        } catch {
          return '-'
        }
      },
    },
    {
      id: 'fecha_vencimiento',
      header: 'Fecha Vencimiento',
      accessorKey: 'fecha_vencimiento',
      enableSorting: true,
      cell: ({ row }) => {
        const fecha = row.original.fecha_vencimiento
        if (!fecha) return '-'
        try {
          const date = new Date(fecha)
          return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        } catch {
          return '-'
        }
      },
    },
    {
      id: 'activa',
      header: 'Estado',
      accessorKey: 'activa',
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <Badge bg={row.original.activa ? 'success' : 'secondary'}>
          {row.original.activa ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      id: 'tiene_omr',
      header: 'OMR',
      accessorFn: (row) => row.libro_mira?.tiene_omr || false,
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <Badge bg={row.original.libro_mira?.tiene_omr ? 'info' : 'secondary'}>
          {row.original.libro_mira?.tiene_omr ? 'Sí' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'fechas',
      header: 'Fechas',
      enableSorting: true,
      accessorFn: (row) => row.updatedAt || row.createdAt || '',
      cell: ({ row }) => {
        const updatedAt = row.original.updatedAt
        const createdAt = row.original.createdAt
        
        const formatDate = (dateStr: string | null | undefined) => {
          if (!dateStr) return '-'
          try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          } catch {
            return '-'
          }
        }
        
        return (
          <div className="small">
            {updatedAt && (
              <div>
                <span className="text-muted">Mod:</span> {formatDate(updatedAt)}
              </div>
            )}
            {createdAt && (
              <div>
                <span className="text-muted">Creado:</span> {formatDate(createdAt)}
              </div>
            )}
            {!updatedAt && !createdAt && '-'}
          </div>
        )
      },
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="d-flex gap-1">
          <Button
            variant="outline-primary"
            size="sm"
            className="btn-icon rounded-circle"
            onClick={() => {
              // TODO: Implementar edición
              alert('Edición de licencia - Próximamente')
            }}
            title="Editar"
          >
            <TbEdit className="fs-lg" />
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            className="btn-icon rounded-circle"
            onClick={() => {
              setSelectedRowIds({})
              setSelectedLicenciaId(row.original.id)
              setShowDeleteModal(true)
            }}
            title="Eliminar"
          >
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const [data, setData] = useState<LicenciaType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'fecha_activacion', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  useEffect(() => {
    setData(mappedLicencias)
  }, [mappedLicencias])

  const table = useReactTable<LicenciaType>({
    data,
    columns,
    getRowId: (row) => String(row.id || row.documentId || Math.random()),
    state: { sorting, globalFilter, columnFilters, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const handleDelete = async () => {
    const selectedIds: (string | number)[] = []
    
    if (selectedLicenciaId) {
      selectedIds.push(selectedLicenciaId)
    } else {
      const selectedRows = table.getSelectedRowModel().rows
      if (selectedRows.length > 0) {
        selectedIds.push(...selectedRows.map(row => row.original.id))
      }
    }

    if (selectedIds.length === 0) {
      alert('No hay licencias seleccionadas para eliminar')
      setShowDeleteModal(false)
      return
    }

    setLoading(true)
    try {
      // TODO: Implementar eliminación
      alert('Eliminación de licencias - Próximamente')
      setShowDeleteModal(false)
      setSelectedLicenciaId(null)
      setSelectedRowIds({})
    } catch (error: any) {
      console.error('Error al eliminar licencia(s):', error)
      alert('Error al eliminar licencia(s): ' + error.message)
      setShowDeleteModal(false)
    } finally {
      setLoading(false)
    }
  }

  const recargarLicencias = async () => {
    setLoading(true)
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/mira/licencias?_t=${timestamp}`, {
        cache: 'no-store',
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && Array.isArray(result.data)) {
        const nuevasLicencias = result.data.map((licencia: any) => ({
          id: licencia.id || licencia.documentId,
          documentId: licencia.documentId || String(licencia.id || ''),
          codigo_activacion: licencia.codigo_activacion || '',
          fecha_activacion: licencia.fecha_activacion || null,
          activa: licencia.activa !== false,
          fecha_vencimiento: licencia.fecha_vencimiento || null,
          libro_mira: licencia.libro_mira || null,
          estudiante: licencia.estudiante || null,
          createdAt: licencia.createdAt || null,
          updatedAt: licencia.updatedAt || null,
        } as LicenciaType))
        
        setData(nuevasLicencias)
      }
    } catch (refreshError: any) {
      console.error('Error al recargar licencias:', refreshError)
      alert('Error al recargar licencias: ' + refreshError.message)
    } finally {
      setLoading(false)
    }
  }

  if (error && mappedLicencias.length === 0) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar licencias:</strong> {error}
          </Alert>
        </Col>
      </Row>
    )
  }

  return (
    <Row>
      <Col xs={12}>
        <Card className="mb-4">
          <CardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex gap-2">
              <div className="app-search">
                <input
                  type="search"
                  className="form-control"
                  placeholder="Buscar por código, libro, estudiante..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('activa')?.getFilterValue() as string) ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '') {
                      table.getColumn('activa')?.setFilterValue(undefined)
                    } else {
                      table.getColumn('activa')?.setFilterValue(value === 'true')
                    }
                  }}>
                  <option value="">Todos los Estados</option>
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}>
                  {[5, 10, 15, 20, 25].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex gap-1">
              {Object.keys(selectedRowIds).length > 0 && (
                <Button 
                  variant="danger" 
                  onClick={() => {
                    setSelectedLicenciaId(null)
                    setShowDeleteModal(true)
                  }}
                >
                  <TbTrash className="fs-sm me-2" /> Eliminar Seleccionadas ({Object.keys(selectedRowIds).length})
                </Button>
              )}
              <Button 
                variant="outline-secondary" 
                onClick={() => recargarLicencias()}
                disabled={loading}
                title="Recargar licencias"
              >
                <LuRefreshCw className={`fs-sm me-2 ${loading ? 'spinning' : ''}`} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> 
                {loading ? 'Recargando...' : 'Recargar'}
              </Button>
              <Button 
                variant="success" 
                onClick={() => {
                  // TODO: Implementar importación masiva
                  alert('Importación masiva - Próximamente')
                }}
              >
                <LuUpload className="fs-sm me-2" /> Importación Masiva
              </Button>
            </div>
          </CardHeader>

          <DataTable<LicenciaType>
            table={table}
            emptyMessage="No se encontraron licencias"
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="licencias"
                showInfo
                previousPage={table.previousPage}
                canPreviousPage={table.getCanPreviousPage()}
                pageCount={table.getPageCount()}
                pageIndex={table.getState().pagination.pageIndex}
                setPageIndex={table.setPageIndex}
                nextPage={table.nextPage}
                canNextPage={table.getCanNextPage()}
              />
            </CardFooter>
          )}

          <DeleteConfirmationModal
            show={showDeleteModal}
            onHide={() => {
              setShowDeleteModal(false)
              setSelectedLicenciaId(null)
            }}
            onConfirm={handleDelete}
            selectedCount={
              selectedLicenciaId 
                ? 1 
                : Object.keys(selectedRowIds).length
            }
            itemName="licencia"
          />
        </Card>
      </Col>
    </Row>
  )
}
