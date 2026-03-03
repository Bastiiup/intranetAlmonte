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
import {
  Button,
  Card,
  CardFooter,
  CardHeader,
  Col,
  Row,
  Alert,
  Badge,
  Spinner,
} from 'react-bootstrap'
import { LuSearch, LuRefreshCw, LuPlus } from 'react-icons/lu'
import { TbEye, TbEdit, TbTrash } from 'react-icons/tb'
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
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedColegioId, setSelectedColegioId] = useState<number | string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchColegios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mira/colegios?pageSize=100')
      const result = await res.json()
      if (result.success && Array.isArray(result.data)) {
        setData(result.data)
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
    fetchColegios()
  }, [fetchColegios])

  const filteredData = searchTerm
    ? data.filter(
        (c) =>
          String(c.rbd ?? '').includes(searchTerm) ||
          c.colegio_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.dependencia ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data

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
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      cell: (info) => <EstadoBadge estado={info.getValue()} />,
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
          <h5 className="card-title mb-0">Establecimientos</h5>
          <Link href="/mira/colegios/crear">
            <Button variant="primary" size="sm" className="d-flex align-items-center gap-1">
              <LuPlus size={18} />
              Añadir Colegio
            </Button>
          </Link>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="input-group input-group-sm" style={{ width: 220 }}>
            <span className="input-group-text">
              <LuSearch size={16} />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por RBD, nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline-secondary" size="sm" onClick={fetchColegios} disabled={loading}>
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
          <DataTable table={table} />
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
