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
  useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button, Card, CardBody, CardFooter, CardHeader, Alert, Form } from 'react-bootstrap'
import { LuSearch, LuMapPin, LuPhone, LuMail, LuX, LuUsers } from 'react-icons/lu'
import { TbEye, TbDots } from 'react-icons/tb'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'

interface ColegioType {
  id: string
  nombre: string
  rbd?: string
  tipo?: string
  direccion?: string
  comuna?: string
  region?: string
  telefonos?: string[]
  emails?: string[]
  website?: string
  contactosCount?: number
  representante?: string
  origen?: string
  createdAt?: string
  estado?: string
}

const columnHelper = createColumnHelper<ColegioType>()

// Lista de regiones de Chile (principales)
const REGIONES = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
]

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'Por Verificar', label: 'Por Verificar' },
  { value: 'Verificado', label: 'Verificado' },
  { value: 'Aprobado', label: 'Aprobado' },
]

const ColegiosListing = ({ colegios: initialColegios, error: initialError }: { colegios: any[]; error: string | null }) => {
  const [colegios, setColegios] = useState<any[]>(initialColegios)
  const [error, setError] = useState<string | null>(initialError)
  const [loading, setLoading] = useState(false)
  
  // Estados de búsqueda y filtros
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [region, setRegion] = useState('')
  
  // Estados de tabla
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'nombre', desc: false }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const [totalRows, setTotalRows] = useState(0)

  // Función para obtener datos
  const fetchColegios = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      params.append('page', (pagination.pageIndex + 1).toString())
      params.append('pageSize', pagination.pageSize.toString())
      if (search) params.append('search', search)
      if (estado) params.append('estado', estado)
      if (region) params.append('region', region)

      const response = await fetch(`/api/crm/colegios?${params.toString()}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        setColegios(Array.isArray(data.data) ? data.data : [data.data])
        setTotalRows(data.meta?.pagination?.total || 0)
      } else {
        setError(data.error || 'Error al obtener colegios')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
    } finally {
      setLoading(false)
    }
  }, [search, estado, region, pagination.pageIndex, pagination.pageSize])

  // Debounce para búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchColegios()
    }, 300) // 300ms de debounce

    return () => clearTimeout(timeoutId)
  }, [fetchColegios])

  // Mapear datos de Strapi al formato esperado
  const mappedColegios: ColegioType[] = useMemo(() => {
    if (!colegios || !Array.isArray(colegios)) return []
    
    return colegios.map((colegio: any) => {
      const attrs = colegio.attributes || {}
      const data = Object.keys(attrs).length > 0 ? attrs : colegio
      
      // Obtener primer teléfono, email y dirección de los componentes
      const telefonos = data.telefonos || []
      const emails = data.emails || []
      const direcciones = data.direcciones || []
      
      // Obtener comuna (puede venir como relación)
      let comunaNombre = ''
      if (data.comuna) {
        if (data.comuna.data?.attributes?.nombre) {
          comunaNombre = data.comuna.data.attributes.nombre
        } else if (data.comuna.attributes?.nombre) {
          comunaNombre = data.comuna.attributes.nombre
        } else if (typeof data.comuna === 'string') {
          comunaNombre = data.comuna
        } else if (data.comuna.nombre) {
          comunaNombre = data.comuna.nombre
        }
      }
      
      return {
        id: colegio.id?.toString() || '',
        nombre: data.colegio_nombre || data.nombre || data.NOMBRE || 'Sin nombre',
        rbd: data.rbd?.toString() || '',
        direccion: direcciones[0]?.calle || direcciones[0]?.direccion || direcciones[0]?.direccion_completa || data.direccion || data.DIRECCION || '',
        comuna: comunaNombre,
        region: data.region || data.REGION || '',
        telefono: telefonos[0]?.numero || telefonos[0]?.telefono || data.telefono || data.TELEFONO || '',
        email: emails[0]?.email || data.email || data.EMAIL || '',
        estado: data.estado || data.ESTADO || '',
        createdAt: data.createdAt || colegio.createdAt || '',
      }
    })
  }, [colegios])

  const columns = useMemo<ColumnDef<ColegioType>[]>(
    () => [
      columnHelper.accessor('nombre', {
        header: 'NOMBRE',
        cell: ({ row }) => {
          const nombre = row.original.nombre
          return (
            <div>
              <h5 className="mb-0">
                <Link href={`/crm/colegios/${row.original.id}`} className="link-reset fw-semibold">
                  {nombre}
                </Link>
              </h5>
            </div>
          )
        },
      }),
      columnHelper.accessor('rbd', {
        header: 'RBD',
        cell: ({ getValue }) => getValue() || <span className="text-muted">-</span>,
      }),
      columnHelper.accessor('direccion', {
        header: 'DIRECCIÓN',
        cell: ({ row }) => {
          const direccion = row.original.direccion
          const comuna = row.original.comuna
          return (
            <div className="d-flex align-items-center">
              <LuMapPin className="me-1 text-muted" size={16} />
              <span>
                {direccion || '-'}
                {comuna && `, ${comuna}`}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor('telefono', {
        header: 'TELÉFONO',
        cell: ({ row }) => {
          const telefono = row.original.telefono
          return telefono ? (
            <div className="d-flex align-items-center">
              <LuPhone className="me-1 text-muted" size={16} />
              <span>{telefono}</span>
            </div>
          ) : (
            <span className="text-muted">-</span>
          )
        },
      }),
      columnHelper.accessor('email', {
        header: 'EMAIL',
        cell: ({ row }) => {
          const email = row.original.email
          return email ? (
            <div className="d-flex align-items-center">
              <LuMail className="me-1 text-muted" size={16} />
              <span>{email}</span>
            </div>
          ) : (
            <span className="text-muted">-</span>
          )
        },
      }),
      columnHelper.accessor('estado', {
        header: 'ESTADO',
        cell: ({ getValue }) => {
          const estado = getValue()
          if (!estado) return <span className="text-muted">-</span>
          const variant = estado === 'Aprobado' ? 'success' : estado === 'Verificado' ? 'info' : 'warning'
          return (
            <span className={`badge badge-soft-${variant}`}>
              {estado}
            </span>
          )
        },
      }),
      {
        header: 'ACCIONES',
        cell: ({ row }) => (
          <div className="d-flex gap-1">
            <Link href={`/crm/colegios/${row.original.id}`} passHref>
              <Button variant="default" size="sm" className="btn-icon rounded-circle" title="Ver detalle">
                <TbEye className="fs-lg" />
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: mappedColegios,
    columns,
    pageCount: Math.ceil(totalRows / pagination.pageSize),
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true, // Paginación del servidor
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalRows)

  const clearFilters = () => {
    setSearch('')
    setEstado('')
    setRegion('')
  }

  const hasActiveFilters = search || estado || region

  if (error && !colegios.length) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h4 className="mb-0">Listado de Colegios</h4>
      </CardHeader>
      <CardBody>
        {/* Búsqueda */}
        <div className="mb-3">
          <div className="app-search">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar por nombre o RBD..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
            <LuSearch className="app-search-icon text-muted" />
          </div>
        </div>

        {/* Filtros */}
        <div className="d-flex gap-2 mb-3 flex-wrap align-items-end">
          <div style={{ minWidth: '200px' }}>
            <Form.Label className="form-label text-muted mb-1" style={{ fontSize: '0.875rem' }}>
              Estado
            </Form.Label>
            <Form.Select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              disabled={loading}
            >
              {ESTADOS.map((est) => (
                <option key={est.value} value={est.value}>
                  {est.label}
                </option>
              ))}
            </Form.Select>
          </div>

          <div style={{ minWidth: '200px' }}>
            <Form.Label className="form-label text-muted mb-1" style={{ fontSize: '0.875rem' }}>
              Región
            </Form.Label>
            <Form.Select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={loading}
            >
              <option value="">Todas las regiones</option>
              {REGIONES.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </Form.Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline-secondary"
              onClick={clearFilters}
              disabled={loading}
              className="d-flex align-items-center gap-1"
            >
              <LuX size={16} />
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Tabla */}
        {loading && colegios.length === 0 ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <Alert variant="warning" className="mb-3">
                <strong>Advertencia:</strong> {error}
              </Alert>
            )}
            <DataTable table={table} />
          </>
        )}
      </CardBody>
      {table.getRowModel().rows.length > 0 && (
        <CardFooter className="border-0">
          <TablePagination
            totalItems={totalRows}
            start={start}
            end={end}
            itemsName="colegios"
            showInfo
            previousPage={table.previousPage}
            canPreviousPage={table.getCanPreviousPage()}
            pageCount={table.getPageCount()}
            pageIndex={pageIndex}
            setPageIndex={table.setPageIndex}
            nextPage={table.nextPage}
            canNextPage={table.getCanNextPage()}
          />
        </CardFooter>
      )}
    </Card>
  )
}

export default ColegiosListing
