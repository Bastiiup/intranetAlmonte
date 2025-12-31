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
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert, Badge } from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import { TbEye, TbCheck, TbX } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

// Tipo extendido para colaboradores
type ColaboradorTypeExtended = {
  id: number | string
  documentId?: string
  email_login: string
  rol?: string
  activo: boolean
  persona?: any
  createdAt?: string
  updatedAt?: string
  nombreCompleto?: string
  rut?: string
  strapiId?: number | string
  colaboradorOriginal?: any
}

// Helper para obtener campo con múltiples variaciones
const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

// Función para mapear colaboradores de Strapi al formato ColaboradorTypeExtended
const mapStrapiColaboradorToColaboradorType = (colaborador: any): ColaboradorTypeExtended => {
  const attrs = colaborador.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (colaborador as any)

  // Obtener datos de persona
  const persona = data.persona?.data || data.persona
  const personaAttrs = persona?.attributes || persona || {}
  const email_login = getField(data, 'email_login', 'EMAIL_LOGIN') || ''
  const nombreCompleto = personaAttrs.nombre_completo || 
    `${personaAttrs.nombres || ''} ${personaAttrs.primer_apellido || ''}`.trim() ||
    email_login

  return {
    id: colaborador.id || colaborador.documentId || 0,
    documentId: colaborador.documentId,
    strapiId: colaborador.id || colaborador.documentId,
    email_login: getField(data, 'email_login', 'EMAIL_LOGIN') || '',
    rol: getField(data, 'rol', 'ROL') || '',
    activo: data.activo !== undefined ? data.activo : false,
    persona: persona || null,
    nombreCompleto: nombreCompleto,
    rut: personaAttrs.rut || '',
    createdAt: attrs.createdAt || colaborador.createdAt || '',
    updatedAt: attrs.updatedAt || colaborador.updatedAt || '',
    colaboradorOriginal: colaborador,
  }
}

interface SolicitudesColaboradoresListingProps {
  colaboradores?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<ColaboradorTypeExtended>()

const SolicitudesColaboradoresListing = ({ colaboradores, error }: SolicitudesColaboradoresListingProps = {}) => {
  const router = useRouter()
  const { colaborador } = useAuth()
  const isSuperAdmin = colaborador?.rol === 'super_admin'
  
  const mappedColaboradores = useMemo(() => {
    if (colaboradores && colaboradores.length > 0) {
      console.log('[SolicitudesColaboradoresListing] Colaboradores recibidos:', colaboradores.length)
      const mapped = colaboradores.map(mapStrapiColaboradorToColaboradorType)
      console.log('[SolicitudesColaboradoresListing] Colaboradores mapeados:', mapped.length)
      return mapped
    }
    return []
  }, [colaboradores])

  // Estado para el modal de activación
  const [showActivateModal, setShowActivateModal] = useState(false)
  const [selectedColaborador, setSelectedColaborador] = useState<ColaboradorTypeExtended | null>(null)
  const [activating, setActivating] = useState(false)

  const columns: ColumnDef<ColaboradorTypeExtended, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<ColaboradorTypeExtended> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<ColaboradorTypeExtended> }) => (
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
    columnHelper.accessor('nombreCompleto', {
      header: 'Nombre',
      cell: ({ row }) => (
        <div>
          <h5 className="mb-0">
            {row.original.nombreCompleto || row.original.email_login || 'Sin nombre'}
          </h5>
          {row.original.rut && (
            <small className="text-muted">RUT: {row.original.rut}</small>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('email_login', {
      header: 'Email',
      cell: ({ row }) => (
        <p className="mb-0">
          {row.original.email_login || 'Sin email'}
        </p>
      ),
    }),
    columnHelper.accessor('rol', {
      header: 'Rol',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const rol = row.original.rol || 'Sin rol'
        const badgeClass = rol === 'super_admin' ? 'badge-soft-danger' :
                          rol === 'encargado_adquisiciones' ? 'badge-soft-primary' :
                          rol === 'supervisor' ? 'badge-soft-info' :
                          'badge-soft-secondary'
        return (
          <span className={`badge ${badgeClass} fs-xxs`}>
            {rol}
          </span>
        )
      },
    }),
    columnHelper.accessor('activo', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const activo = row.original.activo
        return (
          <span className={`badge ${activo ? 'badge-soft-success' : 'badge-soft-warning'} fs-xxs`}>
            {activo ? 'Activo' : 'Inactivo'}
          </span>
        )
      },
    }),
    columnHelper.accessor('createdAt', {
      header: 'Fecha Solicitud',
      cell: ({ row }) => {
        if (!row.original.createdAt) return '-'
        const date = new Date(row.original.createdAt)
        return (
          <>
            {format(date, 'dd MMM, yyyy')} <small className="text-muted">{format(date, 'h:mm a')}</small>
          </>
        )
      },
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<ColaboradorTypeExtended> }) => (
        <div className="d-flex gap-1">
          <Link href={`/colaboradores/${row.original.strapiId || row.original.id}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle" title="Ver">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          {isSuperAdmin && !row.original.activo && (
            <Button
              variant="success"
              size="sm"
              className="btn-icon rounded-circle"
              title="Activar Colaborador"
              onClick={() => {
                setSelectedColaborador(row.original)
                setShowActivateModal(true)
              }}>
              <TbCheck className="fs-lg" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const [data, setData] = useState<ColaboradorTypeExtended[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  useEffect(() => {
    setData(mappedColaboradores)
  }, [mappedColaboradores])

  const table = useReactTable<ColaboradorTypeExtended>({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const handleActivate = async () => {
    if (!selectedColaborador?.strapiId) return

    setActivating(true)
    try {
      const response = await fetch(`/api/colaboradores/${selectedColaborador.strapiId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al activar el colaborador')
      }

      // Actualizar el estado local
      setData((prevData) =>
        prevData.map((c) =>
          c.strapiId === selectedColaborador.strapiId ? { ...c, activo: true } : c
        )
      )
      
      setShowActivateModal(false)
      setSelectedColaborador(null)
      router.refresh()
    } catch (err: any) {
      console.error('[SolicitudesColaboradoresListing] Error al activar:', err)
      alert(`Error al activar colaborador: ${err.message}`)
    } finally {
      setActivating(false)
    }
  }

  const hasError = !!error
  const hasData = mappedColaboradores.length > 0
  
  if (!isSuperAdmin) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="danger">
            <strong>Acceso denegado:</strong> Solo los usuarios con rol super_admin pueden acceder a esta sección.
          </Alert>
        </Col>
      </Row>
    )
  }
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar colaboradores desde Strapi:</strong> {error}
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
                  placeholder="Buscar por nombre, email o RUT..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="me-2 fw-semibold">Filtrar por:</span>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('rol')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) => table.getColumn('rol')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                  <option value="All">Todos los roles</option>
                  <option value="soporte">Soporte</option>
                  <option value="encargado_adquisiciones">Encargado Adquisiciones</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}>
                  {[5, 8, 10, 15, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>

          <DataTable<ColaboradorTypeExtended>
            table={table}
            emptyMessage="No hay colaboradores pendientes de activación"
            enableColumnReordering={false}
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="colaboradores"
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

          {/* Modal de confirmación de activación */}
          {selectedColaborador && (
            <div className={`modal fade ${showActivateModal ? 'show' : ''}`} style={{ display: showActivateModal ? 'block' : 'none' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Activar Colaborador</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowActivateModal(false)
                        setSelectedColaborador(null)
                      }}
                    />
                  </div>
                  <div className="modal-body">
                    <p>
                      ¿Está seguro de que desea activar la cuenta de{' '}
                      <strong>{selectedColaborador.nombreCompleto || selectedColaborador.email_login}</strong>?
                    </p>
                    <p className="text-muted small">
                      Una vez activada, el colaborador podrá iniciar sesión en el sistema.
                    </p>
                  </div>
                  <div className="modal-footer">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowActivateModal(false)
                        setSelectedColaborador(null)
                      }}
                      disabled={activating}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="success"
                      onClick={handleActivate}
                      disabled={activating}
                    >
                      {activating ? 'Activando...' : 'Activar Colaborador'}
                    </Button>
                  </div>
                </div>
              </div>
              {showActivateModal && <div className="modal-backdrop fade show" />}
            </div>
          )}
        </Card>
      </Col>
    </Row>
  )
}

export default SolicitudesColaboradoresListing

