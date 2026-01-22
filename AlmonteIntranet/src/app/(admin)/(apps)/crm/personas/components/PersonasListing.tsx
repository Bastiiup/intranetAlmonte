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
import { LuSearch, LuUser, LuCalendar, LuX } from 'react-icons/lu'
import { TbEye } from 'react-icons/tb'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'

interface PersonaType {
  id: string
  nombre_completo: string
  rut?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  genero?: string
  cumpleagno?: string
  activo?: boolean
  origen?: string
  createdAt?: string
}

const columnHelper = createColumnHelper<PersonaType>()

const ESTADOS_ACTIVO = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activo' },
  { value: 'false', label: 'Inactivo' },
]

const ORIGENES = [
  { value: '', label: 'Todos los orígenes' },
  { value: 'mineduc', label: 'MINEDUC' },
  { value: 'csv', label: 'CSV' },
  { value: 'manual', label: 'Manual' },
  { value: 'crm', label: 'CRM' },
  { value: 'web', label: 'Web' },
  { value: 'otro', label: 'Otro' },
]

const PersonasListing = ({ personas: initialPersonas, error: initialError }: { personas: any[]; error: string | null }) => {
  const [personas, setPersonas] = useState<any[]>(initialPersonas)
  const [error, setError] = useState<string | null>(initialError)
  const [loading, setLoading] = useState(false)
  
  // Estados de búsqueda y filtros
  const [search, setSearch] = useState('')
  const [activo, setActivo] = useState('')
  const [origen, setOrigen] = useState('')
  
  // Estados de tabla
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'nombre_completo', desc: false }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  // Función para obtener datos
  const fetchPersonas = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (activo) params.append('activo', activo)
      if (origen) params.append('origen', origen)

      const response = await fetch(`/api/crm/personas?${params.toString()}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        setPersonas(Array.isArray(data.data) ? data.data : [data.data])
      } else {
        setError(data.error || 'Error al obtener personas')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
    } finally {
      setLoading(false)
    }
  }, [search, activo, origen])

  // Debounce para búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPersonas()
    }, 300) // 300ms de debounce

    return () => clearTimeout(timeoutId)
  }, [search, activo, origen, fetchPersonas])

  // Mapear datos de Strapi al formato esperado
  const mappedPersonas: PersonaType[] = useMemo(() => {
    if (!personas || !Array.isArray(personas)) return []
    
    return personas.map((persona: any) => {
      const attrs = persona.attributes || {}
      const data = Object.keys(attrs).length > 0 ? attrs : persona
      
      // Construir nombre completo si no existe
      let nombreCompleto = data.nombre_completo || data.NOMBRE_COMPLETO || ''
      if (!nombreCompleto) {
        const nombres = data.nombres || data.NOMBRES || ''
        const primerApellido = data.primer_apellido || data.PRIMER_APELLIDO || ''
        const segundoApellido = data.segundo_apellido || data.SEGUNDO_APELLIDO || ''
        nombreCompleto = [nombres, primerApellido, segundoApellido].filter(Boolean).join(' ') || 'Sin nombre'
      }
      
      return {
        id: persona.id?.toString() || '',
        nombre_completo: nombreCompleto,
        rut: data.rut || data.RUT || '',
        nombres: data.nombres || data.NOMBRES || '',
        primer_apellido: data.primer_apellido || data.PRIMER_APELLIDO || '',
        segundo_apellido: data.segundo_apellido || data.SEGUNDO_APELLIDO || '',
        genero: data.genero || data.GENERO || '',
        cumpleagno: data.cumpleagno || data.CUMPLEAGNO || '',
        activo: data.activo !== undefined ? data.activo : true,
        origen: data.origen || data.ORIGEN || '',
        createdAt: data.createdAt || persona.createdAt || '',
      }
    })
  }, [personas])

  const columns = useMemo<ColumnDef<PersonaType>[]>(
    () => [
      columnHelper.accessor('nombre_completo', {
        header: 'NOMBRE COMPLETO',
        cell: ({ row }) => {
          const nombre = row.original.nombre_completo
          return (
            <div className="d-flex align-items-center">
              <LuUser className="me-2 text-muted" size={18} />
              <h5 className="mb-0">
                <Link href={`/crm/contacts/${row.original.id}`} className="link-reset fw-semibold">
                  {nombre}
                </Link>
              </h5>
            </div>
          )
        },
      }),
      columnHelper.accessor('rut', {
        header: 'RUT',
        cell: ({ getValue }) => getValue() || <span className="text-muted">-</span>,
      }),
      columnHelper.accessor('genero', {
        header: 'GÉNERO',
        cell: ({ getValue }) => {
          const genero = getValue()
          if (!genero) return <span className="text-muted">-</span>
          return <span>{genero === 'Mujer' ? 'Femenino' : genero === 'Hombre' ? 'Masculino' : genero}</span>
        },
      }),
      columnHelper.accessor('cumpleagno', {
        header: 'FECHA DE NACIMIENTO',
        cell: ({ row }) => {
          const cumpleagno = row.original.cumpleagno
          if (!cumpleagno) return <span className="text-muted">-</span>
          // Formatear fecha si es necesario
          const date = new Date(cumpleagno)
          const formatted = isNaN(date.getTime()) ? cumpleagno : date.toLocaleDateString('es-CL')
          return (
            <div className="d-flex align-items-center">
              <LuCalendar className="me-1 text-muted" size={16} />
              <span>{formatted}</span>
            </div>
          )
        },
      }),
      columnHelper.accessor('activo', {
        header: 'ESTADO',
        cell: ({ getValue }) => {
          const activo = getValue()
          return (
            <span className={`badge badge-soft-${activo ? 'success' : 'danger'}`}>
              {activo ? 'Activo' : 'Inactivo'}
            </span>
          )
        },
      }),
      {
        header: 'ACCIONES',
        cell: ({ row }) => (
          <div className="d-flex gap-1">
            <Link href={`/crm/contacts/${row.original.id}`} passHref>
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
    data: mappedPersonas,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const clearFilters = () => {
    setSearch('')
    setActivo('')
    setOrigen('')
  }

  const hasActiveFilters = search || activo || origen

  if (error && !personas.length) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h4 className="mb-0">Listado de Personas</h4>
      </CardHeader>
      <CardBody>
        {/* Búsqueda */}
        <div className="mb-3">
          <div className="app-search">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar por nombre completo o RUT..."
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
              value={activo}
              onChange={(e) => setActivo(e.target.value)}
              disabled={loading}
            >
              {ESTADOS_ACTIVO.map((est) => (
                <option key={est.value} value={est.value}>
                  {est.label}
                </option>
              ))}
            </Form.Select>
          </div>

          <div style={{ minWidth: '200px' }}>
            <Form.Label className="form-label text-muted mb-1" style={{ fontSize: '0.875rem' }}>
              Origen
            </Form.Label>
            <Form.Select
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              disabled={loading}
            >
              {ORIGENES.map((orig) => (
                <option key={orig.value} value={orig.value}>
                  {orig.label}
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
        {loading && personas.length === 0 ? (
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
      {table.getFilteredRowModel().rows.length > 0 && (
        <CardFooter className="border-0">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            itemsName="personas"
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

export default PersonasListing
