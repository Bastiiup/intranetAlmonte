'use client'

import {
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect, useCallback, useDeferredValue } from 'react'
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Row, Alert, Badge, Spinner } from 'react-bootstrap'
import { LuSearch, LuBox, LuTag } from 'react-icons/lu'
import { TbEye, TbEdit, TbTrash, TbPlus, TbLayoutGrid, TbList } from 'react-icons/tb'
import Link from 'next/link'
import toast from 'react-hot-toast'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'

export interface ColegioType {
  id: number | string
  documentId?: string
  rbd: number | null
  colegio_nombre: string
  dependencia: string | null
  estado: string | null
  estado_nombre?: string | null
  estado_estab?: string | null
  region?: string | null
  provincia?: string | null
  zona?: string | null
}

const columnHelper = createColumnHelper<ColegioType>()

const DEPENDENCIAS: Record<string, string> = {
  'Corporación de Administración Delegada': 'Corporación Delegada',
  'Municipal': 'Municipal',
  'Particular Subvencionado': 'Particular Subvencionado',
  'Particular Pagado': 'Particular Pagado',
  'Servicio Local de Educación': 'SLE',
}

function EstadoBadge({ estado }: { estado: string | null }) {
  if (!estado) return <Badge bg="secondary">Sin estado</Badge>
  const lower = estado.toLowerCase()
  if (lower.includes('verificado') || lower.includes('aprobado')) {
    return <Badge bg="success">{estado}</Badge>
  }
  if (lower.includes('por verificar')) {
    return <Badge bg="warning" text="dark">{estado}</Badge>
  }
  if (lower.includes('rechazado')) {
    return <Badge bg="danger">{estado}</Badge>
  }
  return <Badge bg="secondary">{estado}</Badge>
}

export default function ColegiosListing() {
  const [data, setData] = useState<ColegioType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('colegios-column-order')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // ignore
        }
      }
    }
    return []
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedColegioId, setSelectedColegioId] = useState<number | string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [page, setPage] = useState(0) // 0-based
  const [pageSize, setPageSize] = useState(25)
  const [totalItems, setTotalItems] = useState(0)

  const deferredSearch = useDeferredValue(searchTerm)

  const fetchColegios = useCallback(async (pageParam: number, pageSizeParam: number, search: string) => {
    setLoading(true)
    setError(null)
    try {
      const apiPage = pageParam + 1 // backend es 1-based
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
      const res = await fetch(
        `/api/mira/colegios?page=${apiPage}&pageSize=${pageSizeParam}${searchParam}`
      )
      const result = await res.json()
      if (result.success && Array.isArray(result.data)) {
        setData(result.data)
        const total =
          result.meta?.pagination?.total != null
            ? Number(result.meta.pagination.total)
            : result.data.length
        setTotalItems(total)
      } else {
        setError(result.error ?? 'Error al obtener colegios')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Cuando cambia el término de búsqueda, volvemos a la primera página
    setPage(0)
  }, [deferredSearch])

  useEffect(() => {
    fetchColegios(page, pageSize, deferredSearch)
  }, [fetchColegios, page, pageSize, deferredSearch])

  const openDeleteModal = (id: number | string) => {
    setSelectedColegioId(id)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!selectedColegioId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/mira/colegios/${encodeURIComponent(String(selectedColegioId))}`, {
        method: 'DELETE',
      })
      const result = await res.json().catch(() => ({}))

      if (!res.ok || !result.success) {
        const message =
          result?.error ||
          `Error al eliminar establecimiento (${res.status} ${res.statusText})`
        throw new Error(message)
      }

      setData((prev) => prev.filter((c) => c.id !== selectedColegioId))
      toast.success('Establecimiento eliminado correctamente')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar establecimiento'
      setError(msg)
      toast.error(msg)
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
      setSelectedColegioId(null)
    }
  }

  const handleColumnOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('colegios-column-order', JSON.stringify(newOrder))
    }
  }

  const columns = [
    columnHelper.accessor('rbd', {
      header: 'RBD',
      cell: (info) => info.getValue() ?? '-',
      enableSorting: true,
    }),
    columnHelper.accessor('colegio_nombre', {
      header: 'Nombre del Colegio',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('dependencia', {
      header: 'Dependencia',
      cell: (info) => DEPENDENCIAS[info.getValue() ?? ''] ?? info.getValue() ?? '-',
      enableSorting: true,
      filterFn: 'equalsString',
      enableColumnFilter: true,
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      cell: (info) => <EstadoBadge estado={info.getValue()} />,
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue || filterValue === 'All') return true
        const value = String(row.getValue(columnId) ?? '').toLowerCase()
        if (filterValue === 'Verificado') {
          return value.includes('verificado') || value.includes('aprobado')
        }
        if (filterValue === 'PorVerificar') {
          return value.includes('por verificar')
        }
        if (filterValue === 'Rechazado') {
          return value.includes('rechazado')
        }
        return true
      },
    }),
    columnHelper.accessor('estado_estab', {
      header: 'Estado Estab.',
      cell: (info) => info.getValue() ?? '-',
      enableSorting: true,
    }),
    columnHelper.accessor('region', {
      header: 'Región',
      cell: (info) => info.getValue() ?? '-',
      enableSorting: true,
    }),
    columnHelper.accessor('provincia', {
      header: 'Provincia',
      cell: (info) => info.getValue() ?? '-',
      enableSorting: true,
    }),
    columnHelper.accessor('zona', {
      header: 'Zona',
      cell: (info) => info.getValue() ?? '-',
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="d-flex gap-1">
          <Link href={`/mira/colegios/${row.original.id}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={`/mira/colegios/${row.original.id}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEdit className="fs-lg" />
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            className="btn-icon rounded-circle"
            onClick={() => openDeleteModal(row.original.id)}
          >
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const currentRows = table.getRowModel().rows
  const currentCount = currentRows.length

  const totalForPagination = totalItems || currentCount
  const start = totalForPagination === 0 ? 0 : page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, totalForPagination)
  const pageCount = Math.max(1, Math.ceil(totalForPagination / pageSize))

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex gap-2">
          <div className="app-search">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar nombre de establecimiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <LuSearch className="app-search-icon text-muted" />
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filtrar por:</span>

          <div className="app-search">
            <select
              className="form-select form-control my-1 my-md-0"
              value={(table.getColumn('dependencia')?.getFilterValue() as string) ?? 'All'}
              onChange={(e) => {
                const value = e.target.value === 'All' ? undefined : e.target.value
                table.getColumn('dependencia')?.setFilterValue(value)
              }}
            >
              <option value="All">Dependencia</option>
              {Object.keys(DEPENDENCIAS).map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
            <LuBox className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <select
              className="form-select form-control my-1 my-md-0"
              value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'All'}
              onChange={(e) => {
                const value = e.target.value === 'All' ? undefined : e.target.value
                table.getColumn('estado')?.setFilterValue(value)
              }}
            >
              <option value="All">Estado</option>
              <option value="Verificado">Verificado / Aprobado</option>
              <option value="PorVerificar">Por verificar</option>
              <option value="Rechazado">Rechazado</option>
            </select>
            <LuTag className="app-search-icon text-muted" />
          </div>

          <div>
            <select
              className="form-select form-control my-1 my-md-0"
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value)
                setPageSize(newSize)
                setPage(0)
              }}
            >
              {[5, 8, 10, 15, 20, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="d-flex gap-1">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'outline-primary'}
            className={viewMode === 'grid' ? 'btn-icon' : 'btn-icon btn-soft-primary'}
            onClick={() => setViewMode('grid')}
          >
            <TbLayoutGrid className="fs-lg" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline-primary'}
            className={viewMode === 'list' ? 'btn-icon' : 'btn-icon btn-soft-primary'}
            onClick={() => setViewMode('list')}
          >
            <TbList className="fs-lg" />
          </Button>
          <Link href="/mira/colegios/crear">
            <Button variant="danger" className="ms-1">
              <TbPlus className="fs-sm me-2" /> Añadir Colegio
            </Button>
          </Link>
        </div>
      </CardHeader>

      {error && (
        <div className="px-4">
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <DataTable
              table={table}
              enableColumnReordering={true}
              onColumnOrderChange={handleColumnOrderChange}
            />
          ) : (
            <CardBody>
              {totalItems === 0 ? (
                <Row>
                  <Col>
                    <p className="text-muted text-center my-4">
                      No se encontraron establecimientos.
                    </p>
                  </Col>
                </Row>
              ) : (
                <Row className="g-3">
                  {table.getRowModel().rows.map((row) => {
                    const colegio = row.original
                    return (
                      <Col key={colegio.id} xs={12} sm={6} lg={4} xl={3}>
                        <Card className="h-100">
                          <CardBody>
                            <h5 className="mb-1">{colegio.colegio_nombre || 'Sin nombre'}</h5>
                            <p className="text-muted mb-1">
                              RBD:{' '}
                              <strong>{colegio.rbd != null ? colegio.rbd : 'N/A'}</strong>
                            </p>
                            <p className="text-muted mb-2">
                              Dependencia:{' '}
                              {DEPENDENCIAS[colegio.dependencia ?? ''] ??
                                colegio.dependencia ??
                                'N/A'}
                            </p>
                            <div className="mb-3">
                              <EstadoBadge estado={colegio.estado} />
                            </div>
                            <div className="d-flex gap-1">
                              <Link href={`/mira/colegios/${colegio.id}`}>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="btn-icon rounded-circle"
                                >
                                  <TbEye className="fs-lg" />
                                </Button>
                              </Link>
                              <Link href={`/mira/colegios/${colegio.id}`}>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="btn-icon rounded-circle"
                                >
                                  <TbEdit className="fs-lg" />
                                </Button>
                              </Link>
                              <Button
                                variant="default"
                                size="sm"
                                className="btn-icon rounded-circle"
                                onClick={() => openDeleteModal(colegio.id)}
                              >
                                <TbTrash className="fs-lg" />
                              </Button>
                            </div>
                          </CardBody>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
              )}
            </CardBody>
          )}
          <CardFooter>
            <TablePagination
              totalItems={totalForPagination}
              start={start}
              end={end}
              itemsName="colegios"
              showInfo
              previousPage={() => setPage((prev) => Math.max(0, prev - 1))}
              canPreviousPage={page > 0}
              pageCount={pageCount}
              pageIndex={page}
              setPageIndex={(index) => setPage(Math.max(0, Math.min(index, pageCount - 1)))}
              nextPage={() =>
                setPage((prev) => (prev + 1 < pageCount ? prev + 1 : prev))
              }
              canNextPage={page + 1 < pageCount}
            />
          </CardFooter>
        </>
      )}
      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        selectedCount={1}
        itemName="establecimiento"
        loading={deleting}
        disabled={deleting}
        modalTitle="Eliminar establecimiento"
        confirmButtonText="Eliminar"
        cancelButtonText="Cancelar"
      />
    </Card>
  )
}
