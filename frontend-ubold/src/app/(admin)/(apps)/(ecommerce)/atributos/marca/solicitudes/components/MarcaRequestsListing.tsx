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
import { LuBox, LuSearch } from 'react-icons/lu'
import { TbCheck, TbEye, TbList, TbPlus, TbTrash, TbX } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import ConfirmStatusModal from '@/components/table/ConfirmStatusModal'
import TablePagination from '@/components/table/TablePagination'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

type MarcaRequestType = {
  id: number
  nombre_marca: string
  descripcion: string
  website: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  fecha_solicitud: string
  time: string
  url: string
  strapiId?: number
}

const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const mapStrapiSolicitudToRequestType = (solicitud: any): MarcaRequestType => {
  const attrs = solicitud.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (solicitud as any)

  const nombre = getField(data, 'nombre_marca', 'nombreMarca', 'nombre', 'NOMBRE_MARCA', 'NAME') || 'Sin nombre'
  const descripcion = getField(data, 'descripcion', 'description', 'DESCRIPCION') || ''
  const website = getField(data, 'website', 'website', 'WEBSITE') || ''
  
  // Leer estado_publicacion: 'pendiente' -> 'pendiente', 'publicado' -> 'aprobada'
  const estadoPublicacion = getField(data, 'estado_publicacion', 'estadoPublicacion', 'ESTADO_PUBLICACION') || 'pendiente'
  const estado = estadoPublicacion === 'publicado' ? 'aprobada' : estadoPublicacion === 'pendiente' ? 'pendiente' : 'pendiente'

  const createdAt = attrs.createdAt || (solicitud as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)

  return {
    id: solicitud.id || solicitud.documentId || solicitud.id,
    nombre_marca: nombre,
    descripcion: descripcion,
    website: website,
    estado: estado as 'pendiente' | 'aprobada' | 'rechazada',
    fecha_solicitud: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/atributos/marca/${solicitud.id || solicitud.documentId || solicitud.id}`,
    strapiId: solicitud.id,
  }
}

interface MarcaRequestsListingProps {
  solicitudes?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<MarcaRequestType>()

const MarcaRequestsListing = ({ solicitudes, error }: MarcaRequestsListingProps = {}) => {
  const router = useRouter()

  const mappedSolicitudes = useMemo(() => {
    if (solicitudes && solicitudes.length > 0) {
      const mapped = solicitudes.map(mapStrapiSolicitudToRequestType)
      return mapped
    }
    return []
  }, [solicitudes])

  const columns: ColumnDef<MarcaRequestType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<MarcaRequestType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<MarcaRequestType> }) => (
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
    columnHelper.accessor('id', {
      header: 'ID',
      cell: ({ row }) => (
        <span className="text-muted">{row.original.id}</span>
      ),
    }),
    columnHelper.accessor('nombre_marca', {
      header: 'Marca',
      cell: ({ row }) => (
        <div className="d-flex">
          <div className="avatar-md me-3 bg-light d-flex align-items-center justify-content-center rounded">
            <span className="text-muted fs-xs">🏷️</span>
          </div>
          <div>
            <h5 className="mb-0">
              <Link href={row.original.url} className="link-reset">
                {row.original.nombre_marca || 'Sin nombre'}
              </Link>
            </h5>
            {row.original.descripcion && (
              <p className="text-muted mb-0 small">{row.original.descripcion.substring(0, 50)}...</p>
            )}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('website', {
      header: 'Website',
      cell: ({ row }) =>
        row.original.website ? (
          <a
            href={row.original.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary"
          >
            {row.original.website}
          </a>
        ) : (
          <span className="text-muted">-</span>
        ),
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const estadoColors: Record<string, string> = {
          pendiente: 'warning',
          aprobada: 'success',
          rechazada: 'danger',
        }
        const estadoLabels: Record<string, string> = {
          pendiente: 'Pendiente',
          aprobada: 'Aprobada',
          rechazada: 'Rechazada',
        }
        return (
          <Badge bg={estadoColors[row.original.estado] || 'secondary'} className="fs-xxs">
            {estadoLabels[row.original.estado] || row.original.estado}
          </Badge>
        )
      },
    }),
    columnHelper.accessor('fecha_solicitud', {
      header: 'Fecha de Solicitud',
      cell: ({ row }) => (
        <>
          {row.original.fecha_solicitud} <small className="text-muted">{row.original.time}</small>
        </>
      ),
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<MarcaRequestType> }) => (
        <div className="d-flex gap-1">
          <Link href={row.original.url}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          {row.original.estado === 'pendiente' && (
            <>
              <Button
                variant="success"
                size="sm"
                className="btn-icon rounded-circle"
                onClick={() => handleApproveClick(row.original.id)}
                title="Aprobar"
              >
                <TbCheck className="fs-lg" />
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="btn-icon rounded-circle"
                onClick={() => handleRejectClick(row.original.id)}
                title="Rechazar"
              >
                <TbX className="fs-lg" />
              </Button>
            </>
          )}
          <Button
            variant="default"
            size="sm"
            className="btn-icon rounded-circle"
            onClick={() => {
              toggleDeleteModal()
              setSelectedRowIds({ [row.id]: true })
            }}
          >
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const [data, setData] = useState<MarcaRequestType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setData(mappedSolicitudes)
  }, [mappedSolicitudes, solicitudes])

  const table = useReactTable<MarcaRequestType>({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject'>('approve')
  const [pendingId, setPendingId] = useState<number | null>(null)

  const toggleDeleteModal = () => {
    setShowDeleteModal(!showDeleteModal)
  }

  const handleApproveClick = (id: number) => {
    setPendingId(id)
    setConfirmAction('approve')
    setShowConfirmModal(true)
  }

  const handleRejectClick = (id: number) => {
    setPendingId(id)
    setConfirmAction('reject')
    setShowConfirmModal(true)
  }

  const handleApprove = async () => {
    if (!pendingId) return
    
    try {
      const response = await fetch(`/api/tienda/marca/${pendingId}`, {
        method: 'PUT',
        credentials: 'include', // Incluir cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado_publicacion: 'publicado',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al aprobar la solicitud')
      }

      setData((old) =>
        old.map((item) => (item.id === pendingId ? { ...item, estado: 'aprobada' as const } : item)),
      )
      
      router.refresh()
    } catch (error: any) {
      console.error('Error al aprobar solicitud:', error)
      alert(error.message || 'Error al aprobar la solicitud')
    } finally {
      setPendingId(null)
    }
  }

  const handleReject = async () => {
    if (!pendingId) return
    
    try {
      const response = await fetch(`/api/tienda/marca/${pendingId}`, {
        method: 'PUT',
        credentials: 'include', // Incluir cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado_publicacion: 'pendiente',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al rechazar la solicitud')
      }

      setData((old) =>
        old.map((item) => (item.id === pendingId ? { ...item, estado: 'pendiente' as const } : item)),
      )
      
      router.refresh()
    } catch (error: any) {
      console.error('Error al rechazar solicitud:', error)
      alert(error.message || 'Error al rechazar la solicitud')
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async () => {
    const selectedIds = Object.keys(selectedRowIds)
    const idsToDelete = selectedIds.map((id) => data[parseInt(id)]?.id).filter(Boolean)

    try {
      for (const solicitudId of idsToDelete) {
        const response = await fetch(`/api/tienda/marca/${solicitudId}`, {
          method: 'DELETE',
          credentials: 'include', // Incluir cookies
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar solicitud ${solicitudId}`)
        }
      }

      setData((old) => old.filter((_, idx) => !selectedIds.includes(idx.toString())))
      setSelectedRowIds({})
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)

      router.refresh()
    } catch (error) {
      console.error('Error al eliminar solicitudes:', error)
      alert('Error al eliminar las solicitudes seleccionadas')
    }
  }

  const hasError = !!error
  const hasData = mappedSolicitudes.length > 0

  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar solicitudes desde Strapi:</strong> {error}
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
                  placeholder="Buscar solicitud de marca..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>

              {Object.keys(selectedRowIds).length > 0 && (
                <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
                  Eliminar
                </Button>
              )}
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="me-2 fw-semibold">Filtrar por:</span>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) =>
                    table
                      .getColumn('estado')
                      ?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)
                  }
                >
                  <option value="All">Estado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                </select>
                <LuBox className="app-search-icon text-muted" />
              </div>

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
              <Button variant="primary" className="btn-icon">
                <TbList className="fs-lg" />
              </Button>
              <Link href="/atributos/marca/agregar" passHref>
                <Button variant="danger" className="ms-1">
                  <TbPlus className="fs-sm me-2" /> Nueva Solicitud
                </Button>
              </Link>
            </div>
          </CardHeader>

          <DataTable<MarcaRequestType>
            table={table}
            emptyMessage="No se encontraron solicitudes"
            enableColumnReordering={true}
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="solicitudes"
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
            show={showDeleteModal}
            onHide={toggleDeleteModal}
            onConfirm={handleDelete}
            selectedCount={Object.keys(selectedRowIds).length}
            itemName="solicitud"
          />

          <ConfirmStatusModal
            show={showConfirmModal}
            onHide={() => {
              setShowConfirmModal(false)
              setPendingId(null)
            }}
            onConfirm={confirmAction === 'approve' ? handleApprove : handleReject}
            action={confirmAction}
            itemName="solicitud"
          />
        </Card>
      </Col>
    </Row>
  )
}

export default MarcaRequestsListing

