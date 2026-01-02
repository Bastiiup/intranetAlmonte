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

  // Función para generar iniciales
  const generarIniciales = (nombre: string) => {
    const palabras = nombre.split(' ')
    if (palabras.length >= 2) {
      return (palabras[0][0] + palabras[1][0]).toUpperCase()
    }
    return nombre.substring(0, 2).toUpperCase()
  }

  // Mapear datos de Strapi al formato esperado
  const mappedColegios: ColegioType[] = useMemo(() => {
    if (!colegios || !Array.isArray(colegios)) return []
    
    return colegios.map((colegio: any) => {
      const attrs = colegio.attributes || {}
      const data = Object.keys(attrs).length > 0 ? attrs : colegio
      
      // Obtener teléfonos y emails (todos)
      const telefonosArray = data.telefonos || []
      const emailsArray = data.emails || []
      const telefonos = telefonosArray.map((t: any) => t.telefono_norm || t.telefono_raw || t.numero || t.telefono || '').filter(Boolean)
      const emails = emailsArray.map((e: any) => e.email || '').filter(Boolean)
      
      // Obtener comuna (puede venir como relación)
      let comunaNombre = ''
      let regionNombre = ''
      if (data.comuna) {
        if (data.comuna.data?.attributes) {
          comunaNombre = data.comuna.data.attributes.comuna_nombre || data.comuna.data.attributes.nombre || ''
          regionNombre = data.comuna.data.attributes.region_nombre || ''
        } else if (data.comuna.attributes) {
          comunaNombre = data.comuna.attributes.comuna_nombre || data.comuna.attributes.nombre || ''
          regionNombre = data.comuna.attributes.region_nombre || ''
        } else if (typeof data.comuna === 'string') {
          comunaNombre = data.comuna
        } else if (data.comuna.comuna_nombre || data.comuna.nombre) {
          comunaNombre = data.comuna.comuna_nombre || data.comuna.nombre || ''
          regionNombre = data.comuna.region_nombre || ''
        }
      }
      
      // Obtener representante comercial
      const asignaciones = data.cartera_asignaciones || []
      const asignacionComercial = asignaciones
        .filter((ca: any) => ca.is_current && ca.rol === 'comercial' && ca.estado === 'activa')
        .sort((a: any, b: any) => {
          const prioridadOrder: Record<string, number> = { alta: 3, media: 2, baja: 1 }
          const prioridadA = (a.prioridad || 'baja') as keyof typeof prioridadOrder
          const prioridadB = (b.prioridad || 'baja') as keyof typeof prioridadOrder
          return (prioridadOrder[prioridadB] || 0) - (prioridadOrder[prioridadA] || 0)
        })[0]
      const representante = asignacionComercial?.ejecutivo?.nombre_completo || asignacionComercial?.ejecutivo?.data?.attributes?.nombre_completo || ''
      
      // Obtener tipo (puede venir de dependencia o tipo)
      const tipo = data.tipo || data.dependencia || 'Colegio'
      
      return {
        id: colegio.id?.toString() || colegio.documentId || '',
        nombre: data.colegio_nombre || data.nombre || data.NOMBRE || 'Sin nombre',
        rbd: data.rbd?.toString() || '',
        tipo,
        direccion: data.direccion || data.DIRECCION || '',
        comuna: comunaNombre,
        region: regionNombre || data.region || data.REGION || '',
        telefonos,
        emails,
        website: data.website || '',
        contactosCount: 0, // TODO: calcular desde relaciones
        representante,
        origen: data.origen || '',
        estado: data.estado || data.ESTADO || '',
        createdAt: data.createdAt || colegio.createdAt || '',
      }
    })
  }, [colegios])

  const columns = useMemo<ColumnDef<ColegioType>[]>(
    () => [
      {
        id: 'select',
        maxSize: 45,
        size: 45,
        header: ({ table }) => (
          <input
            type="checkbox"
            className="form-check-input form-check-input-light fs-14"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
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
        id: 'institucion',
        header: 'INSTITUCIÓN',
        cell: ({ row }) => {
          const colegio = row.original
          const iniciales = generarIniciales(colegio.nombre)
          return (
            <div className="d-flex align-items-center">
              <div className="avatar-sm rounded-circle me-2 flex-shrink-0 bg-secondary-subtle d-flex align-items-center justify-content-center">
                <span className="avatar-title text-secondary fw-semibold fs-12">
                  {iniciales}
                </span>
              </div>
              <div>
                <div className="fw-medium">{colegio.nombre}</div>
                {colegio.tipo && (
                  <div className="text-muted fs-xs">{colegio.tipo}</div>
                )}
              </div>
            </div>
          )
        },
      },
      {
        id: 'comunicacion',
        header: 'COMUNICACIÓN',
        cell: ({ row }) => {
          const colegio = row.original
          return (
            <div className="fs-xs">
              {colegio.emails && colegio.emails.length > 0 && (
                <div className="mb-1">
                  {colegio.emails.map((email, idx) => (
                    <div key={idx} className="d-flex align-items-center">
                      <LuMail className="me-1" size={12} />
                      <span>{email}</span>
                    </div>
                  ))}
                </div>
              )}
              {colegio.telefonos && colegio.telefonos.length > 0 && (
                <div>
                  {colegio.telefonos.map((tel, idx) => (
                    <div key={idx} className="d-flex align-items-center">
                      <LuPhone className="me-1" size={12} />
                      <span>{tel}</span>
                    </div>
                  ))}
                </div>
              )}
              {(!colegio.emails?.length && !colegio.telefonos?.length) && (
                <span className="text-muted">-</span>
              )}
            </div>
          )
        },
      },
      {
        id: 'direccion',
        header: 'DIRECCIÓN',
        cell: ({ row }) => {
          const colegio = row.original
          return (
            <div className="fs-xs">
              {colegio.direccion && (
                <div>{colegio.direccion}</div>
              )}
              {colegio.comuna && (
                <div className="text-muted">{colegio.comuna}</div>
              )}
              {!colegio.direccion && !colegio.comuna && (
                <span className="text-muted">-</span>
              )}
            </div>
          )
        },
      },
      {
        id: 'contactos',
        header: 'CONTACTOS',
        cell: ({ row }) => {
          const colegio = row.original
          return (
            <div className="d-flex align-items-center">
              <LuUsers className="me-1 text-muted" size={16} />
              <span>{colegio.contactosCount || 0}</span>
            </div>
          )
        },
      },
      {
        id: 'representante',
        header: 'REPRESENTANTE',
        cell: ({ row }) => {
          const colegio = row.original
          return colegio.representante ? (
            <span>{colegio.representante}</span>
          ) : (
            <span className="text-muted">-</span>
          )
        },
      },
      {
        id: 'fechaOrigen',
        header: 'FECHA / ORIGEN',
        cell: ({ row }) => {
          const colegio = row.original
          const isNew = colegio.createdAt && 
            (Date.now() - new Date(colegio.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000
          
          const daysAgo = colegio.createdAt 
            ? Math.floor((Date.now() - new Date(colegio.createdAt).getTime()) / (24 * 60 * 60 * 1000))
            : null
          
          const origenLabel = colegio.origen || ''
          
          return (
            <div className="fs-xs">
              {isNew && (
                <span className="badge bg-success-subtle text-success mb-1 d-block" style={{ width: 'fit-content' }}>Nuevo</span>
              )}
              {daysAgo !== null && (
                <div className={isNew ? '' : 'mb-1'}>
                  {daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? '1 día' : `${daysAgo} días`}
                </div>
              )}
              {origenLabel && (
                <span className="badge badge-soft-primary">{origenLabel}</span>
              )}
              {!colegio.createdAt && !colegio.origen && (
                <span className="text-muted">-</span>
              )}
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant="default" size="sm" className="btn-icon">
            <TbDots className="fs-lg" />
          </Button>
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
