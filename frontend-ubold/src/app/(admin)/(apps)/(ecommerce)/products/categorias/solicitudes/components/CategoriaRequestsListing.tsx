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

// Tipo extendido para categorías con estado_publicacion
type CategoriaTypeExtended = {
  id: number
  name: string
  slug: string
  description: string
  image: string | null
  products: number
  status: 'active' | 'inactive'
  date: string
  time: string
  url: string
  strapiId?: number
  estadoPublicacion?: 'Publicado' | 'Pendiente' | 'Borrador'
  categoriaOriginal?: any
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

// Función para mapear categorías de Strapi al formato CategoriaTypeExtended
const mapStrapiCategoriaToCategoriaType = (categoria: any): CategoriaTypeExtended => {
  const attrs = categoria.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (categoria as any)

  // Obtener name (schema real de Strapi usa "name")
  const nombre = getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || 'Sin nombre'
  
  // Obtener slug
  const slug = getField(data, 'slug', 'SLUG') || ''
  
  // Obtener descripcion
  const descripcion = getField(data, 'descripcion', 'description', 'DESCRIPCION') || ''
  
  // Obtener URL de imagen
  const getImageUrl = (): string | null => {
    let imagen = data.imagen || data.image || data.IMAGEN || data.IMAGE
    
    if (imagen?.data) {
      imagen = Array.isArray(imagen.data) ? imagen.data[0] : imagen.data
    }
    
    if (!imagen || imagen === null) {
      return null
    }

    const url = imagen.attributes?.url || imagen.attributes?.URL || imagen.url || imagen.URL
    if (!url) {
      return null
    }
    
    if (url.startsWith('http')) {
      return url
    }
    
    // Construir URL completa con la base de Strapi
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/$/, '') || 'http://localhost:1337'
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }
  
  // Obtener estado (publishedAt indica si está publicado)
  const isPublished = !!(attrs.publishedAt || categoria.publishedAt)
  
  // Obtener estado_publicacion (Strapi devuelve en minúsculas: "pendiente", "publicado", "borrador")
  const estadoPublicacionRaw = getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'pendiente'
  // Normalizar y capitalizar para mostrar (pero Strapi espera minúsculas)
  const estadoPublicacion = typeof estadoPublicacionRaw === 'string' 
    ? estadoPublicacionRaw.toLowerCase() 
    : estadoPublicacionRaw
  
  // Contar productos (si hay relación)
  const productos = data.productos?.data || data.products?.data || data.productos || data.products || []
  const productosCount = Array.isArray(productos) ? productos.length : 0
  
  // Obtener fechas
  const createdAt = attrs.createdAt || (categoria as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  
  return {
    id: categoria.id || categoria.documentId || categoria.id,
    name: nombre,
    slug: slug,
    description: descripcion,
    image: getImageUrl(),
    products: productosCount,
    status: isPublished ? 'active' : 'inactive',
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/products/categorias/${categoria.id || categoria.documentId || categoria.id}`,
    strapiId: categoria.id,
    estadoPublicacion: (estadoPublicacion === 'publicado' ? 'Publicado' : 
                       estadoPublicacion === 'borrador' ? 'Borrador' : 
                       'Pendiente') as 'Publicado' | 'Pendiente' | 'Borrador',
    categoriaOriginal: categoria,
  }
}

interface CategoriaRequestsListingProps {
  categorias?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<CategoriaTypeExtended>()

const CategoriaRequestsListing = ({ categorias, error }: CategoriaRequestsListingProps = {}) => {
  const router = useRouter()
  // Obtener rol del usuario autenticado
  const { colaborador } = useAuth()
  const canDelete = colaborador?.rol === 'super_admin'
  
  const mappedCategorias = useMemo(() => {
    if (categorias && categorias.length > 0) {
      console.log('[CategoriaRequestsListing] Categorías recibidas:', categorias.length)
      const mapped = categorias.map(mapStrapiCategoriaToCategoriaType)
      console.log('[CategoriaRequestsListing] Categorías mapeadas:', mapped.length)
      return mapped
    }
    return []
  }, [categorias])

  // Estado para el modal de cambio de estado
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false)
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaTypeExtended | null>(null)
  const [statusAction, setStatusAction] = useState<'approve' | 'reject'>('approve')

  const columns: ColumnDef<CategoriaTypeExtended, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<CategoriaTypeExtended> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<CategoriaTypeExtended> }) => (
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
      header: 'Categoría',
      cell: ({ row }) => (
        <div>
          <h5 className="mb-0">
            <Link href={row.original.url} className="link-reset">
              {row.original.name || 'Sin nombre'}
            </Link>
          </h5>
          {row.original.slug && (
            <p className="text-muted mb-0 fs-xxs">Slug: {row.original.slug}</p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('description', {
      header: 'Descripción',
      cell: ({ row }) => (
        <p className="text-muted mb-0 small">
          {row.original.description || 'Sin descripción'}
        </p>
      ),
    }),
    columnHelper.accessor('products', {
      header: 'Productos',
      cell: ({ row }) => (
        <span className="badge badge-soft-info">{row.original.products}</span>
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
      cell: ({ row }: { row: TableRow<CategoriaTypeExtended> }) => (
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
            title="Aprobar"
            onClick={() => {
              setSelectedCategoria(row.original)
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

  const [data, setData] = useState<CategoriaTypeExtended[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('categoria-requests-column-order')
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
      localStorage.setItem('categoria-requests-column-order', JSON.stringify(newOrder))
    }
  }

  useEffect(() => {
    setData(mappedCategorias)
  }, [mappedCategorias])

  const table = useReactTable<CategoriaTypeExtended>({
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
      for (const categoriaId of idsToDelete) {
        const response = await fetch(`/api/tienda/categorias/${categoriaId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar categoría ${categoriaId}`)
        }
      }
      
      setData((old) => old.filter((_, idx) => !selectedIds.includes(idx.toString())))
      setSelectedRowIds({})
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
      
      router.refresh()
    } catch (error) {
      console.error('Error al eliminar categorías:', error)
      alert('Error al eliminar las categorías seleccionadas')
    }
  }

  const handleStatusChange = async () => {
    if (!selectedCategoria?.strapiId) return

    // Determinar el nuevo estado basado en la acción
    const newStatus = statusAction === 'approve' ? 'publicado' : 'rechazado'
    const newStatusLower = newStatus.toLowerCase()

    try {
      const response = await fetch(`/api/tienda/categorias/${selectedCategoria.strapiId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { estado_publicacion: newStatusLower } }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar el estado de la categoría')
      }

      // Actualizar el estado local (capitalizar para mostrar)
      const estadoMostrar = newStatusLower === 'publicado' ? 'Publicado' : 
                           newStatusLower === 'borrador' ? 'Borrador' : 
                           'Pendiente'
      setData((prevData) =>
        prevData.map((c) =>
          c.strapiId === selectedCategoria.strapiId ? { ...c, estadoPublicacion: estadoMostrar as any } : c
        )
      )
      console.log(`[CategoriaRequestsListing] Estado de categoría ${selectedCategoria.strapiId} actualizado a ${newStatus}`)
      setShowChangeStatusModal(false)
      setSelectedCategoria(null)
    } catch (err: any) {
      console.error('[CategoriaRequestsListing] Error al cambiar estado:', err)
      alert(`Error al cambiar estado: ${err.message}`)
    }
  }

  const hasError = !!error
  const hasData = mappedCategorias.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar categorías desde Strapi:</strong> {error}
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
                  placeholder="Buscar nombre de categoría..."
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

          <DataTable<CategoriaTypeExtended>
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
                itemsName="categorías"
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
            itemName="categoría"
          />

          {selectedCategoria && (
            <ConfirmStatusModal
              show={showChangeStatusModal}
              onHide={() => {
                setShowChangeStatusModal(false)
                setSelectedCategoria(null)
              }}
              onConfirm={handleStatusChange}
              action={statusAction}
              itemName={selectedCategoria.name || 'categoría'}
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}

export default CategoriaRequestsListing

