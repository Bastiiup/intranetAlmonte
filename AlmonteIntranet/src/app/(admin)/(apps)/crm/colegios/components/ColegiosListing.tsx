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
import Link from 'next/link'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button, Card, CardFooter, CardHeader, CardBody, Col, Row, Alert, Form } from 'react-bootstrap'
import { LuSearch, LuMapPin, LuPhone, LuMail, LuUsers, LuPlus, LuX, LuCalendar, LuDownload, LuUpload } from 'react-icons/lu'
import { TbEye, TbEdit, TbTrash, TbLayoutGrid, TbList } from 'react-icons/tb'
import { exportarListasColegioAExcel } from '@/helpers/excel'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import EditColegioModal from './EditColegioModal'
import AddColegioModal from './AddColegioModal'
import ImportarNivelesAsignaturasModal from './ImportarNivelesAsignaturasModal'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

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
  createdAt?: string
  estado?: string
  createdAtTimestamp?: number
}

const columnHelper = createColumnHelper<ColegioType>()

// Lista de regiones de Chile
export const REGIONES = [
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

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'Municipal', label: 'Municipal' },
  { value: 'Particular Subvencionado', label: 'Particular Subvencionado' },
  { value: 'Particular Pagado', label: 'Particular Pagado' },
  { value: 'Corporación', label: 'Corporación' },
  { value: 'Administración Delegada', label: 'Administración Delegada' },
]

const ColegiosListing = ({ colegios: initialColegios, error: initialError }: { colegios: any[]; error: string | null }) => {
  const router = useRouter()
  const [colegios, setColegios] = useState<any[]>(initialColegios)
  const [error, setError] = useState<string | null>(initialError)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [exportandoId, setExportandoId] = useState<string | number | null>(null)
  
  // Estados de búsqueda y filtros
  const [globalFilter, setGlobalFilter] = useState('')
  const [tipo, setTipo] = useState('')
  const [region, setRegion] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('')
  const [soloConContactos, setSoloConContactos] = useState<boolean>(false)
  
  // Estados de tabla
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAtTimestamp', desc: true } // Ordenar por fecha descendente (más nuevo primero)
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [totalRows, setTotalRows] = useState(0)
  
  // Estados de modales
  const [editModal, setEditModal] = useState<{ open: boolean; colegio: any | null }>({ open: false, colegio: null })
  const [addModal, setAddModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; colegio: any | null }>({ open: false, colegio: null })
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [showImportNivelesModal, setShowImportNivelesModal] = useState(false)

  // Función para obtener datos
  const fetchColegios = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      params.append('page', (pagination.pageIndex + 1).toString())
      params.append('pageSize', pagination.pageSize.toString())
      if (globalFilter) params.append('search', globalFilter)
      if (tipo) params.append('tipo', tipo)
      if (region) params.append('region', region)

      const response = await fetch(`/api/crm/colegios?${params.toString()}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        const colegiosData = Array.isArray(data.data) ? data.data : [data.data]
        setColegios(colegiosData)
        setTotalRows(data.meta?.pagination?.total || 0)
        
        // Obtener conteo de contactos para cada colegio
        const colegiosConContactos = await Promise.all(
          colegiosData.map(async (colegio: any) => {
            const colegioId = colegio.documentId || colegio.id
            if (!colegioId) return colegio
            
            try {
              const contactosResponse = await fetch(`/api/crm/colegios/${colegioId}/contacts`)
              const contactosData = await contactosResponse.json()
              if (contactosData.success && contactosData.data) {
                const contactosArray = Array.isArray(contactosData.data) ? contactosData.data : [contactosData.data]
                colegio._contactosCount = contactosArray.length
              } else {
                colegio._contactosCount = 0
              }
            } catch (err) {
              colegio._contactosCount = 0
            }
            return colegio
          })
        )
        setColegios(colegiosConContactos)
      } else {
        setError(data.error || 'Error al obtener colegios')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
    } finally {
      setLoading(false)
    }
  }, [globalFilter, tipo, region, pagination.pageIndex, pagination.pageSize])

  // Debounce para búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchColegios()
    }, 300)

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
      
      // Obtener teléfonos y emails
      const telefonosArray = data.telefonos || []
      const emailsArray = data.emails || []
      const telefonos = telefonosArray.map((t: any) => t.telefono_norm || t.telefono_raw || t.numero || t.telefono || '').filter(Boolean)
      const emails = emailsArray.map((e: any) => e.email || '').filter(Boolean)
      
      // Obtener comuna y región
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
      
      // Obtener tipo
      const tipo = data.dependencia || data.tipo || ''
      
      // Obtener dirección
      let direccionStr = ''
      if (Array.isArray(data.direcciones) && data.direcciones.length > 0) {
        const primeraDireccion = data.direcciones[0]
        direccionStr = `${primeraDireccion.nombre_calle || ''} ${primeraDireccion.numero_calle || ''}`.trim()
        if (!direccionStr && comunaNombre) {
          direccionStr = comunaNombre
        }
      } else if (data.direccion || data.DIRECCION) {
        direccionStr = data.direccion || data.DIRECCION
      } else if (comunaNombre) {
        direccionStr = comunaNombre
      }
      
      // Obtener fecha de creación
      const createdAt = data.createdAt || colegio.createdAt || new Date().toISOString()
      const createdDate = new Date(createdAt)
      
      return {
        id: colegio.documentId || colegio.id?.toString() || '',
        nombre: data.colegio_nombre || data.nombre || data.NOMBRE || 'Sin nombre',
        rbd: data.rbd?.toString() || '',
        tipo,
        direccion: direccionStr,
        comuna: comunaNombre,
        region: regionNombre || data.region || data.REGION || '',
        telefonos,
        emails,
        website: data.website || '',
        contactosCount: (colegio as any)._contactosCount || 0,
        representante,
        estado: data.estado || data.ESTADO || '',
        createdAt,
        createdAtTimestamp: createdDate.getTime(),
      }
    })
  }, [colegios])

  const columns: ColumnDef<ColegioType, any>[] = useMemo(() => [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<ColegioType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<ColegioType> }) => (
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
      accessorKey: 'nombre',
      enableSorting: true,
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
              <Link 
                href={`/crm/colegios/${colegio.id}`}
                className="text-decoration-none"
              >
                <h5 className="mb-0 fw-semibold text-primary" style={{ cursor: 'pointer' }}>
                  {colegio.nombre}
                </h5>
              </Link>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {colegio.rbd && (
                  <span className="badge badge-soft-secondary" style={{ fontSize: '11px' }}>
                    RBD: {colegio.rbd}
                  </span>
                )}
                {colegio.tipo && (
                  <span className="badge badge-soft-info">{colegio.tipo}</span>
                )}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      id: 'comunicacion',
      header: 'COMUNICACIÓN',
      filterFn: 'includesString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const colegio = row.original
        const emails = colegio.emails?.filter(e => e) || []
        const telefonos = colegio.telefonos?.filter(t => t) || []
        return (
          <div className="fs-xs">
            {emails.length > 0 && (
              <div className="mb-1 d-flex align-items-center">
                <LuMail className="me-1" size={12} />
                <span>{emails.join(', ')}</span>
              </div>
            )}
            {telefonos.length > 0 && (
              <div className="d-flex align-items-center">
                <LuPhone className="me-1" size={12} />
                <span>{telefonos.join(', ')}</span>
              </div>
            )}
            {emails.length === 0 && telefonos.length === 0 && (
              <span className="text-muted">-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'direccion',
      header: 'DIRECCIÓN',
      filterFn: 'includesString',
      enableColumnFilter: true,
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
      id: 'region',
      header: 'REGIÓN',
      accessorKey: 'region',
      filterFn: 'includesString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const colegio = row.original
        return colegio.region ? (
          <span>{colegio.region}</span>
        ) : (
          <span className="text-muted">-</span>
        )
      },
    },
    {
      id: 'contactos',
      header: 'CONTACTOS',
      accessorFn: (row) => row.contactosCount || 0,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true
        const count = row.original.contactosCount || 0
        return count > 0
      },
      enableColumnFilter: true,
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
      filterFn: 'includesString',
      enableColumnFilter: true,
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
      id: 'tipo',
      header: 'TIPO',
      accessorKey: 'tipo',
      filterFn: 'includesString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const colegio = row.original
        const tipoValor = colegio.tipo || '-'
        return (
          <span className="badge badge-soft-info fs-xxs">
            {tipoValor}
          </span>
        )
      },
    },
    {
      id: 'createdAtTimestamp',
      header: 'FECHA',
      accessorFn: (row) => row.createdAtTimestamp || 0,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue || (!filterValue.desde && !filterValue.hasta)) return true
        const createdAt = row.original.createdAt
        if (!createdAt) return false
        const fecha = new Date(createdAt)
        const fechaDesde = filterValue.desde ? new Date(filterValue.desde) : null
        const fechaHasta = filterValue.hasta ? new Date(filterValue.hasta) : null
        
        if (fechaDesde && fecha < fechaDesde) return false
        if (fechaHasta) {
          const fechaHastaFin = new Date(fechaHasta)
          fechaHastaFin.setHours(23, 59, 59, 999) // Incluir todo el día
          if (fecha > fechaHastaFin) return false
        }
        return true
      },
      enableColumnFilter: true,
      enableSorting: true,
      sortingFn: 'basic',
      cell: ({ row }) => {
        const colegio = row.original
        if (!colegio.createdAt) return <span className="text-muted">-</span>
        
        const createdDate = new Date(colegio.createdAt)
        const dateStr = format(createdDate, 'dd MMM, yyyy')
        const timeStr = format(createdDate, 'h:mm a')
        const isNew = colegio.createdAtTimestamp && 
          (Date.now() - colegio.createdAtTimestamp) <= 7 * 24 * 60 * 60 * 1000
        
        return (
          <>
            {isNew && (
              <span className="badge bg-success-subtle text-success mb-1 d-block" style={{ width: 'fit-content' }}>Nuevo</span>
            )}
            <div className="fs-xs">
              {dateStr} <small className="text-muted">{timeStr}</small>
            </div>
          </>
        )
      },
    },
    {
      id: 'actions',
      header: 'ACCIONES',
      cell: ({ row }: { row: TableRow<ColegioType> }) => {
        const colegio = row.original
        const estaExportando = exportandoId === colegio.id
        
        const handleExportar = async () => {
          setExportandoId(colegio.id)
          try {
            const response = await fetch(`/api/crm/listas/exportar-colegio?colegioId=${colegio.id}`)
            const result = await response.json()

            if (!result.success) {
              alert(`Error al obtener datos: ${result.error}`)
              return
            }

            if (!result.data.datosExcel || result.data.datosExcel.length === 0) {
              alert('No hay productos para exportar en este colegio')
              return
            }

            await exportarListasColegioAExcel(result.data)
          } catch (error: any) {
            console.error('Error al exportar:', error)
            alert(`Error al exportar: ${error.message || 'Error desconocido'}`)
          } finally {
            setExportandoId(null)
          }
        }
        
        return (
          <div className="d-flex gap-1">
            <Link href={`/crm/colegios/${colegio.id}`}>
              <Button variant="default" size="sm" className="btn-icon rounded-circle" title="Ver detalle">
                <TbEye className="fs-lg" />
              </Button>
            </Link>
            <Button
              variant="default"
              size="sm"
              className="btn-icon rounded-circle"
              title="Editar"
              onClick={() => {
                // Buscar el colegio original en los datos
                const originalColegio = colegios.find((c: any) => {
                  const cId = c.documentId || c.id?.toString() || ''
                  return cId === colegio.id
                })
                setEditModal({ open: true, colegio: originalColegio || colegio })
              }}
            >
              <TbEdit className="fs-lg" />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="btn-icon rounded-circle"
              title="Exportar listas a Excel"
              onClick={handleExportar}
              disabled={estaExportando}
            >
              <LuDownload className={`fs-lg ${estaExportando ? 'spinning' : ''}`} style={estaExportando ? { animation: 'spin 1s linear infinite' } : {}} />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="btn-icon rounded-circle"
              title="Eliminar"
              onClick={() => {
                const originalColegio = colegios.find((c: any) => {
                  const cId = c.documentId || c.id?.toString() || ''
                  return cId === colegio.id
                })
                setDeleteModal({ open: true, colegio: originalColegio || colegio })
              }}
            >
              <TbTrash className="fs-lg text-danger" />
            </Button>
          </div>
        )
      },
    },
  ], [colegios, exportandoId])

  const table = useReactTable<ColegioType>({
    data: mappedColegios,
    columns,
    state: { sorting, columnFilters, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnFilters: true,
    enableRowSelection: true,
    manualPagination: false, // Paginación del cliente (como productos)
    filterFns: {
      includesString: (row, columnId, filterValue) => {
        const value = row.getValue(columnId) as string
        if (!filterValue) return true
        if (!value) return false
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase())
      },
    },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  // Usar totalRows del servidor cuando hay búsqueda/filtros, sino usar datos locales
  const totalItems = globalFilter || tipo || region ? (totalRows > 0 ? totalRows : mappedColegios.length) : mappedColegios.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)

  const clearFilters = () => {
    setGlobalFilter('')
    setTipo('')
    setRegion('')
    setFiltroFechaDesde('')
    setFiltroFechaHasta('')
    setSoloConContactos(false)
    setColumnFilters([])
  }

  const hasActiveFilters = globalFilter || tipo || region || filtroFechaDesde || filtroFechaHasta || soloConContactos || columnFilters.length > 0

  const handleDelete = async () => {
    if (!deleteModal.colegio) return

    const colegioId = deleteModal.colegio.documentId || deleteModal.colegio.id
    
    if (!colegioId) {
      setError('No se pudo obtener el ID del colegio')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/crm/colegios/${colegioId}`, {
        method: 'DELETE',
      })

      let result: any = { success: true }
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            const text = await response.text()
            if (text && text.trim().length > 0) {
              result = JSON.parse(text)
            }
          } catch (parseError) {
            result = { success: true }
          }
        } else {
          result = { success: true }
        }
      }

      if (!response.ok || result.success === false) {
        throw new Error(result.error || 'Error al eliminar colegio')
      }

      setColegios(prev => prev.filter(c => {
        const cId = (c as any).documentId || (c as any).id
        return cId !== colegioId
      }))
      
      setDeleteModal({ open: false, colegio: null })
      setShowDeleteModal(false)
      setError(null)
      setSuccessMessage('Colegio eliminado exitosamente')
      
      router.refresh()
      fetchColegios()
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Error al eliminar colegio')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchColegios()
  }

  // Aplicar filtros de tipo, región, fecha y contactos como columnFilters
  useEffect(() => {
    const filters: ColumnFiltersState = []
    if (tipo) {
      filters.push({ id: 'tipo', value: tipo })
    }
    if (region) {
      filters.push({ id: 'region', value: region })
    }
    if (filtroFechaDesde || filtroFechaHasta) {
      filters.push({ id: 'createdAtTimestamp', value: { desde: filtroFechaDesde, hasta: filtroFechaHasta } })
    }
    if (soloConContactos) {
      filters.push({ id: 'contactos', value: true })
    }
    setColumnFilters(filters)
  }, [tipo, region, filtroFechaDesde, filtroFechaHasta, soloConContactos])

  if (error && !colegios.length) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="danger">
            <strong>Error:</strong> {error}
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
                  placeholder="Buscar por nombre, RBD, comuna..."
                  value={globalFilter ?? ''}
                  onChange={(e) => {
                    setGlobalFilter(e.target.value)
                    // Resetear a página 1 cuando cambia la búsqueda
                    setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
                  }}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>

              {Object.keys(selectedRowIds).length > 0 && (
                <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
                  Eliminar
                </Button>
              )}
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="me-2 fw-semibold">Filtrar por:</span>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={tipo}
                  onChange={(e) => {
                    setTipo(e.target.value)
                  }}
                >
                  {TIPOS.map((tip) => (
                    <option key={tip.value} value={tip.value}>
                      {tip.label}
                    </option>
                  ))}
                </select>
                <LuUsers className="app-search-icon text-muted" />
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value)
                  }}
                >
                  <option value="">Región</option>
                  {REGIONES.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
                <LuMapPin className="app-search-icon text-muted" />
              </div>

              <div className="app-search">
                <input
                  type="date"
                  className="form-control my-1 my-md-0"
                  placeholder="Desde"
                  value={filtroFechaDesde}
                  onChange={(e) => {
                    setFiltroFechaDesde(e.target.value)
                  }}
                  style={{ minWidth: '150px' }}
                />
                <LuCalendar className="app-search-icon text-muted" />
              </div>

              <div className="app-search">
                <input
                  type="date"
                  className="form-control my-1 my-md-0"
                  placeholder="Hasta"
                  value={filtroFechaHasta}
                  onChange={(e) => {
                    setFiltroFechaHasta(e.target.value)
                  }}
                  style={{ minWidth: '150px' }}
                />
                <LuCalendar className="app-search-icon text-muted" />
              </div>

              <div className="d-flex align-items-center">
                <input
                  type="checkbox"
                  className="form-check-input me-2"
                  id="soloConContactos"
                  checked={soloConContactos}
                  onChange={(e) => {
                    setSoloConContactos(e.target.checked)
                  }}
                />
                <label htmlFor="soloConContactos" className="form-check-label mb-0" style={{ cursor: 'pointer' }}>
                  Solo con contactos
                </label>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={clearFilters}
                  className="d-flex align-items-center gap-1"
                >
                  <LuX size={16} />
                  Limpiar
                </Button>
              )}

              <div>
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                >
                  {[5, 8, 10, 15, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex gap-1">
              <Button variant="outline-primary" className="btn-icon btn-soft-primary">
                <TbLayoutGrid className="fs-lg" />
              </Button>
              <Button variant="primary" className="btn-icon">
                <TbList className="fs-lg" />
              </Button>
              <Button variant="outline-success" className="ms-1" onClick={() => setShowImportNivelesModal(true)}>
                <LuUpload className="fs-sm me-2" /> Importar Niveles/Asignaturas
              </Button>
              <Button variant="danger" className="ms-1" onClick={() => setAddModal(true)}>
                <LuPlus className="fs-sm me-2" /> Agregar Colegio
              </Button>
            </div>
          </CardHeader>

          <CardBody>
            {successMessage && (
              <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)} className="mb-3">
                {successMessage}
              </Alert>
            )}
            {error && (
              <Alert variant="warning" dismissible onClose={() => setError(null)} className="mb-3">
                <strong>Advertencia:</strong> {error}
              </Alert>
            )}

            {loading && mappedColegios.length === 0 ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : (
              <DataTable<ColegioType>
                table={table}
                emptyMessage="No se encontraron colegios"
              />
            )}
          </CardBody>

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="colegios"
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
            show={showDeleteModal || deleteModal.open}
            onHide={() => {
              setShowDeleteModal(false)
              setDeleteModal({ open: false, colegio: null })
            }}
            onConfirm={handleDelete}
            selectedCount={Object.keys(selectedRowIds).length || 1}
            itemName="colegio"
          />
        </Card>
      </Col>

      {/* Modal de agregar */}
      <AddColegioModal
        show={addModal}
        onHide={() => setAddModal(false)}
        onSuccess={() => {
          setAddModal(false)
          setSuccessMessage('Colegio creado exitosamente')
          setTimeout(() => setSuccessMessage(null), 3000)
          router.refresh()
          fetchColegios()
        }}
      />

      {/* Modal de edición */}
      <EditColegioModal
        show={editModal.open}
        onHide={() => setEditModal({ open: false, colegio: null })}
        colegio={editModal.colegio}
        onSuccess={() => {
          setEditModal({ open: false, colegio: null })
          setSuccessMessage('Colegio actualizado exitosamente')
          setTimeout(() => setSuccessMessage(null), 3000)
          router.refresh()
          fetchColegios()
        }}
      />

      {/* Modal de importación de niveles y asignaturas */}
      <ImportarNivelesAsignaturasModal
        show={showImportNivelesModal}
        onHide={() => setShowImportNivelesModal(false)}
        onSuccess={() => {
          setShowImportNivelesModal(false)
          setSuccessMessage('Niveles y asignaturas importados exitosamente')
          setTimeout(() => setSuccessMessage(null), 3000)
          router.refresh()
          fetchColegios()
        }}
      />
    </Row>
  )
}

export default ColegiosListing
