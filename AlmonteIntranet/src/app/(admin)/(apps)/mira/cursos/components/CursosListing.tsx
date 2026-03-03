'use client'

import {
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, Card, CardBody, CardFooter, CardHeader, Alert, Spinner } from 'react-bootstrap'
import { Col, Row } from 'react-bootstrap'
import { LuSearch, LuBox, LuTag } from 'react-icons/lu'
import { TbEye, TbEdit, TbTrash, TbPlus, TbLayoutGrid, TbList } from 'react-icons/tb'
import Link from 'next/link'
import toast from 'react-hot-toast'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'

export interface CursoType {
  id: number | string
  documentId?: string
  colegio_nombre: string
  nombre_curso: string
  letra: string | null
  nivel: string | null
  anio: number | null
}

const columnHelper = createColumnHelper<CursoType>()

function formatNivel(nivel: string | null): string {
  if (!nivel) return '-'
  const lower = nivel.toLowerCase()
  if (lower === 'basica' || lower === 'básica') return 'Básica'
  if (lower === 'media') return 'Media'
  return nivel
}

export default function CursosListing() {
  const [data, setData] = useState<CursoType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('cursos-column-order')
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
  const [selectedCursoId, setSelectedCursoId] = useState<number | string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const fetchCursos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mira/cursos?pageSize=200')
      const result = await res.json()
      if (result.success && Array.isArray(result.data)) {
        setData(result.data)
      } else {
        setError(result.error ?? 'Error al obtener cursos')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCursos()
  }, [fetchCursos])

  const filteredData = searchTerm
    ? data.filter((c) => {
        const term = searchTerm.toLowerCase()
        return (
          c.colegio_nombre.toLowerCase().includes(term) ||
          c.nombre_curso.toLowerCase().includes(term) ||
          (c.nivel ?? '').toLowerCase().includes(term) ||
          String(c.anio ?? '').includes(term) ||
          String(c.letra ?? '').toLowerCase().includes(term)
        )
      })
    : data

  const uniqueYears = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .map((c) => c.anio)
            .filter((v): v is number => v !== null && v !== undefined)
        )
      ).sort((a, b) => b - a),
    [data]
  )

  const openDeleteModal = (id: number | string) => {
    setSelectedCursoId(id)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!selectedCursoId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/mira/cursos/${encodeURIComponent(String(selectedCursoId))}`, {
        method: 'DELETE',
      })
      const result = await res.json().catch(() => ({}))

      if (!res.ok || !result.success) {
        const message =
          result?.error || `Error al eliminar curso (${res.status} ${res.statusText})`
        throw new Error(message)
      }

      setData((prev) => prev.filter((c) => c.id !== selectedCursoId))
      toast.success('Curso eliminado correctamente')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar curso'
      setError(msg)
      toast.error(msg)
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
      setSelectedCursoId(null)
    }
  }

  const handleColumnOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cursos-column-order', JSON.stringify(newOrder))
    }
  }

  const columns = [
    columnHelper.accessor('colegio_nombre', {
      header: 'Colegio',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('nombre_curso', {
      header: 'Nombre Curso',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('letra', {
      header: 'Letra',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('nivel', {
      header: 'Nivel',
      cell: (info) => formatNivel(info.getValue()),
      enableSorting: true,
      filterFn: 'equalsString',
      enableColumnFilter: true,
    }),
    columnHelper.accessor('anio', {
      header: 'Año',
      cell: (info) => info.getValue() ?? '-',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue || filterValue === 'All') return true
        const value = row.getValue(columnId)
        return String(value ?? '') === String(filterValue)
      },
    }),
    columnHelper.display({
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="d-flex gap-1">
          <Link href={`/mira/cursos/${row.original.id}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={`/mira/cursos/${row.original.id}`}>
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
    data: filteredData,
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
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  })

  const totalItems = table.getFilteredRowModel().rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalItems)

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex gap-2">
          <div className="app-search">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar por colegio o curso..."
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
              value={(table.getColumn('nivel')?.getFilterValue() as string) ?? 'All'}
              onChange={(e) => {
                const value = e.target.value === 'All' ? undefined : e.target.value
                table.getColumn('nivel')?.setFilterValue(value)
              }}
            >
              <option value="All">Nivel</option>
              <option value="Basica">Básica</option>
              <option value="Media">Media</option>
            </select>
            <LuBox className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <select
              className="form-select form-control my-1 my-md-0"
              value={(table.getColumn('anio')?.getFilterValue() as string) ?? 'All'}
              onChange={(e) => {
                const value = e.target.value === 'All' ? undefined : e.target.value
                table.getColumn('anio')?.setFilterValue(value)
              }}
            >
              <option value="All">Año</option>
              {uniqueYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <LuTag className="app-search-icon text-muted" />
          </div>

          <div>
            <select
              className="form-select form-control my-1 my-md-0"
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
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
          <Link href="/mira/cursos/crear">
            <Button variant="danger" className="ms-1">
              <TbPlus className="fs-sm me-2" /> Añadir Curso
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
              {filteredData.length === 0 ? (
                <Row>
                  <Col>
                    <p className="text-muted text-center my-4">No se encontraron cursos.</p>
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
                    <p className="text-muted text-center my-4">No se encontraron cursos.</p>
                  </Col>
                </Row>
              ) : (
                <Row className="g-3">
                  {table.getRowModel().rows.map((row) => {
                    const curso = row.original
                    return (
                      <Col key={curso.id} xs={12} sm={6} lg={4} xl={3}>
                        <Card className="h-100">
                          <CardBody>
                            <h5 className="mb-1">{curso.nombre_curso || 'Sin nombre'}</h5>
                            <p className="text-muted mb-1">
                              Colegio:{' '}
                              <strong>{curso.colegio_nombre || 'Sin colegio'}</strong>
                            </p>
                            <p className="text-muted mb-1">
                              Nivel:{' '}
                              {curso.nivel ? formatNivel(curso.nivel) : 'Sin nivel'}
                            </p>
                            <p className="text-muted mb-2">
                              Año:{' '}
                              <strong>{curso.anio != null ? curso.anio : 'N/A'}</strong>
                            </p>
                            <div className="mb-3">
                              <span className="badge badge-soft-info">
                                {curso.letra || 'Sin letra'}
                              </span>
                            </div>
                            <div className="d-flex gap-1">
                              <Link href={`/mira/cursos/${curso.id}`}>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="btn-icon rounded-circle"
                                >
                                  <TbEye className="fs-lg" />
                                </Button>
                              </Link>
                              <Link href={`/mira/cursos/${curso.id}`}>
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
                                onClick={() => openDeleteModal(curso.id)}
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
              totalItems={totalItems}
              start={start}
              end={end}
              itemsName="cursos"
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
        </>
      )}
      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        selectedCount={1}
        itemName="curso"
        loading={deleting}
        disabled={deleting}
        modalTitle="Eliminar curso"
        confirmButtonText="Eliminar"
        cancelButtonText="Cancelar"
      />
    </Card>
  )
}
