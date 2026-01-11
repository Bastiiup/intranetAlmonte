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
import { LuSearch, LuMapPin, LuPhone, LuMail, LuX, LuUsers, LuPlus } from 'react-icons/lu'
import { TbEye, TbDots, TbEdit, TbTrash } from 'react-icons/tb'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import EditColegioModal from './EditColegioModal'
import AddColegioModal from './AddColegioModal'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [colegios, setColegios] = useState<any[]>(initialColegios)
  const [error, setError] = useState<string | null>(initialError)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
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
  
  // Estados de modales
  const [editModal, setEditModal] = useState<{ open: boolean; colegio: any | null }>({ open: false, colegio: null })
  const [addModal, setAddModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; colegio: any | null }>({ open: false, colegio: null })

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
      const tipo = data.dependencia || data.tipo || ''
      
      // Obtener dirección de direcciones array (usar campos correctos)
      let direccionStr = ''
      if (Array.isArray(data.direcciones) && data.direcciones.length > 0) {
        const primeraDireccion = data.direcciones[0]
        direccionStr = `${primeraDireccion.nombre_calle || ''} ${primeraDireccion.numero_calle || ''}`.trim()
        // Si no hay dirección en direcciones, usar comuna como fallback
        if (!direccionStr && comunaNombre) {
          direccionStr = comunaNombre
        }
      } else if (data.direccion || data.DIRECCION) {
        direccionStr = data.direccion || data.DIRECCION
      } else if (comunaNombre) {
        direccionStr = comunaNombre
      }
      
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
        contactosCount: 0, // TODO: calcular desde relaciones
        representante,
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
                <Link 
                  href={`/crm/colegios/${colegio.id}`}
                  className="text-decoration-none"
                >
                  <h5 className="mb-0 fw-semibold text-primary" style={{ cursor: 'pointer' }}>
                    {colegio.nombre}
                  </h5>
                </Link>
                {colegio.tipo && (
                  <span className="badge badge-soft-info">{colegio.tipo}</span>
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
          id: 'fecha',
          header: 'FECHA',
        cell: ({ row }) => {
          const colegio = row.original
          const isNew = colegio.createdAt && 
            (Date.now() - new Date(colegio.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000
          
          const daysAgo = colegio.createdAt 
            ? Math.floor((Date.now() - new Date(colegio.createdAt).getTime()) / (24 * 60 * 60 * 1000))
            : null
          
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
              {!colegio.createdAt && (
                <span className="text-muted">-</span>
              )}
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const colegio = row.original
          return (
            <div className="d-flex gap-1">
              <Button
                variant="default"
                size="sm"
                className="btn-icon"
                title="Editar"
                onClick={() => setEditModal({ open: true, colegio })}
              >
                <TbEdit className="fs-lg" />
              </Button>
              <Button
                variant="default"
                size="sm"
                className="btn-icon text-danger"
                title="Eliminar"
                onClick={() => setDeleteModal({ open: true, colegio })}
              >
                <TbTrash className="fs-lg" />
              </Button>
            </div>
          )
        },
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

  const handleDelete = async () => {
    if (!deleteModal.colegio) return

    // Obtener el ID correcto (documentId es el identificador principal en Strapi)
    const colegioId = deleteModal.colegio.documentId || deleteModal.colegio.id
    
    if (!colegioId) {
      setError('No se pudo obtener el ID del colegio')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/crm/colegios/${colegioId}`, {
        method: 'DELETE',
      })

      // Manejar respuestas vacías (204 No Content) o con JSON
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

      // Actualizar la lista localmente removiendo el colegio eliminado
      setColegios(prev => prev.filter(c => {
        const cId = (c as any).documentId || (c as any).id
        return cId !== colegioId
      }))
      
      // Cerrar modal y limpiar error
      setDeleteModal({ open: false, colegio: null })
      setError(null)
      setSuccessMessage('Colegio eliminado exitosamente')
      
      // Revalidar datos para sincronización bidireccional
      router.refresh()
      
      // Recargar datos
      fetchColegios()
      
      // Limpiar mensaje de éxito después de 3 segundos
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

  if (error && !colegios.length) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="justify-content-between align-items-center">
          <h4 className="mb-0">Listado de Colegios</h4>
          <div className="d-flex gap-2">
            <Button variant="soft-secondary" size="sm" onClick={handleRefresh} disabled={loading}>
              Actualizar
            </Button>
            <Button variant="primary" size="sm" onClick={() => setAddModal(true)}>
              <LuPlus className="me-1" /> Agregar Colegio
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
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
            <strong>Error:</strong> {error}
          </Alert>
        )}
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

    {/* Modal de agregar */}
      <AddColegioModal
        show={addModal}
        onHide={() => setAddModal(false)}
        onSuccess={() => {
          setAddModal(false)
          setSuccessMessage('Colegio creado exitosamente')
          setTimeout(() => setSuccessMessage(null), 3000)
          // Revalidar datos para sincronización bidireccional
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
          // Revalidar datos para sincronización bidireccional
          router.refresh()
          fetchColegios()
        }}
      />

    {/* Modal de confirmación de eliminación */}
    <DeleteConfirmationModal
      show={deleteModal.open}
      onHide={() => setDeleteModal({ open: false, colegio: null })}
      onConfirm={handleDelete}
      selectedCount={1}
      itemName="colegio"
      modalTitle="Eliminar Colegio"
      confirmButtonText="Eliminar Permanentemente"
      cancelButtonText="Cancelar"
    >
      <div>
        <p>¿Estás seguro de que deseas eliminar permanentemente <strong>{deleteModal.colegio?.nombre || deleteModal.colegio?.colegio_nombre}</strong>?</p>
        <p className="text-danger mb-0">
          <small>Esta acción no se puede deshacer. El colegio será eliminado permanentemente del sistema.</small>
        </p>
      </div>
    </DeleteConfirmationModal>
    </>
  )
}

export default ColegiosListing
