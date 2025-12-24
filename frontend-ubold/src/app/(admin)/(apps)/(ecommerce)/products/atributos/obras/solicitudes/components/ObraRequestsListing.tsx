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
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert } from 'react-bootstrap'
import { LuBox, LuSearch } from 'react-icons/lu'
import { TbEdit, TbEye, TbList, TbTrash, TbCheck } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import ConfirmStatusModal from '@/components/table/ConfirmStatusModal'
import TablePagination from '@/components/table/TablePagination'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

// Tipo extendido para obras con estado_publicacion
type ObraTypeExtended = {
  id: number
  nombre: string
  codigoObra: string | null
  descripcion: string | null
  productos: number
  status: 'active' | 'inactive'
  date: string
  time: string
  url: string
  strapiId?: number
  estadoPublicacion?: 'Publicado' | 'Pendiente' | 'Borrador'
  obraOriginal?: any
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

// Función para mapear obras de Strapi al formato ObraTypeExtended
const mapStrapiObraToObraType = (obra: any): ObraTypeExtended => {
  const attrs = obra.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (obra as any)

  // Obtener nombre_obra (schema usa nombre_obra, no name)
  const nombreObra = getField(data, 'nombre_obra', 'nombreObra', 'NOMBRE_OBRA') || 'Sin nombre'
  
  // Obtener código_obra
  const codigoObra = getField(data, 'codigo_obra', 'codigoObra', 'CODIGO_OBRA') || null
  
  // Obtener descripción
  const descripcion = getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || null
  
  // Contar productos (ediciones relacionadas)
  const productos = data.ediciones?.data || data.productos?.data || data.productos || []
  const productosCount = Array.isArray(productos) ? productos.length : 0
  
  // Obtener estado (publishedAt indica si está publicado)
  const isPublished = !!(attrs.publishedAt || obra.publishedAt)
  
  // Obtener estado_publicacion (Strapi devuelve en minúsculas: "pendiente", "publicado", "borrador")
  const estadoPublicacionRaw = getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'pendiente'
  // Normalizar y capitalizar para mostrar (pero Strapi espera minúsculas)
  const estadoPublicacion = typeof estadoPublicacionRaw === 'string' 
    ? estadoPublicacionRaw.toLowerCase() 
    : estadoPublicacionRaw
  
  // Obtener fechas
  const createdAt = attrs.createdAt || (obra as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  
  return {
    id: obra.id || obra.documentId || obra.id,
    nombre: nombreObra,
    codigoObra: codigoObra,
    descripcion: descripcion,
    productos: productosCount,
    status: isPublished ? 'active' : 'inactive',
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/products/atributos/obras/${obra.id || obra.documentId || obra.id}`,
    strapiId: obra.id,
    estadoPublicacion: (estadoPublicacion === 'publicado' ? 'Publicado' : 
                       estadoPublicacion === 'borrador' ? 'Borrador' : 
                       'Pendiente') as 'Publicado' | 'Pendiente' | 'Borrador',
    obraOriginal: obra,
  }
}

interface ObraRequestsListingProps {
  obras?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<ObraTypeExtended>()

const ObraRequestsListing = ({ obras, error }: ObraRequestsListingProps = {}) => {
  const router = useRouter()
  // Obtener rol del usuario autenticado
  const { colaborador } = useAuth()
  const canDelete = colaborador?.rol === 'super_admin'
  
  const mappedObras = useMemo(() => {
    if (obras && obras.length > 0) {
      console.log('[ObraRequestsListing] Obras recibidas:', obras.length)
      const mapped = obras.map(mapStrapiObraToObraType)
      console.log('[ObraRequestsListing] Obras mapeadas:', mapped.length)
      return mapped
    }
    return []
  }, [obras])

  // Estado para el modal de cambio de estado
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false)
  const [selectedObra, setSelectedObra] = useState<ObraTypeExtended | null>(null)
  const [statusAction, setStatusAction] = useState<'approve' | 'reject'>('approve')

  const columns: ColumnDef<ObraTypeExtended, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<ObraTypeExtended> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<ObraTypeExtended> }) => (
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
    columnHelper.accessor('nombre', {
      header: 'Obra',
      cell: ({ row }) => (
        <div>
          <h5 className="mb-0">
            <Link href={row.original.url} className="link-reset">
              {row.original.nombre || 'Sin nombre'}
            </Link>
          </h5>
          {row.original.codigoObra && (
            <p className="text-muted mb-0 fs-xxs">Código: {row.original.codigoObra}</p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('codigoObra', { 
      header: 'Código',
      cell: ({ row }) => (
        <code className="text-muted">{row.original.codigoObra || 'N/A'}</code>
      ),
    }),
    columnHelper.accessor('descripcion', {
      header: 'Descripción',
      cell: ({ row }) => (
        <span className="text-muted small">
          {row.original.descripcion ? (row.original.descripcion.length > 50 ? `${row.original.descripcion.substring(0, 50)}...` : row.original.descripcion) : 'N/A'}
        </span>
      ),
    }),
    columnHelper.accessor('productos', {
      header: 'Productos',
      cell: ({ row }) => (
        <span className="badge badge-soft-info">{row.original.productos}</span>
      ),
    }),
    columnHelper.accessor('estadoPublicacion', {
      header: 'Estado Publicación',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const estado = row.original.estadoPublicacion || 'Pendiente'
        const badgeClass = estado === 'Publicado' ? 'badge-soft-success' :
                          estado === 'Pendiente' ? 'badge-soft-warning' :
                          'badge-soft-secondary'
        return (
          <span className={`badge ${badgeClass} fs-xxs`}>
            {estado}
          </span>
        )
      },
    }),
    columnHelper.accessor('date', {
      header: 'Fecha',
      cell: ({ row }) => (
        <>
          {row.original.date} <small className="text-muted">{row.original.time}</small>
        </>
      ),
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<ObraTypeExtended> }) => (
        <div className="d-flex gap-1">
          <Link href={row.original.url}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle" title="Ver">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={row.original.url}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle" title="Editar">
              <TbEdit className="fs-lg" />
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            className="btn-icon rounded-circle"
            title="Cambiar Estado"
            onClick={() => {
              setSelectedObra(row.original)
              setStatusAction('approve')
              setShowChangeStatusModal(true)
            }}>
            <TbCheck className="fs-lg" />
          </Button>
          {canDelete && (
            <Button
              variant="default"
              size="sm"
              className="btn-icon rounded-circle"
              title="Eliminar"
              onClick={() => {
                toggleDeleteModal()
                setSelectedRowIds({ [row.id]: true })
              }}>
              <TbTrash className="fs-lg" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const [data, setData] = useState<ObraTypeExtended[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('obra-requests-column-order')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Error al cargar orden de columnas:', e)
        }
      }
    }
    return []
  })

  // Guardar orden de columnas en localStorage
  const handleColumnOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder)
    if (typeof window !== 'undefined') {
      localStorage.setItem('obra-requests-column-order', JSON.stringify(newOrder))
    }
  }

  useEffect(() => {
    setData(mappedObras)
  }, [mappedObras])

  const table = useReactTable<ObraTypeExtended>({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination, rowSelection: selectedRowIds, columnOrder },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    onColumnOrderChange: setColumnOrder,
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

  const toggleDeleteModal = () => {
    setShowDeleteModal(!showDeleteModal)
  }

  const handleDelete = async () => {
    const selectedIds = Object.keys(selectedRowIds)
    const idsToDelete = selectedIds.map(id => data[parseInt(id)]?.id).filter(Boolean)
    
    try {
      for (const obraId of idsToDelete) {
        const response = await fetch(`/api/tienda/obras/${obraId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar obra ${obraId}`)
        }
      }
      
      setData((old) => old.filter((_, idx) => !selectedIds.includes(idx.toString())))
      setSelectedRowIds({})
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
      
      router.refresh()
    } catch (error) {
      console.error('Error al eliminar obras:', error)
      alert('Error al eliminar las obras seleccionadas')
    }
  }

  const handleStatusChange = async () => {
    if (!selectedObra?.strapiId) return

    // Determinar el nuevo estado basado en la acción
    const newStatus = statusAction === 'approve' ? 'publicado' : 'rechazado'
    const newStatusLower = newStatus.toLowerCase()

    try {
      const response = await fetch(`/api/tienda/obras/${selectedObra.strapiId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { estado_publicacion: newStatusLower } }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar el estado de la obra')
      }

      // Actualizar el estado local (capitalizar para mostrar)
      const estadoMostrar = newStatusLower === 'publicado' ? 'Publicado' : 
                           newStatusLower === 'borrador' ? 'Borrador' : 
                           'Pendiente'
      setData((prevData) =>
        prevData.map((o) =>
          o.strapiId === selectedObra.strapiId ? { ...o, estadoPublicacion: estadoMostrar as any } : o
        )
      )
      console.log(`[ObraRequestsListing] Estado de obra ${selectedObra.strapiId} actualizado a ${newStatus}`)
      setShowChangeStatusModal(false)
      setSelectedObra(null)
    } catch (err: any) {
      console.error('[ObraRequestsListing] Error al cambiar estado:', err)
      alert(`Error al cambiar estado: ${err.message}`)
    }
  }

  const hasError = !!error
  const hasData = mappedObras.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar obras desde Strapi:</strong> {error}
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
                  placeholder="Buscar nombre de obra..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>

              {Object.keys(selectedRowIds).length > 0 && canDelete && (
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
                  value={(table.getColumn('estadoPublicacion')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) => table.getColumn('estadoPublicacion')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                  <option value="All">Estado Publicación</option>
                  <option value="Publicado">Publicado</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Borrador">Borrador</option>
                </select>
                <LuBox className="app-search-icon text-muted" />
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

            <div className="d-flex gap-1">
              <Button variant="primary" className="btn-icon">
                <TbList className="fs-lg" />
              </Button>
            </div>
          </CardHeader>

          <DataTable<ObraTypeExtended>
            table={table}
            emptyMessage="No se encontraron registros"
            enableColumnReordering={true}
            onColumnOrderChange={handleColumnOrderChange}
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="obras"
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
            itemName="obra"
          />

          {selectedObra && (
            <ConfirmStatusModal
              show={showChangeStatusModal}
              onHide={() => {
                setShowChangeStatusModal(false)
                setSelectedObra(null)
              }}
              onConfirm={handleStatusChange}
              action={statusAction}
              itemName={selectedObra.nombre || 'obra'}
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}

export default ObraRequestsListing

