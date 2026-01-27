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
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert, Badge } from 'react-bootstrap'
import { LuSearch, LuRefreshCw, LuUpload } from 'react-icons/lu'
import { TbEdit } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import ImportadorModal from './ImportadorModal'
import EditLicenciaModal from './EditLicenciaModal'

export interface LicenciaType {
  id: number | string
  documentId?: string
  numeral?: number | null
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
  initialMeta?: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export default function LicenciasListing({ licencias: licenciasProp, error: initialError, initialMeta }: LicenciasListingProps) {
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedLicencia, setSelectedLicencia] = useState<LicenciaType | null>(null)
  const [data, setData] = useState<LicenciaType[]>([])
  const [error, setError] = useState<string | null>(initialError)
  const [paginationMeta, setPaginationMeta] = useState(initialMeta?.pagination || {
    page: 1,
    pageSize: 25,
    pageCount: 1,
    total: 0,
  })
  const isInitialMount = useRef(true)

  // Función para cargar licencias desde la API
  const cargarLicencias = useCallback(async (page: number = 1, pageSize: number = 25) => {
    setLoading(true)
    setError(null)
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/mira/licencias?page=${page}&pageSize=${pageSize}&_t=${timestamp}`, {
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
          numeral: typeof licencia.numeral === 'number' ? licencia.numeral : licencia.numeral != null ? Number(licencia.numeral) : null,
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
        
        // Actualizar meta de paginación
        if (result.meta?.pagination) {
          setPaginationMeta(result.meta.pagination)
        }
      } else {
        throw new Error(result.error || 'Error al obtener licencias')
      }
    } catch (loadError: any) {
      console.error('Error al cargar licencias:', loadError)
      setError(loadError.message || 'Error al cargar licencias')
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar datos iniciales
  useEffect(() => {
    if (licenciasProp && licenciasProp.length > 0) {
      const mappedLicencias = licenciasProp.map((licencia: any) => ({
        id: licencia.id || licencia.documentId,
        documentId: licencia.documentId || String(licencia.id || ''),
        numeral: typeof licencia.numeral === 'number' ? licencia.numeral : licencia.numeral != null ? Number(licencia.numeral) : null,
        codigo_activacion: licencia.codigo_activacion || '',
        fecha_activacion: licencia.fecha_activacion || null,
        activa: licencia.activa !== false,
        fecha_vencimiento: licencia.fecha_vencimiento || null,
        libro_mira: licencia.libro_mira || null,
        estudiante: licencia.estudiante || null,
        createdAt: licencia.createdAt || null,
        updatedAt: licencia.updatedAt || null,
      } as LicenciaType))
      setData(mappedLicencias)
      if (initialMeta?.pagination) {
        setPaginationMeta(initialMeta.pagination)
      }
      isInitialMount.current = false
    } else if (!initialError) {
      // Si no hay datos iniciales y no hay error, cargar la primera página
      cargarLicencias(1, 25)
      isInitialMount.current = false
    }
  }, [licenciasProp, initialError, initialMeta, cargarLicencias]) // Solo ejecutar cuando cambien los props iniciales

  // Los datos ya vienen transformados desde la API /api/mira/licencias
  const mappedLicencias = useMemo(() => data, [data])

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
      id: 'numeral',
      header: 'Numeral',
      accessorKey: 'numeral',
      enableSorting: true,
      cell: ({ row }) => {
        const valor = row.original.numeral
        return valor != null ? valor : '-'
      },
    },
    {
      id: 'libro',
      header: 'Libro',
      accessorFn: (row) => {
        // RUTA CRÍTICA: Licencia -> LibroMira -> Libro -> Nombre
        const libroMira = row.libro_mira
        const libro = libroMira?.libro
        return libro?.nombre_libro || ''
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
      cell: ({ row }) => {
        // RUTA CRÍTICA: Licencia -> LibroMira -> Libro -> Nombre
        // Usar optional chaining para evitar errores si falta algún nivel
        const libroMira = row.original.libro_mira
        const libro = libroMira?.libro
        
        if (!libro || !libro.nombre_libro) {
          return <span className="text-muted">Nombre no encontrado</span>
        }
        
        return (
          <div>
            <div className="fw-semibold">{libro.nombre_libro}</div>
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
        const persona = row.estudiante?.persona
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
              setSelectedLicencia(row.original)
              setShowEditModal(true)
            }}
            title="Editar"
          >
            <TbEdit className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'fecha_activacion', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })

  // Cargar datos cuando cambie la paginación (solo después del mount inicial)
  useEffect(() => {
    if (isInitialMount.current) {
      return // No cargar en el primer render si ya hay datos iniciales
    }
    const page = pagination.pageIndex + 1 // pageIndex es 0-based, pero la API espera 1-based
    const pageSize = pagination.pageSize
    cargarLicencias(page, pageSize)
  }, [pagination.pageIndex, pagination.pageSize, cargarLicencias])

  const table = useReactTable<LicenciaType>({
    data: mappedLicencias,
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
    // NO usar getPaginationRowModel porque la paginación es del lado del servidor
    manualPagination: true, // Paginación del lado del servidor
    pageCount: paginationMeta.pageCount, // Total de páginas desde el servidor
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = paginationMeta.total // Total desde el servidor

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const recargarLicencias = async () => {
    // Recargar la página actual
    const page = pagination.pageIndex + 1
    const pageSize = pagination.pageSize
    await cargarLicencias(page, pageSize)
  }

  if (error && data.length === 0 && !loading) {
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
                  onChange={(e) => {
                    const newPageSize = Number(e.target.value)
                    table.setPageSize(newPageSize)
                    table.setPageIndex(0) // Resetear a la primera página cuando cambie el tamaño
                  }}>
                  {[10, 25, 50, 100, 200].map((size) => (
                    <option key={size} value={size}>
                      {size} por página
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex gap-1">
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
                onClick={() => setShowImportModal(true)}
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

          <EditLicenciaModal
            show={showEditModal}
            onHide={() => {
              setShowEditModal(false)
              setSelectedLicencia(null)
            }}
            licencia={selectedLicencia}
            onSuccess={() => {
              recargarLicencias()
            }}
          />

          <ImportadorModal
            show={showImportModal}
            onHide={() => setShowImportModal(false)}
            onImportComplete={() => {
              setShowImportModal(false)
              recargarLicencias()
            }}
          />
        </Card>
      </Col>
    </Row>
  )
}
