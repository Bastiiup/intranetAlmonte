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
import { Button, Card, CardBody, CardFooter, CardHeader, Alert, Spinner } from 'react-bootstrap'
import { Col, Row } from 'react-bootstrap'
import { LuSearch, LuTag } from 'react-icons/lu'
import { TbEye, TbEdit, TbTrash, TbPlus, TbLayoutGrid, TbList, TbBook } from 'react-icons/tb'
import Link from 'next/link'
import toast from 'react-hot-toast'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'

export interface LibroMiraType {
  id: number | string
  documentId: string
  libroNombre: string
  isbn: string | null
  asignaturaNombre: string | null
  activo: boolean
  tiene_omr: boolean
}

const columnHelper = createColumnHelper<LibroMiraType>()

export default function LibrosMiraListing() {
  const [data, setData] = useState<LibroMiraType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('libros-mira-column-order')
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
  const [selectedId, setSelectedId] = useState<number | string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [page, setPage] = useState(0) // 0-based
  const [pageSize, setPageSize] = useState(25)
  const [totalItems, setTotalItems] = useState(0)

  const deferredSearch = useDeferredValue(searchTerm)

  const fetchLibros = useCallback(
    async (pageParam: number, pageSizeParam: number, search: string) => {
      setLoading(true)
      setError(null)
      try {
        const apiPage = pageParam + 1
        const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
        const res = await fetch(
          `/api/mira/libros-mira?page=${apiPage}&pageSize=${pageSizeParam}${searchParam}`,
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
          setError(result.error ?? 'Error al obtener libros MIRA')
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error de conexión')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    setPage(0)
  }, [deferredSearch])

  useEffect(() => {
    fetchLibros(page, pageSize, deferredSearch)
  }, [fetchLibros, page, pageSize, deferredSearch])

  const openDeleteModal = (id: number | string, documentId?: string) => {
    setSelectedId(documentId ?? id)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!selectedId) return
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/mira/libros-mira/${encodeURIComponent(String(selectedId))}`,
        {
          method: 'DELETE',
        },
      )
      const result = await res.json().catch(() => ({}))

      if (!res.ok || !result.success) {
        const message =
          result?.error || `Error al eliminar libro MIRA (${res.status} ${res.statusText})`
        throw new Error(message)
      }

      setData((prev) => prev.filter((c) => c.documentId !== selectedId))
      toast.success('Libro MIRA eliminado correctamente')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar libro MIRA'
      setError(msg)
      toast.error(msg)
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
      setSelectedId(null)
    }
  }

  const handleColumnOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('libros-mira-column-order', JSON.stringify(newOrder))
    }
  }

  const columns = [
    columnHelper.accessor('libroNombre', {
      header: 'Libro',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('isbn', {
      header: 'ISBN',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('asignaturaNombre', {
      header: 'Asignatura',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('tiene_omr', {
      header: 'OMR',
      cell: (info) =>
        info.getValue() ? (
          <span className="badge bg-success-subtle text-success">Sí</span>
        ) : (
          <span className="badge bg-secondary-subtle text-muted">No</span>
        ),
      enableSorting: true,
    }),
    columnHelper.accessor('activo', {
      header: 'Activo',
      cell: (info) =>
        info.getValue() ? (
          <span className="badge bg-success-subtle text-success">Activo</span>
        ) : (
          <span className="badge bg-secondary-subtle text-muted">Inactivo</span>
        ),
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="d-flex gap-1">
          <Link href={`/mira/libros-mira/${row.original.documentId || row.original.id}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={`/mira/libros-mira/${row.original.documentId || row.original.id}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEdit className="fs-lg" />
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            className="btn-icon rounded-circle"
            onClick={() => openDeleteModal(row.original.id, row.original.documentId)}
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
              placeholder="Buscar por libro, ISBN o asignatura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <LuSearch className="app-search-icon text-muted" />
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Mostrar:</span>
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
              {[5, 10, 15, 20, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="d-none d-md-flex align-items-center">
            <LuTag className="text-muted me-1" />
            <span className="text-muted small">Libros MIRA</span>
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
          <Link href="/mira/libros-mira/crear">
            <Button variant="danger" className="ms-1">
              <TbPlus className="fs-sm me-2" /> Asignar Libro a MIRA
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
            <CardBody>
              {currentRows.length === 0 ? (
                <Row>
                  <Col>
                    <p className="text-muted text-center my-4">
                      No se encontraron libros MIRA.
                    </p>
                  </Col>
                </Row>
              ) : (
                <DataTable
                  table={table}
                  enableColumnReordering={true}
                  onColumnOrderChange={handleColumnOrderChange}
                />
              )}
            </CardBody>
          ) : (
            <CardBody>
              {totalItems === 0 ? (
                <Row>
                  <Col>
                    <p className="text-muted text-center my-4">
                      No se encontraron libros MIRA.
                    </p>
                  </Col>
                </Row>
              ) : (
                <Row className="g-3">
                  {table.getRowModel().rows.map((row) => {
                    const libro = row.original
                    return (
                      <Col key={libro.id} xs={12} sm={6} lg={4} xl={3}>
                        <Card className="h-100">
                          <CardBody>
                            <div className="d-flex align-items-start gap-2 mb-2">
                              <div className="avatar-sm bg-primary-subtle rounded me-2 d-flex align-items-center justify-content-center">
                                <TbBook className="text-primary fs-4" />
                              </div>
                              <div className="flex-grow-1">
                                <h5 className="mb-1">
                                  {libro.libroNombre || 'Libro sin nombre'}
                                </h5>
                                <p className="text-muted mb-1">
                                  ISBN:{' '}
                                  <strong>{libro.isbn ?? 'N/A'}</strong>
                                </p>
                                <p className="text-muted mb-1">
                                  Asignatura:{' '}
                                  <strong>
                                    {libro.asignaturaNombre ?? 'Sin asignatura'}
                                  </strong>
                                </p>
                              </div>
                            </div>
                            <div className="mb-2 d-flex gap-1 flex-wrap">
                              {libro.tiene_omr && (
                                <span className="badge bg-info-subtle text-info">
                                  OMR
                                </span>
                              )}
                              <span
                                className={`badge ${
                                  libro.activo
                                    ? 'bg-success-subtle text-success'
                                    : 'bg-secondary-subtle text-muted'
                                }`}
                              >
                                {libro.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <div className="d-flex gap-1">
                              <Link
                                href={`/mira/libros-mira/${libro.documentId || libro.id}`}
                              >
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="btn-icon rounded-circle"
                                >
                                  <TbEye className="fs-lg" />
                                </Button>
                              </Link>
                              <Link
                                href={`/mira/libros-mira/${libro.documentId || libro.id}`}
                              >
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
                                onClick={() => openDeleteModal(libro.id, libro.documentId)}
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
              itemsName="libros MIRA"
              showInfo
              previousPage={() => setPage((prev) => Math.max(0, prev - 1))}
              canPreviousPage={page > 0}
              pageCount={pageCount}
              pageIndex={page}
              setPageIndex={(index) =>
                setPage(Math.max(0, Math.min(index, pageCount - 1)))
              }
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
        itemName="libro MIRA"
        loading={deleting}
        disabled={deleting}
        modalTitle="Eliminar libro MIRA"
        confirmButtonText="Eliminar"
        cancelButtonText="Cancelar"
      />
    </Card>
  )
}

