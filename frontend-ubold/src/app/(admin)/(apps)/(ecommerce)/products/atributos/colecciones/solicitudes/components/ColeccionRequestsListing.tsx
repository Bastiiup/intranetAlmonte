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
import { LuBox, LuSearch, LuTag } from 'react-icons/lu'
import { TbEdit, TbEye, TbList, TbTrash, TbCheck } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import ConfirmStatusModal from '@/components/table/ConfirmStatusModal'
import TablePagination from '@/components/table/TablePagination'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

// Tipo extendido para colecciones con estado_publicacion
type ColeccionTypeExtended = {
  id: number
  name: string
  idColeccion: number | null
  editorial: string | null
  sello: string | null
  libros: number
  status: 'active' | 'inactive'
  date: string
  time: string
  url: string
  strapiId?: number
  estadoPublicacion?: 'Publicado' | 'Pendiente' | 'Borrador'
  coleccionOriginal?: any
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

// Función para mapear colecciones de Strapi al formato ColeccionTypeExtended
const mapStrapiColeccionToColeccionType = (coleccion: any): ColeccionTypeExtended => {
  const attrs = coleccion.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (coleccion as any)

  // Obtener nombre
  const nombreColeccion = getField(data, 'nombre_coleccion', 'nombreColeccion', 'NOMBRE_COLECCION') || 'Sin nombre'
  
  // Obtener ID colección
  const idColeccion = getField(data, 'id_coleccion', 'idColeccion', 'ID_COLECCION') || null
  
  // Obtener editorial
  const editorialData = data.editorial?.data || data.editorial
  const editorialNombre = editorialData?.attributes?.nombre_editorial || editorialData?.nombre_editorial || null
  
  // Obtener sello
  const selloData = data.sello?.data || data.sello
  const selloNombre = selloData?.attributes?.nombre_sello || selloData?.nombre_sello || null
  
  // Contar libros
  const libros = data.libros?.data || data.books || []
  const librosCount = Array.isArray(libros) ? libros.length : 0
  
  // Obtener estado (publishedAt indica si está publicado)
  const isPublished = !!(attrs.publishedAt || coleccion.publishedAt)
  
  // Obtener estado_publicacion (Strapi devuelve en minúsculas: "pendiente", "publicado", "borrador")
  const estadoPublicacionRaw = getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'pendiente'
  // Normalizar y capitalizar para mostrar (pero Strapi espera minúsculas)
  const estadoPublicacion = typeof estadoPublicacionRaw === 'string' 
    ? estadoPublicacionRaw.toLowerCase() 
    : estadoPublicacionRaw
  
  // Obtener fechas
  const createdAt = attrs.createdAt || (coleccion as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  
  return {
    id: coleccion.id || coleccion.documentId || coleccion.id,
    name: nombreColeccion,
    idColeccion: idColeccion,
    editorial: editorialNombre,
    sello: selloNombre,
    libros: librosCount,
    status: isPublished ? 'active' : 'inactive',
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/products/atributos/colecciones/${coleccion.id || coleccion.documentId || coleccion.id}`,
    strapiId: coleccion.id,
    estadoPublicacion: (estadoPublicacion === 'publicado' ? 'Publicado' : 
                       estadoPublicacion === 'borrador' ? 'Borrador' : 
                       'Pendiente') as 'Publicado' | 'Pendiente' | 'Borrador',
    coleccionOriginal: coleccion,
  }
}

interface ColeccionRequestsListingProps {
  colecciones?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<ColeccionTypeExtended>()

const ColeccionRequestsListing = ({ colecciones, error }: ColeccionRequestsListingProps = {}) => {
  const router = useRouter()
  // Obtener rol del usuario autenticado
  const { colaborador } = useAuth()
  const canDelete = colaborador?.rol === 'super_admin'
  
  const mappedColecciones = useMemo(() => {
    if (colecciones && colecciones.length > 0) {
      console.log('[ColeccionRequestsListing] Colecciones recibidas:', colecciones.length)
      const mapped = colecciones.map(mapStrapiColeccionToColeccionType)
      console.log('[ColeccionRequestsListing] Colecciones mapeadas:', mapped.length)
      return mapped
    }
    return []
  }, [colecciones])

  // Estado para el modal de cambio de estado
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false)
  const [selectedColeccion, setSelectedColeccion] = useState<ColeccionTypeExtended | null>(null)

  const columns: ColumnDef<ColeccionTypeExtended, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<ColeccionTypeExtended> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<ColeccionTypeExtended> }) => (
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
    columnHelper.accessor('name', {
      header: 'Colección',
      cell: ({ row }) => (
        <div>
          <h5 className="mb-0">
            <Link href={row.original.url} className="link-reset">
              {row.original.name || 'Sin nombre'}
            </Link>
          </h5>
          <p className="text-muted mb-0 fs-xxs">ID: {row.original.idColeccion || 'N/A'}</p>
        </div>
      ),
    }),
    columnHelper.accessor('idColeccion', { 
      header: 'ID Colección',
      cell: ({ row }) => (
        <code className="text-muted">{row.original.idColeccion || 'N/A'}</code>
      ),
    }),
    columnHelper.accessor('editorial', {
      header: 'Editorial',
      cell: ({ row }) => (
        <span>{row.original.editorial || 'N/A'}</span>
      ),
    }),
    columnHelper.accessor('sello', {
      header: 'Sello',
      cell: ({ row }) => (
        <span>{row.original.sello || 'N/A'}</span>
      ),
    }),
    columnHelper.accessor('libros', {
      header: 'Libros',
      cell: ({ row }) => (
        <span className="badge badge-soft-info">{row.original.libros}</span>
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
      cell: ({ row }: { row: TableRow<ColeccionTypeExtended> }) => (
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
              setSelectedColeccion(row.original)
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

  const [data, setData] = useState<ColeccionTypeExtended[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coleccion-requests-column-order')
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
      localStorage.setItem('coleccion-requests-column-order', JSON.stringify(newOrder))
    }
  }

  useEffect(() => {
    setData(mappedColecciones)
  }, [mappedColecciones])

  const table = useReactTable<ColeccionTypeExtended>({
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
      for (const coleccionId of idsToDelete) {
        const response = await fetch(`/api/tienda/colecciones/${coleccionId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar colección ${coleccionId}`)
        }
      }
      
      setData((old) => old.filter((_, idx) => !selectedIds.includes(idx.toString())))
      setSelectedRowIds({})
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
      
      router.refresh()
    } catch (error) {
      console.error('Error al eliminar colecciones:', error)
      alert('Error al eliminar las colecciones seleccionadas')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedColeccion?.strapiId) return

    // IMPORTANTE: Strapi espera valores en minúsculas: "pendiente", "publicado", "borrador"
    const newStatusLower = newStatus.toLowerCase()

    try {
      const response = await fetch(`/api/tienda/colecciones/${selectedColeccion.strapiId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { estado_publicacion: newStatusLower } }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar el estado de la colección')
      }

      // Actualizar el estado local (capitalizar para mostrar)
      const estadoMostrar = newStatusLower === 'publicado' ? 'Publicado' : 
                           newStatusLower === 'borrador' ? 'Borrador' : 
                           'Pendiente'
      setData((prevData) =>
        prevData.map((c) =>
          c.strapiId === selectedColeccion.strapiId ? { ...c, estadoPublicacion: estadoMostrar as any } : c
        )
      )
      console.log(`[ColeccionRequestsListing] Estado de colección ${selectedColeccion.strapiId} actualizado a ${newStatus}`)
    } catch (err: any) {
      console.error('[ColeccionRequestsListing] Error al cambiar estado:', err)
      alert(`Error al cambiar estado: ${err.message}`)
    }
  }

  const hasError = !!error
  const hasData = mappedColecciones.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar colecciones desde Strapi:</strong> {error}
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
                  placeholder="Buscar nombre de colección..."
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

          <DataTable<ColeccionTypeExtended>
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
                itemsName="colecciones"
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
            itemName="colección"
          />

          {selectedColeccion && (
            <ChangeStatusModal
              show={showChangeStatusModal}
              onHide={() => {
                setShowChangeStatusModal(false)
                setSelectedColeccion(null)
              }}
              onConfirm={handleStatusChange}
              currentStatus={selectedColeccion.estadoPublicacion || 'Pendiente'}
              productName={selectedColeccion.name || 'Colección'}
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}

export default ColeccionRequestsListing

