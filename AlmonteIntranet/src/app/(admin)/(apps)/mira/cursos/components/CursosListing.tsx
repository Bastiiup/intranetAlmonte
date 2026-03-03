'use client'

import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect, useCallback } from 'react'
import { Button, Card, CardFooter, CardHeader, Alert, Spinner } from 'react-bootstrap'
import { Col, Row } from 'react-bootstrap'
import { LuSearch, LuRefreshCw, LuPlus } from 'react-icons/lu'
import { TbEye, TbEdit, TbTrash } from 'react-icons/tb'
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
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCursoId, setSelectedCursoId] = useState<number | string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    }),
    columnHelper.accessor('anio', {
      header: 'Año',
      cell: (info) => info.getValue() ?? '-',
      enableSorting: true,
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
      globalFilter: searchTerm,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  })

  return (
    <Card>
      <CardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          <h5 className="card-title mb-0">Cursos</h5>
          <Link href="/mira/cursos/crear">
            <Button variant="primary" size="sm" className="d-flex align-items-center gap-1">
              <LuPlus size={18} />
              Añadir Curso
            </Button>
          </Link>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="input-group input-group-sm" style={{ width: 260 }}>
            <span className="input-group-text">
              <LuSearch size={16} />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por colegio, curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline-secondary" size="sm" onClick={fetchCursos} disabled={loading}>
            <LuRefreshCw size={16} className={loading ? 'spin' : ''} />
          </Button>
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
          <Card.Body>
            {filteredData.length === 0 ? (
              <Row>
                <Col>
                  <p className="text-muted text-center my-4">No se encontraron cursos.</p>
                </Col>
              </Row>
            ) : (
              <DataTable table={table} />
            )}
          </Card.Body>
          {filteredData.length > 0 && (
            <CardFooter>
              <TablePagination
                totalItems={table.getFilteredRowModel().rows.length}
                start={
                  table.getFilteredRowModel().rows.length === 0
                    ? 0
                    : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
                }
                end={Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}
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
          )}
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
